/* global Line noise Blob */
// eslint-disable-next-line no-unused-vars

/**
 * ===============================================================================================
 * ===============================================================================================
 * ===============================================================================================
 *
 * NOTE TO THE READER (that's you)
 *
 * This is my own messy code to make SVG files for sending to the AxiDraw without having
 * to deal with Illustrator.
 *
 * This is NOT good code, this is not the "proper" way to write helpful libraries like this
 * but it does what I need it to do in a way that helps me debug easily in the console
 * etc. etc. etc. The "cull/bisectLines" functions are particularly terrible.
 *
 * There is no versioning, no changelogs, no githib repo, the latest version probable lives here.
 *
 * ===============================================================================================
 * ===============================================================================================
 * ===============================================================================================
 */

/**
 * The page object (which you'd expect to be a class but isn't for various dull reasons)
 * controls the display of lines on a canvas, the saving of those lines into svgs
 * and other various bits and bobs
 *
 * Page
 * @namespace
 * @property {function} resize
 * @property {function} scaleX
 * @property {function} scaleY
 * @property {function} isInside
 * @property {function} intersect
 * @property {function} bisectLines
 * @property {function} cullOutside
 * @property {function} cullInside
 * @property {function} translate
 * @property {function} rotate
 * @property {function} getBoundingBox
 * @property {function} sortPointsClockwise
 * @property {function} makeCircle
 */
