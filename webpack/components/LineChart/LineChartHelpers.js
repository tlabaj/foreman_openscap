/** Backend sends [label, values, color]; legacy Foreman charts used spread columns. */
import { chart_color_black_500 as chartColorBlack500 } from '@patternfly/react-tokens';

const getColumnValues = col => {
  if (Array.isArray(col[1])) return col[1];

  const values = col.slice(1);
  const last = values[values.length - 1];

  if (
    values.length > 1 &&
    (last == null || (typeof last === 'string' && last.startsWith('#')))
  ) {
    return values.slice(0, -1);
  }

  return values;
};

const getSeriesColor = col => {
  if (typeof col[2] === 'string' && col[2].startsWith('#')) {
    return col[2];
  }

  const last = col[col.length - 1];
  if (typeof last === 'string' && last.startsWith('#')) {
    return last;
  }

  return undefined;
};

const toMs = val => {
  const n = Number(val);
  return n >= 1e12 ? n : n * 1000;
};

/** Process raw backend data into chart series for PatternFly line charts. */
export const processChartData = (data, xAxisDataLabel, config) => {
  if (!data || data.length === 0) return null;

  if (config === 'timeseries') {
    const timeColumn = data.find(col => col[0] === xAxisDataLabel);
    if (!timeColumn) return null;

    const xValues = getColumnValues(timeColumn).map(t => toMs(t));

    const series = data
      .filter(col => col[0] !== xAxisDataLabel)
      .map(col => {
        const values = getColumnValues(col);
        return {
          name: col[0],
          color: getSeriesColor(col),
          data: values.map((value, index) => ({
            x: new Date(xValues[index]),
            y: value ?? 0,
            name: col[0],
          })),
        };
      });

    return series.length > 0 ? series : null;
  }

  const series = data.map(col => {
    const values = getColumnValues(col);
    return {
      name: col[0],
      color: getSeriesColor(col),
      data: values.map((value, index) => ({
        x: index + 1,
        y: value ?? 0,
        name: col[0],
      })),
    };
  });

  return series.some(s => s.data.length > 0) ? series : null;
};

export const hasChartData = (data, xAxisDataLabel) => {
  if (!data || data.length === 0) return false;

  return data
    .filter(col => col[0] !== xAxisDataLabel)
    .some(col =>
      getColumnValues(col).some(value => value !== 0 && value != null)
    );
};

export const getYTickValues = (chartData, hiddenSeries = new Set()) => {
  if (!chartData?.length) return undefined;

  let maxY = 0;
  chartData
    .filter(chartSeries => !hiddenSeries.has(chartSeries.name))
    .forEach(chartSeries => {
      chartSeries.data.forEach(point => {
        maxY = Math.max(maxY, point.y ?? 0);
      });
    });

  if (maxY <= 0) return [0, 0.5, 1.0];

  const step = Math.max(0.1, Math.ceil((maxY / 4) * 10) / 10);
  return [0, 1, 2, 3, 4, 5].map(i => Math.round(i * step * 10) / 10);
};

/** Rule counts are whole numbers; avoid decimal formatting in tooltips. */
export const formatTooltipValue = value => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '';
  if (Math.abs(num) >= 1e21) {
    return num.toExponential(1);
  }
  return String(Math.round(num));
};

export const sanitizeChartDimension = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** Prevent padding from exceeding chart size, which breaks Victory scale/range math. */
export const clampChartPadding = (padding, width, height) => {
  let { top = 0, bottom = 0, left = 0, right = 0 } = padding;

  const horizontalTotal = left + right;
  if (horizontalTotal >= width) {
    const scale = (width * 0.9) / horizontalTotal;
    left *= scale;
    right *= scale;
  }

  const verticalTotal = top + bottom;
  if (verticalTotal >= height) {
    const scale = (height * 0.9) / verticalTotal;
    top *= scale;
    bottom *= scale;
  }

  return { top, bottom, left, right };
};

/** Expand degenerate time domains so Victory can draw valid line paths. */
export const getTimeseriesXDomain = chartData => {
  if (!chartData?.[0]?.data?.length) return undefined;

  const times = chartData[0].data.map(point =>
    point.x instanceof Date ? point.x.getTime() : new Date(point.x).getTime()
  );
  const min = Math.min(...times);
  const max = Math.max(...times);

  if (min === max) {
    const offset = 12 * 60 * 60 * 1000;
    return [new Date(min - offset), new Date(max + offset)];
  }

  return undefined;
};

/** Legend swatches must use backend series colors, not the default PF theme scale. */
export const buildLineChartLegendData = (chartData, hiddenSeries) =>
  chartData.map(series => {
    const hidden = hiddenSeries.has(series.name);

    if (hidden) {
      return {
        childName: series.name,
        name: series.name,
        symbol: {
          type: 'eyeSlash',
          fill: chartColorBlack500.var,
        },
      };
    }

    return {
      childName: series.name,
      name: series.name,
      ...(series.color && {
        symbol: {
          type: 'square',
          fill: series.color,
        },
      }),
    };
  });
