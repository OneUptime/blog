# How to Create Grafana Panel Plugins

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Grafana, Plugins, Visualization, Monitoring

Description: Build custom Grafana panel plugins with React for specialized visualizations, data transformations, and interactive dashboards.

---

Grafana ships with dozens of built-in panels, but sometimes you need something specific to your domain. Maybe you want a network topology map, a custom gauge with thresholds your team defined, or a visualization that combines multiple data sources in a unique way. Panel plugins let you build exactly that.

This guide walks through the entire process of creating a Grafana panel plugin from scratch - from scaffolding to signing and distribution.

---

## Table of Contents

1. Prerequisites
2. Plugin Architecture Overview
3. Scaffolding with create-plugin
4. Understanding plugin.json
5. Building the Panel Component
6. Working with Data Frames
7. Adding Panel Options
8. Field Configuration
9. Handling Themes and Styles
10. Testing Your Plugin
11. Building for Production
12. Signing Your Plugin
13. Distribution Options
14. Complete Example Plugin
15. Troubleshooting Common Issues

---

## 1. Prerequisites

Before starting, make sure you have these tools installed:

| Tool | Minimum Version | Purpose |
|------|-----------------|---------|
| Node.js | 18.x or higher | JavaScript runtime |
| npm or yarn | npm 9.x / yarn 1.22+ | Package management |
| Go | 1.21+ | Required if building backend plugins |
| Docker | 20.x+ | Running Grafana for development |
| Grafana | 10.x+ | Target platform |

Verify your setup:

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check Go version (optional, for backend plugins)
go version
```

---

## 2. Plugin Architecture Overview

Grafana panel plugins consist of several key pieces:

| Component | File | Purpose |
|-----------|------|---------|
| Plugin metadata | plugin.json | Defines plugin ID, name, dependencies, and capabilities |
| Module entry | module.ts | Exports the plugin to Grafana |
| Panel component | components/SimplePanel.tsx | React component that renders the visualization |
| Panel options | types.ts | TypeScript interfaces for configuration |
| Styles | styles.ts | Theme-aware styling using Grafana utilities |

The data flow works like this:

```
Data Source -> Query -> Data Frame -> Panel Plugin -> Visualization
                                          |
                                    Panel Options
                                    Field Config
```

Your plugin receives processed data frames and configuration, then renders whatever visualization you need.

---

## 3. Scaffolding with create-plugin

Grafana provides an official scaffolding tool that sets up the project structure, build configuration, and TypeScript types.

Run the scaffolding command:

```bash
# Create a new panel plugin
npx @grafana/create-plugin@latest

# Follow the prompts:
# - Plugin type: panel
# - Plugin name: my-custom-panel
# - Organization: your-org
# - Include backend: No (for frontend-only plugins)
```

This generates the following structure:

```
my-custom-panel/
├── .config/                    # Build configuration
├── src/
│   ├── components/
│   │   └── SimplePanel.tsx     # Main panel component
│   ├── img/
│   │   └── logo.svg            # Plugin icon
│   ├── module.ts               # Plugin entry point
│   ├── plugin.json             # Plugin metadata
│   └── types.ts                # TypeScript interfaces
├── package.json
├── tsconfig.json
└── README.md
```

Install dependencies and start development:

```bash
cd my-custom-panel

# Install dependencies
npm install

# Start development server with hot reload
npm run dev
```

---

## 4. Understanding plugin.json

The plugin.json file defines everything Grafana needs to load your plugin. Here is a complete example with explanations:

```json
{
  "$schema": "https://raw.githubusercontent.com/grafana/grafana/main/docs/sources/developers/plugins/plugin.schema.json",
  "type": "panel",
  "name": "Custom Gauge Panel",
  "id": "yourorg-customgauge-panel",
  "info": {
    "keywords": ["gauge", "visualization", "custom"],
    "description": "A custom gauge panel with configurable thresholds",
    "author": {
      "name": "Your Name",
      "url": "https://github.com/yourorg"
    },
    "logos": {
      "small": "img/logo.svg",
      "large": "img/logo.svg"
    },
    "links": [
      {
        "name": "Documentation",
        "url": "https://github.com/yourorg/customgauge-panel"
      },
      {
        "name": "Report Issues",
        "url": "https://github.com/yourorg/customgauge-panel/issues"
      }
    ],
    "screenshots": [
      {
        "name": "Panel Overview",
        "path": "img/screenshot-overview.png"
      }
    ],
    "version": "1.0.0",
    "updated": "2026-01-30"
  },
  "dependencies": {
    "grafanaDependency": ">=10.0.0",
    "plugins": []
  }
}
```

Key fields explained:

| Field | Description |
|-------|-------------|
| id | Unique identifier, format: orgname-pluginname-panel |
| type | Must be "panel" for panel plugins |
| name | Display name shown in Grafana UI |
| grafanaDependency | Minimum Grafana version required |
| keywords | Help users find your plugin in the catalog |

---

## 5. Building the Panel Component

The panel component is a React component that receives data and options as props. Here is the core structure:

```tsx
// src/components/SimplePanel.tsx
import React from 'react';
import { PanelProps } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { SimpleOptions } from '../types';

