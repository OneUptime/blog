# Validation Summary: Validating Cilium Networking Concepts

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF
- Hubble
- Helm
- kubectl

## Sources Consulted
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium troubleshooting documentation for `cilium-dbg endpoint list` and Hubble: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium `cilium-dbg bpf metrics list` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_metrics_list.html
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes pod anti-affinity documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Helm `get values` reference: https://helm.sh/docs/helm/helm_get_values/

## Issues Found
- The description claimed the guide validated service mesh integration, but the post only covers datapath, endpoint identity, service load balancing, endpoint health, and observability. Changed the description to refer to service load balancing.
- The introduction said Cilium attaches eBPF programs to network interfaces. This is too narrow for Cilium's datapath, so it now says Cilium attaches programs to kernel networking hooks.
- The connectivity test examples included `--test dns-resolution`, which is not a documented scenario name in the Cilium CLI reference. Removed that example and clarified that `--test` matches test names.
- Endpoint inspection used `cilium endpoint list`, but current Cilium documentation uses the in-agent `cilium-dbg endpoint list` command. Updated the endpoint checks accordingly.
- The non-ready endpoint check parsed human-readable table output, which can wrap labels and create false positives. Updated it to parse JSON output from `cilium-dbg endpoint list`.
- The endpoint count check implied the node-local endpoint list should match all running pods. Updated it to count cluster-wide `CiliumEndpoint` resources and compare them with running pods as a sanity check rather than claiming a strict match.
- Metrics checks used `cilium metrics list`, but the documented in-agent command is `cilium-dbg metrics list`, and BPF datapath metrics are exposed through `cilium-dbg bpf metrics list`. Updated the commands and troubleshooting text.

## Review Notes
The custom Kubernetes Deployment and Service manifests are syntactically valid for current Kubernetes APIs. The CiliumEndpoint count may still differ from the running pod count in clusters with host-network pods, unmanaged pods, or Cilium health endpoints, so it should be treated as an investigative signal rather than an exact invariant.
