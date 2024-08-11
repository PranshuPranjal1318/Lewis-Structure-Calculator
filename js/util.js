// Maximum distance for detecting atom clicks
const ATOM_CLICK_DISTANCE_THRESHOLD = 30;
// Minimum distance for detecting dragging
const DRAG_THRESHOLD = 10;
// Font size for atom labels and charges
const FONT_SIZE = 24;
// Size of the atom visual representation, relative to FONT_SIZE
const ATOM_SIZE = (40 / 36) * FONT_SIZE;
// Size of the electron visual representation, relative to ATOM_SIZE
const ELECTRON_SIZE = ATOM_SIZE / 8;

/**
 * Calculate the 2-norm (Euclidean distance) between two points
 * @param {number} x1 - X coordinate of the first point
 * @param {number} y1 - Y coordinate of the first point
 * @param {number} x2 - X coordinate of the second point
 * @param {number} y2 - Y coordinate of the second point
 * @return {number} - The distance between the two points
 */
function distance(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Draw a line between two points on the canvas
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
 * @param {number} x1 - X coordinate of the start point
 * @param {number} y1 - Y coordinate of the start point
 * @param {number} x2 - X coordinate of the end point
 * @param {number} y2 - Y coordinate of the end point
 */
function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath(); // Start a new path
  ctx.moveTo(x1, y1); // Move to the start point
  ctx.lineTo(x2, y2); // Draw a line to the end point
  ctx.stroke(); // Render the path
}

/**
 * Draw a circle with both stroke and fill on the canvas
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
 * @param {number} x - X coordinate of the circle's center
 * @param {number} y - Y coordinate of the circle's center
 * @param {number} r - Radius of the circle
 */
function circle(ctx, x, y, r) {
  ctx.beginPath(); // Start a new path
  ctx.arc(x, y, r, 0, 2 * Math.PI); // Draw a circle
  ctx.stroke(); // Render the outline of the circle
  ctx.fill(); // Fill the circle
}

/**
 * Create a deep copy of a given object using JSON methods
 * @param {*} x - The object to copy
 * @return {*} - A deep copy of the object
 */
function deepcopy(x) {
  return JSON.parse(JSON.stringify(x));
}

/**
 * Calculate the distance from a point to a line segment defined by two other points
 * @see https://stackoverflow.com/a/6853926/6079328
 * @param {number} x - X coordinate of the point
 * @param {number} y - Y coordinate of the point
 * @param {number} x1 - X coordinate of the first point defining the line segment
 * @param {number} y1 - Y coordinate of the first point defining the line segment
 * @param {number} x2 - X coordinate of the second point defining the line segment
 * @param {number} y2 - Y coordinate of the second point defining the line segment
 * @return {number} - The distance from the point to the line segment
 */
function pointLineDistance(x, y, x1, y1, x2, y2) {
  let A = x - x1;
  let B = y - y1;
  let C = x2 - x1;
  let D = y2 - y1;

  // Compute dot product and length squared of the line segment
  let dot = A * C + B * D;
  let len_sq = C * C + D * D;
  let param = -1;
  if (len_sq !== 0)
    // In case of zero length line
    param = dot / len_sq;

  // Calculate the nearest point on the line segment to the given point
  let xx, yy;
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  // Compute the distance from the given point to the nearest point on the line segment
  let dx = x - xx;
  let dy = y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}
