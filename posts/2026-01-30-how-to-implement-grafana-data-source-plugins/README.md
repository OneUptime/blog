# How to Implement Grafana Data Source Plugins

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Grafana, Plugin, Monitoring, TypeScript

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
  DataFrame,
  FieldType,
  createDataFrame,
  TestDataSourceResponse,
} from '@grafana/data';
import { getBackendSrv } from '@grafana/runtime';
import { lastValueFrom } from 'rxjs';
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
      const response = await this.fetchData(target.queryText ?? '', from, to);
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
private transformResponse(response: any, refId: string): DataFrame {
  return createDataFrame({
    refId,
    fields: [
      {
        name: 'Time',
        type: FieldType.time,
        values: response.dataPoints.map((point: { timestamp: number }) => point.timestamp),
      },
      {
        name: 'Value',
        type: FieldType.number,
        values: response.dataPoints.map((point: { value: number }) => point.value),
      },
    ],
  });
}

private async fetchData(query: string, from: number, to: number): Promise<any> {
  const response = getBackendSrv().fetch({
    url: `${this.baseUrl}/api/query`,
    method: 'POST',
    data: { query, from, to },
  });
  const { data } = await lastValueFrom(response);
  return data;
}
```

## Implementing Health Checks

The `testDatasource` method validates connectivity when users configure the data source:

```typescript
async testDatasource(): Promise<TestDataSourceResponse> {
  try {
    const response = getBackendSrv().fetch({
      url: `${this.baseUrl}/api/health`,
    });
    await lastValueFrom(response);
    return { status: 'success', message: 'Data source is working' };
  } catch (error) {
    return { status: 'error', message: `Connection failed: ${error}` };
  }
}
```

Using `getBackendSrv().fetch` sends requests through Grafana's data proxy. This avoids browser CORS limitations and lets Grafana add authentication configured for the data source.

## Building the Config Editor

Create a configuration UI in `src/components/ConfigEditor.tsx` for users to enter connection details:

```typescript
import React, { ChangeEvent } from 'react';
import { DataSourceHttpSettings, InlineField, SecretInput } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { MyDataSourceOptions, MySecureJsonData } from '../types';

export function ConfigEditor(
  props: DataSourcePluginOptionsEditorProps<MyDataSourceOptions, MySecureJsonData>
) {
  const { onOptionsChange, options } = props;
  const { secureJsonFields, secureJsonData } = options;

  const onApiKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      secureJsonData: { ...secureJsonData, apiKey: event.target.value },
    });
  };

  return (
    <>
      <DataSourceHttpSettings
        defaultUrl="https://api.example.com"
        dataSourceConfig={options}
        onChange={onOptionsChange}
      />
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

Store secrets such as API keys in `secureJsonData`, not `jsonData`. After Grafana saves the data source, encrypted secrets are not readable from frontend code; send them to your API through a data proxy route or a backend plugin component.

## Adding Annotations Support

Enable annotations by declaring support in `src/plugin.json`:

```json
{
  "annotations": true
}
```

Then add the `annotations` property to your data source class:

```typescript
export class MyDataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  annotations = {};

  // ...
}
```

Grafana uses your default query editor for annotation queries and converts the query result data frames into annotation events.

## Building and Publishing

Build your plugin for distribution:

```bash
npm run build
```

Sign your plugin for Grafana Cloud or private distribution after exporting a Grafana access policy token:

```bash
export GRAFANA_ACCESS_POLICY_TOKEN=<YOUR_ACCESS_POLICY_TOKEN>
npm run sign
```

For a private plugin, pass the root URLs where the plugin will be installed:

```bash
npm run sign -- --rootUrls https://example.com/grafana
```

Package the built plugin as a ZIP file and publish it to the Grafana plugin catalog or distribute it internally. For local testing, copy the built plugin to Grafana's plugin directory and restart the server.

## Conclusion

Building Grafana data source plugins unlocks the ability to visualize data from any backend system. The plugin SDK provides robust abstractions for queries, health checks, configuration, and annotations. With TypeScript support and comprehensive documentation, creating production-ready plugins is straightforward. Start with the scaffolded project, implement your query logic, and iterate using Grafana's development mode for rapid feedback.
