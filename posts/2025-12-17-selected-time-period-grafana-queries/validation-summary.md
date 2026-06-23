# Validation Summary: How to Use Selected Time Period in Grafana Queries

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Grafana dashboard variables and macros
- Prometheus and PromQL
- InfluxDB Flux and InfluxQL
- PostgreSQL and MySQL Grafana SQL macros
- Elasticsearch raw DSL queries in Grafana

## Sources Consulted
- Grafana global variables documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/global-variables/
- Grafana Prometheus template variables documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- Grafana Prometheus query editor documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/query-editor/
- Grafana Prometheus troubleshooting documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/troubleshooting/
- Grafana InfluxDB query editor documentation: https://grafana.com/docs/grafana/latest/datasources/influxdb/query-editor/
- Grafana PostgreSQL query editor documentation: https://grafana.com/docs/grafana/latest/datasources/postgres/query-editor/
- Grafana MySQL query editor documentation: https://grafana.com/docs/grafana/latest/datasources/mysql/query-editor/
- Grafana Elasticsearch query editor documentation: https://grafana.com/docs/grafana/latest/datasources/elasticsearch/query-editor/
- Prometheus querying basics documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The post implied that all listed built-in variables, including `$__range`, work across PromQL, InfluxDB, SQL, and more. Grafana documents `$__range`, `$__range_s`, and `$__range_ms` as currently supported for Prometheus and Loki. Updated the TL;DR and variable table to make data-source support accurate.
- The post said Grafana calculates `$__rate_interval` as 4x the scrape interval. Grafana documents the formula as `max($__interval + scrape_interval, 4 * scrape_interval)`. Updated the explanation and configuration step.
- The troubleshooting example said to use a "slightly larger range" but showed `increase(metric[$__range] @ end())`, which pins evaluation at the range end rather than making the range larger. Updated the comment to describe what the query actually does.
- The rate-spike troubleshooting example suggested `irate(metric[5m])`. Prometheus documents `irate()` as using the last two samples and recommends it for volatile, fast-moving counters, which can make spike-focused graphs noisier. Replaced the suggestion with `$__rate_interval` or a longer range vector.

## Review Notes
The remaining examples are broadly accurate for Grafana 13.1-era documentation. The Elasticsearch raw DSL example is valid in Grafana's experimental raw query editor; future edits could mention that feature-toggle caveat if the post is expanded.
