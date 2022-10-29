/* global imagesLoaded fxhash fxrand page Line Blob */

//
//  fxhash - Map
//
//
//  HELLO!! Code is copyright revdancatt (that's me), so no sneaky using it for your
//  NFT projects.
//  But please feel free to unpick it, and ask me questions. A quick note, this is written
//  as an artist, which is a slightly different (and more storytelling way) of writing
//  code, than if this was an engineering project. I've tried to keep it somewhat readable
//  rather than doing clever shortcuts, that are cool, but harder for people to understand.
//
//  You can find me at...
//  https://twitter.com/revdancatt
//  https://instagram.com/revdancatt
//  https://youtube.com/revdancatt
//

const ratio = 1.41
// const startTime = new Date().getTime() // so we can figure out how long since the scene started
let drawn = false
let highRes = false // display high or low res
let resizeTmr = null
let full = false
const features = {}
const nextFrame = null

window.$fxhashFeatures = {}

const makeHexagon = (row) => {
  const vertexes = [{
    x: -0.5,
    y: -0.866
  },
  {
    x: 0,
    y: -0.866
  },
  {
    x: 0.5,
    y: -0.866
  },
  {
    x: -0.75,
    y: -0.433
  },
  {
    x: -0.25,
    y: -0.433
  },
  {
    x: 0.25,
    y: -0.433
  },
  {
    x: 0.75,
    y: -0.433
  },
  {
    x: -1,
    y: 0
  },
  {
    x: -0.5,
    y: 0
  },
  {
    x: 0,
    y: 0
  },
  {
    x: 0.5,
    y: 0
  },
  {
    x: 1,
    y: 0
  },
  {
    x: -0.75,
    y: 0.433
  },
  {
    x: -0.25,
    y: 0.433
  },
  {
    x: 0.25,
    y: 0.433
  },
  {
    x: 0.75,
    y: 0.433
  },
  {
    x: -0.5,
    y: 0.866
  },
  {
    x: 0,
    y: 0.866
  },
  {
    x: 0.5,
    y: 0.866
  }
  ]

  const glyphLines = [
    //  Outer edge
    [0, 1, 2],
    [2, 6, 11],
    [11, 15, 18],
    [18, 17, 16],
    [16, 12, 7],
    [7, 3, 0],
    //  Main crosslines
    [0, 4, 9],
    [2, 5, 9],
    [11, 10, 9],
    [18, 14, 9],
    [16, 13, 9],
    [7, 8, 9],
    //  Inner triangles
    [1, 5],
    [5, 4],
    [4, 1],
    [6, 10],
    [10, 5],
    [5, 6],
    [15, 14],
    [14, 10],
    [10, 15],
    [17, 13],
    [13, 14],
    [14, 17],
    [12, 8],
    [8, 13],
    [13, 12],
    [3, 4],
    [4, 8],
    [8, 3]
  ]

  const lineChanceStep = 100 / glyphLines.length
  let chanceCounter = 0
  const shuffledLines = JSON.parse(JSON.stringify(glyphLines.sort(() => 0.5 - fxrand())))
  const shapeMap = []
  let drawLines = []
  const shapeLines = []

  for (const glyphLine of shuffledLines) {
    let baseChancePercent = (100 - (lineChanceStep * chanceCounter)) / 100
    baseChancePercent *= features.liney[row - 1] // Adjust for how liney we want it
    if (fxrand() < baseChancePercent) {
      //  If there is more than two point on a line, then it's breakable
      if (glyphLine.length > 2 && fxrand() < features.breaky[row - 1]) {
        //  50/50 which end we break off
        if (fxrand() < 0.5) {
          glyphLine.pop()
        } else {
          glyphLine.shift()
        }
        //  50/50 chance to reverse the line
        if (fxrand() < 0.5) {
          glyphLine.reverse()
        }
        //  Now add the vert to the shape map if it isn't there already
        if (shapeMap.indexOf(glyphLine[0]) === -1 && fxrand() < features.shapey[row - 1]) {
          shapeMap.push(glyphLine[0])
        }
      }
      //  Now draw the line
      const line = new Line(0)
      for (const vert of glyphLine) {
        line.addPoint((vertexes[vert].x), (vertexes[vert].y))
      }
      drawLines.push(line)
    }
    chanceCounter++
  }
  //  Now add the shapes
  for (const vert of shapeMap) {
    const radius = 0.25 * 0.75
    let shape = null
    if (fxrand() < features.circley[row - 1]) {
      shape = page.makeCircle(60, radius, 0)
    } else {
      shape = page.makeCircle(6, radius, 0)
    }
    shape = page.translate(shape, vertexes[vert].x, vertexes[vert].y, 0)
    shapeLines.push(shape[0])
  }

  //  Add the shape lines
  for (const line of shapeLines) {
    drawLines = page.cullInside(drawLines, line)
  }
  return page.optimise([...shapeLines, ...drawLines], 0.01)
}

