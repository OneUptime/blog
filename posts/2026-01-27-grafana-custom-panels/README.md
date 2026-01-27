# How to Build Custom Grafana Panels

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Panel Plugins, TypeScript, React, Observability, Data Visualization, Frontend Development

Description: A comprehensive guide to building custom Grafana panel plugins using TypeScript and React, covering plugin architecture, data handling, options editors, and deployment.

---

> Custom panels let you visualize data in ways that standard Grafana panels cannot. Whether you need a specialized chart, a custom table format, or an entirely new visualization type, building your own panel plugin gives you complete control over how your data is displayed.

## Understanding Panel Plugin Architecture

Grafana panels are React components that receive data from configured data sources and render visualizations. The plugin system provides a well-defined interface for integrating custom panels into the Grafana ecosystem.

### Plugin Structure

A typical panel plugin project follows this structure:

```
my-panel-plugin/
├── src/
│   ├── module.ts           # Plugin entry point
│   ├── SimplePanel.tsx     # Main panel component
│   ├── SimpleEditor.tsx    # Options editor component
│   └── types.ts            # TypeScript interfaces
├── plugin.json             # Plugin metadata
├── package.json
├── tsconfig.json
└── webpack.config.ts
```

### Key Concepts

| Concept | Description |
|---------|-------------|
| Panel | The React component that renders the visualization |
| PanelProps | Props passed to your panel including data, options, and dimensions |
| Options | User-configurable settings for your panel |
| Field Config | Per-field configuration (colors, thresholds, etc.) |
| Data Frame | Grafana's standard data structure for query results |

## Creating a Panel Plugin

### Setting Up the Development Environment

First, install the Grafana plugin development tools and scaffold a new panel plugin:

```bash
# Install the Grafana create-plugin tool
npm install -g @grafana/create-plugin

# Create a new panel plugin
npx @grafana/create-plugin@latest

# Follow the prompts:
# - Select "panel" as the plugin type
# - Enter your plugin name (e.g., "custom-chart-panel")
# - Choose your organization name

# Navigate to the plugin directory
cd custom-chart-panel

# Install dependencies
npm install

# Start development server
npm run dev
```

### Plugin Metadata (plugin.json)

The `plugin.json` file defines your plugin's metadata:

```json
{
  "$schema": "https://raw.githubusercontent.com/grafana/grafana/main/docs/sources/developers/plugins/plugin.schema.json",
  "type": "panel",
  "name": "Custom Chart Panel",
  "id": "myorg-customchart-panel",
  "info": {
    "description": "A custom chart panel for specialized visualizations",
    "author": {
      "name": "My Organization",
      "url": "https://myorg.com"
    },
    "keywords": ["chart", "visualization", "custom"],
    "version": "1.0.0",
    "updated": "2026-01-27"
  },
  "dependencies": {
    "grafanaDependency": ">=10.0.0",
    "plugins": []
  }
}
```

### Module Entry Point (module.ts)

The module file registers your plugin with Grafana:

```typescript
// src/module.ts

import { PanelPlugin } from '@grafana/data';
import { SimplePanel } from './SimplePanel';
import { SimpleOptions } from './types';

/**
 * PanelPlugin is the entry point for panel plugins.
 * It registers the panel component and options editor.
 */
export const plugin = new PanelPlugin<SimpleOptions>(SimplePanel)
  // Set default options for new panel instances
  .setPanelOptions((builder) => {
    return builder
      // Add a text input option
      .addTextInput({
        path: 'title',
        name: 'Chart Title',
        description: 'The title displayed above the chart',
        defaultValue: 'My Chart',
      })
      // Add a boolean toggle option
      .addBooleanSwitch({
        path: 'showLegend',
        name: 'Show Legend',
        description: 'Toggle legend visibility',
        defaultValue: true,
      })
      // Add a select dropdown option
      .addSelect({
        path: 'chartType',
        name: 'Chart Type',
        description: 'Select the visualization type',
        defaultValue: 'bar',
        settings: {
          options: [
            { value: 'bar', label: 'Bar Chart' },
            { value: 'line', label: 'Line Chart' },
            { value: 'pie', label: 'Pie Chart' },
          ],
        },
      })
      // Add a color picker option
      .addColorPicker({
        path: 'primaryColor',
        name: 'Primary Color',
        description: 'Main color for the chart',
        defaultValue: '#5794F2',
      })
      // Add a numeric slider option
      .addSliderInput({
        path: 'opacity',
        name: 'Opacity',
        description: 'Chart element opacity',
        defaultValue: 80,
        settings: {
          min: 0,
          max: 100,
          step: 5,
        },
      });
  });
```

