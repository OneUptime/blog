# Validation Summary: How to Use Worldmap Plugin with Table Data in Grafana

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Grafana Geomap panel
- Grafana Worldmap panel
- Grafana transformations
- Prometheus and PromQL
- InfluxDB and InfluxQL
- Grafana dashboard JSON
- Mermaid diagrams

## Sources Consulted
- Grafana Geomap documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/geomap/
- Grafana Prometheus query editor documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/query-editor/
- Grafana transformations documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/query-transform-data/transform-data/
- Grafana InfluxDB query editor documentation: https://grafana.com/docs/grafana/latest/datasources/influxdb/query-editor/
- Grafana Worldmap panel plugin catalog entry: https://grafana.com/orgs/grafana/plugins
- Prometheus data model documentation: https://prometheus.io/docs/concepts/data_model/
- Prometheus querying basics documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/
- InfluxDB InfluxQL GROUP BY documentation: https://docs.influxdata.com/influxdb/v2/query-data/influxql/explore-data/group-by/

## Issues Found
- The post described Worldmap as generally usable alongside Geomap without noting that Grafana's Worldmap panel is deprecated. Updated the introduction to state that Worldmap is deprecated and Geomap should be used for new dashboards.
- The coordinate requirements were framed as Worldmap requirements even though the examples use Geomap configuration. Updated the wording to clarify this is for coordinate-based Geomap marker layers.
- The first Geomap JSON example configured marker styling but did not configure the layer location fields. Added the `location` block with coordinate mode and latitude/longitude field mappings.
- Prometheus examples stored latitude and longitude as labels, but Prometheus label values are strings and Grafana Geomap coordinate mode expects numeric fields. Added instructions to convert `latitude`/`longitude` and `lat`/`lon` fields to Numeric with Grafana's Convert field type transformation.
- The country lookup example used two-letter country codes even though Grafana's built-in country gazetteer examples use three-letter country codes. Updated examples and troubleshooting notes to use ISO 3166-1 alpha-3 style codes such as `USA`, `GBR`, and `JPN`.
- The transformation section suggested using Add field from calculation to add coordinate columns, which is not the right built-in transformation for resource-backed geographic lookup. Updated it to use Lookup fields from resource for country, state, or airport lookups.
- The join instructions referred to an Outer join transformation as if it were a separate transformation. Updated the wording to Grafana's Join by field transformation with the outer join mode for SQL-like/tabular data.
- The InfluxQL query grouped by `location`, `latitude`, and `longitude` without clarifying that InfluxQL can group by tags but not fields. Added a note that these columns must be tags for that query shape.

## Review Notes
All JSON snippets were parsed locally after edits. The dashboard JSON examples are illustrative snippets rather than full export-ready dashboards because datasource UIDs and plugin version metadata are environment-specific.