//  Work out what all our features are
const makeFeatures = () => {
  const lineTypes = [
    [0.9, 0.8, 0.7, 0.7, 0.8, 0.9], // high
    [0.8, 0.5, 0.25, 0.25, 0.5, 0.8], // medium
    [0.5, 0.25, 0.05, 0.05, 0.25, 0.5] // low
  ]
  const breakTypes = [
    [0.1, 0.1, 0.1, 0.1, 0.1, 0.1], // low
    [0.8, 0.4, 0.2, 0.2, 0.4, 0.8], // high
    [0.45, 0.35, 0.25, 0.25, 0.35, 0.45] // medium
  ]
  const shapeTypes = [
    [0.8, 0.4, 0.2, 0.2, 0.4, 0.8], // high
    [0.1, 0.1, 0.1, 0.1, 0.1, 0.1], // low
    [0.8, 0.4, 0.2, 0.2, 0.4, 0.8] // high
  ]
  const type = Math.floor(fxrand() * 3)

  features.liney = lineTypes[type]
  features.breaky = breakTypes[type]
  features.shapey = shapeTypes[type]
  features.circley = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
  features.hexes = 16
  features.hexagons = []
  features.showChance = [0.8, 0.3, 0.07, 0.07, 0.3, 0.8]
  features.smallChance = [0, 0.2, 1, 1, 0.2, 0]
  for (let row = 1; row <= 6; row++) {
    for (let hex = 0; hex < features.hexes; hex++) {
      const newHex = {
        row,
        hex,
        glyph: makeHexagon(row),
        show: fxrand() < features.showChance[row - 1],
        small: fxrand() < features.smallChance[row - 1]
      }
      features.hexagons.push(newHex)
    }
  }

  //  Work out the distortion for the main line
  features.lineDistortion = []
  for (let i = 0; i < 5; i++) {
    const distortions = []
    for (let j = 0; j < 200; j++) {
      distortions.push(fxrand())
    }
    features.lineDistortion.push(distortions)
  }

  // Now we position all the planets
  features.planetPositions = []
  features.planetCount = Math.floor(fxrand() * 6) + 1
  features.maxPlanetRadius = 0
  features.moonCount = 0
  features.ringCount = 0

  const escapeLimit = 200
  while (features.planetPositions.length < features.planetCount) {
    let overLap = true
    let radius = null
    let position = null
    let exitCounter = 0
    while (overLap && exitCounter < escapeLimit) {
      radius = fxrand() * 0.333 + 0.05
      position = fxrand()
      //  Check to see if it overlaps with any other planet
      overLap = false
      for (const planet of features.planetPositions) {
        if (position + radius > planet.position - planet.radius && position - radius < planet.position + planet.radius) overLap = true
      }
      exitCounter++
    }
    const newPlanet = {
      position,
      radius,
      exitCounter,
      offsets: [],
      rings: [],
      moons: []
    }
    //  Work out if we have any moons, and if so, how many
    let maxMoons = 0
    if (fxrand() < 0.25) {
      maxMoons = 1
      const moonChance = fxrand()
      if (moonChance < 0.333) maxMoons = 2
      if (moonChance < 0.1) maxMoons = 3

      const moonOrbits = [0, 0.33, 0.66, 1]
      //  Shuffle the moonOrbit array
      for (let i = moonOrbits.length - 1; i > 0; i--) {
        const j = Math.floor(fxrand() * (i + 1))
        const temp = moonOrbits[i]
        moonOrbits[i] = moonOrbits[j]
        moonOrbits[j] = temp
      }
      //  Loop through the number of moons we have
      for (let m = 0; m < maxMoons; m++) {
        const moonOrbit = moonOrbits.pop()
        newPlanet.moons.push(moonOrbit)
        features.moonCount++
      }
    }
    //  Work out if we have any rings around this planet
    let maxRings = 0
    if (fxrand() < 0.4) maxRings = Math.floor(fxrand() * 5) + 1
    maxRings -= maxMoons
    for (let ring = 0; ring < maxRings; ring++) {
      newPlanet.rings.push(fxrand(0))
      features.ringCount++
    }

    features.planetPositions.push(newPlanet)
    if (radius > features.maxPlanetRadius) {
      features.maxPlanetRadius = radius
    }
  }
  features.planetPositions = features.planetPositions.filter(planet => planet.exitCounter < escapeLimit).map(planet => {
    planet.radius *= 0.95
    return planet
  })

  features.palette = {
    Black: '#000000',
    Green: '#ECF3EB',
    Blue: '#EEF5F5',
    Pink: '#F3EAF3',
    Parchment: '#F5C976',
    'Off White': '#EEEEEE',
    White: '#FFFFFF'
  }

  features.linePalette = {
    Black: '#000000',
    Ink: '#3D1D12',
    Wash: '#605A5C',
    'Off White': '#EEEEEE'
  }

  features.dotPalette = {
    Red: '#D72A0C',
    'Bright Red': '#FF0000',
    Yellow: '#F5C976'
  }

  const backgroundColour = fxrand()
  features.backgroundColour = 'Black'
  if (backgroundColour < 0.95) features.backgroundColour = 'Special'
  if (backgroundColour < 0.90) features.backgroundColour = 'Green'
  if (backgroundColour < 0.81) features.backgroundColour = 'Blue'
  if (backgroundColour < 0.72) features.backgroundColour = 'Pink'
  if (backgroundColour < 0.63) features.backgroundColour = 'Parchment'
  if (backgroundColour < 0.52) features.backgroundColour = 'Off White'
  if (backgroundColour < 0.32) features.backgroundColour = 'White'

  const convertToWash = fxrand()

  const lineColour = fxrand()
  features.lineColour = 'Black'
  if (lineColour < 0.40) features.lineColour = 'Ink'
  if (lineColour < 0.20) features.lineColour = 'Wash'
  if (features.backgroundColour === 'Black') {
    features.lineColour = 'Off White'
    if (convertToWash < 0.25) features.lineColour = 'Wash'
  }
  if (features.backgroundColour === 'Parchment' && features.lineColour === 'Wash') {
    features.lineColour = 'Ink'
  }
  if (features.backgroundColour === 'Special') features.lineColour = 'Black'

  const dotColour = fxrand()
  features.dotColour = 'Red'
  if (features.backgroundColour === 'Black') {
    if (features.circleColour === 'Wash') features.dotColour = 'Bright Red'
    if (dotColour < 0.60) features.dotColour = 'Bright Red'
    if (dotColour < 0.20) features.dotColour = 'Yellow'
  }

  if (features.backgroundColour === 'Special') {
    features.backgroundSpecial = fxrand()
  }
  if ((features.backgroundColour === 'Pink' || features.backgroundColour === 'Green' || features.backgroundColour === 'Blue') && fxrand() < 0.33) {
    features.backgroundColour += ' Gradient'
  }
  if (features.backgroundColour === 'Parchment' && fxrand() < 0.25) {
    features.backgroundColour += ' Gradient'
  }
}

