# Validation Summary: How to Use MongoDB Atlas Charts for Data Visualization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas Charts (data visualization)
- MongoDB Atlas (cloud database platform)
- MongoDB Aggregation Pipeline
- @mongodb-js/charts-embed-dom JavaScript SDK (v3.3.1)
- HTML iframe embedding
- GeoJSON / geospatial data

## Sources Consulted
- npm registry for `@mongodb-js/charts-embed-dom` package — verified package exists and is current (v3.3.1)
- TypeScript type definitions from `@mongodb-js/charts-embed-dom` package — verified SDK class names (`EmbedSDK` default export), `createChart` method signature, `EmbedChartOptions` interface (confirms `chartId`, `height`, `theme`, `filter` options), `setFilter` method on Chart class, and `render` method signature
- MongoDB Extended JSON v2 specification — verified `$date` operator requires full ISO-8601 datetime string format
- MongoDB Atlas Charts documentation — verified chart types, embedding workflow, data source configuration, and dashboard sharing features

## Issues Found
1. **Incomplete `$date` Extended JSON format (line 112)**: The aggregation pipeline example used `{"$date": "2026-01-01"}` which is a date-only string. MongoDB Extended JSON v2 requires a full ISO-8601 datetime string. Fixed to `{"$date": "2026-01-01T00:00:00Z"}`.

2. **Incorrect reference to App Services for field-level access (line 233)**: The post stated that field-level access for Charts is configured "in App Services." Atlas App Services is a separate product; Atlas Charts has its own data source permissions where field-level access is configured directly within the Charts interface. Fixed to reference "the Charts data source settings" instead.

## Review Notes
- The SDK import `import ChartsEmbedSDK from "@mongodb-js/charts-embed-dom"` uses a custom name for the default export (the actual class is `EmbedSDK`). This is perfectly valid since it is a default export and can be named anything by the importer. The name `ChartsEmbedSDK` is actually clearer for readers.
- The `refreshInterval` option on `EmbedChartOptions` is marked as deprecated in the SDK types — the post does not use it, which is correct. The best practices section appropriately mentions setting refresh intervals without using the deprecated API.
- All SDK methods used in the post (`createChart`, `render`, `setFilter`) are confirmed to exist with the correct signatures in the v3.3.1 type definitions.
- The `filter` option in `createChart` is confirmed as a valid option via the `SharedEmbedOptions` interface.
- The embed URL format `https://charts.mongodb.com/charts-myapp-abc/embed/charts?id=chart-id&theme=light` follows the correct Atlas Charts embed URL pattern.
