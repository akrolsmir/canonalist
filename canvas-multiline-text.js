/* Taken from https://gitlab.com/davideblasutto/canvas-multiline-text */

function drawMultilineText(ctx, text, opts) {
  // Default options
  if (!opts)
    opts = {}
  if (!opts.font)
    opts.font = 'sans-serif'
  if (typeof opts.stroke == 'undefined')
    opts.stroke = false
  if (typeof opts.verbose == 'undefined')
    opts.verbose = false
  if (!opts.rect)
    opts.rect = {
      x: 0,
      y: 0,
      width: ctx.canvas.width,
      height: ctx.canvas.height
    }
  if (!opts.lineHeight)
    opts.lineHeight = 1.1
  if (!opts.minFontSize)
    opts.minFontSize = 30
  if (!opts.maxFontSize)
    opts.maxFontSize = 100
  // Default log function is console.log - Note: if verbose il false, nothing will be logged anyway
  if (!opts.logFunction)
    opts.logFunction = function (message) { console.log(message) }


  const words = text.split(/\s/) // Split on whitespace
  if (opts.verbose) opts.logFunction('Text contains ' + words.length + ' words')
  var lines = []

  // Finds max font size  which can be used to print whole text in opts.rec
  for (var fontSize = opts.minFontSize; fontSize <= opts.maxFontSize; fontSize++) {

    // Line height
    var lineHeight = fontSize * opts.lineHeight

    // Set font for testing with measureText()
    ctx.font = " " + fontSize + "px " + opts.font

    // Start
    var x = opts.rect.x
    var y = opts.rect.y + fontSize // It's the bottom line of the letters
    lines = []
    var line = ""

    // Cycles on words
    for (var word of words) {
      // Add next word to line
      var linePlus = line + word + " "
      // If added word exceeds rect width...
      if (ctx.measureText(linePlus).width > (opts.rect.width)) {
        // ..."prints" (save) the line without last word
        // " + opts.rect.width / 2" is for center text alignment
        lines.push({ text: line, x: x + opts.rect.width / 2, y: y })
        // New line with ctx last word
        line = word + " "
        y += lineHeight
      } else {
        // ...continues appending words
        line = linePlus
      }
    }

    // "Print" (save) last line
    lines.push({ text: line, x: x + opts.rect.width / 2, y: y})

    // If bottom of rect is reached then breaks "fontSize" cycle
    if (y > opts.rect.height)
      break

  }

  if (opts.verbose) opts.logFunction("Font used: " + ctx.font)

  // Print lines
  for (var line of lines)
    // Fill or stroke
    if (opts.stroke)
      ctx.strokeText(line.text.trim(), line.x, line.y)
    else
      ctx.fillText(line.text.trim(), line.x, line.y)

  // Returns font size
  return fontSize

}