//  Call the above make features, so we'll have the window.$fxhashFeatures available
//  for fxhash
makeFeatures()

window.$fxhashFeatures.Background = features.backgroundColour
window.$fxhashFeatures['Line colour'] = features.lineColour
window.$fxhashFeatures.Planets = features.planetPositions.length
window.$fxhashFeatures.Moons = features.moonCount
window.$fxhashFeatures.Rings = features.ringCount

console.log('window.$fxhashFeatures:')
console.table(window.$fxhashFeatures)

const init = async () => {
  //  I should add a timer to this, but really how often to people who aren't
  //  the developer resize stuff all the time. Stick it in a digital frame and
  //  have done with it!
  window.addEventListener('resize', async () => {
    //  If we do resize though, work out the new size...
    clearTimeout(resizeTmr)
    resizeTmr = setTimeout(layoutCanvas, 100)
  })

  //  Now layout the canvas
  await layoutCanvas()
}

const layoutCanvas = async () => {
  //  Kill the next animation frame
  window.cancelAnimationFrame(nextFrame)

  const wWidth = window.innerWidth
  const wHeight = window.innerHeight
  let cWidth = wWidth
  let cHeight = cWidth * ratio
  if (cHeight > wHeight) {
    cHeight = wHeight
    cWidth = wHeight / ratio
  }
  const canvas = document.getElementById('target')
  if (highRes) {
    canvas.height = 8192
    canvas.width = 8192 / ratio
  } else {
    canvas.width = Math.min((8192 / 2), cWidth * 2)
    canvas.height = Math.min((8192 * ratio / 2), cHeight * 2)
    //  Minimum size to be half of the high rez cersion
    if (Math.min(canvas.width, canvas.height) < 8192 / 2) {
      if (canvas.width < canvas.height) {
        canvas.height = 8192 / 2
        canvas.width = 8192 / 2 / ratio
      } else {
        canvas.width = 8192 / 2
        canvas.height = 8192 / 2 / ratio
      }
    }
  }

  canvas.style.position = 'absolute'
  canvas.style.width = `${cWidth}px`
  canvas.style.height = `${cHeight}px`
  canvas.style.left = `${(wWidth - cWidth) / 2}px`
  canvas.style.top = `${(wHeight - cHeight) / 2}px`

  //  And draw it!!
  drawCanvas()
}

