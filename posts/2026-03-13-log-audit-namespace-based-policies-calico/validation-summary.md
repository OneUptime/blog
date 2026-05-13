# Validation Summary: How to Log and Audit Namespace-Based Policies in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source network policy
- Calico `GlobalNetworkPolicy`
- Calico `Log` policy action
- Kubernetes API audit logging
- Fluentd log collection
- Elasticsearch queries
- Mermaid diagrams

## Sources Consulted
- Calico documentation: Use log rules to test network policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico documentation: Global network policy resource - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: Felix configuration, including `logPrefix` and log action rate limit settings - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Automatic labels for namespace selectors - https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Kubernetes documentation: Auditing - https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes API reference: kube-apiserver audit configuration v1 - https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Fluentd documentation: Tail input plugin - https://docs.fluentd.org/input/tail

## Issues Found
- The original policy logged `environment != 'production'` traffic before the explicit monitoring namespace allow rule, so allowed monitoring traffic could also appear in the "denial" log stream. I moved the `Allow` rule before the `Log` and `Deny` rules so the log entry is generated immediately before the denial path.
- The post described Calico Open Source `Log` action output as JSON flow logs under `/var/log/calico/flow-logs/*.log`. Official Calico documentation describes `Log` rules as packet logging rules rendered by Felix, with the default `calico-packet` prefix, not Calico Enterprise flow-log JSON. I changed the wording to "packet logs" and updated the Fluentd input to tail host syslog-style paths.
- The Fluentd example used the deprecated `format json` tail parameter and assumed JSON fields such as `action` and `src_namespace`. I changed the example to use a current `<parse>` section and a regexp that captures Calico packet log messages.
- The Elasticsearch query filtered on structured fields that are not produced by Calico Open Source packet logs. I changed the query to search the packet log message for the Calico log prefix over the requested time window.
- The architecture diagram and conclusion referred to "Calico Flow Logs" for this Open Source `Log` action workflow. I changed these references to "Calico Packet Logs."

## Review Notes
The Kubernetes audit policy snippet is syntactically valid for `audit.k8s.io/v1` and appropriately targets namespace `patch` and `update` operations. In a production cluster, `RequestResponse` audit logging can be high-volume and may capture sensitive request or response bodies, so teams should tune the audit level and retention policy for their compliance requirements.
