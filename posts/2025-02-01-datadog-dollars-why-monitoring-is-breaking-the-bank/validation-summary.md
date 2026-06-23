# Validation Summary: Datadog Dollars: Why Your Monitoring Bill Is Breaking the Bank

## Status
validated

## Post Type
Opinion / cost-analysis guide (persuasive piece with illustrative pricing examples; no code, commands, or configuration snippets, but it makes concrete, verifiable claims about Datadog's pricing models)

## Technologies Covered
- Datadog (Infrastructure Monitoring, APM, RUM, Synthetic Monitoring, Log Management)
- Observability / monitoring concepts (custom metrics, high-cardinality tags, time series, log retention, sampling/aggregation)
- Kubernetes auto-scaling (referenced as a host-count driver)
- OneUptime (positioned as an open-source alternative)

## Sources Consulted
- Datadog official pricing page — https://www.datadoghq.com/pricing/ (Infrastructure Pro $15/host/mo, APM $31/host/mo paired with Infra, Log ingestion $0.10/GB)
- Datadog RUM & Session Replay billing docs — https://docs.datadoghq.com/account_management/billing/rum/ (confirms RUM is billed per 1,000 sessions ingested, not per event)
- Datadog billing/pricing reference — https://docs.datadoghq.com/account_management/billing/pricing/
- Datadog Synthetic Monitoring pricing ($5 per 10,000 API test runs = $0.0005/test)

## Issues Found
1. **Incorrect RUM pricing model and rate.** The post stated RUM cost as "10 million events x $0.01/event = $100,000/month." This is wrong on two counts: Datadog bills RUM **per 1,000 sessions ingested, not per event**, and the per-unit rate was far too high. Corrected to "10 million sessions x $0.0015/session = $15,000/month," reflecting Datadog's published list price of $1.50 per 1,000 sessions.
2. **Slightly inaccurate Synthetic API test rate.** The post used "$0.0007/test." Datadog's published Synthetic pricing is $5 per 10,000 API test runs = $0.0005/test. Corrected the rate and the resulting line total to "1,000,000 API tests x $0.0005/test = $500/month."
3. **Updated dependent total.** The "Total Premium Features Cost" was recalculated from the corrected component figures: $1,550 (APM) + $15,000 (RUM) + $500 (Synthetic) = **$17,050/month** (previously stated as $102,250/month, which was driven by the erroneous RUM figure).

## Review Notes
- The remaining pricing figures are accurate against Datadog's current list pricing: Infrastructure Pro $15/host/month, APM $31/host/month (when paired with Infrastructure Monitoring), and Log ingestion $0.10/GB. The illustrative host-count and log-volume math all check out.
- The conceptual explanations are technically sound: per-host billing inflating with auto-scaling, high-cardinality tags multiplying time series (1 metric × 5 regions × 1M user IDs = 5M series), and the default 15-day log retention.
- All figures are explicitly framed as illustrative examples with hypothetical companies/volumes, so exact totals are scenario-dependent; the corrections bring the per-unit rates and billing units in line with Datadog's actual published pricing. Datadog pricing tiers (e.g., RUM Measure vs. Investigate, on-demand vs. annual commitments) vary, so readers should confirm current rates for their specific plan.
- The OneUptime self-host/open-source positioning and the external "Related Reading" links are claims/links, not technical assertions, and were left as-is.
