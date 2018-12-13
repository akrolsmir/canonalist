/** Draws vertical black lines to separate words */
function drawSeparators(ctx) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = new Uint8ClampedArray(imageData.data);
  for (let x = 0; x < canvas.width; x++) {
    const colors = [];
    const column = [];
    for (let y = 0; y < canvas.height; y++) {
      const color = getGrayscale(pixels, pair(x, y));
      colors.push(color);
      column.push(pair(x, y));
    }

    whitePixels = colors.map(c => c > 240).reduce((a, b) => a + b);
    whitePercent = whitePixels / canvas.height;
    if (whitePercent > 0.9) {
      paint(pixels, column, [0, 0, 0]);
    }

    imageData.data.set(pixels);
    ctx.putImageData(imageData, 0, 0);
  }
}

function pair(x, y) {
  return x + y * canvas.width;
}

function depair(p) {
  return [p % canvas.width, Math.floor(p / canvas.width)];
}

function getGrayscale(pixels, p) {
  const [red, green, blue] = getColor(pixels, p);
  return Math.floor((red + green + blue) / 3);
}

function getColor(pixels, p) {
  const red = pixels[p * 4];
  const green = pixels[p * 4 + 1];
  const blue = pixels[p * 4 + 2];
  return [red, green, blue];
}

/** Paints the specified pairs to be the color [r, g, b] */
function paint(pixels, pairs, color) {
  const [red, green, blue] = color;
  for (const pair of pairs) {
    pixels[pair * 4 + 0] = red;
    pixels[pair * 4 + 1] = green;
    pixels[pair * 4 + 2] = blue;
  }
}
