# Validation Summary: Runbook: BIRD Not Ready Errors in Calico

## Status
validated

## Post Type
Runbook / On-call operational guide

## Technologies Covered
- Calico (CNI plugin)
- BIRD (BGP daemon used by calico-node)
- Kubernetes (kubectl, DaemonSet, Pod conditions)
- calicoctl CLI
- BGP (Border Gateway Protocol)
- Alertmanager / Prometheus alerting
- Mermaid (diagram syntax)

## Sources Consulted
- Calico documentation — calico-node and BIRD: https://docs.tigera.io/calico/latest/reference/component-resources/node/
- calicoctl reference: https://docs.tigera.io/calico/latest/reference/calicoctl/
- calicoctl node status: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- calicoctl BGPPeer resource: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- kubectl reference (get, logs, describe, patch, wait, field-selector, sort-by): https://kubernetes.io/docs/reference/kubectl/
- JSON Patch RFC 6902 (used by `kubectl patch --type=json`): https://datatracker.ietf.org/doc/html/rfc6902
- Standard calico-node DaemonSet manifest (container layout): https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises

## Issues Found
No technical issues found. All kubectl and calicoctl commands are syntactically valid and use current, non-deprecated flags. The JSON Patch operation targeting `/spec/template/spec/containers/0/...` is correct for the standard Calico DaemonSet where `calico-node` is the single main container (init containers are tracked separately under `initContainers`). The description of BIRD as the BGP daemon within calico-node and its role in route advertisement aligns with Calico's documented architecture.

## Review Notes
- The alert name `CalicoNodeBIRDNotReady` is a reasonable custom alert name (not a built-in upstream Calico/kube-prometheus-stack rule), which is consistent with most teams who define their own readiness-based alert on the calico-node liveness/readiness probes.
- `calicoctl node status` requires the calicoctl binary to be configured with the appropriate datastore (etcd or Kubernetes API) credentials; in Kubernetes API datastore mode it may need to be run via `kubectl exec` into a calico-node pod or with a properly configured kubeconfig. The runbook does not call this out explicitly but it is a minor operational nuance rather than a technical error.
- The memory limit value of `512Mi` is a reasonable starting point but the appropriate value depends on cluster size; readers should treat it as illustrative.
- For newer Calico releases (3.28+) that have introduced eBPF and VPP dataplanes which do not rely on BIRD, this runbook applies specifically to clusters using the default BGP/BIRD dataplane. A future revision could mention this scope.
