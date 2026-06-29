import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import {
  formatAxisTick,
  formatTooltipTitle,
  getXAxisTickValues,
} from 'foremanReact/components/common/charts/helpers/LegendHelpers';

import LineChart from './index';
import {
  data,
  timeseriesData,
  emptyTimeseriesData,
  spreadTimeseriesData,
} from './LineChart.fixtures';
import {
  processChartData,
  hasChartData,
  sanitizeChartDimension,
  clampChartPadding,
  getTimeseriesXDomain,
  buildLineChartLegendData,
  formatTooltipValue,
} from './LineChartHelpers';

jest.unmock('./');

const chartSize = { width: 800, height: 350 };

describe('hasChartData', () => {
  it('returns false when all series values are zero', () => {
    expect(hasChartData(emptyTimeseriesData, 'dates')).toBe(false);
  });

  it('returns true when any series has a non-zero value', () => {
    expect(hasChartData(timeseriesData, 'dates')).toBe(true);
  });
});

describe('chart layout helpers', () => {
  it('sanitizes invalid chart dimensions', () => {
    expect(sanitizeChartDimension(Infinity, 350)).toBe(350);
    expect(sanitizeChartDimension(NaN, 800)).toBe(800);
    expect(sanitizeChartDimension(500, 800)).toBe(500);
  });

  it('clamps padding when it exceeds chart size', () => {
    const padding = clampChartPadding(
      { top: 50, bottom: 125, left: 300, right: 170 },
      400,
      350
    );

    expect(padding.left + padding.right).toBeLessThan(400);
    expect(padding.top + padding.bottom).toBeLessThan(350);
  });

  it('expands degenerate timeseries x domains', () => {
    const singlePointData = [
      ['Passed', [5], '#3f9c35'],
      ['dates', [1557014400000], null],
    ];
    const chartData = processChartData(singlePointData, 'dates', 'timeseries');
    const domain = getTimeseriesXDomain(chartData);

    expect(domain).toHaveLength(2);
    expect(domain[0].getTime()).toBeLessThan(domain[1].getTime());
  });
});

describe('buildLineChartLegendData', () => {
  it('uses backend series colors for visible legend symbols', () => {
    const chartData = processChartData(timeseriesData, 'dates', 'timeseries');
    const legendData = buildLineChartLegendData(chartData, new Set());

    expect(legendData).toEqual([
      {
        childName: 'Passed',
        name: 'Passed',
        symbol: { type: 'square', fill: '#3f9c35' },
      },
      {
        childName: 'Failed',
        name: 'Failed',
        symbol: { type: 'square', fill: '#c9190b' },
      },
      {
        childName: 'Othered',
        name: 'Othered',
        symbol: { type: 'square', fill: '#f0ab00' },
      },
    ]);
  });

  it('uses eyeSlash symbol for hidden series', () => {
    const chartData = processChartData(timeseriesData, 'dates', 'timeseries');
    const legendData = buildLineChartLegendData(chartData, new Set(['Failed']));

    expect(legendData[1]).toMatchObject({
      childName: 'Failed',
      name: 'Failed',
      symbol: { type: 'eyeSlash' },
    });
    expect(legendData[1].symbol.fill).toBeDefined();
  });
});

describe('formatTooltipValue', () => {
  it('formats rule counts as whole numbers', () => {
    expect(formatTooltipValue(10)).toBe('10');
    expect(formatTooltipValue(10.0)).toBe('10');
    expect(formatTooltipValue(0)).toBe('0');
  });

  it('rounds non-integer values', () => {
    expect(formatTooltipValue(6.7)).toBe('7');
  });
});

describe('LineChart', () => {
  it('renders chart with regular data', () => {
    const { container } = render(
      <LineChart data={data} config="regular" size={chartSize} />
    );

    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders chart with timeseries data', () => {
    const { container } = render(
      <LineChart
        data={timeseriesData}
        config="timeseries"
        xAxisDataLabel="dates"
        size={chartSize}
      />
    );

    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders chart with spread-column timeseries data', () => {
    const { container } = render(
      <LineChart
        data={spreadTimeseriesData}
        config="timeseries"
        xAxisDataLabel="dates"
        size={chartSize}
      />
    );

    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders empty state when no data provided', () => {
    const { container } = render(<LineChart data={null} />);

    expect(screen.getByText('No data available')).toBeInTheDocument();
    expect(
      container.querySelector('.line-chart-container')
    ).not.toBeInTheDocument();
  });

  it('renders empty state when all values are zero', () => {
    const { container } = render(
      <LineChart
        data={emptyTimeseriesData}
        config="timeseries"
        xAxisDataLabel="dates"
      />
    );

    expect(screen.getByText('No data available')).toBeInTheDocument();
    expect(
      container.querySelector('.line-chart-container')
    ).not.toBeInTheDocument();
  });

  it('displays custom noDataMsg', () => {
    const customMsg = 'Custom no data message';
    render(<LineChart data={null} noDataMsg={customMsg} />);

    expect(screen.getByText(customMsg)).toBeInTheDocument();
  });

  it('renders legend items for each series', () => {
    const { container } = render(
      <LineChart
        data={timeseriesData}
        config="timeseries"
        xAxisDataLabel="dates"
        size={chartSize}
      />
    );

    expect(container.textContent).toContain('Passed');
    expect(container.textContent).toContain('Failed');
    expect(container.textContent).toContain('Othered');
  });

  it('legend items are interactive (button role for accessibility)', () => {
    render(
      <LineChart
        data={timeseriesData}
        config="timeseries"
        xAxisDataLabel="dates"
        size={chartSize}
      />
    );

    expect(
      screen.getAllByRole('button', { name: 'Passed' }).length
    ).toBeGreaterThan(0);
  });

  it('clicking legend toggles series visibility', () => {
    const { container } = render(
      <LineChart
        data={timeseriesData}
        config="timeseries"
        xAxisDataLabel="dates"
        size={chartSize}
      />
    );

    const labels = container.querySelectorAll('.chart-legend-label');
    expect(labels.length).toBeGreaterThan(0);

    const firstLabel = labels[0];
    expect(firstLabel).toHaveAttribute('data-hidden', 'false');

    fireEvent.click(firstLabel);
    expect(firstLabel).toHaveAttribute('data-hidden', 'true');

    fireEvent.click(firstLabel);
    expect(firstLabel).toHaveAttribute('data-hidden', 'false');
  });

  it('formats tooltip title for timeseries data points', () => {
    const chartData = processChartData(timeseriesData, 'dates', 'timeseries');
    const title = formatTooltipTitle(chartData[0].data[0]);

    expect(title).toMatch(/\d/);
    expect(title).toContain(',');
  });

  it('does not show duplicate x-axis labels when multiple data points fall within the same minute', () => {
    const denseData = [
      ['Passed', [1, 2, 3], '#3f9c35'],
      ['Failed', [1, 2, 3], '#c9190b'],
      ['dates', [1614449768000, 1614449769000, 1614451500000], null],
    ];
    const chartData = processChartData(denseData, 'dates', 'timeseries');
    const tickValues = getXAxisTickValues(chartData, 6);

    expect(tickValues).toBeDefined();
    expect(tickValues.length).toBeGreaterThan(0);

    const formattedLabels = tickValues.map(t => formatAxisTick(t));
    const uniqueLabels = [...new Set(formattedLabels)];

    expect(formattedLabels).toHaveLength(uniqueLabels.length);
  });
});
