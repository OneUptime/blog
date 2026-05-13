# Validation Summary: How to Debug Calico Metrics Endpoint Security Issues

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico Open Source
- Calico GlobalNetworkPolicy
- Calico HostEndpoint
- Kubernetes
- Prometheus metrics
- calicoctl
- kubectl

## Sources Consulted
- Calico documentation: Secure Calico Prometheus endpoints - https://docs.tigera.io/calico/latest/network-policy/comms/secure-metrics
- Calico documentation: GlobalNetworkPolicy resource - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: HostEndpoint resource - https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico documentation: Monitoring Felix with Prometheus - https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico documentation: calicoctl get command - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes documentation: kubectl label - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/

## Issues Found
- The original GlobalNetworkPolicy selected `k8s-app == 'calico-node'`, which targets workload endpoints by label and does not match Calico's documented method for securing the `calico/node` host-level Prometheus endpoint. Changed the policy to select HostEndpoint objects labeled `running-calico == 'true'`.
- The original policy allowed sources by namespace and pod selectors without showing the required label setup for Prometheus access. Changed the policy to use the documented `calico-prometheus-access == 'true'` source selector and added a `kubectl label pod` command for the Prometheus pod.
- The original policy omitted `protocol: TCP` while matching a TCP metrics port. Added `protocol: TCP` to the ingress rule.
- The original prerequisites did not mention that Felix Prometheus metrics must be enabled or that HostEndpoint objects are required for host endpoint policy. Added those prerequisites, including the need for existing host allow policies.
- The original verification checked `calicoctl get networkpolicies -n kube-system`, but the configured resource is a non-namespaced `GlobalNetworkPolicy`. Changed the command to `calicoctl get globalnetworkpolicies`.
- The original flow-log command referenced `/var/log/calico/flow-logs/*.log`, which is not the documented Calico Open Source flow-log viewing path. Replaced it with a note to use the Whisker console when flow logs are enabled.
- The original successful-access verification piped `curl` to `head` and then checked `$?`, which can hide a failed `curl` status. Added `set -o pipefail` and `curl -f --max-time 5` so the verification fails when the endpoint cannot be reached successfully.

## Review Notes
- The allow-list HostEndpoint approach can block other host traffic unless the cluster already has the required host endpoint allow policies in place. The prerequisites now call this out, but production users should still validate host endpoint policy behavior in staging before applying it broadly.
