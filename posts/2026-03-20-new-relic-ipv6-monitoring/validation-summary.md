# Validation Summary: How to Configure New Relic for IPv6 Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- New Relic Infrastructure Agent (`newrelic-infra`)
- `nri-flex` integration
- New Relic Synthetic Monitors (Simple / Scripted API)
- New Relic NerdGraph API (`syntheticsCreateSimpleMonitor` mutation)
- New Relic REST API v2 (`alerts_nrql_conditions`)
- NRQL (`SyntheticCheck`, `NetworkSample` event types)
- IPv6 (literal addressing, `ping6`)

## Sources Consulted
- [Infrastructure agent configuration settings](https://docs.newrelic.com/docs/infrastructure/infrastructure-agent/configuration/infrastructure-agent-configuration-settings/)
- [Config file template (newrelic-infra.yml)](https://docs.newrelic.com/docs/infrastructure/install-infrastructure-agent/configuration/config-file-template-newrelic-infrayml/)
- [Run on-host integrations manually (dry-run)](https://docs.newrelic.com/docs/infrastructure/host-integrations/troubleshooting/run-integrations-manually/)
- [nri-flex commands API reference](https://github.com/newrelic/nri-flex/blob/master/docs/apis/commands.md)
- [New Relic Flex integration overview](https://docs.newrelic.com/docs/infrastructure/host-integrations/host-integrations-list/flex-integration-tool-build-your-own-integration/)
- [Manage your synthetic monitors (NerdGraph)](https://docs.newrelic.com/docs/apis/nerdgraph/examples/nerdgraph-synthetics-tutorial/)
- [Write synthetic API tests](https://docs.newrelic.com/docs/synthetics/synthetic-monitoring/scripting-monitors/write-synthetic-api-tests/)
- [Add custom attributes to synthetic monitoring data](https://docs.newrelic.com/docs/synthetics/synthetic-monitoring/scripting-monitors/add-custom-attributes-synthetic-monitoring-data/)
- [Events reported by synthetic monitoring](https://docs.newrelic.com/docs/data-apis/understand-data/event-data/events-reported-synthetic-monitoring/)
- [REST API calls for alerts](https://docs.newrelic.com/docs/alerts/scale-automate/rest-api/rest-api-calls-alerts/)
- [Intro to using alerts with NerdGraph](https://docs.newrelic.com/docs/alerts/scale-automate/nerdgraph/nerdgraph-api-examples/)
- [nri-network-telemetry repo](https://github.com/newrelic/nri-network-telemetry)

## Issues Found

1. **`network_interface_filters` used a non-existent `index` key.** The agent config schema uses `prefix` and `index-1` (the suffix that comes after a leading digit) — there is no `index` field. Fixed the YAML to use `index-1` with a string value (e.g., `tun`) and rewrote the surrounding comments to describe what the filters actually do.

2. **Misleading "force IPv6" comment on `collector_url`.** Setting `collector_url: "https://infra-api.newrelic.com"` does not force IPv6; it is just the default collector base URL, and the agent uses whatever the OS resolver returns. Reworded the comment to accurately describe how the agent picks IPv6 (via the host's network stack/resolver preference).

3. **`newrelic-infra --dry_run` was misused as an "is the agent sending data" check.** `dry_run` (added in agent v1.27.0) executes integrations from a config file you point at with `-integration_config_path` and prints their output. It does not validate that the agent process is running or shipping data. Replaced the command with `systemctl status newrelic-infra`, which is what the surrounding text actually claims to do.

4. **Step 2 referenced non-existent / mis-scoped integrations.** `nrping` is not a real New Relic integration, and `nri-network-telemetry` is for SFlow/IPFIX flow collection from network devices (not for ICMP pinging IPv6 hosts). The configuration block that follows uses `nri-flex`, so I rewrote the section header and lede to accurately describe `nri-flex` wrapping `ping6`.

5. **Step 4 was labelled "Scripted Browser" but used HTTP-client code.** Scripted Browser monitors run Selenium via `$browser`; the code in the post is API-style. Also, `var $http = require('request')` is wrong — `$http` is a runtime-provided global (now backed by `got` with a request-compatible surface) and the standalone `request` module is deprecated in the current Synthetics runtime. Renamed the section to "Scripted API Monitor", removed the bad `require('request')`, and switched to `$http.get(options, …)`. Also renamed the `uri` field to `url` to match got's option name.

6. **Step 6 alerts-API call was missing the policy scope and required term fields.** The REST endpoint for creating NRQL conditions is `/v2/alerts_nrql_conditions/policies/{policy_id}.json` (not `/v2/alerts_nrql_conditions.json`), and each term must include `duration` and `time_function`; the condition body also needs `type` and `value_function`. Fixed the endpoint, escaped the embedded NRQL string quotes correctly for shell, and added the missing fields. Also added a one-line note that NerdGraph is now the preferred alerts API.

## Review Notes

- The `request` module shim via `$http` is preserved by New Relic's runtime for backwards compatibility, but new code should use `$http.get/$http.post/...` directly. The post now reflects this.
- `ping6` as a separate binary is being phased out in newer `iputils` releases in favour of `ping -6` (or unified `ping`). The example still works on most distributions in 2026 but may need updating to `ping -6` on the newest systems.
- The REST v2 alerts API still works as of 2026-04, but New Relic recommends NerdGraph (`alertsNrqlConditionStaticCreate`) for new automation. The post now flags this.
- The `syntheticsCreateSimpleMonitor` mutation in Step 3 is left as-is; the structure (`accountId`, `monitor.{name, period, status, uri, locations.public, advancedOptions.customHeaders}`) matches the current NerdGraph schema. Note that `YOUR_ACCOUNT_ID` must be a numeric literal in the GraphQL query, which the placeholder makes clear.
