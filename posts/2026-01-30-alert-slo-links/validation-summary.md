# Validation Summary: How to Build Alert SLO Links

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Alertmanager configuration
- Alertmanager Go notification templates
- Slack alert notifications
- Generic webhook alert routing
- TypeScript
- Node.js
- Express
- SLOs, SLIs, error budgets, and burn-rate alerting
- URLSearchParams / URL encoding

## Sources Consulted
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Alertmanager notification template reference: https://prometheus.io/docs/alerting/latest/notifications/
- Prometheus Alertmanager notification template examples: https://prometheus.io/docs/alerting/latest/notification_examples/
- Google SRE Workbook, Alerting on SLOs: https://sre.google/workbook/alerting-on-slos/
- Google Cloud Observability, Alerting on your burn rate: https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/alerting-on-budget-burn-rate
- Node.js crypto documentation for `randomUUID`: https://nodejs.org/api/crypto.html
- Express API documentation: https://expressjs.com/en/api/
- TypeScript documentation: https://www.typescriptlang.org/docs/

## Issues Found
- **Alertmanager template was not wired to the Slack receiver.** The config loaded templates but only configured a webhook receiver, so the `slack.slo.message` template would not be used by Alertmanager. Added a `slack_configs` receiver entry with `api_url_file`, `channel`, `title`, `text`, and `send_resolved`, matching Alertmanager's documented Slack config fields.
- **Template fields did not match the enrichment code.** The Slack template read `error_budget_remaining` and `burn_rate` from labels and appended `%` / `x`, while the TypeScript enricher writes formatted values into annotations. Updated the template to read `.Annotations.error_budget_remaining` and `.Annotations.burn_rate` directly.
- **Cross-file TypeScript snippets were missing exports and imports.** The examples imported `SLOConfig`, `ErrorBudgetStatus`, `AlertCorrelator`, `MultiSLOImpactAssessor`, and `BurnRateCalculator` from separate files, but the original snippets did not export all of those symbols. Added the needed exports/imports, including `enrichAlertWithSLO` in the pipeline snippet.
- **Rolling-window burn rate calculation reused period-to-date logic incorrectly.** The original multi-window burn-rate code passed 1h/6h/24h metrics into a calculator that divides by elapsed fraction of the full SLO window, which would overstate rolling-window burn rates. Added `calculateWindowBurnRate`, which normalizes the observed window error rate by the error budget ratio, consistent with burn rate being normalized so values greater than 1 indicate an unsustainable error rate.
- **SLO names were not URL-encoded in path segments.** Query parameters used `URLSearchParams`, but path segments interpolated raw SLO names. Added `encodeURIComponent` for the SLO path segment in trend links.
- **Dependency traversal could recurse forever on cyclic service graphs.** Added a `visited` set to `findDependentServices` so dependency cycles do not cause infinite recursion.
- **Node UUID generation relied on ambient `crypto`.** Replaced `crypto.randomUUID()` with an explicit `randomUUID` import from `node:crypto`, which is the documented Node.js API.
- **Pipeline wording overstated completeness.** The final pipeline still depends on application-specific variables and functions such as `dependencies`, `sloConfigs`, `metricsClient`, `getSLOConfigForAlert`, `sloMappings`, and `sendToNotificationSystem`. Changed the wording from "complete" to "example" to avoid implying it is standalone.

## Review Notes
- The overall SRE guidance is accurate: SLO-based alerting, error-budget context, and multi-window burn-rate views align with Google SRE guidance.
- Alertmanager route fields such as `group_by`, `group_wait`, `group_interval`, `repeat_interval`, `receiver`, `webhook_configs`, `send_resolved`, and `templates` are current and documented.
- The TypeScript snippets remain illustrative and assume application-specific metrics, dependency, mapping, and notification implementations exist.