// Define props interface extending Grafana's PanelProps
interface Props extends PanelProps<SimpleOptions> {}

export const SimplePanel: React.FC<Props> = ({
  options,
  data,
  width,
  height,
  fieldConfig,
  timeRange,
  onChangeTimeRange,
  replaceVariables,
}) => {
  // Get theme-aware styles
  const styles = useStyles2(getStyles);

  // Access the first data frame (most panels work with one series)
  const frame = data.series[0];

  // Handle case when no data is available
  if (!frame || frame.length === 0) {
    return (
      <div className={styles.container}>
        <p className={styles.noData}>No data available</p>
      </div>
    );
  }

  return (
    <div
      className={styles.container}
      style={{ width, height }}
    >
      {/* Your visualization goes here */}
      <h3>{options.title}</h3>
      <p>Data points: {frame.length}</p>
    </div>
  );
};

// Theme-aware styles using Grafana's styling system
const getStyles = () => {
  return {
    container: css`
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 16px;
    `,
    noData: css`
      color: #999;
      font-style: italic;
    `,
  };
};
```

The PanelProps generic provides these key properties:

| Property | Type | Description |
|----------|------|-------------|
| data | PanelData | Query results containing data frames |
| options | T | Your custom panel options |
| width | number | Panel width in pixels |
| height | number | Panel height in pixels |
| fieldConfig | FieldConfigSource | Field-level configuration |
| timeRange | TimeRange | Current dashboard time range |
| replaceVariables | function | Resolves dashboard variables |

---

## 6. Working with Data Frames

Data frames are Grafana's standard data structure. Understanding them is essential for building effective panels.

```tsx
// src/components/DataFrameExample.tsx
import React from 'react';
import { PanelProps, DataFrame, Field, FieldType } from '@grafana/data';
import { SimpleOptions } from '../types';

interface Props extends PanelProps<SimpleOptions> {}

export const DataFrameExample: React.FC<Props> = ({ data }) => {
  // Iterate through all data frames (one per query)
  return (
    <div>
      {data.series.map((frame: DataFrame, frameIndex: number) => (
        <FrameDisplay key={frameIndex} frame={frame} />
      ))}
    </div>
  );
};

// Component to display a single data frame
const FrameDisplay: React.FC<{ frame: DataFrame }> = ({ frame }) => {
  // Get field by name
  const timeField = frame.fields.find((f) => f.type === FieldType.time);
  const valueField = frame.fields.find((f) => f.type === FieldType.number);

  if (!timeField || !valueField) {
    return <p>Missing required fields</p>;
  }

  // Access values from fields
  const timestamps = timeField.values;
  const values = valueField.values;

  // Calculate statistics
  const sum = values.toArray().reduce((a: number, b: number) => a + b, 0);
  const avg = sum / values.length;
  const max = Math.max(...values.toArray());
  const min = Math.min(...values.toArray());

  return (
    <div>
      <h4>{frame.name || 'Unnamed Series'}</h4>
      <p>Points: {frame.length}</p>
      <p>Average: {avg.toFixed(2)}</p>
      <p>Min: {min.toFixed(2)}</p>
      <p>Max: {max.toFixed(2)}</p>
    </div>
  );
};
```

Field types you will commonly encounter:

| FieldType | Description | Example |
|-----------|-------------|---------|
| time | Timestamps | Unix milliseconds |
| number | Numeric values | Metrics, counts |
| string | Text values | Labels, names |
| boolean | True/false | Status flags |
| other | Unspecified | Complex objects |

Extracting specific fields:

```tsx
// Get field by exact name
const cpuField = frame.fields.find((f) => f.name === 'cpu_usage');

