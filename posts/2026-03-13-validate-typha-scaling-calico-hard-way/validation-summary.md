# Validation Summary: Validating Typha Scaling in Calico the Hard Way

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Typha
- Felix
- Kubernetes
- kubectl
- calicoctl
- Prometheus metrics
- Linux iptables dataplane

## Sources Consulted
- Calico Typha configuration reference: https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico Typha Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/typha/prometheus
- Calico component metrics monitoring guide: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico the hard way Typha installation guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha

## Issues Found
- The policy propagation command claimed to poll Felix's iptables state, but it actually ran `calicoctl get globalnetworkpolicy` inside a `calico-node` pod. That only confirms the policy is visible through the datastore/API, not that Felix rendered it into the dataplane. I changed the policy to include rule annotations and changed the polling command to look for the rendered `validation=typha-validation-marker` comment in `iptables-save`, matching Calico's documented behavior for rule annotations on the Linux iptables dataplane.
- The Prometheus metrics section used `typha_updates_sent_total` and `typha_connections_dropped_total`, which do not match Calico's documented Typha metric names. I changed them to `typha_updates_total` and `typha_connections_dropped`.
- The Prometheus metrics section assumed Typha metrics were exposed on port `9093`. Calico documents `9091` as Typha's default metrics port, with `9093` used by some manifests such as the Amazon YAML/operator examples. I changed the snippet to use `TYPHA_METRICS_PORT=${TYPHA_METRICS_PORT:-9091}` so readers can override it when their manifest uses another port.

## Review Notes
- The endpoint validation uses the core Kubernetes `Endpoints` resource. That remains usable, but future updates could prefer `EndpointSlice` checks for large or modern clusters.
- The revised dataplane propagation check is specific to the Linux iptables dataplane. The post now calls out that nftables or eBPF deployments need an equivalent Felix dataplane or metrics signal.
- The fixed latency thresholds are operational guidance rather than a Calico guarantee. They are acceptable as validation criteria if treated as a local baseline.