const drawCanvas = async () => {
  //  Let the preloader know that we've hit this function at least once
  drawn = true
  //  Make sure there's only one nextFrame to be called
  window.cancelAnimationFrame(nextFrame)

  // Grab all the canvas stuff
  const canvas = document.getElementById('target')
  const ctx = canvas.getContext('2d')
  const w = canvas.width
  const h = canvas.height

  //  Draw the background
  if (features.backgroundColour === 'Special' || features.backgroundColour.includes('Gradient')) {
    const grd = ctx.createLinearGradient(0, 0, 0, canvas.height)
    if (features.backgroundColour.includes('Gradient')) {
      grd.addColorStop(1, features.palette[features.backgroundColour.replace(' Gradient', '')])
      grd.addColorStop(0, 'white')
    } else {
      if (features.backgroundSpecial > 0.75) {
        grd.addColorStop(1, 'black')
        grd.addColorStop(0, 'white')
        window.$fxhashFeatures.Background = '80s'
      }
      if (features.backgroundSpecial <= 0.75 && features.backgroundSpecial > 0.25) {
        grd.addColorStop(1, '#E4904E')
        grd.addColorStop(0.5, '#D3C7A5')
        grd.addColorStop(0, '#748D78')
        window.$fxhashFeatures.Background = 'World on Fire'
      }
      if (features.backgroundSpecial <= 0.25) {
        grd.addColorStop(1, '#91DEF7')
        grd.addColorStop(0, '#F690EC')
        window.$fxhashFeatures.Background = 'Summertime'
      }
    }
    ctx.fillStyle = grd
  } else {
    ctx.fillStyle = features.palette[features.backgroundColour]
  }
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  //  Set up our protective circles
  const protectiveCircles = []

  const scale = h / (features.hexes + 1)
  const hexShrink = 0.4
  const fineAdjust = 0.134

  //  Record all the lines used to make the messages
  const messageLines = []
  let hexIndex = -1
  for (let row = 1; row <= 6; row++) {
    for (let hex = 0; hex < features.hexes; hex++) {
      hexIndex++
      //  Only draw the hex if it's supposed to be shown
      if (features.hexagons[hexIndex].show) {
        //  If we are in the middle rows, don't draw the
        if ((row === 2 || row === 5) && (hex === features.hexes - 1)) continue
        //  If we are in the middle rows, don't draw the first hexagon, or the last hexagon
        if ((row === 3 || row === 4) && (hex === 0 || hex === features.hexes - 1)) continue
        let x = row * scale - scale / 4
        if (row > 3) x = w - (7 - row) * scale + scale / 4

        let y = hex * scale + scale / 2
        y += scale / 2
        if (row === 2 || row === 5) y += scale / 2

        //  Final adjustments to the x postion
        if (row === 2) x -= scale * fineAdjust
        if (row === 3) x -= scale * fineAdjust * 2
        if (row === 4) x += scale * fineAdjust * 2
        if (row === 5) x += scale * fineAdjust

        let hexSize = hexShrink
        if (features.hexagons[hexIndex].small) {
          hexSize *= 0.5
          if (row === 2) x -= scale * fineAdjust * 2
          if (row === 3) x -= scale * fineAdjust * 2 * 1.2
          if (row === 4) x += scale * fineAdjust * 2 * 1.2
          if (row === 5) x += scale * fineAdjust * 2
        }

        if (features.hexagons[hexIndex].glyph.length) {
          protectiveCircles.push({
            x,
            y,
            radius: hexSize * scale + w / 100
          })
        }

        for (const line of features.hexagons[hexIndex].glyph) {
          const newLine = []
          const px = line.points[0].x * (scale * hexSize) + x
          const py = line.points[0].y * (scale * hexSize) + y
          newLine.push({
            x: px,
            y: py
          })
          for (let p = 1; p < line.points.length; p++) {
            const px = line.points[p].x * (scale * hexSize) + x
            const py = line.points[p].y * (scale * hexSize) + y
            newLine.push({
              x: px,
              y: py
            })
          }
          messageLines.push(newLine)
          // ctx.stroke()
        }
      }
    }
  }

  //  Draw the line that the planets run down
  const gridLines = []
  const lineLength = h - (scale * 2)
  const lineTop = scale
  //  Now we are going to draw the lines with all the distortions
  for (let i = 0; i < 5; i++) {
    const newLine = []
    newLine.push({
      x: w / 2,
      y: lineTop
    })
    for (let percent = 0; percent <= 1; percent += 1 / 200) {
      const x = w / 2 + (w / 1000) * ((fxrand() - 0.5) * 2)
      const y = lineTop + lineLength * percent
      newLine.push({
        x,
        y
      })
    }
    gridLines.push(newLine)
  }

  const planetLine = lineLength - features.maxPlanetRadius * 2 * lineLength
  const planetTop = lineTop + features.maxPlanetRadius * lineLength

  //  Draw the planets
  const planetDivision = 200
  const planetLines = []
  for (const planet of features.planetPositions) {
    const planetRadius = Math.floor(planet.radius * planetLine / (h / planetDivision)) * (h / planetDivision) - (h / (planetDivision * 2))
    const planetX = w / 2
    const planetY = planetTop + planet.position * planetLine

    protectiveCircles.push({
      x: planetX,
      y: planetY,
      radius: planetRadius + w / 50
    })

    //  Now draw the lines
    for (let y = planetY - planetRadius; y <= planetY + planetRadius; y += h / planetDivision) {
      const planetPoints = []
      const drawWidth = Math.sqrt(planetRadius * planetRadius - (y - planetY) * (y - planetY))
      planetPoints.push({
        x: planetX - drawWidth,
        y: y - (w / 3000) * ((fxrand() - 0.5) * 2)
      })
      for (let x = planetX - drawWidth + w / planetDivision; x <= planetX + drawWidth; x += w / (planetDivision * 2)) {
        planetPoints.push({
          x,
          y: y - (w / 3000) * ((fxrand() - 0.5) * 2)
        })
      }
      planetLines.push(planetPoints)
    }
  }

  //  Work out the moons around the planets
  ctx.lineWidth = w / 400
  const moonLines = []
  for (const planet of features.planetPositions) {
    for (const moon of planet.moons) {
      //  The position of the moon is somewhere between the right edge of the planet radius
      //  and the alien writing on the right
      const planetRadius = Math.floor(planet.radius * planetLine / (h / planetDivision)) * (h / planetDivision) - (h / (planetDivision * 2))
      const planetX = w / 2
      const planetY = planetTop + planet.position * planetLine

      const moonLeft = planetX + planetRadius + (w / 20)
      const moonRight = w - (scale * 2.5)
      const moonX = ((moonRight - moonLeft) * moon) + moonLeft
      //  Calculate the radius for the ring now and add it to the rings.
      //  Mark is as a negative number so we know it's precalulated
      const ringRadius = moonX - planetX
      planet.rings.push(-ringRadius)

      let moonRadius = w / 80
      if (fxrand() < 0.8 && moon > 0 && moon < 1) moonRadius *= (fxrand() + 0.8)
      protectiveCircles.push({
        x: moonX,
        y: planetY,
        radius: moonRadius + w / 200
      })

      const moonLine = []
      //  Calculate the points by rotating the points around the middle
      for (let i = 0; i <= 360; i += 1) {
        const tinyOffset = (w / 1000) * ((fxrand() - 0.5) * 2)
        const x = moonX + Math.cos(i * Math.PI / 180) * (moonRadius + tinyOffset)
        const y = planetY + Math.sin(i * Math.PI / 180) * (moonRadius + tinyOffset)
        moonLine.push({
          x,
          y
        })
      }
      moonLines.push(moonLine)
    }
  }

  //  Work out the rings around the planets
  const orbitLines = []
  //  Do the whole thing three times
  for (let i = 0; i < 3; i++) {
    for (const planet of features.planetPositions) {
      for (const ring of planet.rings) {
        let ringRadius = (((ring * ((planet.radius * 6) - planet.radius)) + planet.radius) * planetLine) + w / 45
        //  If it's precaculated (as marked with a negative value, then ust use it)
        if (ring < 0) ringRadius = -ring
        const ringX = w / 2
        const ringY = planetTop + planet.position * planetLine

        //  Now calculate the points of a circle based on that ringRadius
        let started = false
        let thisLine = []
        for (let i = 0; i <= 360; i += 1) {
          const tinyOffset = (w / 1000) * ((fxrand() - 0.5) * 2)
          const x = ringX + Math.cos(i * Math.PI / 180) * (ringRadius + tinyOffset)
          const y = ringY + Math.sin(i * Math.PI / 180) * (ringRadius + tinyOffset)
          //  Loop through all the protected circles and see if we are inside one
          let insideCircle = false
          for (const circle of protectiveCircles) {
            if (Math.sqrt((x - circle.x) * (x - circle.x) + (y - circle.y) * (y - circle.y)) < circle.radius) {
              insideCircle = true
              break
            }
          }
          //  Nwo also check we aren't at the edges of the canvas
          if (x < w / 130) insideCircle = true
          if (x > w - (w / 130)) insideCircle = true
          if (y < w / 130) insideCircle = true
          if (y > h - (w / 130)) insideCircle = true

          //  If we aren't inside a circle, add the point to the line
          if (!insideCircle) {
            thisLine.push({
              x,
              y
            })
            if (!started) started = true
          } else {
            //  If we are inside a circle, add the line to the orbitLines and start a new line
            if (started) {
              if (thisLine.length) orbitLines.push(thisLine)
              thisLine = []
              started = false
            }
          }
        }
        //  If we have a line left over, add it to the orbitLines
        if (thisLine.length) orbitLines.push(thisLine)
      }
    }
  }
  //  This is where we draw all the things
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  //  Store the lines to be plotted later
  features.blackLines = []
  features.redLines = []

  //  Draw the messageLines
  ctx.lineWidth = w / 400
  ctx.strokeStyle = features.linePalette[features.lineColour]

  for (const line of messageLines) {
    ctx.beginPath()
    ctx.moveTo(line[0].x, line[0].y)
    for (let p = 1; p < line.length; p++) {
      ctx.lineTo(line[p].x, line[p].y)
    }
    ctx.stroke()
    if (line.length > 1) features.blackLines.push(line)
  }

  //  Draw the gridLines
  ctx.lineWidth = w / 400
  ctx.strokeStyle = features.linePalette[features.lineColour]
  for (const line of gridLines) {
    ctx.beginPath()
    ctx.moveTo(line[0].x, line[0].y)
    for (let p = 1; p < line.length; p++) {
      ctx.lineTo(line[p].x, line[p].y)
    }
    ctx.stroke()
    if (line.length > 1) features.blackLines.push(line)
  }

  //  Draw the planetLines
  ctx.lineWidth = w / 400
  ctx.strokeStyle = features.linePalette[features.lineColour]
  for (const line of planetLines) {
    ctx.beginPath()
    ctx.moveTo(line[0].x, line[0].y)
    for (let p = 1; p < line.length; p++) {
      ctx.lineTo(line[p].x, line[p].y)
    }
    ctx.stroke()
    if (line.length > 1) features.blackLines.push(line)
  }

  //  Draw the orbitLines
  ctx.lineWidth = w / 400
  ctx.strokeStyle = features.linePalette[features.lineColour]
  for (const line of orbitLines) {
    ctx.beginPath()
    ctx.moveTo(line[0].x, line[0].y)
    for (let p = 1; p < line.length; p++) {
      ctx.lineTo(line[p].x, line[p].y)
    }
    ctx.stroke()
    if (line.length > 1) features.blackLines.push(line)
  }

  //  Draw the moonLines
  ctx.lineWidth = w / 400
  ctx.strokeStyle = features.dotPalette[features.dotColour]
  for (const line of moonLines) {
    ctx.beginPath()
    ctx.moveTo(line[0].x, line[0].y)
    for (let p = 1; p < line.length; p++) {
      ctx.lineTo(line[p].x, line[p].y)
    }
    ctx.stroke()
    if (line.length > 1) features.redLines.push(line)
  }

  features.canvas = {
    width: w,
    height: h
  }

  //  Now do it all over again
  // nextFrame = window.requestAnimationFrame(drawCanvas)
  // await autoDownloadCanvas()
  // location.reload()
}