// Get all numeric fields
const numericFields = frame.fields.filter((f) => f.type === FieldType.number);

// Get field values as array
const values = cpuField?.values.toArray() || [];

// Access display processor for formatted values
const displayValue = cpuField?.display?.(values[0]);
console.log(displayValue?.text); // "85.5%"
console.log(displayValue?.color); // "#FF0000"
```

---

## 7. Adding Panel Options

Panel options let users configure your visualization through the Grafana UI. Define them in types.ts and register them in module.ts.

First, define the options interface:

```tsx
// src/types.ts
export interface SimpleOptions {
  // Text options
  title: string;
  subtitle: string;

  // Numeric options
  decimals: number;
  threshold: number;

  // Boolean options
  showLegend: boolean;
  animate: boolean;

  // Select options
  colorScheme: 'default' | 'warm' | 'cool' | 'monochrome';

  // Complex options
  thresholds: ThresholdConfig[];
}

export interface ThresholdConfig {
  value: number;
  color: string;
  label: string;
}

// Default values
export const defaults: SimpleOptions = {
  title: 'My Panel',
  subtitle: '',
  decimals: 2,
  threshold: 80,
  showLegend: true,
  animate: false,
  colorScheme: 'default',
  thresholds: [
    { value: 0, color: 'green', label: 'OK' },
    { value: 70, color: 'yellow', label: 'Warning' },
    { value: 90, color: 'red', label: 'Critical' },
  ],
};
```

Register the options panel builder:

```tsx
// src/module.ts
import { PanelPlugin } from '@grafana/data';
import { SimpleOptions, defaults } from './types';
import { SimplePanel } from './components/SimplePanel';

export const plugin = new PanelPlugin<SimpleOptions>(SimplePanel)
  .setPanelOptions((builder) => {
    builder
      // Text input
      .addTextInput({
        path: 'title',
        name: 'Panel Title',
        description: 'Title displayed at the top of the panel',
        defaultValue: defaults.title,
        category: ['Display'],
      })

      // Number input with validation
      .addNumberInput({
        path: 'decimals',
        name: 'Decimal Places',
        description: 'Number of decimal places to display',
        defaultValue: defaults.decimals,
        settings: {
          min: 0,
          max: 10,
          integer: true,
        },
        category: ['Display'],
      })

      // Boolean toggle
      .addBooleanSwitch({
        path: 'showLegend',
        name: 'Show Legend',
        description: 'Display the legend below the visualization',
        defaultValue: defaults.showLegend,
        category: ['Display'],
      })

      // Select dropdown
      .addSelect({
        path: 'colorScheme',
        name: 'Color Scheme',
        description: 'Color palette for the visualization',
        defaultValue: defaults.colorScheme,
        settings: {
          options: [
            { value: 'default', label: 'Default' },
            { value: 'warm', label: 'Warm Colors' },
            { value: 'cool', label: 'Cool Colors' },
            { value: 'monochrome', label: 'Monochrome' },
          ],
        },
        category: ['Colors'],
      })

      // Radio button group
      .addRadio({
        path: 'alignment',
        name: 'Value Alignment',
        defaultValue: 'center',
        settings: {
          options: [
            { value: 'left', label: 'Left' },
            { value: 'center', label: 'Center' },
            { value: 'right', label: 'Right' },
          ],
        },
        category: ['Display'],
      })

      // Slider
      .addSliderInput({
        path: 'threshold',
        name: 'Warning Threshold',
        defaultValue: defaults.threshold,
        settings: {
          min: 0,
          max: 100,
          step: 5,
        },
        category: ['Thresholds'],
      })

      // Color picker
      .addColorPicker({
        path: 'backgroundColor',
        name: 'Background Color',
        defaultValue: 'transparent',
        category: ['Colors'],
      })

      // Conditional visibility
      .addBooleanSwitch({
        path: 'animate',
        name: 'Enable Animation',
        defaultValue: defaults.animate,
        category: ['Animation'],
      })
      .addSliderInput({
        path: 'animationDuration',
        name: 'Animation Duration (ms)',
        defaultValue: 500,
        settings: {
          min: 100,
          max: 2000,
          step: 100,
        },
        category: ['Animation'],
        // Only show when animation is enabled
        showIf: (config) => config.animate === true,
      });
  });
