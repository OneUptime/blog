# Validation Summary: Uptime Kuma vs OneUptime: Choosing the Right Open Source Monitoring Tool

## Status
validated

## Post Type
Comparison guide

## Technologies Covered
- Uptime Kuma
- OneUptime
- Uptime monitoring
- Status pages
- Incident management
- On-call alerting
- OpenTelemetry logs, traces, and metrics
- Docker Compose, Kubernetes, PostgreSQL, ClickHouse, and Redis

## Sources Consulted
- Uptime Kuma GitHub README: https://github.com/louislam/uptime-kuma
- Uptime Kuma Status Page wiki: https://github.com/louislam/uptime-kuma/wiki/Status-Page
- OneUptime GitHub README: https://github.com/OneUptime/oneuptime
- OneUptime getting started docs: https://oneuptime.com/docs
- OneUptime Docker Compose installation docs: https://oneuptime.com/docs/installation/docker-compose
- OneUptime pricing page: https://oneuptime.com/pricing
- OneUptime monitoring product page: https://oneuptime.com/product/monitoring
- OneUptime Docker monitor docs: https://oneuptime.com/docs/monitor/docker-monitor
- OneUptime on-call product page: https://oneuptime.com/product/on-call
- OneUptime status page product page: https://oneuptime.com/product/status-page

## Issues Found
- The feature table said Uptime Kuma has no API monitoring. Uptime Kuma does not have a separate OneUptime-style API monitor product category, but the official README lists HTTP(S) JSON Query monitoring, so the table now says "Partial (HTTP/JSON checks)."
- The OneUptime notification channel list was too narrow. Official OneUptime docs and product pages list email, SMS, phone calls, push notifications, Slack/Teams, webhooks/workflows, and 5000+ workflow integrations, so the table and explanatory paragraph were updated.
- The OneUptime resource guidance said "4+ GB recommended." Official Docker Compose docs list 8 GB RAM for homelab/minimal use and 16 GB RAM as recommended, so the resource section was corrected.

## Review Notes
The post is a technical comparison rather than a code tutorial. No code examples, commands, or configuration snippets required syntax validation. Pricing and feature claims are time-sensitive and should be rechecked before publication because both projects, especially OneUptime Cloud pricing and hosted feature packaging, change over time.
