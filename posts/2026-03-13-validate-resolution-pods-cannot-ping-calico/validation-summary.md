# Validation Summary: How to Validate Resolution of Pod Connectivity Failures with Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- kubectl
- Calico
- calicoctl
- Calico Felix metrics
- BGP
- BusyBox networking tools

## Sources Consulted
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico BGP configuration documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico component metrics documentation: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus

## Issues Found
- The initial pod status command used text filtering on `kubectl get pods` output. Replaced it with Kubernetes field selectors for non-Running and non-Succeeded pods.
- The namespace validation wait command mixed `--all` with a label selector and did not wait in each affected namespace. Moved the wait into the namespace loop and used the pod label created for each validation pod.
- The `kubectl run --overrides` examples omitted `apiVersion`, which kubectl requires for inline overrides. Added `apiVersion: v1` to both override snippets.
- The TCP listener used `nc -e`, which is not portable and is often unavailable. Replaced it with a BusyBox-compatible listener loop and a client command that verifies the expected response.
- The Felix metric `felix_iptables_dropped` is not listed in the current Calico Open Source Felix metric reference. Replaced it with documented Felix metrics: `felix_logs_dropped`, `felix_iptables_*_errors`, and `felix_int_dataplane_failures`.
- The Felix metrics command assumed Calico always runs in `kube-system` and that the `calico-node` image includes `wget`. Made the namespace explicit and used `kubectl port-forward` with `curl` against the documented metrics endpoint.

## Review Notes
The BGP validation guidance is accurate for Calico deployments that use BGP. Some Calico installations use VXLAN or another overlay mode, where `calicoctl node status` may not show BGP peers and the BGP step should be treated as topology-specific.