## Using @grafana/ui Components

Grafana provides a comprehensive UI component library. Use these components to ensure your panel matches Grafana's look and feel.

### Type Definitions (types.ts)

```typescript
// src/types.ts

/**
 * SimpleOptions defines the configurable options for the panel.
 * These are exposed in the panel editor sidebar.
 */
export interface SimpleOptions {
  // Display title for the chart
  title: string;
  // Whether to show the legend
  showLegend: boolean;
  // Type of chart to render
  chartType: 'bar' | 'line' | 'pie';
  // Primary color for chart elements
  primaryColor: string;
  // Opacity percentage (0-100)
  opacity: number;
}

/**
 * ChartDataPoint represents a single data point in the chart.
 */
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

/**
 * ChartSeries represents a series of data points.
 */
export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
}
```

### Main Panel Component (SimplePanel.tsx)

```typescript
// src/SimplePanel.tsx

import React, { useMemo } from 'react';
import { PanelProps, FieldType, getDisplayProcessor } from '@grafana/data';
import { useTheme2, useStyles2 } from '@grafana/ui';
import { css, cx } from '@emotion/css';
import { SimpleOptions, ChartDataPoint } from './types';

// Define the props type using Grafana's PanelProps generic
type Props = PanelProps<SimpleOptions>;

/**
 * SimplePanel is the main component that renders the visualization.
 * It receives data, options, and dimensions from Grafana.
 */
export const SimplePanel: React.FC<Props> = ({
  options,
  data,
  width,
  height,
  fieldConfig,
  timeRange,
}) => {
  // Access the current Grafana theme (light/dark mode aware)
  const theme = useTheme2();
  // Get styled classes using the theme
  const styles = useStyles2(getStyles);

  /**
   * Transform Grafana data frames into chart-ready data points.
   * This memoized computation runs only when data changes.
   */
  const chartData = useMemo((): ChartDataPoint[] => {
    // Handle empty data case
    if (!data.series || data.series.length === 0) {
      return [];
    }

    const frame = data.series[0];
    const points: ChartDataPoint[] = [];

    // Find the first string field for labels
    const labelField = frame.fields.find(
      (field) => field.type === FieldType.string
    );

    // Find the first numeric field for values
    const valueField = frame.fields.find(
      (field) => field.type === FieldType.number
    );

    if (!labelField || !valueField) {
      return [];
    }

    // Get display processor for formatting values
    const displayProcessor = getDisplayProcessor({
      field: valueField,
      theme,
    });

    // Build chart data points from the data frame
    for (let i = 0; i < frame.length; i++) {
      const label = labelField.values[i];
      const value = valueField.values[i];
      const display = displayProcessor(value);

      points.push({
        label: String(label),
        value: typeof value === 'number' ? value : 0,
        color: display.color,
      });
    }

    return points;
  }, [data.series, theme]);

  // Calculate the maximum value for scaling
  const maxValue = useMemo(() => {
    if (chartData.length === 0) return 0;
    return Math.max(...chartData.map((d) => d.value));
  }, [chartData]);

  // Render empty state when no data is available
  if (chartData.length === 0) {
    return (
      <div className={styles.wrapper} style={{ width, height }}>
        <div className={styles.emptyState}>
          <p>No data available</p>
          <p className={styles.hint}>
            Configure a data source query to see your visualization
          </p>
        </div>
      </div>
    );
  }

  // Render the bar chart visualization
  return (
    <div className={styles.wrapper} style={{ width, height }}>
      {/* Chart title */}
      {options.title && (
        <h3 className={styles.title}>{options.title}</h3>
      )}

      {/* Chart container */}
      <div className={styles.chartContainer}>
        {/* Render bars for bar chart type */}
        {options.chartType === 'bar' && (
          <div className={styles.barChart}>
            {chartData.map((point, index) => {
              // Calculate bar height as percentage of max value
              const barHeight = maxValue > 0
                ? (point.value / maxValue) * 100
                : 0;

              return (
                <div key={index} className={styles.barWrapper}>
                  {/* The actual bar element */}
                  <div
                    className={styles.bar}
                    style={{
                      height: `${barHeight}%`,
                      backgroundColor: point.color || options.primaryColor,
                      opacity: options.opacity / 100,
                    }}
                    title={`${point.label}: ${point.value}`}
                  />
                  {/* Bar label */}
                  <span className={styles.barLabel}>{point.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Render line chart type */}
        {options.chartType === 'line' && (
          <svg
            className={styles.lineChart}
            viewBox={`0 0 ${chartData.length * 50} 100`}
            preserveAspectRatio="none"
          >
            {/* Draw the line path */}
            <polyline
              fill="none"
              stroke={options.primaryColor}
              strokeWidth="2"
              strokeOpacity={options.opacity / 100}
              points={chartData
                .map((point, i) => {
                  const x = i * 50 + 25;
                  const y = maxValue > 0
                    ? 100 - (point.value / maxValue) * 90
                    : 50;
                  return `${x},${y}`;
                })
                .join(' ')}
            />
            {/* Draw data points */}
            {chartData.map((point, i) => {
              const x = i * 50 + 25;
              const y = maxValue > 0
                ? 100 - (point.value / maxValue) * 90
                : 50;
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="4"
                  fill={point.color || options.primaryColor}
                  opacity={options.opacity / 100}
                >
                  <title>{`${point.label}: ${point.value}`}</title>
                </circle>
              );
            })}
          </svg>
        )}
      </div>

      {/* Legend section */}
      {options.showLegend && (
        <div className={styles.legend}>
          {chartData.map((point, index) => (
            <div key={index} className={styles.legendItem}>
              <span
                className={styles.legendColor}
                style={{
                  backgroundColor: point.color || options.primaryColor,
                }}
              />
              <span className={styles.legendLabel}>
                {point.label}: {point.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * getStyles returns CSS styles using Emotion's css function.
 * The theme parameter enables theme-aware styling.
 */
const getStyles = (theme: any) => ({
  wrapper: css`
    display: flex;
    flex-direction: column;
    padding: ${theme.spacing(1)};
    overflow: hidden;
  `,
  title: css`
    margin: 0 0 ${theme.spacing(1)} 0;
    font-size: ${theme.typography.h5.fontSize};
    color: ${theme.colors.text.primary};
    text-align: center;
  `,
  chartContainer: css`
    flex: 1;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    min-height: 0;
  `,
  barChart: css`
    display: flex;
    align-items: flex-end;
    justify-content: space-around;
    height: 100%;
    width: 100%;
    gap: ${theme.spacing(0.5)};
  `,
  barWrapper: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
    height: 100%;
    max-width: 60px;
  `,
  bar: css`
    width: 100%;
    border-radius: ${theme.shape.borderRadius(1)} ${theme.shape.borderRadius(1)} 0 0;
    transition: height 0.3s ease;
    cursor: pointer;

    &:hover {
      filter: brightness(1.1);
    }
  `,
  barLabel: css`
    font-size: ${theme.typography.bodySmall.fontSize};
    color: ${theme.colors.text.secondary};
    margin-top: ${theme.spacing(0.5)};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  `,
  lineChart: css`
    width: 100%;
    height: 100%;
  `,
  legend: css`
    display: flex;
    flex-wrap: wrap;
    gap: ${theme.spacing(1)};
    margin-top: ${theme.spacing(1)};
    justify-content: center;
  `,
  legendItem: css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing(0.5)};
  `,
  legendColor: css`
    width: 12px;
    height: 12px;
    border-radius: 2px;
  `,
  legendLabel: css`
    font-size: ${theme.typography.bodySmall.fontSize};
    color: ${theme.colors.text.secondary};
  `,
  emptyState: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: ${theme.colors.text.secondary};
  `,
  hint: css`
    font-size: ${theme.typography.bodySmall.fontSize};
    opacity: 0.7;
  `,
});
```

## Data Handling

Understanding how to work with Grafana's data structures is essential for building effective panels.

### Working with Data Frames

```typescript
// src/utils/dataUtils.ts

