# Validation Summary: Troubleshooting Cilium Configuration Issues in Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- kubectl
- Helm
- Cilium CLI
- Cilium eBPF datapath
- Hubble

## Sources Consulted
- Cilium Configuration documentation: https://docs.cilium.io/en/stable/network/kubernetes/configuration/
- Cilium ConfigMap drift detection documentation: https://docs.cilium.io/en/stable/configuration/configmap-drift-detection/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium CLI `status` reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium CLI `encryption status` reference: https://docs.cilium.io/en/latest/cmdref/cilium_encryption_status.html
- Cilium `cilium-dbg status` reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status.html
- Cilium `cilium-dbg bpf bandwidth list` reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_bandwidth_list.html
- Kubernetes kubectl generated command reference: https://kubernetes.io/docs/reference/kubectl/generated/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Helm rollback reference: https://helm.sh/docs/helm/helm_rollback/
- Helm get values reference: https://helm.sh/docs/helm/helm_get_values/

## Issues Found
- The post used `kubectl exec -l k8s-app=cilium -- cilium status --verbose` to inspect what the agent sees. Current kubectl `exec` targets a pod or resource, not a label selector, and Cilium's detailed in-agent status command is `cilium-dbg status --verbose`. Changed it to execute `cilium-dbg status --verbose` against `ds/cilium` in the `cilium-agent` container.
- The post checked `.data.tunnel` in `cilium-config` and used `--set tunnel=disabled`. Current Cilium Helm values use `routingMode` with values such as `native` and `tunnel`, and the corresponding ConfigMap key is `routing-mode`. Updated the jsonpath checks and Helm upgrade command.
- The post used `cilium encrypt status`. Current Cilium CLI exposes this as `cilium encryption status`. Updated the command.
- The post used `cilium bpf bandwidth list`, but BPF datapath commands are exposed by `cilium-dbg` inside a Cilium agent context. Updated it to run `cilium-dbg bpf bandwidth list` through `kubectl exec`.
- The conclusion recommended `cilium status --verbose` as the primary diagnostic tool for agent configuration. Cilium troubleshooting documentation recommends `cilium-dbg status --verbose` for detailed daemon state, so the recommendation was corrected.

## Review Notes
- Local `kubectl`, `helm`, and `cilium` binaries were not installed in the review environment, so command validation was performed against official Kubernetes, Helm, and Cilium documentation.
- The native-routing example assumes the listed CIDR matches the cluster's pod/native routing range and that the nodes share suitable L2/routing conditions for `autoDirectNodeRoutes`.
