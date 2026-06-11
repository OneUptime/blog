# Validation Summary: How to Implement Grafana Data Source Plugins

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Grafana data source plugins
- Grafana Plugin Tools
- TypeScript
- React
- Grafana data frames
- Grafana data proxy
- Grafana plugin signing

## Sources Consulted
- Grafana Plugin Tools: Build a data source plugin, https://grafana.com/developers/plugin-tools/tutorials/build-a-data-source-plugin
- Grafana Plugin Tools: CLI commands to create plugins, https://grafana.com/developers/plugin-tools/reference/cli-commands
- Grafana Plugin Tools: Create data frames, https://grafana.com/developers/plugin-tools/how-to-guides/data-source-plugins/create-data-frames
- Grafana Plugin Tools: Use data proxy to fetch frontend data, https://grafana.com/developers/plugin-tools/how-to-guides/data-source-plugins/fetch-data-from-frontend
- Grafana Plugin Tools: Add authentication for data source plugins, https://grafana.com/developers/plugin-tools/how-to-guides/data-source-plugins/add-authentication-for-data-source-plugins
- Grafana Plugin Tools: Add support for annotation queries, https://grafana.com/developers/plugin-tools/how-to-guides/data-source-plugins/add-support-for-annotation-queries
- Grafana Plugin Tools: Sign a plugin, https://grafana.com/developers/plugin-tools/publish-a-plugin/sign-a-plugin
- Grafana source: DataSourceApi and AnnotationSupport types, https://github.com/grafana/grafana/blob/main/packages/grafana-data/src/types/datasource.ts and https://github.com/grafana/grafana/blob/main/packages/grafana-data/src/types/annotations.ts

## Issues Found
- The data-frame example used `MutableDataFrame` and `appendRow`. Grafana 10.1 introduced `createDataFrame` and deprecated `MutableDataFrame`, so the example now imports `createDataFrame` and returns a `DataFrame` with field value arrays.
- The query and health-check examples used the browser `fetch` API directly against `this.baseUrl`. Grafana's official guidance recommends `getBackendSrv().fetch` through the data proxy for data source frontend requests, especially for CORS and authenticated requests. The examples now use `getBackendSrv().fetch` with `lastValueFrom`.
- The config editor accepted an API key but did not provide URL configuration and implied the frontend could use saved secrets directly. The example now uses `DataSourceHttpSettings` for endpoint configuration and explains that saved `secureJsonData` values must be sent through a data proxy route or backend plugin component.
- The annotations example used the deprecated `annotationQuery` method. Current Grafana docs recommend enabling annotations in `plugin.json` and setting the `annotations` property on the data source, so that section was updated.
- The signing command used `npx @grafana/sign-plugin@latest` directly. Current Grafana signing docs show signing through the scaffolded `npm run sign` script after setting `GRAFANA_ACCESS_POLICY_TOKEN`, with `--rootUrls` for private plugins. The commands were updated.

## Review Notes
The post remains a high-level tutorial and uses placeholder API paths and query types. A production plugin should also define proxy routes or a backend component for API-key injection, add error handling around backend response shapes, and include tests for the query transformation logic.