import {
  DataFrame,
  Field,
  FieldType,
  PanelData,
  getFieldDisplayName,
} from '@grafana/data';

/**
 * Extracts time series data from Grafana data frames.
 * Handles multiple series and time fields.
 */
export function extractTimeSeriesData(data: PanelData): TimeSeriesData[] {
  const result: TimeSeriesData[] = [];

  for (const frame of data.series) {
    // Find the time field in this frame
    const timeField = frame.fields.find(
      (f) => f.type === FieldType.time
    );

    if (!timeField) {
      continue;
    }

    // Process each numeric field as a separate series
    for (const field of frame.fields) {
      if (field.type !== FieldType.number) {
        continue;
      }

      const seriesName = getFieldDisplayName(field, frame);
      const points: TimeSeriesPoint[] = [];

      // Build array of time-value pairs
      for (let i = 0; i < frame.length; i++) {
        points.push({
          time: timeField.values[i] as number,
          value: field.values[i] as number,
        });
      }

      result.push({
        name: seriesName,
        points,
        // Preserve field configuration for styling
        config: field.config,
      });
    }
  }

  return result;
}

/**
 * Aggregates data by a specific field (useful for pie charts, etc.)
 */
export function aggregateByField(
  frame: DataFrame,
  labelFieldName: string,
  valueFieldName: string
): Map<string, number> {
  const aggregated = new Map<string, number>();

  const labelField = frame.fields.find((f) => f.name === labelFieldName);
  const valueField = frame.fields.find((f) => f.name === valueFieldName);

  if (!labelField || !valueField) {
    return aggregated;
  }

  for (let i = 0; i < frame.length; i++) {
    const label = String(labelField.values[i]);
    const value = Number(valueField.values[i]) || 0;

    const current = aggregated.get(label) || 0;
    aggregated.set(label, current + value);
  }

  return aggregated;
}

