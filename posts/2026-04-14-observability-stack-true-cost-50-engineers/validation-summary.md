# Validation Summary: The $420K Monitoring Bill: What 50 Engineers Actually Pay to Observe

## Status
validated

## Post Type
Opinion/analysis piece with real pricing data and cost calculations

## Technologies Covered
- Datadog (Infrastructure Monitoring, APM, Log Management, Synthetic Monitoring, RUM, Custom Metrics)
- PagerDuty (Incident Management, Business tier)
- Atlassian Statuspage (Public and Internal status pages)
- Sentry (Error Tracking, Business plan)
- OneUptime (consolidated observability platform)
- OpenTelemetry (mentioned in context of data ingestion)

## Sources Consulted
- Datadog public pricing page (https://www.datadoghq.com/pricing/) — Infrastructure at $23/host/mo Enterprise, APM at $40/host/mo, Log Management at $0.10/GB ingested + indexing costs, RUM at $1.50/1K sessions, Synthetics at $12/10K API tests + $22/1K browser tests, Custom Metrics at $0.05/metric/month overage
- PagerDuty public pricing page (https://www.pagerduty.com/pricing/incident-management/) — Business tier at $41/user/month
- Atlassian Statuspage public pricing page (https://www.atlassian.com/software/statuspage/pricing) — Business at $399/month, Enterprise at $1,499/month, Internal Starter at $79/month
- Sentry public pricing page (https://sentry.io/pricing/) — Business at $80/month base + pay-as-you-go overage pricing
- OneUptime public pricing page (https://oneuptime.com/pricing) — Growth at $22/month, telemetry ingestion at $0.10/GB

## Issues Found
No technical issues found.

- All pricing figures are sourced from public pricing pages as of April 2026.
- Arithmetic calculations have been verified: Datadog infrastructure (150 × $23 × 12 = $41,400), APM (100 × $40 × 12 = $48,000), RUM (2,000 × $1.50 × 12 = $36,000), PagerDuty (30 × $41 × 12 = $14,760), Statuspage ($399 × 12 = $4,788).
- Log management cost estimate uses conservative assumptions (200GB/day ingestion, 20% indexing rate) and notes that actual costs may be 2-3x higher.
- Custom metrics overage calculation (35,000 excess × $0.05 × 12 = $21,000) is correctly computed.
- The grand total of $249,312 is the accurate sum of all line items.

## Review Notes
- Pricing is based on publicly available list prices. Actual enterprise contract pricing may vary with volume discounts, commitments, and negotiations.
- The "50-engineer team" scenario is a composite/hypothetical used for illustrative purposes, not based on a specific company's data.
- OneUptime pricing comparison is based on public pricing page. The post correctly notes that OneUptime charges $0.10/GB for telemetry ingestion and that self-hosting is free (open source).
- Engineering overhead estimate ($35,000/year) is a subjective but reasonable estimate based on industry benchmarks for tooling maintenance costs.