```

---

## 8. Field Configuration

Field configuration allows users to customize how individual fields are displayed. This includes units, thresholds, mappings, and colors.

Enable standard field configuration options:

```tsx
// src/module.ts
import { PanelPlugin, FieldConfigProperty } from '@grafana/data';
import { SimpleOptions } from './types';
import { SimplePanel } from './components/SimplePanel';

export const plugin = new PanelPlugin<SimpleOptions>(SimplePanel)
  // Enable standard field configuration options
  .useFieldConfig({
    // Specify which standard options to include
    standardOptions: {
      [FieldConfigProperty.Unit]: {},
      [FieldConfigProperty.Decimals]: {},
      [FieldConfigProperty.Min]: {},
      [FieldConfigProperty.Max]: {},
      [FieldConfigProperty.Color]: {
        settings: {
          byValueSupport: true,
          bySeriesSupport: true,
          preferThresholdsMode: true,
        },
      },
      [FieldConfigProperty.Thresholds]: {
        defaultValue: {
          mode: 'absolute',
          steps: [
            { value: -Infinity, color: 'green' },
            { value: 70, color: 'yellow' },
            { value: 90, color: 'red' },
          ],
        },
      },
      [FieldConfigProperty.Mappings]: {},
      [FieldConfigProperty.Links]: {},
    },
    // Add custom field options
    useCustomConfig: (builder) => {
      builder
        .addBooleanSwitch({
          path: 'showSparkline',
          name: 'Show Sparkline',
          description: 'Display a mini trend line',
          defaultValue: false,
        })
        .addNumberInput({
          path: 'sparklineHeight',
          name: 'Sparkline Height',
          defaultValue: 30,
          settings: {
            min: 10,
            max: 100,
          },
          showIf: (config) => config.showSparkline === true,
        });
    },
  })
  .setPanelOptions((builder) => {
    // Panel-level options here
  });
```

Using field configuration in your component:

```tsx
// src/components/SimplePanel.tsx
import React from 'react';
import { PanelProps, getFieldDisplayValues, FieldDisplay } from '@grafana/data';
import { SimpleOptions } from '../types';

interface Props extends PanelProps<SimpleOptions> {}

