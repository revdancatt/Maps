/* global imagesLoaded fxhash fxrand page Line */

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
  console.log('features:')
  console.table(features)
}

//  Call the above make features, so we'll have the window.$fxhashFeatures available
//  for fxhash
makeFeatures()
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
    canvas.height = Math.min((8192 / ratio / 2), cHeight * 2)
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
  ctx.fillStyle = '#EEE'
  ctx.fillRect(0, 0, w, h)

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

    //  Draw the messageLines
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.lineWidth = w / 400
    ctx.strokeStyle = '#000'
    for (const line of messageLines) {
      console.log(line)
      ctx.beginPath()
      ctx.moveTo(line[0].x, line[0].y)
      for (let p = 1; p < line.length; p++) {
        ctx.lineTo(line[p].x, line[p].y)
      }
      ctx.stroke()
    }
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
