# Validation Summary: How to Configure Multus for Multiple Networks in Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher (v2.7+)
- Kubernetes (kubectl)
- Multus CNI (referenced in title/scope)
- CNI (Container Network Interface)
- Calico / calicoctl
- NetworkPolicy (networking.k8s.io/v1)
- Prometheus Operator (monitoring.coreos.com/v1 PrometheusRule)
- nicolaka/netshoot, busybox (debug images)

## Sources Consulted
- Tigera Calico documentation — `calicoctl node status`: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Tigera Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- projectcalico/calico GitHub source for `calico-node` binary flags: https://github.com/projectcalico/calico
- containernetworking/plugins reference for valid CNI types (bridge, macvlan, host-local IPAM): https://github.com/containernetworking/plugins
- Multus CNI project documentation (NetworkAttachmentDefinition / k8s.cni.cncf.io): https://github.com/k8snetworkplumbingwg/multus-cni
- Kubernetes NetworkPolicy v1 API reference: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Prometheus Operator PrometheusRule CRD reference: https://prometheus-operator.dev/docs/operator/api/

## Issues Found

1. **Invalid `calico-node -show-status` command (Step 5 and Step 7).** The `calico-node` binary inside calico-node DaemonSet pods does not expose a `-show-status` flag. Its real flags are health/lifecycle related (`-felix-ready`, `-felix-live`, `-bird-ready`, `-bird-live`, `-startup`, etc.). The canonical way to check Calico node status is `calicoctl node status`, per the Tigera docs. Replaced both occurrences with `calicoctl node status`.

2. **Placeholder/non-existent CNI plugin type `main-cni-plugin` (Step 2).** The ConfigMap example listed `"type": "main-cni-plugin"`, which is not a real CNI plugin type and would not load. Replaced with `bridge` (a real reference plugin from containernetworking/plugins) and added the required `bridge` field, so the example is at least syntactically valid as a bridge CNI configuration with host-local IPAM.

## Review Notes
- The post's title is "How to Configure Multus for Multiple Networks in Rancher", but the body contains generic Kubernetes networking content rather than Multus-specific configuration. To genuinely demonstrate Multus, the post would ideally show a `NetworkAttachmentDefinition` (`apiVersion: k8s.cni.cncf.io/v1`) and a Pod annotated with `k8s.v1.cni.cncf.io/networks`. Reworking the post to do that is out of scope for this technical-correctness review (which avoids restructuring), but a future content pass should add at least one NetworkAttachmentDefinition example and the corresponding Pod annotation, and reference the Multus DaemonSet install (e.g. `kubectl apply -f https://raw.githubusercontent.com/k8snetworkplumbingwg/multus-cni/master/deployments/multus-daemonset.yml`).
- The Step 3 NetworkPolicy and Step 6 PrometheusRule are syntactically valid against current API versions (`networking.k8s.io/v1`, `monitoring.coreos.com/v1`).
- The conclusion repeats "in Rancher" awkwardly ("…in Rancher configuration in Rancher requires…"). This is stylistic, not technical, so left as-is.
- `cniVersion: "0.4.0"` in Step 2 is valid; current CNI spec versions go up to 1.0.0, but 0.4.0 remains widely supported.