// Type definitions for time series data
interface TimeSeriesPoint {
  time: number;
  value: number;
}

interface TimeSeriesData {
  name: string;
  points: TimeSeriesPoint[];
  config: any;
}
```

### Handling Field Configuration

```typescript
// src/utils/fieldConfigUtils.ts

import {
  Field,
  FieldConfig,
  ThresholdsMode,
  getColorForTheme,
} from '@grafana/data';
import { GrafanaTheme2 } from '@grafana/data';

/**
 * Gets the appropriate color for a value based on field thresholds.
 * Returns the primary color if no thresholds are configured.
 */
export function getColorForValue(
  value: number,
  field: Field,
  theme: GrafanaTheme2,
  fallbackColor: string
): string {
  const config = field.config;

  // If no thresholds configured, use fallback
  if (!config.thresholds || !config.thresholds.steps) {
    return fallbackColor;
  }

  const thresholds = config.thresholds;
  const steps = thresholds.steps;

  // Handle percentage mode by converting value to percentage
  let effectiveValue = value;
  if (thresholds.mode === ThresholdsMode.Percentage) {
    const { min = 0, max = 100 } = config;
    effectiveValue = ((value - min) / (max - min)) * 100;
  }

  // Find the matching threshold step
  let matchedStep = steps[0];
  for (const step of steps) {
    if (step.value <= effectiveValue) {
      matchedStep = step;
    }
  }

  // Convert the threshold color to the actual color value
  return getColorForTheme(matchedStep.color, theme);
}

/**
 * Formats a value according to field configuration (unit, decimals, etc.)
 */
export function formatFieldValue(
  value: number,
  field: Field,
  theme: GrafanaTheme2
): string {
  const config = field.config;

  // Apply decimals configuration
  const decimals = config.decimals ?? 2;
  let formatted = value.toFixed(decimals);

  // Apply unit suffix if configured
  if (config.unit) {
    formatted = `${formatted} ${config.unit}`;
  }

  return formatted;
}
```

## Options Editor

For complex configuration needs, you can create a custom options editor component.

### Custom Editor Component

```typescript
// src/components/CustomEditor.tsx

import React, { useState, useCallback } from 'react';
import {
  StandardEditorProps,
  FieldConfigEditorProps,
} from '@grafana/data';
import {
  Input,
  Button,
  IconButton,
  useStyles2,
  VerticalGroup,
  HorizontalGroup,
  InlineField,
  InlineFieldRow,
} from '@grafana/ui';
import { css } from '@emotion/css';

// Define the shape of our custom option
interface ThresholdConfig {
  value: number;
  color: string;
  label: string;
}

interface CustomThresholdsEditorProps {
  value: ThresholdConfig[];
  onChange: (value: ThresholdConfig[]) => void;
}

/**
 * CustomThresholdsEditor provides a UI for configuring
 * multiple threshold values with colors and labels.
 */
export const CustomThresholdsEditor: React.FC<
  StandardEditorProps<ThresholdConfig[]>
