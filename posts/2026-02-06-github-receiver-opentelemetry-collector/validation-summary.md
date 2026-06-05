# Validation Summary: How to Configure the GitHub Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- GitHub Receiver
- GitHub REST and GraphQL APIs
- GitHub Actions webhooks
- Bearer Token Authenticator Extension
- OpenTelemetry Collector processors and exporters

## Sources Consulted
- OpenTelemetry Collector Contrib GitHub Receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/githubreceiver
- OpenTelemetry Collector Contrib GitHub Receiver generated metrics documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/githubreceiver/documentation.md
- OpenTelemetry Collector Contrib GitHub Receiver scraper limitations: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/githubreceiver/internal/scraper/githubscraper/README.md
- OpenTelemetry Collector Contrib GitHub Receiver config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/githubreceiver/config.go
- OpenTelemetry Collector Contrib GitHub scraper config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/githubreceiver/internal/scraper/githubscraper/config.go
- OpenTelemetry Bearer Token Authenticator Extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/bearertokenauthextension
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- GitHub webhook events and payloads documentation: https://docs.github.com/en/webhooks/webhook-events-and-payloads

## Issues Found
- The original examples used unsupported top-level `repository` and `token` fields. Replaced them with the supported `scrapers` configuration, `github_org`, optional `search_query`, and `bearertokenauth` extension.
- The original examples used unsupported `github.*` metric names such as `github.repository.stars`, `github.workflow.run.duration`, and `github.issue.count`. Replaced them with the receiver's documented `vcs.*` metrics.
- The original post described issue metrics, workflow metrics, repository stars/forks/watchers, and contributor commit/addition/deletion metrics as receiver outputs. Corrected the scope to the documented VCS metrics and clarified that GitHub Actions workflow data is received as traces from webhook events.
- The original GitHub App authentication block used an unsupported inline `github_app` configuration. Replaced it with the supported webhook configuration and clarified GitHub App setup for `workflow_run` and `workflow_job` events.
- The original rate limit example placed retry settings at the wrong level and used unsupported retry fields. Moved `retry_on_failure` under the scraper and updated the fields to the documented retry configuration.
- Several transform examples referenced nonexistent attributes such as `github.repository`, `labels`, `duration_ms`, `merged_prs`, and `total_prs`. Replaced those examples with resource and batch processor examples that do not depend on nonexistent receiver attributes.
- The production example used `service.telemetry.metrics.address`, which is ignored in Collector versions v0.123.0 and newer. Replaced it with `service.telemetry.metrics.level`.

## Review Notes
The GitHub Receiver is currently documented as alpha for metrics and traces in the receiver README, while its generated metadata marks traces as development. Metric names and attributes are not stable and should be rechecked before future publication or major Collector upgrades.
