# Validation Summary: How to Create a Scatter Plot in MongoDB Atlas Charts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Charts (scatter/bubble chart type)
- MongoDB Aggregation Pipeline (`$sample`, `$project`, `$arrayElemAt`)
- MongoDB Atlas sample dataset (`sample_mflix.movies`)

## Sources Consulted
- MongoDB Atlas Charts documentation — chart types and encoding channels: https://www.mongodb.com/docs/charts/chart-type-reference/scatter-chart/
- MongoDB Atlas Charts documentation — customize charts: https://www.mongodb.com/docs/charts/customize-charts/
- MongoDB Aggregation Pipeline reference — `$sample`, `$project`, `$arrayElemAt`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/
- MongoDB Atlas sample datasets — `sample_mflix` schema: https://www.mongodb.com/docs/atlas/sample-data/sample-mflix/

## Issues Found
1. **Jitter claim removed**: The post stated that Atlas Charts has a built-in "jitter" option for scatter plots to randomize point positions and reduce overplotting. Atlas Charts does not provide a native jitter feature. This is a technique available in other visualization tools (e.g., ggplot2, D3.js) but not in Atlas Charts. Removed the jitter bullet from the "Handling Overplotting" section and from the summary paragraph.

## Review Notes
- The aggregation pipeline example using `$sample` is a valid and practical approach for reducing overplotting in Atlas Charts, since Charts supports custom aggregation pipelines as data source filters.
- All field paths referenced from `sample_mflix.movies` (`tomatoes.viewer.numReviews`, `tomatoes.viewer.rating`, `genres`, `runtime`, `imdb.rating`) are accurate for the current sample dataset schema.
- The server metrics example is illustrative and not tied to a real Atlas collection, which is fine for a hypothetical use case demonstration.