const page = {

  /**
   * precision - is used when we do some rounding on floats. We can often end up with two floats
   * like 1.9999999999998 and 2.0000000000001, which are the same for the purposes of plotting pen
   * on paper, but won't pass checks to be === equal. So sometimes we'll round the numbers when we
   * want to check things.
   * @constant {number}
   * @access private
   * */
  precision: 2,

  /**
   * dpi - the dots per inch that we are working with. Used to calculate x,y co-ords to printable dimensions
   * @constant {number}
   * @access private
   */
  dpi: 300,

  /**
   * printStore - This is where we hold things to be printed
   */
  printStore: {},

  /**
   * Returns a rounded value based on the {@private precision}
   * @access private
   * @param {number}  val The value to be rounded
   * @returns {number} The rounded value
   */
  rounding: (val) => {
    return val
    // return parseFloat(val.toFixed(page.precision))
  },

  /**
   * Calculates if a point is inside a polygon defined by an array of points
   * @param {object}  point A single point in the format of [x, y]
   * @param {Array}   vs    An array of points (vertexes) that make up the polygon i.e. [[0, 0], [10, 0], [10, 10], [0, 10]]
   * @returns {boolean} Is the point inside the array or not
   */
  isInside: (point, vs, forceSort = false) => {
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

    const x = point.x
    const y = point.y
    let sortedVs = vs
    if (forceSort) sortedVs = page.sortPointsClockwise(vs)

    let inside = false
    for (let i = 0, j = sortedVs.length - 1; i < sortedVs.length; j = i++) {
      const xi = sortedVs[i].x
      const yi = sortedVs[i].y
      const xj = sortedVs[j].x
      const yj = sortedVs[j].y

      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
      if (intersect) inside = !inside
    }

    return inside
  },

  /**
   * Determine the intersection point of two line segments
   * line intercept math by Paul Bourke http://paulbourke.net/geometry/pointlineplane/
   * @param {object} line1 A single {@link Line} object, consisting of two points, a start and end point.
   * @param {object} line2 A single {@link Line} object, consisting of two points, a start and end point.
   * @returns {boolean} Returns if the lines intersect or not
   */
  intersect: (line1, line2) => {
    //  Round all this stuff off
    /*
    line1.x1 = page.rounding(line1.x1)
    line1.y1 = page.rounding(line1.y1)
    line1.x2 = page.rounding(line1.x2)
    line1.y2 = page.rounding(line1.y2)

    line2.x1 = page.rounding(line2.x1)
    line2.y1 = page.rounding(line2.y1)
    line2.x2 = page.rounding(line2.x2)
    line2.y2 = page.rounding(line2.y2)
    */

    // Check if none of the lines are of length 0
    if ((line1.x1 === line1.x2 && line1.y1 === line1.y2) || (line2.x1 === line2.x2 && line2.y1 === line2.y2)) {
      return false
    }

    const denominator = ((line2.y2 - line2.y1) * (line1.x2 - line1.x1) - (line2.x2 - line2.x1) * (line1.y2 - line1.y1))

    // Lines are parallel
    if (denominator === 0) {
      return false
    }

    const ua = ((line2.x2 - line2.x1) * (line1.y1 - line2.y1) - (line2.y2 - line2.y1) * (line1.x1 - line2.x1)) / denominator
    const ub = ((line1.x2 - line1.x1) * (line1.y1 - line2.y1) - (line1.y2 - line1.y1) * (line1.x1 - line2.x1)) / denominator

    // is the intersection along the segments
    if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
      return false
    }

    // Return a object with the x and y coordinates of the intersection
    const x = (line1.x1 + ua * (line1.x2 - line1.x1))
    const y = (line1.y1 + ua * (line1.y2 - line1.y1))

    //  If the intersection point is the same as any of the line1 points, then it
    //  doesn't count
    // if (line1.x1 === x && line1.y1 === y) return false
    // if (line1.x2 === x && line1.y2 === y) return false

    return {
      x,
      y
    }
  },

  /**
   * This takes in an array of lines, and then splits the lines based on a "cutter/culler"
   * second set of lines, returning the new cut lines. For example if a single line passing
   * through a square is passed in. The line will be split into three parts the two outside
   * the square parts, and the single inside part. This function is normally used in conjunction
   * with the cullInside/Outside functions. But you could bisect something (say inside a circle)
   * duplicate the results. Then cull the inside of one copy and the outside of the other, so you
   * can rotate the inside set of lines independently of the outside ones.
   *
   * NOTE:
   * REALLY NOTE:
   *
   * This code kinda, sorta, doesn't work, like 100% of the time. After the line is bisected we end
   * up with line who's point falls exactly on the bisecting line, which will count as bisecting, and
   * therefor will bisect again and again. We have a counter to bail us out of this, but it does mean
   * we need to clean up lines that are like 0 distance long. And I haven't written the code to do that
   * yet.
   *
   * TODO:
   *
   * Write code to remove lines are are under a certain threshold in length
   * Write code to remove duplicate lines when they are within a certain threshold of each other
   * Join lines up when the end points of the line are close enough to the end points of another
   * line
   *
   * @param {(Array|object)}  lines   An array of {@link Line} objects, or a single {@link Line} object
   * @param {object}          culler  A single {@link Line} object
   * @returns {Array}                 An array of {@link Line} objects
   */
  bisectLines: (lines, culler) => {
    // Make sure we have an array of lines
    let counter = 0
    let maxDepth = 0
    if (!Array.isArray(lines)) lines = [lines]

    //  Turn the culler into a set of lines we can check against
    const cullLines = []
    const points = culler.getPoints()
    for (let p = 0; p < points.length - 1; p++) {
      const subline = {
        x1: points[p].x,
        y1: points[p].y,
        x2: points[p + 1].x,
        y2: points[p + 1].y
      }
      cullLines.push(subline)
    }

    const keepLines = []
    let checkLines = lines

    while (counter < 10000 && checkLines.length > 0) {
      if (counter > maxDepth) maxDepth = counter
      //  Now go through all the lines we want to bisect
      const checkedLines = []
      checkLines.forEach((line) => {
        //  Now loop through all the lines to check against all the lines
        //  in the culler, each time the line doesn't bisect then we add it
        //  to the newLine
        let newLine = new Line(line.getZindex())
        newLine.splitHappened = false
        let splitFound = false

        //  Go through all the points, turning them into lines
        const points = line.getPoints()
        for (let p = 0; p < points.length - 1; p++) {
          const subline = {
            x1: points[p].x,
            y1: points[p].y,
            x2: points[p + 1].x,
            y2: points[p + 1].y
          }

          const isFirstPoint = (p === 0)
          const isLastPoint = (p === points.length - 2)

          //  Always add the first point to the line
          newLine.addPoint(subline.x1, subline.y1)
          if (splitFound === false) {
            cullLines.forEach((cullLine) => {
              if (splitFound === false) {
                const result = page.intersect(subline, cullLine)
                //  If we have an intersection then we need to stop this line
                //  and start a new one
                let setTrue = true
                if (result) {
                  if (isFirstPoint && page.getDistance({
                    x: subline.x1,
                    y: subline.y1
                  }, result) < 0.0001) setTrue = false
                  if (isLastPoint && page.getDistance({
                    x: subline.x2,
                    y: subline.y2
                  }, result) < 0.0001) setTrue = false
                } else {
                  setTrue = false
                }

                if (result !== false && setTrue === true) {
                  splitFound = true
                  newLine.addPoint(result.x, result.y) // Add the bisection point
                  newLine.splitHappened = true
                  checkedLines.push(newLine)
                  newLine = new Line(newLine.getZindex()) //  Start a new line
                  newLine.splitHappened = true
                  newLine.addPoint(result.x, result.y) //  Add this point onto it
                }
              }
            })
          }
        }
        newLine.addPoint(points[points.length - 1].x, points[points.length - 1].y)
        if (newLine.getPoints().length > 1) checkedLines.push(newLine) //  Add it to the list of returned lines
      })

      //  Go through the checkedLines and push them onto one array or another
      checkLines = []
      checkedLines.forEach((line) => {
        if (line.splitHappened === true) {
          checkLines.push(line)
        } else {
          keepLines.push(line)
        }
      })
      counter++
    }
    return page.cleanLines(keepLines)
  },

  /**
   * When passed an array of lines, and a single line to act as a "culler",
   * this method will remove all the lines on the outside of the "culler"
   * and return a new array of lines.
   * NOTE: The culler needs to be a closed polygon, i.e. the last point
   * needs to be the same as the first point, otherwise the inside/outside
   * part of the calculation will not function correctly
   * @param {(Array|object)}  lines   An array of {@link Line} objects, or a single {@link Line} object
   * @param {object}          culler  A single {@link Line} object
   * @returns {Array}                 An array of {@link Line} objects
   */
  cullOutside: (lines, culler, forceSort = false) => {
    // TODO: Add a check in to make sure the culler is closed
    const newLines = page.bisectLines(lines, culler) // gets an array of lines back
    const keepLines = []
    newLines.forEach((line) => {
      let anyPointOutside = false
      const points = line.getPoints()

      for (let p = 0; p < points.length - 1; p++) {
        const subline = {
          x1: points[p].x,
          y1: points[p].y,
          x2: points[p + 1].x,
          y2: points[p + 1].y
        }
        const midPoint = {
          x: subline.x1 + ((subline.x2 - subline.x1) / 2),
          y: subline.y1 + ((subline.y2 - subline.y1) / 2)
        }
        const isInside = page.isInside(midPoint, culler.getPoints(), forceSort)
        if (isInside === false) anyPointOutside = true
      }
      if (anyPointOutside === false) keepLines.push(line)
    })
    return keepLines
  },

  /**
   * When passed an array of lines, and a single line to act as a "culler",
   * this method will remove all the lines on the outside of the "culler"
   * and return a new array of lines
   * NOTE: The culler needs to be a closed polygon, i.e. the last point
   * needs to be the same as the first point, otherwise the inside/outside
   * part of the calculation will not function correctly
   * @param {(Array|object)}  lines   An array of {@link Line} objects, or a single {@link Line} object
   * @param {object}          culler  A single {@link Line} object
   * @returns {Array}                 An array of {@link Line} objects
   */
  cullInside: (lines, culler, forceSort = false) => {
    // TODO: Add a check in to make sure the culler is closed
    //  bisect the lines where they pass over the culler
    const newLines = page.bisectLines(lines, culler)
    const keepLines = []
    newLines.forEach((line) => {
      let anyPointInside = false
      const points = line.getPoints()

      for (let p = 0; p < points.length - 1; p++) {
        const subline = {
          x1: points[p].x,
          y1: points[p].y,
          x2: points[p + 1].x,
          y2: points[p + 1].y
        }
        const midPoint = {
          x: subline.x1 + ((subline.x2 - subline.x1) / 2),
          y: subline.y1 + ((subline.y2 - subline.y1) / 2)
        }
        const isInside = page.isInside(midPoint, culler.getPoints(), forceSort)
        if (isInside === true) anyPointInside = true
      }
      if (anyPointInside === false) keepLines.push(line)
    })
    return keepLines
  },

  /**
   * A utility method to translate a single line or an array of lines
   * by the passed values. It always returns an array of lines
   * @param {(Array|object)}  lines An array of {@link Line} objects, or a single {@link Line} object
   * @param {number}          x     The x offset
   * @param {number}          y     The y offset
   * @param {number}          z     The z offset
   * @returns {Array}               An array of {@link Line} objects
   */
  translate: (lines, x, y, z = 0) => {
    const newLines = []
    if (!Array.isArray(lines)) lines = [lines]
    lines.forEach((line) => {
      const newLine = new Line(line.getZindex())
      const points = line.getPoints()
      points.forEach((point) => {
        newLine.addPoint(page.rounding(point.x + x), page.rounding(point.y + y), page.rounding(point.z + z))
      })
      newLines.push(newLine)
    })
    return newLines
  },

  /**
   * A utility method to translate a single line or an array of lines
   * by the passed values. It always returns an array of lines
   * @param {(Array|object)}  lines             An array of {@link Line} objects, or a single {@link Line} object
   * @param {number}          angle             The angle in degrees to rotate around
   * @param {boolean}         aroundOwnMidpoint Rotate around it's own middle if true, around 0,0 origin if false
   * @returns {Array}                 An array of {@link Line} objects
   */
  rotate: (lines, angle, aroundOwnMidpoint = true) => {
    //  Convert the angle from degree to radians
    const adjustedAngle = (-angle * Math.PI / 180)

    //  This will hold our final lines for us
    let newLines = []
    //  Make sure the lines are an array
    if (!Array.isArray(lines)) lines = [lines]
    //  Grab the bouding box in case we need it
    const bb = page.getBoundingBox(lines)

    //  If we are rotating around it's own center then translate it to 0,0
    if (aroundOwnMidpoint) {
      lines = page.translate(lines, -bb.mid.x, -bb.mid.y)
    }

    //  Now rotate all the points
    lines.forEach((line) => {
      const newLine = new Line(line.getZindex())
      const points = line.getPoints()
      points.forEach((point) => {
        newLine.addPoint((Math.cos(adjustedAngle) * point.x) + (Math.sin(adjustedAngle) * point.y), (Math.cos(adjustedAngle) * point.y) - (Math.sin(adjustedAngle) * point.x), point.z)
      })
      newLines.push(newLine)
    })

    //  If we are rotating around the center now we need to move it back
    //  to it's original position
    if (aroundOwnMidpoint) {
      newLines = page.translate(newLines, bb.mid.x, bb.mid.y)
    }
    //  Send the lines back
    return newLines
  },

  /**
   * A utility method to translate a single line or an array of lines
   * by the passed values. It always returns an array of lines
   * @param {(Array|object)}  lines             An array of {@link Line} objects, or a single {@link Line} object
   * @param {number}          angle             The angle in degrees to rotate around
   * @param {boolean}         aroundOwnMidpoint Rotate around it's own middle if true, around 0,0 origin if false
   * @returns {Array}                 An array of {@link Line} objects
   */
  rotateXYZ: (lines, angle, aroundOwnMidpoint = true) => {
    //  This will hold our final lines for us
    let newLines = []
    //  Make sure the lines are an array
    if (!Array.isArray(lines)) lines = [lines]
    //  Grab the bouding box in case we need it
    const bb = page.getBoundingBox(lines)

    //  If we are rotating around it's own center then translate it to 0,0
    if (aroundOwnMidpoint) {
      lines = page.translate(lines, -bb.mid.x, -bb.mid.y, -bb.mid.z)
    }

    //  Now rotate all the points
    lines.forEach((line) => {
      const newLine = new Line(line.getZindex())
      const points = line.getPoints()
      points.forEach((point) => {
        const newPoint = page.rotatePoint(point, angle)
        newLine.addPoint(newPoint.x, newPoint.y, newPoint.z)
      })
      newLines.push(newLine)
    })

    //  If we are rotating around the center now we need to move it back
    //  to it's original position
    if (aroundOwnMidpoint) {
      newLines = page.translate(newLines, bb.mid.x, bb.mid.y, bb.mid.z)
    }
    //  Send the lines back
    return newLines
  },

  zSort: (lines) => {
    //  This will hold our final lines for us
    let newLines = []
    //  Make sure the lines are an array
    const linesMap = {}
    const linesIndex = []

    if (!Array.isArray(lines)) lines = [lines]
    //  Go through the lines
    lines.forEach((line) => {
      //  Grab the bbox
      const bb = page.getBoundingBox(line)
      //  Grab the zIndex of the line
      let z = bb.mid.z
      //  Now adjust it *very* slightly based on the x and y values... the greater the x/y values
      //  the furure it will be away from the middle, so we push that zindex a little further out.
      //  This is of course a terrible HACK, and there is much wrong with this way of doing zSorting!
      z -= (Math.max(Math.abs(bb.max.x), Math.abs(bb.min.x)) / 100)
      z -= (Math.max(Math.abs(bb.max.y), Math.abs(bb.min.y)) / 100)
      line.setZindex(z)
      if (!linesMap[z]) linesMap[z] = []
      linesMap[z].push(line)
      linesIndex.push(z)
      // newLines.push(line)
    })

    //  Now we have built up a map and index of all the lines, we need to sort the zIndex and then push the lines
    //  into the newLines stack in that order
    linesIndex.sort(function (a, b) {
      return a - b
    })
    linesIndex.forEach((i) => {
      newLines = [...newLines, ...linesMap[i]]
    })
    return newLines
  },

  flatten: (lines, zoom) => {
    //  This will hold our final lines for us
    const newLines = []
    //  Make sure the lines are an array
    if (!Array.isArray(lines)) lines = [lines]

    lines.forEach((line) => {
      const newLine = new Line(line.getZindex())
      const points = line.getPoints()
      points.forEach((point) => {
        const newPoint = page.projectPoint(point, zoom)
        newLine.addPoint(newPoint.x, newPoint.y, newPoint.z)
      })
      newLines.push(newLine)
    })
    return newLines
  },

  /**
   * A utility method to translate a single line or an array of lines
   * by the passed values. It always returns an array of lines
   * @param {(Array|object)}  lines             An array of {@link Line} objects, or a single {@link Line} object
   * @param {displacement}    amount            Length and direction of dotify
   * @returns {Array}                           An array of {@link Line} objects
   */
  dotify: (lines, displacement) => {
    if (!displacement) {
      displacement = {
        amplitude: 0,
        resolution: 1,
        xNudge: 0,
        yNudge: 0,
        zNudge: 0,
        xScale: 1,
        yScale: 1,
        zScale: 1,
        addTime: false,
        timeMod: 1
      }
    }
    //  This will hold our final lines for us
    const newLines = []
    //  Make sure the lines are an array
    if (!Array.isArray(lines)) lines = [lines]

    //  If we are supposed to do time, then do it
    let ttMod = 0
    if (displacement.addTime) ttMod = new Date().getTime() / 1000 / displacement.timeMod

    //  Now displace all the points
    lines.forEach((line) => {
      const points = line.getPoints()
      points.forEach((point) => {
        const newPoint = {
          x: point.x,
          y: point.y,
          z: point.z
        }
        newPoint.x += noise.perlin3((point.x + displacement.xNudge + ttMod) / displacement.resolution, (point.y + displacement.xNudge + ttMod) / displacement.resolution, (point.z + displacement.xNudge + ttMod) / displacement.resolution) * displacement.xScale * displacement.amplitude
        newPoint.y += noise.perlin3((point.x + displacement.yNudge + ttMod) / displacement.resolution, (point.y + displacement.yNudge + ttMod) / displacement.resolution, (point.z + displacement.yNudge + ttMod) / displacement.resolution) * displacement.yScale * displacement.amplitude
        newPoint.z += noise.perlin3((point.x + displacement.zNudge + ttMod) / displacement.resolution, (point.y + displacement.zNudge + ttMod) / displacement.resolution, (point.z + displacement.zNudge + ttMod) / displacement.resolution) * displacement.zScale * displacement.amplitude
        //  Make sure we always have something
        if (point.x === newPoint.x && point.y === newPoint.y && point.z === newPoint.z) {
          newPoint.x += 0.02
          newPoint.y += 0.02
          newPoint.y += 0.02
        }
        const newLine = new Line(line.getZindex())
        newLine.addPoint(point.x, point.y, point.z)
        newLine.addPoint(newPoint.x, newPoint.y, newPoint.z)
        newLines.push(newLine)
      })
    })

    //  Send the lines back
    return newLines
  },

  /**
   * A utility method to translate a single line or an array of lines
   * by the passed values. It always returns an array of lines
   * @param {(Array|object)}  lines             An array of {@link Line} objects, or a single {@link Line} object
   * @param {displacement}    vectorObjects     The angle in degrees to rotate around
   * @returns {Array}                           An array of {@link Line} objects
   */
  displace: (lines, displacement) => {
    //  This will hold our final lines for us
    const newLines = []
    //  Make sure the lines are an array
    if (!Array.isArray(lines)) lines = [lines]

    //  If we are supposed to do time, then do it
    let ttMod = 0
    if (displacement.addTime) ttMod = new Date().getTime() / 1000 / displacement.timeMod
    if (displacement.layout) ttMod += displacement.layout * Math.PI * 1000000
    const midPoint = {
      x: page.size[0] / 2,
      y: page.size[1] / 2
    }
    const d = new Date().getTime()
    const cornerDistance = (midPoint.x * midPoint.x) + (midPoint.y * midPoint.y)

    //  Now displace all the points
    lines.forEach((line) => {
      const newLine = new Line(line.getZindex())
      const points = line.getPoints()
      points.forEach((point) => {
        const newPoint = {
          x: point.x,
          y: point.y,
          z: point.z
        }

        //  Do the hoop jumping to
        const weightPoint = {
          x: point.x + page.size[0] / 2 + displacement.xShift,
          y: point.y + page.size[1] / 2 + displacement.yShift,
          z: point.z
        }

        let finalWeightingMod = 1
        if (displacement.direction === 'topDown') finalWeightingMod = (1 - weightPoint.y / page.size[1]) * 1
        if (displacement.direction === 'leftRight') finalWeightingMod = (1 - weightPoint.x / page.size[0]) * 1
        if (displacement.direction === 'middle') {
          const thisDist = ((midPoint.x - weightPoint.x) * (midPoint.x - weightPoint.x)) + ((midPoint.y - weightPoint.y) * (midPoint.y - weightPoint.y))
          finalWeightingMod = (0.71 - (thisDist / cornerDistance - (displacement.middleDist / 1000)) * 1)
        }
        if (displacement.direction === 'noise') {
          finalWeightingMod = ((noise.perlin3(weightPoint.x / 20 + (d / 721), weightPoint.y / 20 + (d / 883), d / 1000) + 1) / 2)
        }
        if (displacement.weighting !== 0) finalWeightingMod *= displacement.weighting
        if (displacement.invert) finalWeightingMod = 1 - finalWeightingMod

        newPoint.x += noise.perlin3((point.x + displacement.xNudge + ttMod) / displacement.resolution, (point.y + displacement.xNudge + ttMod) / displacement.resolution, (point.z + displacement.xNudge + ttMod) / displacement.resolution) * displacement.xScale * displacement.amplitude * finalWeightingMod
        newPoint.y += noise.perlin3((point.x + displacement.yNudge + ttMod) / displacement.resolution, (point.y + displacement.yNudge + ttMod) / displacement.resolution, (point.z + displacement.yNudge + ttMod) / displacement.resolution) * displacement.yScale * displacement.amplitude * finalWeightingMod
        newPoint.z += noise.perlin3((point.x + displacement.zNudge + ttMod) / displacement.resolution, (point.y + displacement.zNudge + ttMod) / displacement.resolution, (point.z + displacement.zNudge + ttMod) / displacement.resolution) * displacement.zScale * displacement.amplitude * finalWeightingMod
        newLine.addPoint(newPoint.x, newPoint.y, newPoint.z)
        // newLine.addPoint((Math.cos(adjustedAngle) * point.x) + (Math.sin(adjustedAngle) * point.y), (Math.cos(adjustedAngle) * point.y) - (Math.sin(adjustedAngle) * point.x))
      })
      newLines.push(newLine)
    })

    //  Send the lines back
    return newLines
  },

  /**
   * A utility method to scale a single line or an array of lines
   * by the passed values. It always returns an array of lines
   * @param {(Array|object)}  lines             An array of {@link Line} objects, or a single {@link Line} object
   * @param {number}          xScale            The amount to scale in the x direction
   * @param {number}          yScale            The amount to scale in the y direction, if null, then uses the same value as xScale
   * @param {number}          zScale            The amount to scale in the z direction, if null, then uses the same value as xScale
   * @param {boolean}         aroundOwnMidpoint Scale around it's own middle if true, around 0,0 origin if false
   * @returns {Array}                           An array of {@link Line} objects
   */
  scale: (lines, xScale, yScale = null, zScale = null, aroundOwnMidpoint = true) => {
    //  This will hold our final lines for us
    let newLines = []
    //  Make sure the lines are an array
    if (!Array.isArray(lines)) lines = [lines]
    //  Grab the bouding box in case we need it
    const bb = page.getBoundingBox(lines)

    //  If we are rotating around it's own center then translate it to 0,0
    if (aroundOwnMidpoint) {
      lines = page.translate(lines, -bb.mid.x, -bb.mid.y)
    }

    if (yScale === null) yScale = xScale
    if (zScale === null) zScale = xScale

    //  Now scale all the points
    lines.forEach((line) => {
      const newLine = new Line(line.getZindex())
      const points = line.getPoints()
      points.forEach((point) => {
        newLine.addPoint(xScale * point.x, yScale * point.y, zScale * point.z)
      })
      newLines.push(newLine)
    })

    //  If we are scaling around the center now we need to move it back
    //  to it's original position
    if (aroundOwnMidpoint) {
      newLines = page.translate(newLines, bb.mid.x, bb.mid.y, bb.mid.z)
    }
    //  Send the lines back
    return newLines
  },

  getDistance: (p1, p2) => {
    if (!p1.z || isNaN(p1.z)) p1.z = 0
    if (!p2.z || isNaN(p2.z)) p2.z = 0
    return Math.cbrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2))
  },

  /**
   * This utility method gets the bounding box from an array of lines, it also
   * calculates the midpoint
   * @param {(Array|object)}  lines  An array of {@link Line} objects, or a single {@link Line} object
   * @returns {object}        And object containing the min/max points and the mid points
   */
  getBoundingBox: (lines) => {
    if (!Array.isArray(lines)) lines = [lines]

    const max = {
      x: -999999999,
      y: -999999999,
      z: -999999999
    }
    const min = {
      x: 999999999,
      y: 999999999,
      z: 999999999
    }
    lines.forEach((line) => {
      const points = line.getPoints()
      points.forEach((point) => {
        if (point.x < min.x) min.x = point.x
        if (point.x > max.x) max.x = point.x
        if (point.y < min.y) min.y = point.y
        if (point.y > max.y) max.y = point.y
        if (point.z < min.z) min.z = point.z
        if (point.z > max.z) max.z = point.z
      })
    })
    return {
      min,
      max,
      mid: {
        x: page.rounding(min.x + ((max.x - min.x) / 2)),
        y: page.rounding(min.y + ((max.y - min.y) / 2)),
        z: page.rounding(min.z + ((max.z - min.z) / 2))
      }
    }
  },

  /**
   * A utility method for converting an array of points into a clockwise order
   * (or at least I think it's clockwise, it's suddenly struck me that there's
   * a slim chance it's anti-clockwise, TODO: check clockwiseyness)
   * @param {array} points  An array of points objects
   * @returns {array} A sorted array of point objects
   */
  sortPointsClockwise: (points) => {
    //  Get the mid points of the points
    const max = {
      x: -999999999,
      y: -999999999,
      z: -999999999
    }
    const min = {
      x: 999999999,
      y: 999999999,
      z: 999999999
    }
    points.forEach((point) => {
      if (point.x < min.x) min.x = point.x
      if (point.x > max.x) max.x = point.x
      if (point.y < min.y) min.y = point.y
      if (point.y > max.y) max.y = point.y
      if (point.z < min.z) min.z = point.z
      if (point.z > max.z) max.z = point.z
    })
    const mid = {
      x: page.rounding(min.x + ((max.x - min.x) / 2)),
      y: page.rounding(min.y + ((max.y - min.y) / 2)),
      z: page.rounding(min.z + ((max.z - min.z) / 2))
    }
    //  Now calculate the angle between the mid point and
    //  all the points in turn
    let sortedPoints = []
    points.forEach((point) => {
      sortedPoints.push({
        x: point.x,
        y: point.y,
        z: point.z,
        angle: Math.atan2(point.y - mid.y, point.x - mid.x) * 180 / Math.PI
      })
    })
    sortedPoints = sortedPoints.sort((a, b) => parseFloat(a.angle) - parseFloat(b.angle))
    return sortedPoints
  },

  /**
   * A utility method to duplicate an array, so we end up with a deep copy
   * rather than a linked copy. There's a bunch of ways of doing this, I'm gunna
   * do it this way :)
   * @param {Array}   lines The lines (or array of lines to duplicate)
   * @returns {Array} The duplicated lines
   */
  duplicate: (lines) => {
    if (!Array.isArray(lines)) lines = [lines]
    const newLines = []
    lines.forEach((line) => {
      const newLine = new Line(parseInt(line.zIndex))
      const points = line.getPoints()
      points.forEach((p) => {
        newLine.addPoint(p.x, p.y, p.z)
      })
      newLines.push(newLine)
    })
    return newLines
  },

  cleanLines: (lines) => {
    const keepLines = []

    const wasArray = Array.isArray(lines)
    if (!Array.isArray(lines)) lines = [lines]
    //  Go through each line
    lines.forEach((line) => {
      const points = line.getPoints()
      const minDist = 0.01
      //  This is going to keep track of the points we want to keep
      const newPoints = []
      //  grab the first point
      let previousPoint = points.shift()
      newPoints.push(previousPoint)
      while (points.length) {
        //  grab the next point
        const checkPoint = points.shift()
        //  work out the distance
        const xs = checkPoint.x - previousPoint.x
        const ys = checkPoint.y - previousPoint.y
        const zs = checkPoint.z - previousPoint.z
        const dist = page.rounding(Math.cbrt(Math.abs(xs) + Math.abs(ys) + Math.abs(zs)))
        //  if the distance is greater then the minimum allowed, we keep the point
        if (dist >= minDist) {
          //  Keep the point
          newPoints.push(checkPoint)
          //  set the previous point to the one we just had
          previousPoint = checkPoint
        }
      }
      //  Set the points back into the line
      line.points = newPoints
      if (line.points.length > 1) keepLines.push(line)
    })
    if (!wasArray) return keepLines[0]
    return keepLines
  },

  /**
   * A utility function to remove duplicate lines
   * NOTE: This doesn't work!!!
   * TODO: Make it work
   * @param {(Array|object)} lines  An array of {@link Line} objects, or a single {@link Line} object
   * @returns {array}               A sorted array of point objects
   */
  dedupe: (lines) => {
    const keepLines = []

    if (!Array.isArray(lines)) lines = [lines]
    lines.forEach((line) => {
      const points = line.getPoints()
      const x1 = page.rounding(points[0].x)
      const y1 = page.rounding(points[0].y)
      const z1 = page.rounding(points[0].z)
      const x2 = page.rounding(points[points.length - 1].x)
      const y2 = page.rounding(points[points.length - 1].y)
      const z2 = page.rounding(points[points.length - 1].z)
      const xs = x2 - x1
      const ys = y2 - y1
      const zs = z2 - z1
      const dist = page.rounding(Math.cbrt(Math.abs(xs) + Math.abs(ys) + Math.abs(zs)))
      line.dist = dist
      if (dist > 0.01) {
        const pointsString = JSON.stringify(points)
        line.hash = pointsString
        line.reverseHash = JSON.stringify(points.reverse())
        keepLines.push(line)
      }
    })

    const reallyKeepLines = []
    while (keepLines.length > 0) {
      const checkLine = keepLines.pop()
      let hasMatch = false
      //  Now go through all the rest of them
      if (keepLines.length > 0) {
        keepLines.forEach((check) => {
          if (checkLine.hash === check.hash || checkLine.hash === check.reverseHash) {
            hasMatch = true
          }
        })
      }
      if (hasMatch === false) reallyKeepLines.push(checkLine)
    }
    return reallyKeepLines
  },

  /**
   * A utility method that will return a circle, well, technically a
   * polygon based on the number of segments and radius. The zIndex is
   * also set here. The polygon returned is centered on 0,0.
   * @param   {number}  segments  The number of segments in the circle
   * @param   {number}  radius    The radius of the polygon
   * @param   {number}  zIndex    The zIndex to be applied to the returned {@link Line}
   * @returns {Array}             Returns an Array containing a single {@link Line} object
   */
  makeCircle: (segments, radius, zIndex) => {
    const circle = new Line(zIndex)
    const angle = 360 / segments
    for (let s = 0; s <= segments; s++) {
      const adjustedAngle = ((angle * s) * Math.PI / 180)
      const x = page.rounding(Math.cos(adjustedAngle) * radius)
      const y = page.rounding(Math.sin(adjustedAngle) * radius)
      circle.addPoint(x, y)
    }
    return [circle]
  },

  /**
   * Crazy 3D stuff here
   */

  // Blah blah, lazy rotate
  rotatePoint: (point, values) => {
    const radmod = Math.PI / 180
    const newPoint = {
      x: 0,
      y: 0,
      z: 0
    }

    const newValues = {}
    newValues.x = values.x * radmod
    newValues.y = values.y * radmod
    newValues.z = values.z * radmod

    newPoint.x = point.x
    newPoint.y = point.y * Math.cos(newValues.x) - point.z * Math.sin(newValues.x) // rotate about X
    newPoint.z = point.y * Math.sin(newValues.x) + point.z * Math.cos(newValues.x) // rotate about X

    point.x = parseFloat(newPoint.x)
    point.z = parseFloat(newPoint.z)
    newPoint.x = point.z * Math.sin(newValues.y) + point.x * Math.cos(newValues.y) // rotate about Y
    newPoint.z = point.z * Math.cos(newValues.y) - point.x * Math.sin(newValues.y) // rotate about Y

    point.x = parseFloat(newPoint.x)
    point.y = parseFloat(newPoint.y)
    newPoint.x = point.x * Math.cos(newValues.z) - point.y * Math.sin(newValues.z) // rotate about Z
    newPoint.y = point.x * Math.sin(newValues.z) + point.y * Math.cos(newValues.z) // rotate about Z

    return newPoint
  },

  //  Convert a point from 3D to 2D
  projectPoint: (point, perspective) => {
    const f = 1 + (point.z / (perspective * perspective))
    const newPoint = {
      x: (point.x * f),
      y: (point.y * f),
      z: 0
    }

    // send the point back
    return newPoint
  },

  //  Optimise the draw order of the lines
  optimise: (lines, threshold) => {
    let paths = lines.map((line) => line.points)
    let finalPaths = []

    let keepGoing = true
    while (keepGoing) {
      finalPaths = []

      let foundNewJoin = false
      while (paths.length >= 1) {
        //  Grab the first path
        const firstPath = paths.shift()
        const endPoint = firstPath[firstPath.length - 1]
        //  This is where we are going to keep the merge path
        let mergePath = null
        //  This is where we are going to keep the rest of them
        let rejectPaths = []

        /*
          Now we are going to go through all the paths, looking to see if the END POINT of the first
          path, matches any of the FIRST POINTS of the other paths.
          If it does, then we keep the marge path, and put the rest into the rejects
        */
        const x1 = endPoint.x
        const y1 = endPoint.y
        paths.forEach((p) => {
          const x2 = p[0].x
          const y2 = p[0].y
          const dist = Math.sqrt(Math.pow(Math.abs(x1 - x2), 2) + Math.pow(Math.abs(y1 - y2), 2))
          if (dist <= threshold && !mergePath) {
            mergePath = p
            foundNewJoin = true
          } else {
            rejectPaths.push(p)
          }
        })

        //  If we didn't find a mergePath then go again but with all the paths reversed
        if (!mergePath) {
          rejectPaths = []
          paths = paths.map((p) => p.reverse())
          paths.forEach((p) => {
            const x2 = p[0].x
            const y2 = p[0].y
            const dist = Math.sqrt(Math.pow(Math.abs(x1 - x2), 2) + Math.pow(Math.abs(y1 - y2), 2))
            if (dist <= threshold && !mergePath) {
              mergePath = p
              foundNewJoin = true
            } else {
              rejectPaths.push(p)
            }
          })
        }

        //  If we have a path to merge, then stick them together and put them back in the stack
        //  so they can go around again, if there was still nothing to merge then we put the
        //  path into the finalPaths, where it will live and not get checked again
        if (mergePath) {
          //  remove the last entry from the first path
          firstPath.pop()
          //  Now put it back into the array of rejected paths, so it can go around again
          rejectPaths.push([...firstPath, ...mergePath])
        } else {
          //  If there was nothing to merge, put it on the finalPaths instead, so we can
          //  remove it all from future checking
          finalPaths.push(firstPath)
        }

        paths = rejectPaths
      }
      //  If we didn't find a new join, then we can stop
      if (!foundNewJoin) {
        keepGoing = false
      } else {
        paths = finalPaths
        finalPaths = []
      }
    }
    return finalPaths.map((points) => {
      const line = new Line(0)
      line.points = points
      return line
    })
  },

  /**
   * The method to convert a {@link Line} or an array of {@link Line}s into SVG markup.
   * @param   {(Array|object)}  lines   An array of {@link Line} objects, or a single {@link Line} object
   * @param   {string}          id      The id to name the layer. NOTE: we don't actually name the layer (that would be a TODO:)
   * @returns {string}          The string representation of the SVG
   */
  svg: (lines, id, strokeWidth = 1.0) => {
    if (!Array.isArray(lines)) lines = [lines]
    let output = `
          <g>
          <path d="`
    lines.forEach((line) => {
      const points = line.getPoints()
      output += `M ${page.rounding(page.rounding(points[0].x) * 0.393701 * page.dpi)} ${page.rounding(page.rounding(points[0].y) * 0.393701 * page.dpi)} `
      for (let p = 1; p < points.length; p++) {
        output += `L ${page.rounding(page.rounding(points[p].x) * 0.393701 * page.dpi)} ${page.rounding(page.rounding(points[p].y) * 0.393701 * page.dpi)} `
      }
    })

    output += `"  fill="none" stroke="black" stroke-width="${strokeWidth}"/>
      </g>`
    return output
  },

  /**
   * Take an svg or an array of svgs and wraps them in the XML needed to export an SVG file
   * @param   {(Array|string)}  svgs      An array of svgs strings, or a single svg string
   * @param   {string}          id        A unique ID that we can use to reference this set of SVG files
   * @param   {string}          filename  The filename (without the trailing '.svg') to save the file as, if we are going to save it
   * @returns {string}                    Returns the wrapped svgs string, into a final SVG formatted text chunk
   */
  wrapSVG: (svgs, id = 'plot', filename) => {
    if (!Array.isArray(svgs)) svgs = [svgs]
    let output = `<?xml version="1.0" standalone="no" ?>
    <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" 
        "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
        <svg version="1.1" id="${id}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
        x="0" y="0"
        viewBox="0 0 ${page.size[0] * 0.393701 * page.dpi} ${page.size[1] * 0.393701 * page.dpi}"
        width="${page.size[0]}cm"
        height="${page.size[1]}cm" 
        xml:space="preserve">`
    svgs.forEach((svg) => {
      output += svg
    })
    output += '</svg>'

    page.printStore[id] = {
      output,
      filename
    }
    return page.printStore[id].output
  },

  /**
   * Function to "print" i.e. save the files down onto disk
   * @param {string} id The id of the layer to print
   */
  print: (id) => {
    if (page.printStore[id]) {
      page.download(`${page.printStore[id].filename}.svg`, page.printStore[id].output)
      console.log('Try using the following commands to optimise, start and resume plotting')
      console.log(`svgsort ${page.printStore[id].filename}.svg  ${page.printStore[id].filename}-opt.svg --no-adjust`)
      console.log(`axicli ${page.printStore[id].filename}-opt.svg --model 2 -o progress01.svg -s 30 --report_time`)
      console.log('axicli progress01.svg --model 2 -o progress02.svg -s 30 --report_time --mode res_plot')
    }
  },

  /**
   * Utility function to force the downloading of the text file, which is normally our SVG file
   * @param {string}  filename  The filename of the downloaded document
   * @param {string}  text      The text content of the files we want downloaded (normall the wrapped SVG)
   */
  download: (filename, text) => {
    const element = document.createElement('a')
    element.setAttribute('download', filename)
    element.style.display = 'none'
    document.body.appendChild(element)
    //  Blob code via gec @3Dgec https://twitter.com/3Dgec/status/1226018489862967297
    element.setAttribute('href', window.URL.createObjectURL(new Blob([text], {
      type: 'text/plain;charset=utf-8'
    })))

    element.click()
    document.body.removeChild(element)
  }
}
