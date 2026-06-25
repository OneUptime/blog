# Validation Summary: Grafana Stack vs OneUptime: DIY Observability or Unified Platform?

## Status
validated

## Post Type
Comparison

## Technologies Covered
- Grafana (dashboards, visualization, alerting)
- Prometheus (metrics collection, PromQL)
- Loki (log aggregation)
- Tempo (distributed tracing)
- Grafana Cloud IRM / Alertmanager (alerting, on-call, incidents)
- OneUptime (unified observability platform)
- OpenTelemetry (instrumentation standard)

## Official Sources Consulted
- grafana.com/pricing (Grafana Cloud metrics/logs/traces and IRM pricing)
- grafana.com/docs / GitHub grafana/oncall (OnCall OSS archival status)
- oneuptime.com/pricing (Growth plan $22/month flat base; $0.10/GB ingestion)

## Issues Found and Fixed (review 2026-06-25)
- Corrected stale claim: the open-source Grafana OnCall was archived (read-only) in March 2026 and folded into the cloud-only Grafana Cloud IRM. The post previously presented Grafana OnCall OSS as a current self-hostable building block. Stack table, body copy, and the self-hosted infrastructure list were updated; an explicit 2026 caveat was added.
- Corrected Grafana Cloud on-call pricing: replaced "Grafana OnCall (Pro) ~$19/user" with Grafana Cloud IRM at ~$20/active user plus the $19/month platform fee; recalculated the Grafana Cloud total to ~$503-$823/month.
- Tightened the Grafana Cloud metrics estimate from ~$120 to ~$130 for 20K active series.

## Key Claims Verified
- OneUptime Growth plan is a flat $22/month base fee (not per-seat) - confirmed against oneuptime.com/pricing on 2026-06-25.
- OneUptime $0.10/GB telemetry ingestion model is current.
- Both platforms are correctly described as open source (OneUptime Apache-2.0, not open-core).
- Grafana's incident management / on-call being cloud-only in 2026 is accurate.
- Grafana's strengths (visualization depth, PromQL maturity, ecosystem, community) are fairly represented, as is OneUptime's weaker dashboard/PromQL story.
