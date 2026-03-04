# How to Implement Grafana Data Source Plugins

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Grafana, Plugins, Monitoring, TypeScript

Description: Learn how to build custom Grafana data source plugins to connect to any backend service using the Grafana plugin SDK.

---

Grafana's extensibility through plugins makes it one of the most powerful observability platforms available. When your data lives in a custom backend or a service without native Grafana support, building a data source plugin bridges that gap. This guide walks you through implementing a Grafana data source plugin from scratch.

## Setting Up the Plugin SDK

Start by scaffolding your plugin using the official Grafana create-plugin tool:

```bash
npx @grafana/create-plugin@latest
```

Select "datasource" when prompted for the plugin type. This generates a project structure with TypeScript configurations, webpack setup, and essential boilerplate code.

Install dependencies and start development:

```bash
npm install
npm run dev
```

## Implementing the DataSourcePlugin Interface

The core of your plugin lives in `src/datasource.ts`. Extend the `DataSourceApi` class to define how Grafana communicates with your backend:

```typescript
import {
  DataSourceApi,
  DataQueryRequest,
  DataQueryResponse,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
} from '@grafana/data';
import { MyQuery, MyDataSourceOptions } from './types';

export class MyDataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  baseUrl: string;

  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);
    this.baseUrl = instanceSettings.url || '';
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    const { range } = options;
    const from = range.from.valueOf();
    const to = range.to.valueOf();

    const promises = options.targets.map(async (target) => {
      const response = await this.fetchData(target.queryText, from, to);
      return this.transformResponse(response, target.refId);
    });

    const data = await Promise.all(promises);
    return { data };
  }
}
```

## Handling Queries

Transform your backend's response into Grafana's DataFrame format. This standardized structure enables visualization across all Grafana panels:

```typescript
private transformResponse(response: any, refId: string): MutableDataFrame {
  const frame = new MutableDataFrame({
    refId,
    fields: [
      { name: 'time', type: FieldType.time },
      { name: 'value', type: FieldType.number },
    ],
  });

  response.dataPoints.forEach((point: { timestamp: number; value: number }) => {
    frame.appendRow([point.timestamp, point.value]);
  });

  return frame;
}

private async fetchData(query: string, from: number, to: number): Promise<any> {
  const response = await fetch(`${this.baseUrl}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, from, to }),
  });
  return response.json();
}
```

## Implementing Health Checks

The `testDatasource` method validates connectivity when users configure the data source:

```typescript
async testDatasource(): Promise<{ status: string; message: string }> {
  try {
    const response = await fetch(`${this.baseUrl}/api/health`);
    if (response.ok) {
      return { status: 'success', message: 'Data source is working' };
    }
    return { status: 'error', message: `HTTP ${response.status}` };
  } catch (error) {
    return { status: 'error', message: `Connection failed: ${error}` };
  }
}
```

## Building the Config Editor

Create a configuration UI in `src/components/ConfigEditor.tsx` for users to enter connection details:

```typescript
import React, { ChangeEvent } from 'react';
import { InlineField, Input, SecretInput } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { MyDataSourceOptions, MySecureJsonData } from '../types';

export function ConfigEditor(
  props: DataSourcePluginOptionsEditorProps<MyDataSourceOptions, MySecureJsonData>
) {
  const { onOptionsChange, options } = props;
  const { jsonData, secureJsonFields, secureJsonData } = options;

  const onApiKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      secureJsonData: { ...secureJsonData, apiKey: event.target.value },
    });
  };

  return (
    <>
      <InlineField label="API Key" labelWidth={12}>
        <SecretInput
          isConfigured={secureJsonFields?.apiKey}
          value={secureJsonData?.apiKey || ''}
          placeholder="Enter your API key"
          width={40}
          onChange={onApiKeyChange}
        />
      </InlineField>
    </>
  );
}
```

## Adding Annotations Support

Enable annotations by implementing the `annotationQuery` method to overlay events on time series panels:

```typescript
async annotationQuery(options: AnnotationQueryRequest<MyQuery>): Promise<AnnotationEvent[]> {
  const { range, annotation } = options;
  const response = await fetch(`${this.baseUrl}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: range.from.valueOf(),
      to: range.to.valueOf(),
      tags: annotation.tags,
    }),
  });

  const events = await response.json();
  return events.map((event: any) => ({
    time: event.timestamp,
    title: event.title,
    text: event.description,
    tags: event.tags,
  }));
}
```

## Building and Publishing

Build your plugin for distribution:

```bash
npm run build
```

Sign your plugin for Grafana Cloud or private distribution:

```bash
npx @grafana/sign-plugin@latest
```

Package the `dist` folder and publish to the Grafana plugin catalog or distribute internally. For local testing, copy the built plugin to Grafana's plugin directory and restart the server.

## Conclusion

Building Grafana data source plugins unlocks the ability to visualize data from any backend system. The plugin SDK provides robust abstractions for queries, health checks, configuration, and annotations. With TypeScript support and comprehensive documentation, creating production-ready plugins is straightforward. Start with the scaffolded project, implement your query logic, and iterate using Grafana's development mode for rapid feedback.
