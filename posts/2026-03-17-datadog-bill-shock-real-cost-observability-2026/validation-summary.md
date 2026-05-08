# Validation Summary: Your Datadog Bill Is About to Get Worse: The Real Cost of Observability in 2026

## Status
validated

## Post Type
Opinion piece / comparison

## Technologies Covered
- Datadog Infrastructure Monitoring
- Datadog APM
- Datadog Log Management
- Datadog Custom Metrics
- Datadog Synthetic Monitoring
- Datadog RUM
- Kubernetes
- OpenTelemetry
- Grafana, Prometheus, Loki, and Tempo
- OneUptime
- SigNoz, Highlight, and HyperDX

## Sources Consulted
- Datadog Pricing List: https://www.datadoghq.com/pricing/list/
- Datadog Billing documentation: https://docs.datadoghq.com/account_management/billing/
- Datadog Pricing Units documentation: https://docs.datadoghq.com/account_management/billing/pricing/
- Datadog Containers Billing documentation: https://docs.datadoghq.com/account_management/billing/containers/
- Datadog Custom Metrics Billing documentation: https://docs.datadoghq.com/account_management/billing/custom_metrics/
- Datadog Log Rehydration documentation: https://docs.datadoghq.com/logs/log_configuration/rehydrating/
- Datadog Archive Search documentation: https://docs.datadoghq.com/logs/log_configuration/archive_search/
- OpenTelemetry documentation: https://opentelemetry.io/docs/what-is-opentelemetry/
- Grafana Cloud pricing: https://grafana.com/pricing/
- OneUptime pricing: https://oneuptime.com/pricing
- OneUptime GitHub repository: https://github.com/OneUptime/oneuptime

## Issues Found
- The post stated that APM is $31/host/month and then labeled $40/host/month as "APM (Pro)" in the table. Datadog's pricing lists base APM at $31/host/month, APM Pro at $35/host/month, and APM Enterprise at $40/host/month when billed annually. I changed the narrative to say APM starts at $31 and changed the table row to "APM (Enterprise)".
- The post described custom metrics as "$0.05 each after the first 100" and modeled 10,000 metrics as $500. Datadog prices indexed custom metrics at $5 per 100 custom metrics after the included per-host allotment. I changed the text and table to use "$5/100 metrics" and clarified that the example is 10,000 metrics over the allotment.
- The Synthetics row used "$12/10k tests." Datadog currently lists Synthetic API Tests at $5 per 10,000 API test runs and Synthetic Browser Tests at $12 per 1,000 browser test runs. I changed the table to distinguish API and browser test pricing and recalculated the example as 50,000 API tests for $25.
- The RUM row used "$1.50/1k sessions." Datadog currently lists RUM Measure at $0.15 per 1,000 sessions and RUM Investigate at $3 per 1,000 sessions. I changed the row to show the current range and recalculated the example as $75-$1,500.
- The Kubernetes billing section said every pod gets an agent. Datadog recommends monitoring containers with a single containerized Agent per host, and Kubernetes nodes count as hosts. I changed the wording to explain the node Agent model and separate container allotment/overage behavior.
- The custom metrics section said every new dashboard creates custom metrics. Dashboards can surface custom metrics, but the billable metric count is driven by submitted metric names, tag value combinations, and some metric-type aggregation behavior. I changed the wording to focus on metric tag combinations, dimensions, and metric types.

## Review Notes
The post is not a code tutorial, but it contains concrete technical and pricing claims, so it was reviewed as a technically relevant comparison article rather than marked as not-code-blog. Pricing can change frequently; future reviews should re-check Datadog and alternative-vendor pricing pages before publication.
