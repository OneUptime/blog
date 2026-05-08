# Validation Summary: Troubleshooting Cilium on Google Cloud

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Cilium CLI and cilium-dbg
- Hubble
- Kubernetes and kubectl
- Google Kubernetes Engine
- GKE Dataplane V2
- Google Cloud VPC-native networking and Alias IP ranges
- Cloud NAT
- eBPF

## Sources Consulted
- Cilium Troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium command reference for `cilium` and `cilium connectivity test`: https://docs.cilium.io/en/latest/cmdref/cilium/ and https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium command reference for `cilium-dbg monitor`, `endpoint list`, `metrics list`, and `bpf ct list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html, https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/, https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html, and https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/
- Cilium routing and Google Cloud native routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Google Cloud GKE Dataplane V2 concept documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/dataplane-v2
- Google Cloud GKE Dataplane V2 usage and troubleshooting documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/dataplane-v2
- Kubernetes `kubectl debug` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/ and https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
- The introduction implied that GKE Dataplane V2 simply replaces kube-proxy with a directly managed Cilium DaemonSet. Google Cloud documents that GKE Dataplane V2 is implemented using Cilium, but the managed node agent is the `anetd` DaemonSet with pods labeled `k8s-app=cilium`. Updated the wording to reflect this.
- The introduction described "Google Cloud network policies" as an integration point. GKE Dataplane V2 provides Kubernetes NetworkPolicy enforcement, so the wording was corrected.
- The introduction said self-managed Cilium on GCE native routing uses VPC routes. Cilium's Google Cloud native routing documentation describes using Alias IP ranges for natively routable PodCIDRs, so the wording was corrected.
- The pod health command used `app.kubernetes.io/part-of=cilium`, which does not match the GKE Dataplane V2 troubleshooting selector. Updated it to `k8s-app=cilium`.
- Several node-local datapath commands used `cilium bpf`, `cilium monitor`, `cilium endpoint`, and `cilium metrics` inside the agent pod. Current Cilium documentation uses `cilium-dbg` for local agent and BPF inspection, so these commands were changed to `cilium-dbg`.
- The examples executed `kubectl exec -n kube-system ds/cilium`, which fails on managed GKE Dataplane V2 where the DaemonSet is `anetd`. Updated the examples to select a pod by `k8s-app=cilium`.
- The Kubernetes service connectivity example used `http://kubernetes.default.svc:443`, which sends plain HTTP to the HTTPS API server port. Changed it to `https://kubernetes.default.svc:443/version` with `curl -k`.
- The BPF conntrack troubleshooting command used `cilium bpf ct list global`, but current `cilium-dbg bpf ct list` syntax takes an optional cluster identifier rather than `global`. Updated the command.
- The performance troubleshooting note referenced `cilium bpf prog list`, which is not in the current Cilium command reference. Updated it to use `bpftool prog show` from a node debug shell.

## Review Notes
The post now covers both managed GKE Dataplane V2 and self-managed Cilium more accurately, but some deep debug commands still require access to Cilium or `anetd` containers and might be restricted in locked-down managed environments.
