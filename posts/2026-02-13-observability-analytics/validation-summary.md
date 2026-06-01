# Validation Summary: Using Observability Data for Business and Operational Analytics

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Observability analytics
- Prometheus and PromQL
- Prometheus recording rules
- Mermaid diagrams
- Python
- pandas
- scikit-learn
- statsmodels
- PostgreSQL SQL
- cAdvisor container metrics
- Data warehousing and BI pipelines

## Sources Consulted
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus histograms and summaries documentation: https://prometheus.io/docs/practices/histograms/
- Prometheus cAdvisor monitoring guide: https://prometheus.io/docs/guides/cadvisor/
- pandas read_csv API reference: https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.read_csv.html
- scikit-learn LinearRegression API reference: https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.LinearRegression.html
- statsmodels seasonal_decompose API reference: https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.seasonal_decompose.html
- PostgreSQL date/time functions documentation: https://www.postgresql.org/docs/current/functions-datetime.html
- PostgreSQL conditional expressions documentation: https://www.postgresql.org/docs/current/functions-conditional.html
- PostgreSQL aggregate functions documentation: https://www.postgresql.org/docs/current/functions-aggregate.html

## Issues Found
- The capacity planning PromQL example claimed to predict disk usage but queried `node_filesystem_avail_bytes`, which predicts available space rather than used space. Changed the query to predict `node_filesystem_size_bytes - node_filesystem_avail_bytes` with a subquery range so the calculated gauge expression can be passed to `predict_linear`.
- The recording rules comment said "weekly latency percentiles" while the rule group interval and metric names describe hourly aggregates. Updated the comment to "hourly latency percentiles."
- The cost attribution Python example used `container_cpu_usage_cores`, which is not the cAdvisor metric documented by Prometheus. Changed it to compute average cores from `rate(container_cpu_usage_seconds_total[5m])` over a 30-day subquery.

## Review Notes
- The SQL examples use PostgreSQL-specific syntax such as `date_trunc`, `interval`, and `::float`; that is technically valid but should be treated as PostgreSQL-oriented rather than portable SQL.
- The `seasonal_decompose` example is valid for hourly data with a weekly period, but statsmodels requires at least two complete seasonal cycles in the input series.
