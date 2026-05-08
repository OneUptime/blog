# Validation Summary: How to Validate Performance in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- kubectl
- CiliumNetworkPolicy
- iperf3
- curl
- Prometheus metrics

## Sources Consulted
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes port-forward task documentation: https://kubernetes.io/docs/tasks/access-application-cluster/port-forward-access-application-cluster/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Cilium policy language documentation: https://docs.cilium.io/en/stable/security/policy/language/
- Cilium metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- iperf3 official documentation: https://software.es.net/iperf/
- curl write-out variables documentation: https://curl.se/docs/manpage.html

## Issues Found
- The prerequisites listed netperf images, but the post does not use netperf. Changed the prerequisite to iperf3 and curl images to match the examples.
- Several `kubectl run` benchmark commands used `-it`, which allocates a TTY and can make JSON or numeric output harder to parse reliably. Changed these to `-i --quiet` and redirected iperf3 JSON output to explicit files.
- The iperf3 parsing example referenced `iperf3-result.json`, but the previous commands did not create that file. Updated the throughput commands to write `iperf3-same-node.json` and `iperf3-cross-node.json`, and updated the parser example accordingly.
- The connection latency parser assumed every stdout line was numeric and used a P99 index that could go out of range for small samples. Added numeric filtering and bounded the P99 index.
- The DNS latency command used BusyBox `date +%s%N`; BusyBox commonly prints `%N` literally instead of nanoseconds. Replaced that approach with curl's `time_namelookup` measurement from the same curl image used elsewhere.
- The policy overhead comparison allowed the baseline and policy client pods to schedule on arbitrary nodes, making the comparison less controlled. Added the same node selector to both client test pods.
- The CiliumNetworkPolicy used `matchLabels: {}` for an allow-all endpoint selector. Replaced it with the documented empty endpoint selector form `- {}`.
- The verification snippet attempted to exec into the Cilium DaemonSet and run `wget`, which depends on tools being present inside the Cilium container. Replaced it with `kubectl port-forward` to the selected Cilium pod and local `curl` against the metrics endpoint.
- The troubleshooting section referenced `cilium_policy_evaluation_duration`, which is not present in current Cilium metrics documentation. Replaced it with documented policy latency metrics: `cilium_policy_implementation_delay` and `cilium_policy_incremental_update_duration`.

## Review Notes
The commands were reviewed against official documentation, but they were not executed against a live Kubernetes cluster in this workspace. `kubectl` is not installed here, and no target cluster context was available. Performance targets remain environment-dependent and should be treated as example thresholds rather than universal Cilium guarantees.
