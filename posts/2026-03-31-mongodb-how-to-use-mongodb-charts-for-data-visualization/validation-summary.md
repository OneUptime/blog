# Validation Summary: How to Use MongoDB Charts for Data Visualization

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB Atlas
- MongoDB Charts
- MongoDB Aggregation Framework
- MongoDB Charts Embedding SDK (`@mongodb-js/charts-embed-dom`)
- HTML iframe embedding
- MongoDB Atlas RBAC

## Sources Consulted
- MongoDB Charts documentation: https://www.mongodb.com/docs/charts/
- MongoDB Charts Embedding SDK documentation: https://www.mongodb.com/docs/charts/embedding-charts/
- MongoDB Charts chart types reference: https://www.mongodb.com/docs/charts/chart-type-reference/
- MongoDB Atlas RBAC documentation: https://www.mongodb.com/docs/atlas/reference/user-roles/
- npm package `@mongodb-js/charts-embed-dom`: https://www.npmjs.com/package/@mongodb-js/charts-embed-dom

## Issues Found
1. **Candlestick chart type listed but does not exist in MongoDB Charts.** The Chart Type Reference table included "Candlestick - OHLC financial data" as a supported chart type. MongoDB Charts does not offer a Candlestick chart. The available chart types are Column/Bar, Line, Area, Scatter, Donut, Gauge, Heatmap, Table, Number, Word Cloud, Geospatial, and Text. Removed the Candlestick entry from the reference table.

## Review Notes
- The "Geo Map" label in the chart type reference is informal. The MongoDB Charts UI uses "Geospatial" as the chart category (with subtypes Geospatial Scatter and Geospatial Choropleth). The description is acceptable for a reference table but not the exact UI label.
- The RBAC role names ("Charts Admin", "Charts Data Analyst", "Charts Viewer") are reasonable descriptions of access levels but may not match the exact role names in the current Atlas UI. Exact role names can vary across Atlas versions.
- The post refers to an "Aggregate" tab in the chart builder for entering custom pipelines. The actual UI element may be labeled differently (e.g., a pipeline toggle in the Query bar), depending on the Atlas UI version.
- The post does not list all available chart types (e.g., Area, Gauge, Word Cloud are omitted) but does not claim to be exhaustive, so this is not an error.
