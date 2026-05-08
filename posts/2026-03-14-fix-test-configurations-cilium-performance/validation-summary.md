# Validation Summary: Fixing Test Configuration Issues in Cilium Performance

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- eBPF datapath configuration
- Bash CLI validation scripts

## Sources Consulted
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Routing Concepts: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium Performance Tuning Guide: https://docs.cilium.io/en/stable/operations/performance/tuning/
- Cilium Kubernetes Without kube-proxy: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium Troubleshooting Guide: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium Command Reference for `cilium status`: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium Command Reference for `cilium-dbg endpoint list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html
- Helm `rollback` command reference: https://helm.sh/docs/helm/helm_rollback/
- Kubernetes `kubectl drain` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes `kubectl rollout` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/

## Issues Found
- The throughput Helm example used stale connection tracking Helm keys, `bpf.ctGlobalTCPMax` and `bpf.ctGlobalAnyMax`. Updated them to the documented Helm keys `bpf.ctTcpMax` and `bpf.ctAnyMax`.
- The throughput and latency examples set `tunnel=disabled`, which is not a current Cilium Helm value. Removed it and kept `routingMode=native`, which is the documented Helm setting for native routing mode.
- The safe rollout example implied a Helm value change could be rolled out only to one Cilium node. Clarified that Helm values update the Cilium DaemonSet cluster-wide and adjusted the follow-up step accordingly.
- The rollout example used a raw placeholder, `<your-changes-here>`, inside a bash block. Replaced it with syntactically valid `--set key=value`.
- The validation script used `cilium monitor` and `cilium endpoint list`, but Cilium's documented agent-side commands are under `cilium-dbg`. Updated those checks to run `cilium-dbg` through a Cilium pod with `kubectl exec`.
- The endpoint readiness check counted text matches for `ready` and `not-ready`, which can miscount because `not-ready` contains `ready`. Replaced it with structured JSON output and `jq` filters on `.status.state`.
- The drop monitoring pipeline could fail to print the intended no-drop message depending on pipeline exit status. Reworked it to capture the short monitoring window and print a deterministic message.

## Review Notes
The Helm examples remain environment-dependent: `devices=eth0`, `ipv4NativeRoutingCIDR`, native routing, and XDP acceleration must match the cluster network and NIC capabilities. The post now uses documented Cilium Helm keys and command forms for the stated Cilium v1.14+ scope, but benchmark settings should still be verified in a non-production cluster before production use.
