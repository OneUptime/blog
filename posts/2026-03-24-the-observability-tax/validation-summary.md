# Validation Summary: The Observability Tax: How Monitoring Became Your Biggest Hidden Cost

## Status
not-code-blog

## Post Type
Opinion / analysis piece on observability cost trends. No code examples, CLI commands, or configuration snippets — the piece is a narrative argument with pricing math and high-level recommendations.

## Technologies Covered
- Datadog (APM, logs, traces) — pricing reference
- PagerDuty — incident management / on-call pricing reference
- Atlassian Statuspage — status page pricing reference
- OpenTelemetry (OTel) — collectors, filtering, sampling, routing
- Grafana + Prometheus — self-hosted metrics
- OpenSearch — self-hosted log aggregation
- Jaeger — self-hosted distributed tracing
- Kubernetes — deployment substrate for self-hosted observability
- S3 / GCS — cold storage for compliance log retention
- Compliance frameworks: SOC 2, ISO 27001, DORA

## Sources Consulted
- Datadog pricing page (https://www.datadoghq.com/pricing/) — host, log, and trace pricing tiers
- PagerDuty pricing page (https://www.pagerduty.com/pricing/) — per-user tier ranges
- Atlassian Statuspage pricing (https://www.atlassian.com/software/statuspage/pricing) — Business tier
- OpenTelemetry Collector documentation (https://opentelemetry.io/docs/collector/) — filtering / sampling / routing at the edge
- Grafana Labs, Prometheus, OpenSearch, and Jaeger project docs — capability claims
- EU DORA regulation overview — operational resilience and ICT monitoring requirements
- SOC 2 Trust Services Criteria and ISO/IEC 27001 Annex A — monitoring / logging / incident response controls

## Issues Found
No technical issues found.

- The illustrative pricing figures ($23/host APM, $1.70/GB/day logs, $5/million spans, $29/user incident mgmt, $399 status page, $29/user on-call) are within plausible ranges of currently published vendor pricing pages.
- The sample arithmetic sums correctly: $4,600 + $5,100 + $7,500 + $2,175 + $399 + $870 = $20,644.
- Compliance framework attributions are accurate: SOC 2 and ISO 27001 both require monitoring / logging / incident response controls, and DORA (EU financial-services regulation) does impose ICT operational resilience and monitoring obligations.
- Open-source tool descriptions are correct: Prometheus for metrics, OpenSearch for logs, Jaeger for traces, OpenTelemetry for vendor-neutral telemetry collection.

## Review Notes
- Pricing in this space changes frequently; the vendor list prices cited reflect 2025–2026 public pricing pages and may drift. Readers should confirm against current pricing pages before quoting figures.
- The claim "log management ~$1.70/GB ingested/day" conflates ingestion and indexing/retention — Datadog's raw ingestion list price is lower, with indexing/retention multiplying effective cost. The figure is defensible as an effective per-GB cost once retention is included, but a future revision could split the two for clarity.
- The 15–30% observability-to-infra ratio and 2–5x AI telemetry multiplier are industry-reported ranges rather than claims tied to a specific published study; presenting them as observed ranges (as the post does) is appropriate.
- No code or configuration is present, so classification is "not-code-blog" rather than "validated".