export const SimplePanel: React.FC<Props> = ({
  data,
  width,
  height,
  fieldConfig,
  options,
  replaceVariables,
  timeZone,
}) => {
  // Get display values with all field config applied
  const fieldDisplayValues: FieldDisplay[] = getFieldDisplayValues({
    fieldConfig,
    reduceOptions: {
      calcs: ['lastNotNull'],
      fields: '',
      values: false,
    },
    replaceVariables,
    theme: useTheme2(),
    data: data.series,
    timeZone,
  });

  return (
    <div style={{ width, height }}>
      {fieldDisplayValues.map((display, index) => {
        // display.display contains formatted value with color
        const { text, numeric, color, suffix, prefix } = display.display;

        return (
          <div
            key={index}
            style={{
              color: color,
              fontSize: '24px',
              textAlign: 'center',
            }}
          >
            {prefix}
            {text}
            {suffix}
          </div>
        );
      })}
    </div>
  );
};
```

---

## 9. Handling Themes and Styles

Grafana supports light and dark themes. Your plugin should adapt to both.

```tsx
// src/components/ThemedPanel.tsx
import React from 'react';
import { PanelProps, GrafanaTheme2 } from '@grafana/data';
import { useStyles2, useTheme2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { SimpleOptions } from '../types';

interface Props extends PanelProps<SimpleOptions> {}

export const ThemedPanel: React.FC<Props> = ({ data, width, height, options }) => {
  // Access the current theme
  const theme = useTheme2();

  // Get theme-aware styles
  const styles = useStyles2(getStyles);

  // Use theme colors directly when needed
  const chartColors = [
    theme.visualization.getColorByName('green'),
    theme.visualization.getColorByName('yellow'),
    theme.visualization.getColorByName('red'),
  ];

  return (
    <div className={styles.wrapper} style={{ width, height }}>
      <div className={styles.header}>
        <h3 className={styles.title}>{options.title}</h3>
      </div>
      <div className={styles.content}>
        {/* Chart or visualization here */}
        <svg width="100%" height="80%">
          <rect
            x="10%"
            y="10%"
            width="80%"
            height="80%"
            fill={theme.colors.background.secondary}
            stroke={theme.colors.border.weak}
          />
        </svg>
      </div>
    </div>
  );
};

// Styles function receives the theme as parameter
const getStyles = (theme: GrafanaTheme2) => {
  return {
    wrapper: css`
      display: flex;
      flex-direction: column;
      background: ${theme.colors.background.primary};
      border: 1px solid ${theme.colors.border.weak};
      border-radius: ${theme.shape.radius.default};
      overflow: hidden;
    `,
    header: css`
      padding: ${theme.spacing(1, 2)};
      background: ${theme.colors.background.secondary};
      border-bottom: 1px solid ${theme.colors.border.weak};
    `,
    title: css`
      margin: 0;
      font-size: ${theme.typography.h5.fontSize};
      font-weight: ${theme.typography.fontWeightMedium};
      color: ${theme.colors.text.primary};
    `,
    content: css`
      flex: 1;
      padding: ${theme.spacing(2)};
      display: flex;
      align-items: center;
      justify-content: center;
    `,
    // Example of responsive styles
    value: css`
      font-size: ${theme.typography.h1.fontSize};
      color: ${theme.colors.text.maxContrast};

      @media (max-width: 600px) {
        font-size: ${theme.typography.h3.fontSize};
      }
    `,
  };
};
```

Common theme properties:

| Property | Example | Description |
|----------|---------|-------------|
| colors.background.primary | Panel background | Main background color |
| colors.background.secondary | Header background | Secondary surfaces |
| colors.text.primary | Main text | Primary text color |
| colors.text.secondary | Subtitles | Muted text |
| colors.border.weak | Dividers | Subtle borders |
| spacing(n) | spacing(2) = 16px | Consistent spacing |
| typography.h1 | Headings | Font styles |
| visualization.getColorByName | Chart colors | Named colors |

---

## 10. Testing Your Plugin

Set up a test environment with Docker:

```yaml
# docker-compose.yml
version: '3.8'

services:
  grafana:
    image: grafana/grafana:latest
    ports:
      - '3000:3000'
    volumes:
      # Mount your plugin source
      - ./dist:/var/lib/grafana/plugins/my-custom-panel
      # Grafana configuration
      - ./grafana.ini:/etc/grafana/grafana.ini
    environment:
      - GF_DEFAULT_APP_MODE=development
      - GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=yourorg-customgauge-panel
      - GF_LOG_LEVEL=debug
```

Create a minimal grafana.ini:

```ini
# grafana.ini
[plugins]
allow_loading_unsigned_plugins = yourorg-customgauge-panel

[log]
level = debug
```

Run the development environment:

```bash
# Build and watch for changes
npm run dev

# Start Grafana in another terminal
docker-compose up

# Access Grafana at http://localhost:3000
# Default credentials: admin/admin
```

Write unit tests for your components:

```tsx
// src/components/SimplePanel.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SimplePanel } from './SimplePanel';
import { LoadingState, FieldType, toDataFrame } from '@grafana/data';

// Mock the Grafana UI hooks
jest.mock('@grafana/ui', () => ({
  ...jest.requireActual('@grafana/ui'),
  useStyles2: () => ({
    container: 'mock-container',
    noData: 'mock-no-data',
  }),
  useTheme2: () => ({
    colors: {
      text: { primary: '#000' },
      background: { primary: '#fff' },
    },
  }),
}));

describe('SimplePanel', () => {
  const defaultProps = {
    id: 1,
    data: {
      state: LoadingState.Done,
      series: [
        toDataFrame({
          name: 'Test Series',
          fields: [
            { name: 'time', type: FieldType.time, values: [1, 2, 3] },
            { name: 'value', type: FieldType.number, values: [10, 20, 30] },
          ],
        }),
      ],
      timeRange: {} as any,
    },
    timeRange: {} as any,
    timeZone: 'browser',
    width: 400,
    height: 300,
    options: {
      title: 'Test Panel',
      showLegend: true,
    },
    fieldConfig: { defaults: {}, overrides: [] },
    transparent: false,
    renderCounter: 0,
    replaceVariables: (v: string) => v,
    onOptionsChange: jest.fn(),
    onFieldConfigChange: jest.fn(),
    onChangeTimeRange: jest.fn(),
    eventBus: {} as any,
  };

  it('renders panel title', () => {
    render(<SimplePanel {...defaultProps} />);
    expect(screen.getByText('Test Panel')).toBeInTheDocument();
  });

  it('displays no data message when series is empty', () => {
    const emptyDataProps = {
      ...defaultProps,
      data: {
        ...defaultProps.data,
        series: [],
      },
    };
    render(<SimplePanel {...emptyDataProps} />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('shows data point count', () => {
    render(<SimplePanel {...defaultProps} />);
    expect(screen.getByText('Data points: 3')).toBeInTheDocument();
  });
});
```

Run tests:

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test -- --watch

# Run tests with coverage
npm run test -- --coverage
```

---

## 11. Building for Production

Build your plugin for production distribution:

```bash
# Production build
npm run build

# This creates a dist/ folder with:
# - Minified JavaScript bundle
# - plugin.json
# - Assets (images, etc.)
```

The build output structure:

```
dist/
├── img/
│   └── logo.svg
├── module.js          # Main bundle
├── module.js.map      # Source map (optional)
├── plugin.json        # Metadata
└── README.md          # Documentation
```

Create a release package:

```bash
# Create a zip archive for distribution
cd dist
zip -r ../yourorg-customgauge-panel-1.0.0.zip .
```

---

## 12. Signing Your Plugin

Grafana requires plugins to be signed for production use. There are three signature levels:

| Level | Use Case | Verification |
|-------|----------|--------------|
| Private | Internal/enterprise use | Self-signed |
| Community | Public distribution | Grafana approval |
| Commercial | Paid plugins | Grafana partnership |

For private signing:

```bash
# Install the signing tool
npm install --save-dev @grafana/sign-plugin

# Create a Grafana Cloud account and get an API key
# https://grafana.com/auth/sign-in

# Sign your plugin
npx @grafana/sign-plugin --rootUrls https://your-grafana-instance.com

# This adds MANIFEST.txt to your dist folder
```

Configure your grafana.ini to accept the signature:

```ini
[plugins]
# For private signatures, specify your root URL
plugin_admin_enabled = true
plugin_catalog_url = https://grafana.com/grafana/plugins/
```

For unsigned plugins in development, allow loading:

```ini
[plugins]
allow_loading_unsigned_plugins = yourorg-customgauge-panel
```

---

## 13. Distribution Options

You have several options for distributing your plugin:

| Method | Audience | Requirements |
|--------|----------|--------------|
| Local install | Development/testing | Copy to plugins folder |
| Private catalog | Enterprise | Signed, internal hosting |
| Grafana catalog | Public | Grafana review and approval |
| GitHub releases | Open source | Manual download |

Local installation:

```bash
# Copy to Grafana plugins directory
cp -r dist/ /var/lib/grafana/plugins/yourorg-customgauge-panel/

# Restart Grafana
sudo systemctl restart grafana-server
```

Submit to Grafana catalog:

1. Create a GitHub repository for your plugin
2. Ensure all required files are present (plugin.json, README, LICENSE)
3. Submit at https://grafana.com/developers/plugin-tools/publish-a-plugin

---

## 14. Complete Example Plugin

Here is a complete, working gauge panel plugin that demonstrates all the concepts:

```tsx
// src/types.ts
export interface GaugeOptions {
  title: string;
  showValue: boolean;
  showThresholdLabels: boolean;
  arcWidth: number;
}

export const defaults: GaugeOptions = {
  title: 'Gauge',
  showValue: true,
  showThresholdLabels: true,
  arcWidth: 20,
};
```

```tsx
// src/module.ts
import { PanelPlugin, FieldConfigProperty } from '@grafana/data';
import { GaugeOptions, defaults } from './types';
import { GaugePanel } from './components/GaugePanel';

export const plugin = new PanelPlugin<GaugeOptions>(GaugePanel)
  .useFieldConfig({
    standardOptions: {
      [FieldConfigProperty.Unit]: {},
      [FieldConfigProperty.Decimals]: { defaultValue: 1 },
      [FieldConfigProperty.Min]: { defaultValue: 0 },
      [FieldConfigProperty.Max]: { defaultValue: 100 },
      [FieldConfigProperty.Thresholds]: {
        defaultValue: {
          mode: 'absolute',
          steps: [
            { value: -Infinity, color: 'green' },
            { value: 70, color: 'yellow' },
            { value: 90, color: 'red' },
          ],
        },
      },
    },
  })
  .setPanelOptions((builder) => {
    builder
      .addTextInput({
        path: 'title',
        name: 'Title',
        defaultValue: defaults.title,
        category: ['Display'],
      })
      .addBooleanSwitch({
        path: 'showValue',
        name: 'Show Value',
        defaultValue: defaults.showValue,
        category: ['Display'],
      })
      .addBooleanSwitch({
        path: 'showThresholdLabels',
        name: 'Show Threshold Labels',
        defaultValue: defaults.showThresholdLabels,
        category: ['Display'],
      })
      .addSliderInput({
        path: 'arcWidth',
        name: 'Arc Width',
        defaultValue: defaults.arcWidth,
        settings: {
          min: 5,
          max: 50,
          step: 1,
        },
        category: ['Display'],
      });
  });
```

```tsx
// src/components/GaugePanel.tsx
import React, { useMemo } from 'react';
import {
  PanelProps,
  GrafanaTheme2,
  getFieldDisplayValues,
  FieldDisplay,
  ThresholdsMode,
} from '@grafana/data';
import { useStyles2, useTheme2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { GaugeOptions } from '../types';

interface Props extends PanelProps<GaugeOptions> {}

export const GaugePanel: React.FC<Props> = ({
  data,
  width,
  height,
  options,
  fieldConfig,
  replaceVariables,
  timeZone,
}) => {
  const theme = useTheme2();
  const styles = useStyles2(getStyles);

  // Calculate display values with field config applied
  const displayValues: FieldDisplay[] = useMemo(() => {
    return getFieldDisplayValues({
      fieldConfig,
      reduceOptions: {
        calcs: ['lastNotNull'],
        fields: '',
        values: false,
      },
      replaceVariables,
      theme,
      data: data.series,
      timeZone,
    });
  }, [data.series, fieldConfig, replaceVariables, theme, timeZone]);

  // Get the first display value
  const display = displayValues[0]?.display;
  if (!display) {
    return (
      <div className={styles.container} style={{ width, height }}>
        <p className={styles.noData}>No data</p>
      </div>
    );
  }

  // Get field config values
  const min = fieldConfig.defaults.min ?? 0;
  const max = fieldConfig.defaults.max ?? 100;
  const thresholds = fieldConfig.defaults.thresholds;

  // Calculate gauge parameters
  const value = display.numeric;
  const percentage = Math.min(Math.max((value - min) / (max - min), 0), 1);
  const angle = percentage * 180; // 180 degree arc

  // SVG dimensions
  const size = Math.min(width, height * 1.5);
  const centerX = size / 2;
  const centerY = size * 0.6;
  const radius = size * 0.4;
  const arcWidth = options.arcWidth;

  // Generate arc path
  const describeArc = (startAngle: number, endAngle: number): string => {
    const start = polarToCartesian(centerX, centerY, radius, endAngle);
    const end = polarToCartesian(centerX, centerY, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return [
      'M', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    ].join(' ');
  };

  // Get color from thresholds
  const getThresholdColor = (val: number): string => {
    if (!thresholds?.steps) {
      return theme.colors.primary.main;
    }
    let color = thresholds.steps[0]?.color || 'green';
    for (const step of thresholds.steps) {
      if (val >= step.value) {
        color = step.color;
      }
    }
    return theme.visualization.getColorByName(color);
  };

  return (
    <div className={styles.container} style={{ width, height }}>
      {options.title && <h3 className={styles.title}>{options.title}</h3>}

      <svg
        width={size}
        height={size * 0.7}
        viewBox={`0 0 ${size} ${size * 0.7}`}
        className={styles.svg}
      >
        {/* Background arc */}
        <path
          d={describeArc(180, 360)}
          fill="none"
          stroke={theme.colors.background.secondary}
          strokeWidth={arcWidth}
          strokeLinecap="round"
        />

        {/* Value arc */}
        <path
          d={describeArc(180, 180 + angle)}
          fill="none"
          stroke={getThresholdColor(value)}
          strokeWidth={arcWidth}
          strokeLinecap="round"
        />

        {/* Threshold markers */}
        {options.showThresholdLabels &&
          thresholds?.steps?.slice(1).map((step, i) => {
            const stepPercentage = (step.value - min) / (max - min);
            const stepAngle = 180 + stepPercentage * 180;
            const markerPos = polarToCartesian(
              centerX,
              centerY,
              radius + arcWidth / 2 + 10,
              stepAngle
            );
            return (
              <text
                key={i}
                x={markerPos.x}
                y={markerPos.y}
                className={styles.thresholdLabel}
                textAnchor="middle"
                fill={theme.colors.text.secondary}
              >
                {step.value}
              </text>
            );
          })}

        {/* Min/Max labels */}
        <text
          x={centerX - radius - 10}
          y={centerY + 15}
          className={styles.minMaxLabel}
          textAnchor="end"
          fill={theme.colors.text.secondary}
        >
          {min}
        </text>
        <text
          x={centerX + radius + 10}
          y={centerY + 15}
          className={styles.minMaxLabel}
          textAnchor="start"
          fill={theme.colors.text.secondary}
        >
          {max}
        </text>
      </svg>

      {/* Value display */}
      {options.showValue && (
        <div className={styles.valueContainer}>
          <span className={styles.value} style={{ color: display.color }}>
            {display.prefix}
            {display.text}
            {display.suffix}
          </span>
        </div>
      )}
    </div>
  );
};

// Helper function to convert polar coordinates to cartesian
function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 180) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

const getStyles = (theme: GrafanaTheme2) => ({
  container: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: ${theme.spacing(2)};
  `,
  title: css`
    margin: 0 0 ${theme.spacing(1)} 0;
    font-size: ${theme.typography.h5.fontSize};
    color: ${theme.colors.text.primary};
  `,
  svg: css`
    overflow: visible;
  `,
  valueContainer: css`
    margin-top: ${theme.spacing(1)};
    text-align: center;
  `,
  value: css`
    font-size: ${theme.typography.h2.fontSize};
    font-weight: ${theme.typography.fontWeightBold};
  `,
  noData: css`
    color: ${theme.colors.text.secondary};
    font-style: italic;
  `,
  thresholdLabel: css`
    font-size: ${theme.typography.bodySmall.fontSize};
  `,
  minMaxLabel: css`
    font-size: ${theme.typography.bodySmall.fontSize};
  `,
});
```

---

## 15. Troubleshooting Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Plugin not loading | Unsigned plugin | Add plugin ID to allow_loading_unsigned_plugins |
| No data displayed | Data frame parsing | Check field types and names, add logging |
| Styles not applying | Theme not injected | Use useStyles2 hook, not inline styles |
| Options not saving | Path mismatch | Verify path matches types.ts interface |
| Build errors | Type mismatches | Update @grafana/data types, check versions |
| Hot reload not working | Docker volume | Verify dist folder is mounted correctly |

Debug logging in your panel:

```tsx
// Add to your component for debugging
useEffect(() => {
  console.log('Panel data:', data);
  console.log('Field config:', fieldConfig);
  console.log('Options:', options);
}, [data, fieldConfig, options]);
```

Check Grafana server logs:

```bash
# View Grafana logs for plugin errors
docker logs grafana-container 2>&1 | grep -i plugin

# Or on a systemd system
journalctl -u grafana-server -f
```

---

## Summary

Building Grafana panel plugins involves several key steps:

1. Scaffold with create-plugin for proper project structure
2. Configure plugin.json with accurate metadata and dependencies
3. Build React components that handle PanelProps correctly
4. Parse data frames to extract values for visualization
5. Define panel options for user configuration
6. Use field configuration for per-field settings
7. Apply theme-aware styles for light/dark mode support
8. Test locally with Docker before distribution
9. Sign your plugin for production use
10. Distribute via Grafana catalog or private hosting

The Grafana plugin ecosystem gives you full control over how data is visualized. Whether you need specialized charts, custom data transformations, or interactive dashboards, panel plugins provide the flexibility to build exactly what your team needs.

---

## Resources

- [Grafana Plugin Tools Documentation](https://grafana.com/developers/plugin-tools/)
- [Grafana UI Components](https://developers.grafana.com/ui/)
- [Data Frame Reference](https://grafana.com/developers/plugin-tools/introduction/data-frames)
- [Plugin Examples Repository](https://github.com/grafana/grafana-plugin-examples)

---

**Related Reading:**

- [Three Pillars of Observability: Logs, Metrics, Traces](/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/)
- [What are Metrics in OpenTelemetry](/blog/post/2025-08-26-what-are-metrics-in-opentelemetry/)
- [SRE Tools Comparison](/blog/post/2025-11-28-sre-tools-comparison/)
