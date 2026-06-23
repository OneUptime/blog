# Validation Summary: How to Display Points on Worldmap Panel in Grafana

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Grafana Worldmap panel
- Grafana Geomap panel
- Grafana plugin installation
- Prometheus scrape configuration and PromQL
- Prometheus Kubernetes service discovery and relabeling
- InfluxQL
- Grafana dashboard variables and transformations

## Sources Consulted
- Grafana Worldmap panel README: https://github.com/grafana/worldmap-panel
- Grafana Geomap documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/geomap/
- Grafana plugin installation documentation: https://grafana.com/docs/grafana/latest/administration/plugin-management/plugin-install/
- Grafana Docker plugin installation documentation: https://grafana.com/docs/grafana/latest/setup-grafana/installation/docker/
- Grafana transformations documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/query-transform-data/transform-data/
- Grafana Prometheus template variables documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus query operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The post described the legacy Worldmap panel without noting its unsupported status. Updated the installation section to state that the Worldmap plugin is no longer supported and that Geomap is the native panel for Grafana 8+.
- The Kubernetes plugin installation example used the older `GF_INSTALL_PLUGINS` environment variable. Updated it to `GF_PLUGINS_PREINSTALL_SYNC`, which is the current documented Helm/Kubernetes-style plugin preinstall variable.
- The country-code Worldmap example implied table `labelField` matching. The legacy Worldmap panel matches time series names or aliases against country keys for `locationData: "countries"`, so the snippet now sets the Prometheus legend to `{{country_code}}`.
- The geohash Worldmap example used `locationData: "geohash"` for an InfluxDB table result. Updated it to `locationData: "table"` with `queryType: "geohash"` for a table containing a geohash column.
- The Geomap section used Prometheus label-based latitude and longitude values without noting that Geomap coordinate mode expects numeric fields. Added a note to apply Labels to fields and convert latitude/longitude fields to numeric values.
- The custom JSON location mapping example implied table `labelField` matching. Updated it to use a time-series legend matching the custom JSON location keys.
- The dashboard variable example used deprecated classic `label_values(...)` syntax. Updated it to use `query_result(...)` with regex extraction for the `region` and `country` variables.

## Review Notes
The JSON snippets are illustrative panel fragments rather than complete importable dashboards.
