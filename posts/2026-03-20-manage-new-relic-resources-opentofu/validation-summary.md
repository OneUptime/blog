# Validation Summary: How to Manage New Relic Resources with OpenTofu - Resources

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- New Relic provider
- NRQL
- New Relic alert policies, workflows, notification channels, dashboards, and synthetics monitors

## Sources Consulted
- New Relic provider configuration guide: https://raw.githubusercontent.com/newrelic/terraform-provider-newrelic/main/website/docs/guides/provider_configuration.html.markdown
- `newrelic_nrql_alert_condition` resource docs: https://raw.githubusercontent.com/newrelic/terraform-provider-newrelic/main/website/docs/r/nrql_alert_condition.html.markdown
- `newrelic_notification_channel` resource docs: https://raw.githubusercontent.com/newrelic/terraform-provider-newrelic/main/website/docs/r/notification_channel.html.markdown
- `newrelic_notification_destination` resource docs: https://raw.githubusercontent.com/newrelic/terraform-provider-newrelic/main/website/docs/r/notification_destination.html.markdown
- `newrelic_notification_destination` data source docs: https://raw.githubusercontent.com/newrelic/terraform-provider-newrelic/main/website/docs/d/notification_destination.html.markdown
- `newrelic_workflow` resource docs: https://raw.githubusercontent.com/newrelic/terraform-provider-newrelic/main/website/docs/r/workflow.html.markdown
- `newrelic_one_dashboard` resource docs: https://raw.githubusercontent.com/newrelic/terraform-provider-newrelic/main/website/docs/r/one_dashboard.html.markdown
- `newrelic_synthetics_monitor` resource docs: https://raw.githubusercontent.com/newrelic/terraform-provider-newrelic/main/website/docs/r/synthetics_monitor.html.markdown
- `newrelic_entity_tags` resource docs: https://raw.githubusercontent.com/newrelic/terraform-provider-newrelic/main/website/docs/r/entity_tags.html.markdown
- New Relic API keys docs: https://docs.newrelic.com/docs/apis/intro-apis/new-relic-api-keys/
- Synthetic monitor public minion IPs: https://docs.newrelic.com/docs/synthetics/new-relic-synthetics/administration/synthetics-public-minion-ips/

## Issues Found
- The prerequisites listed an Admin API key as acceptable input. I changed this to a User API key (personal API key), because New Relic documents admin keys as deprecated and the provider documentation expects a user/personal key.
- The Slack example tried to create a `newrelic_notification_destination` with `type = "SLACK"`. I replaced that with a `data "newrelic_notification_destination"` lookup and added a brief note, because the provider documentation states Slack destinations cannot be created via Terraform/OpenTofu.
- The provider configuration comment only mentioned `US` and `EU` as region values. I updated it to include `JP`, which is also a valid provider region.
- The best-practices section said `newrelic_entity_tags` could label all managed resources. I narrowed that statement to managed entities that expose a GUID, because the resource applies to New Relic entities rather than every provider resource.

## Review Notes
- The remaining resource examples align with current provider documentation, including `newrelic_alert_policy`, `newrelic_nrql_alert_condition`, `newrelic_one_dashboard`, and `newrelic_synthetics_monitor`.
- The synthetics example uses a `SIMPLE` monitor, which remains valid without browser runtime fields. Browser-based synthetic monitors have additional runtime requirements after the legacy runtime end-of-life.
- The post uses OpenTofu, while the official provider documentation is published under Terraform. The validated HCL syntax and provider resource names are the same ones OpenTofu consumes.
- The `version = "~> 3.0"` constraint is still technically valid and will continue to select current 3.x releases of the provider.