const autoDownloadCanvas = async (showHash = false) => {
  const element = document.createElement('a')
  element.setAttribute('download', `Map_${fxhash}`)
  element.style.display = 'none'
  document.body.appendChild(element)
  let imageBlob = null
  imageBlob = await new Promise(resolve => document.getElementById('target').toBlob(resolve, 'image/png'))
  element.setAttribute('href', window.URL.createObjectURL(imageBlob, {
    type: 'image/png'
  }))
  element.click()
  document.body.removeChild(element)
}

const PAPER = { // eslint-disable-line no-unused-vars
  A1: [59.4, 84.1],
  A2: [42.0, 59.4],
  A3: [29.7, 42.0],
  A4: [21.0, 29.7],
  A5: [14.8, 21.0],
  A6: [10.5, 14.8]
}

const downloadSVG = async size => {
  await wrapSVG(features.blackLines, PAPER[size], `Maps_blacklines_${size}_${fxhash}`)
  if (features.redLines.length) await wrapSVG(features.redLines, PAPER[size], `Maps_redlines_${size}_${fxhash}`)
}

const wrapSVG = async (lines, size, filename) => {
  let output = `<?xml version="1.0" standalone="no" ?>
  <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" 
      "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
      <svg version="1.1" id="lines" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
      x="0" y="0"
      viewBox="0 0 ${size[0]} ${size[1]}"
      width="${size[0]}cm"
      height="${size[1]}cm" 
      xml:space="preserve">`

  output += `
      <g>
      <path d="`
  lines.forEach(points => {
    output += `M ${points[0].x / features.canvas.width * size[0]} ${points[0].y / features.canvas.height * size[1]} `
    for (let p = 1; p < points.length; p++) {
      output += `L ${points[p].x / features.canvas.width * size[0]} ${points[p].y / features.canvas.height * size[1]} `
    }
  })
  output += `"  fill="none" stroke="black" stroke-width="0.05"/>
    </g>`
  output += '</svg>'

  const element = document.createElement('a')
  element.setAttribute('download', `${filename}.svg`)
  element.style.display = 'none'
  document.body.appendChild(element)
  element.setAttribute('href', window.URL.createObjectURL(new Blob([output], {
    type: 'text/plain;charset=utf-8'
  })))
  element.click()
  document.body.removeChild(element)
}

//  KEY PRESSED OF DOOM
document.addEventListener('keypress', async (e) => {
  e = e || window.event
  // Save
  if (e.key === 's') autoDownloadCanvas()

  //   Toggle highres mode
  if (e.key === 'h') {
    highRes = !highRes
    await layoutCanvas()
  }

  if (e.key === 'f') {
    full = !full
    await layoutCanvas()
  }

  if (e.key === '1') downloadSVG('A1')
  if (e.key === '2') downloadSVG('A2')
  if (e.key === '3') downloadSVG('A3')
  if (e.key === '4') downloadSVG('A4')
  if (e.key === '5') downloadSVG('A5')
  if (e.key === '6') downloadSVG('A6')
})
//  This preloads the images so we can get access to them
// eslint-disable-next-line no-unused-vars
const preloadImages = () => {
  //  If paper1 has loaded and we haven't draw anything yet, then kick it all off
  if (!imagesLoaded && !drawn) {
    imagesLoaded = true // eslint-disable-line no-global-assign
    init()
  }
}
