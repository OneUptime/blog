# Validation Summary: How to Log and Audit Default Deny Policies in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Cloud and Calico Enterprise
- Calico Open Source
- Kubernetes
- Calico FelixConfiguration
- Calico GlobalNetworkPolicy
- Flow logs
- Syslog
- Fluentd
- Elasticsearch

## Sources Consulted
- Calico Open Source FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Cloud FelixConfiguration resource reference: https://docs.tigera.io/calico-cloud/reference/resources/felixconfig
- Calico Open Source log rules documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico Open Source flow logs API and Whisker documentation: https://docs.tigera.io/calico/latest/observability/enable-whisker
- Calico Open Source flow logs API documentation: https://docs.tigera.io/calico/latest/observability/flow-logs-api
- Calico Cloud flow log data types: https://docs.tigera.io/calico-cloud/observability/elastic/flow/datatypes
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy

## Issues Found
- The post presented Felix file-based flow logs as generic Calico v3.26+ functionality. Current Calico Open Source documentation uses Goldmane and Whisker for flow logs, while file-based Felix flow log settings are documented for Calico Cloud and Calico Enterprise. I clarified the edition-specific scope in the introduction and prerequisites.
- The FelixConfiguration patch used `flowLogsEnabled`, which is not a documented field. I changed it to `flowLogsFileEnabled`, which is the documented file flow log setting for Calico Cloud and Enterprise.
- The FelixConfiguration syslog patch used lowercase severity values (`info` and `warning`). The documented values are capitalized enum values such as `Info` and `Warning`, so I corrected the casing.
- The Fluentd example tailed `/var/log/calico/flow-logs/*.log`, but the documented default file flow log directory is `/var/log/calico/flowlogs`. I updated the path and matching architecture diagram.
- The Elasticsearch aggregation used `src_ip`, but the documented flow log field is `source_ip`. I updated the query to use `source_ip`.
- The post described flow logs as capturing all traffic decisions. Official documentation describes flow logs as aggregated connection data with policy enforcement details, so I changed the wording to "aggregated connection metadata and policy decisions."

## Review Notes
- The policy-level `Log` action example is valid: Calico supports `Log`, and processing continues to the following rule before the `Deny` action is applied.
- The Fluentd snippet is still a minimal example. A production DaemonSet should also mount the host log directory, configure a position file, and tune buffering/retry behavior.