> = ({ value = [], onChange }) => {
  const styles = useStyles2(getEditorStyles);

  // Add a new threshold entry
  const handleAdd = useCallback(() => {
    const newThreshold: ThresholdConfig = {
      value: 0,
      color: '#FF0000',
      label: 'New Threshold',
    };
    onChange([...value, newThreshold]);
  }, [value, onChange]);

  // Remove a threshold by index
  const handleRemove = useCallback(
    (index: number) => {
      const updated = value.filter((_, i) => i !== index);
      onChange(updated);
    },
    [value, onChange]
  );

  // Update a specific threshold property
  const handleUpdate = useCallback(
    (index: number, field: keyof ThresholdConfig, newValue: any) => {
      const updated = value.map((item, i) =>
        i === index ? { ...item, [field]: newValue } : item
      );
      onChange(updated);
    },
    [value, onChange]
  );

  return (
    <div className={styles.container}>
      <VerticalGroup spacing="sm">
        {/* Render each threshold configuration */}
        {value.map((threshold, index) => (
          <div key={index} className={styles.thresholdRow}>
            <InlineFieldRow>
              {/* Value input */}
              <InlineField label="Value" labelWidth={8}>
                <Input
                  type="number"
                  value={threshold.value}
                  onChange={(e) =>
                    handleUpdate(index, 'value', parseFloat(e.currentTarget.value))
                  }
                  width={12}
                />
              </InlineField>

              {/* Color picker */}
              <InlineField label="Color" labelWidth={8}>
                <input
                  type="color"
                  value={threshold.color}
                  onChange={(e) =>
                    handleUpdate(index, 'color', e.target.value)
                  }
                  className={styles.colorInput}
                />
              </InlineField>

              {/* Label input */}
              <InlineField label="Label" labelWidth={8}>
                <Input
                  value={threshold.label}
                  onChange={(e) =>
                    handleUpdate(index, 'label', e.currentTarget.value)
                  }
                  width={16}
                />
              </InlineField>

              {/* Remove button */}
              <IconButton
                name="trash-alt"
                onClick={() => handleRemove(index)}
                tooltip="Remove threshold"
              />
            </InlineFieldRow>
          </div>
        ))}

        {/* Add button */}
        <Button
          icon="plus"
          variant="secondary"
          size="sm"
          onClick={handleAdd}
        >
          Add Threshold
        </Button>
      </VerticalGroup>
    </div>
  );
};

// Styles for the editor component
const getEditorStyles = (theme: any) => ({
  container: css`
    padding: ${theme.spacing(1)};
  `,
  thresholdRow: css`
    padding: ${theme.spacing(0.5)};
    border: 1px solid ${theme.colors.border.weak};
    border-radius: ${theme.shape.borderRadius(1)};
    margin-bottom: ${theme.spacing(0.5)};
  `,
  colorInput: css`
    width: 50px;
    height: 32px;
    padding: 2px;
    border: 1px solid ${theme.colors.border.medium};
    border-radius: ${theme.shape.borderRadius(1)};
    cursor: pointer;
  `,
});
```

### Registering the Custom Editor

```typescript
// src/module.ts (updated)

import { PanelPlugin } from '@grafana/data';
import { SimplePanel } from './SimplePanel';
import { SimpleOptions } from './types';
import { CustomThresholdsEditor } from './components/CustomEditor';

export const plugin = new PanelPlugin<SimpleOptions>(SimplePanel)
  .setPanelOptions((builder) => {
    return builder
      // ... other options ...

      // Register custom editor for complex options
      .addCustomEditor({
        id: 'customThresholds',
        path: 'customThresholds',
        name: 'Custom Thresholds',
        description: 'Configure custom threshold levels',
        // Use our custom editor component
        editor: CustomThresholdsEditor,
        // Default value when panel is created
        defaultValue: [],
        // Category in the editor sidebar
        category: ['Thresholds'],
      });
  })
  // Use standard field config options (color, thresholds, etc.)
  .useFieldConfig({
    standardOptions: {
      color: {},
      thresholds: {},
      unit: {},
      decimals: {},
      min: {},
      max: {},
    },
  });
```

## Building and Signing

### Development Build

```bash
# Start development mode with hot reload
npm run dev

# The plugin will be built to dist/ and watched for changes
# Make sure your Grafana instance is configured to load plugins from this path
```

### Production Build

```bash
# Create optimized production build
npm run build

# The dist/ folder contains your production-ready plugin
```

### Plugin Signing

For distributing plugins outside of development, Grafana requires plugins to be signed.

```bash
# Install the Grafana plugin signing tool
npm install -g @grafana/sign-plugin

