# Validation Summary: Validating Cilium on Google Cloud

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Cilium CLI and cilium-dbg
- Kubernetes
- Google Kubernetes Engine
- GKE Dataplane V2
- Hubble
- Helm

## Sources Consulted
- Cilium CLI command reference for `cilium connectivity test`: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list/
- Cilium Hubble setup and validation documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Google Cloud GKE Dataplane V2 concepts: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/dataplane-v2
- Google Cloud GKE Dataplane V2 usage and troubleshooting: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/dataplane-v2

## Issues Found
- The introduction said GKE Dataplane V2 "replaces kube-proxy with Cilium" and referred to Google Cloud network policies. I changed the wording to match Google Cloud documentation: GKE Dataplane V2 uses Cilium-based eBPF service handling instead of kube-proxy, and provides Kubernetes NetworkPolicy enforcement plus GKE network policy logging.
- The Helm comparison command was presented as universally applicable. I clarified that `helm get values cilium -n kube-system -o yaml` applies when Cilium was installed with Helm.
- The BusyBox `wget` examples used `--timeout=5`, which is not portable across BusyBox builds. I changed the examples to `-T 5`.
- The endpoint and metrics examples used `cilium endpoint list` and `cilium metrics list` inside the agent pod. Current Cilium documentation exposes these local agent diagnostics through `cilium-dbg endpoint list` and `cilium-dbg metrics list`, so I updated those commands.
- The endpoint and metrics examples assumed a `ds/cilium` resource. GKE Dataplane V2 runs agent pods with an `anetd-` prefix and the `k8s-app=cilium` label, so I changed the examples to select a Cilium pod by label before running `kubectl exec`.
- The endpoint count check said the count should match the running pod count. That can be misleading because host-networked or unmanaged pods may not appear as Cilium endpoints, so I changed the wording to compare the counts rather than require an exact match.

## Review Notes
The automated `cilium connectivity test --test` flag is current and accepts regular expressions. Hubble commands require Hubble to be enabled and accessible from the selected agent pod. The validation commands still depend on cluster-specific permissions and whether the cluster is managed GKE Dataplane V2 or a self-managed Cilium installation.
