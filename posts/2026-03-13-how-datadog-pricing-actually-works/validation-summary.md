# Validation Summary: How Datadog's Pricing Actually Works (And Why Your Bill Keeps Growing)

## Status
validated

## Post Type
Reference / pricing guide

## Technologies Covered
- Datadog Infrastructure Monitoring
- Datadog Container Monitoring
- Datadog Custom Metrics and Metrics without Limits
- Datadog Log Management
- Datadog APM and indexed spans
- Datadog RUM
- Datadog Synthetic Monitoring
- Datadog Database Monitoring
- Datadog Serverless Monitoring
- OneUptime, Grafana Loki/Tempo, SigNoz, New Relic, Elastic Cloud

## Sources Consulted
- Datadog pricing list: https://www.datadoghq.com/pricing/list/
- Datadog billing and pricing documentation: https://docs.datadoghq.com/account_management/billing/pricing/
- Datadog container billing documentation: https://docs.datadoghq.com/account_management/billing/containers/
- Datadog custom metrics billing documentation: https://docs.datadoghq.com/account_management/billing/custom_metrics/
- Datadog Metrics without Limits documentation: https://docs.datadoghq.com/metrics/metrics-without-limits/
- Datadog log indexes documentation: https://docs.datadoghq.com/logs/log_configuration/indexes/
- Datadog APM billing documentation: https://docs.datadoghq.com/account_management/billing/apm_tracing_profiler/
- Datadog product allotments: https://www.datadoghq.com/pricing/allotments/
- OneUptime website: https://oneuptime.com/
- OneUptime GitHub repository: https://github.com/oneuptime/oneuptime

## Issues Found
- Container billing was described as "5 containers = 1 host" with a $900/month example. Updated it to Datadog's current host-based container allotment model: Pro includes 5 containers per host, Enterprise includes 10, and overages are billed per extra container.
- Serverless billing was described as $5 per million Lambda invocations. Updated it to distinguish Serverless Workload Monitoring per active function from Serverless Functions APM per million traced invocations.
- Log indexing listed 30-day annual retention at $2.55 per million events. Corrected it to $2.50 per million events on an annual plan and adjusted the example total.
- The log example mixed indexed GB/day with monthly indexed event pricing. Reworded the assumption so the calculation is based on monthly indexed events.
- APM on-demand prices were outdated. Updated APM, APM Pro, and APM Enterprise on-demand rates to the current Datadog pricing list.
- The indexed span example framed overage as per-service rather than based on host allotments and aggregate trace volume. Reworded it to avoid implying a service-level billing unit.
- RUM pricing used an outdated $1.50 per 1,000 sessions figure. Updated it to current RUM Measure and RUM Investigate pricing and adjusted the session example.
- The compound-cost table used outdated container, custom metric, RUM, and log-indexing assumptions. Recalculated affected rows and the monthly/yearly totals.
- The add-on list used outdated CSPM wording/pricing. Updated it to Cloud Security Management Pro with current annual and month-to-month list pricing.
- The Metrics without Limits section incorrectly implied it is simply an additional feature for tag/aggregation before indexing. Updated it to reflect Datadog's indexed and ingested custom metric billing behavior for configured metrics.
- The log drift section referred to hard ingestion caps. Updated it to Datadog's documented index daily quotas and exclusion filters, which control indexed log volume rather than stopping all ingestion.
- The container-density explanation used the outdated "5 containers = 1 host" wording. Updated it to the current included-container ratio model.

## Review Notes
Pricing is time-sensitive and varies by Datadog site, contract, commitment, and discounts. The post now matches publicly listed US pricing and documented billing mechanics as of 2026-05-13, but future reviews should re-check Datadog's pricing list before publication.
