# Validation Summary: How to Troubleshoot Understanding the log output in Cilium configuration

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF
- Helm
- kubectl
- Cilium CLI and cilium-dbg
- Prometheus and Grafana

## Sources Consulted
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium `cilium status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `cilium connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium `cilium sysdump` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium `cilium-dbg` command reference: https://docs.cilium.io/en/stable/cmdref/
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium identity-relevant labels documentation: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels.html
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements.html
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Kubernetes `kubectl describe` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/

## Issues Found
- Several examples used standalone `cilium` subcommands for agent-local diagnostics such as identities, metrics, BPF maps, policies, endpoints, and health checks. Current Cilium documentation exposes those diagnostics through `cilium-dbg` and `cilium-health` in the Cilium pod, so the examples were changed to run them via `kubectl exec -n kube-system ds/cilium -c cilium-agent -- ...`.
- The operator pod selector used `name=cilium-operator`, while current Cilium CLI/sysdump defaults use `io.cilium/app=operator`. Updated the operator log and health examples to the current selector.
- The Helm example used `labels.exclude`, which is not the documented Helm value. Updated it to use the documented `labels` value with exclusion patterns and `--set-string`.
- The prerequisites and kernel guidance used outdated broad version claims (`Kubernetes v1.21+`, `Cilium v1.14+`, and kernel `4.19 or later`). Updated them to current Cilium v1.19-era Kubernetes and kernel guidance from official documentation.
- The verification text claimed endpoint count should match expected pod count, but `cilium-dbg endpoint list` run in one agent reports that agent's endpoint view. Updated the wording to avoid a misleading cluster-wide claim.
- The introduction described "subsystem filters"; Cilium logs expose subsystem fields and configurable debug verbosity, so the wording was corrected.

## Review Notes
The post is technically relevant and salvageable. Some examples still inspect a single Cilium agent by using `kubectl exec` against the DaemonSet; for cluster-wide inspection, future revisions could add a loop across all Cilium pods or use Cilium's `k8s-cilium-exec.sh` helper.
