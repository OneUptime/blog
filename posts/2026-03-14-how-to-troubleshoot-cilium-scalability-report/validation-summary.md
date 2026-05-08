# Validation Summary: How to Troubleshoot Cilium Scalability report

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF
- Helm
- kubectl
- Prometheus and Grafana

## Sources Consulted
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/index_cilium_cli/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium Helm installation documentation: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements/
- Cilium limiting identity-relevant labels: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels.html
- Cilium command reference for cilium-dbg: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium command reference for cilium-health status: https://docs.cilium.io/en/stable/cmdref/cilium-health_status.html
- Cilium metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/

## Issues Found
- The prerequisites listed fixed Kubernetes and Cilium minimum versions. Current Cilium documentation defines supported Kubernetes versions per Cilium release, so the prerequisite was changed to require a Kubernetes version supported by the deployed Cilium release.
- Several examples used node-local inspection commands as external `cilium` CLI commands, such as `cilium bpf`, `cilium endpoint`, `cilium identity`, `cilium metrics`, and `cilium policy`. Current Cilium documentation exposes these through `cilium-dbg` inside the agent, so the examples were updated to run `cilium-dbg` with `kubectl exec` against the Cilium DaemonSet.
- The Helm value `labels.exclude` is not a valid Cilium Helm chart value. It was replaced with the documented `labels` value using exclusion patterns.
- The verification command `cilium health status` was incorrect for current Cilium tooling. It was replaced with `cilium-health status` executed inside a Cilium agent pod.
- Agent log commands targeting Cilium pods without an explicit container can be ambiguous because Cilium pods include init containers. The affected commands were updated with `-c cilium-agent`.
- The troubleshooting note stated Linux kernel 4.19 or later. Current Cilium system requirements recommend Linux 5.10 or later, or an equivalent distribution kernel, so the note was corrected.
- The init-container log example used `cilium-init`, which is not a stable current init container name. It was changed to a placeholder requiring the actual init container name from the pod.

## Review Notes
The guide is technically relevant and mostly aligned with Cilium troubleshooting workflows. Some diagnostics, especially metrics checks through `cilium-dbg metrics list`, are useful for discovering enabled metrics but production monitoring should still rely on Prometheus scraping Cilium and Hubble metrics where configured.