# Sign your plugin (requires Grafana Cloud account)
npx @grafana/sign-plugin@latest

# For private plugins, you can use a private signature
# Configure in grafana.ini:
# [plugins]
# allow_loading_unsigned_plugins = myorg-customchart-panel
```

### Testing Your Plugin

```typescript
// src/SimplePanel.test.tsx

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SimplePanel } from './SimplePanel';
import { LoadingState, toDataFrame } from '@grafana/data';

// Mock the Grafana hooks
jest.mock('@grafana/ui', () => ({
  ...jest.requireActual('@grafana/ui'),
  useTheme2: () => ({
    colors: {
      text: { primary: '#000', secondary: '#666' },
      border: { weak: '#ccc', medium: '#999' },
    },
    spacing: (n: number) => `${n * 8}px`,
    typography: {
      h5: { fontSize: '14px' },
      bodySmall: { fontSize: '12px' },
    },
    shape: { borderRadius: (n: number) => `${n * 2}px` },
  }),
  useStyles2: (fn: any) => fn({
    colors: {
      text: { primary: '#000', secondary: '#666' },
      border: { weak: '#ccc', medium: '#999' },
    },
    spacing: (n: number) => `${n * 8}px`,
    typography: {
      h5: { fontSize: '14px' },
      bodySmall: { fontSize: '12px' },
    },
    shape: { borderRadius: (n: number) => `${n * 2}px` },
  }),
}));

describe('SimplePanel', () => {
  const defaultProps = {
    options: {
      title: 'Test Chart',
      showLegend: true,
      chartType: 'bar' as const,
      primaryColor: '#5794F2',
      opacity: 80,
    },
    data: {
      state: LoadingState.Done,
      series: [
        toDataFrame({
          fields: [
            { name: 'label', values: ['A', 'B', 'C'] },
            { name: 'value', values: [10, 20, 30] },
          ],
        }),
      ],
      timeRange: {} as any,
    },
    width: 400,
    height: 300,
    fieldConfig: { defaults: {}, overrides: [] },
    timeRange: {} as any,
    timeZone: 'browser',
    renderCounter: 0,
    transparent: false,
    replaceVariables: (s: string) => s,
    onOptionsChange: jest.fn(),
    onFieldConfigChange: jest.fn(),
    onChangeTimeRange: jest.fn(),
    eventBus: {} as any,
    id: 1,
    title: 'Test',
  };

  it('renders the chart title', () => {
    render(<SimplePanel {...defaultProps} />);
    expect(screen.getByText('Test Chart')).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    const propsWithNoData = {
      ...defaultProps,
      data: {
        ...defaultProps.data,
        series: [],
      },
    };
    render(<SimplePanel {...propsWithNoData} />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('renders legend when showLegend is true', () => {
    render(<SimplePanel {...defaultProps} />);
    expect(screen.getByText(/A:/)).toBeInTheDocument();
    expect(screen.getByText(/B:/)).toBeInTheDocument();
    expect(screen.getByText(/C:/)).toBeInTheDocument();
  });
});
```

Run tests:

```bash
npm run test
```

## Best Practices Summary

Building effective Grafana panels requires attention to several key areas:

1. **Use Grafana's data utilities** - Work with DataFrames and use built-in processors for formatting and color calculations instead of reinventing the wheel.

2. **Leverage @grafana/ui components** - Use the provided UI library to ensure visual consistency with the rest of Grafana and get automatic theme support.

3. **Handle empty states gracefully** - Always provide meaningful feedback when no data is available or when queries return errors.

4. **Make options intuitive** - Group related options, provide clear descriptions, and set sensible defaults so users can quickly configure the panel.

5. **Optimize rendering performance** - Use React.memo, useMemo, and useCallback to prevent unnecessary re-renders, especially when dealing with large datasets.

6. **Support both light and dark themes** - Use the theme object from useTheme2() for all colors and spacing to ensure your panel looks good in any Grafana theme.

7. **Write comprehensive tests** - Test your panel component, data transformations, and custom editors to catch regressions early.

8. **Document your plugin** - Include clear README documentation, screenshots, and example dashboards to help users understand how to use your panel.

---

Custom Grafana panels open up unlimited possibilities for data visualization. By following the plugin architecture patterns and leveraging Grafana's built-in components, you can create professional visualizations that integrate seamlessly with any Grafana deployment. For monitoring your custom panels and the infrastructure they run on, check out [OneUptime](https://oneuptime.com) for comprehensive observability and incident management.
