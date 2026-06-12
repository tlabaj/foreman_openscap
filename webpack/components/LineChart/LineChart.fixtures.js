export const data = [
  ['red', [5, 7, 9], '#AA4643'],
  ['green', [2, 4, 6], '#89A54E'],
];

const dates = [1557014400000, 1559779200000, 1562457600000];

export const timeseriesData = [
  ['Passed', [5, 7, 9], '#3f9c35'],
  ['Failed', [2, 4, 6], '#c9190b'],
  ['Othered', [1, 0, 2], '#f0ab00'],
  ['dates', dates, null],
];

export const emptyTimeseriesData = [
  ['Passed', [0, 0, 0], '#3f9c35'],
  ['Failed', [0, 0, 0], '#c9190b'],
  ['Othered', [0, 0, 0], '#f0ab00'],
  ['dates', dates, null],
];

/** Spread-column format used by some Foreman chart fixtures. */
export const spreadTimeseriesData = [
  ['Passed', 5, 7, 9, '#3f9c35'],
  ['Failed', 2, 4, 6, '#c9190b'],
  ['Othered', 1, 0, 2, '#f0ab00'],
  ['dates', ...dates, null],
];
