# Validation Summary: How to Use Calico Flow Logs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Cloud
- Calico Enterprise
- Kubernetes
- kubectl
- FelixConfiguration
- Network flow logs

## Sources Consulted
- Calico Open Source documentation: View flow logs in the Calico Whisker web console: https://docs.tigera.io/calico/latest/observability/view-flow-logs
- Calico Open Source documentation: Enable the flow logs API and Calico Whisker: https://docs.tigera.io/calico/latest/observability/enable-whisker
- Calico Open Source documentation: Flow logs API: https://docs.tigera.io/calico/latest/observability/flow-logs-api
- Calico Cloud documentation: FelixConfiguration flow log file settings: https://docs.tigera.io/calico-cloud/reference/resources/felixconfig
- Calico Cloud documentation: Filter flow logs and file flow log format: https://docs.tigera.io/calico-cloud/observability/elastic/flow/filtering
- Calico Enterprise documentation: Flow log data types: https://docs.tigera.io/calico-enterprise/latest/observability/elastic/flow/datatypes

## Issues Found
- The post implied that all current Calico flow logs are directly available under `/var/log/calico/flowlogs/flows.log`. Current Calico Open Source documents Goldmane and Whisker for flow logs, while the file-based flow log settings are documented for Calico Cloud and Calico Enterprise. I clarified that the commands apply to file-based flow logs in Calico Cloud and Calico Enterprise.
- The introduction and conclusion stated or implied that each flow log records exact individual connections and exactly which policy rule allowed or denied each flow. Official documentation describes flow logs as aggregated connection data, and policy details depend on whether policy fields are included. I changed those claims to describe aggregated traffic patterns and made policy-rule visibility conditional on policy fields being enabled.
- The flow log format example used a pipe-delimited, title-cased format with `Allow` and `Deny`. Calico Cloud documents file flow logs as space-delimited fields with lowercase `allow` and `deny` actions. I replaced the example with the documented field order and lowercase action values.
- The denied-flow command used a case-insensitive grep pattern for `deny`/`Deny`. Because the documented file format uses lowercase action values and the action is the final field, I changed the command to filter on `$NF == "deny"` with `awk`.
- The configuration check grepped for the broad string `flowLog`. I changed it to `flowLogsFile` so it targets the file-based flow log settings used by the post.

## Review Notes
The architecture diagram still shows a generic Fluent Bit pipeline into Elasticsearch or Loki. Calico Cloud and Calico Enterprise documentation commonly discusses Elasticsearch-backed log handling and Fluentd filtering, but forwarding file-based logs with another collector can be a valid deployment choice if configured separately.
