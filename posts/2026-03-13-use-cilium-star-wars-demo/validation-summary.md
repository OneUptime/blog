# Validation Summary: How to Use the Cilium Star Wars Demo

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- Kubernetes Network Policy concepts
- eBPF
- HTTP L7 policy enforcement
- kubectl
- Cilium CLI and cilium-dbg

## Sources Consulted
- Cilium Star Wars Demo documentation: https://docs.cilium.io/en/stable/gettingstarted/demo/
- Cilium CLI installation and status documentation: https://docs.cilium.io/en/stable/gettingstarted/k8s-install-default/
- Cilium CLI status command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- cilium-dbg monitor command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Cilium example manifests in the official cilium/cilium repository:
  - https://raw.githubusercontent.com/cilium/cilium/HEAD/examples/minikube/http-sw-app.yaml
  - https://raw.githubusercontent.com/cilium/cilium/HEAD/examples/minikube/sw_l3_l4_policy.yaml
  - https://raw.githubusercontent.com/cilium/cilium/HEAD/examples/minikube/sw_l3_l4_l7_policy.yaml

## Issues Found
- The monitoring commands used `cilium monitor --type drop` and `cilium monitor --type l7`, but the current Cilium command reference documents `monitor` under `cilium-dbg`, not the standalone Cilium CLI. Updated the examples to select a Cilium agent pod and run `cilium-dbg monitor` through `kubectl -n kube-system exec`.
- The prerequisites only mentioned the `cilium` binary. Added access to a Cilium agent pod for `cilium-dbg monitor`, because the corrected monitoring commands run from inside the agent pod.
- The conclusion said the demo uses five concrete steps, but the post has six numbered steps. Updated the count to six.

## Review Notes
- The demo application and policy URLs are valid and match the official Cilium Star Wars example manifests. They currently use `HEAD`, which works, but pinning to a specific Cilium release would make the tutorial more reproducible over time.
