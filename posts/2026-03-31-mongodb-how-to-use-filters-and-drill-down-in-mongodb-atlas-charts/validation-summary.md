# Validation Summary: How to Use Filters and Drill-Down in MongoDB Atlas Charts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas Charts
- MongoDB Atlas Charts Embedding SDK (`@mongodb-js/charts-embed-dom`)
- MongoDB query filter syntax (extended JSON)
- Dashboard filter controls (Checkbox Group, Select, Date Picker, Number Slider, Search)

## Sources Consulted
- MongoDB Atlas Charts Embedding SDK documentation: https://www.mongodb.com/docs/charts/embedding-charts-sdk/
- MongoDB Atlas Charts Filter Embedded Charts: https://www.mongodb.com/docs/charts/filter-embedded-charts/
- MongoDB Atlas Charts Filter Embedded Dashboards: https://www.mongodb.com/docs/charts/filter-embedded-dashboards/
- MongoDB Charts Embed SDK GitHub repository: https://github.com/mongodb-js/charts-embed-sdk
- `@mongodb-js/charts-embed-dom` npm package: https://www.npmjs.com/package/@mongodb-js/charts-embed-dom

## Issues Found

1. **Incorrect SDK instantiation for dashboard embedding (line ~150)**: The code called `ChartsEmbedSDK.createDashboard()` as if it were a static method. `ChartsEmbedSDK` is a class that must be instantiated with `new` before calling instance methods. Fixed by adding proper `import`, `new ChartsEmbedSDK(...)` instantiation, and calling `sdk.createDashboard()` on the instance — matching the correct pattern already shown in the later "Injecting Filters Dynamically" section.

2. **Incorrect URL query parameter name (line ~144)**: The embedded dashboard URL used `?filters=` (plural) but the correct Atlas Charts query parameter is `?filter=` (singular). Fixed to `?filter=`.

## Review Notes
- The first code example (lines 30-42) uses `ISODate()` which is a MongoDB shell function, not valid JSON. However, the comment clearly labels it as "Equivalent MongoDB query" rather than something to paste into the Charts filter box, so this is acceptable.
- The dashboard filter type names (Checkbox Group, Select, Date Picker, Number Slider, Search) are reasonable descriptions of the UI controls, though the exact labels in the Atlas Charts UI may vary slightly across versions.
- The post correctly distinguishes between chart-level filters, dashboard filters, and click-to-filter as three separate filtering mechanisms.
- The embedding SDK code in the "Injecting Filters Dynamically" section is correct and demonstrates proper usage of `createChart()`, `render()`, `setFilter()`, and `getFilter()`.
