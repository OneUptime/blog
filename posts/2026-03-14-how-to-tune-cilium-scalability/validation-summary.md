# Validation Summary: How to Tune Cilium Scalability

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- eBPF
- Cilium CLI and agent debugging commands
- Prometheus metrics

## Sources Consulted
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium identity-relevant labels documentation: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels/
- Cilium Tuning Guide: https://docs.cilium.io/en/stable/operations/performance/tuning/
- Cilium Command Reference: https://docs.cilium.io/en/stable/cmdref/
- Cilium Kubernetes Requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements/
- Cilium v1.19.3 Helm values source: https://raw.githubusercontent.com/cilium/cilium/v1.19.3/install/kubernetes/cilium/values.yaml
- Cilium v1.19.3 Helm ConfigMap template: https://raw.githubusercontent.com/cilium/cilium/v1.19.3/install/kubernetes/cilium/templates/cilium-configmap.yaml
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The Helm value for identity label filtering used an object form (`labels.exclude`) that is not rendered by the Cilium chart. Changed it to the documented string form using exclusion patterns, for example `labels: "!pod-template-hash !controller-revision-hash !job-name"`.
- The identity garbage collection interval was shown as top-level `identityGCInterval`, but current Cilium Helm charts render it from `operator.identityGCInterval`. Moved the value under the existing `operator` block.
- The prerequisites stated a broad Kubernetes `v1.21+` requirement, which is not accurate across current Cilium releases. Changed this to require a Kubernetes version supported by the installed Cilium release.
- Several examples used agent-local commands such as `cilium identity list`, `cilium metrics list`, `cilium endpoint list`, and `cilium policy get` as if they were top-level Cilium Kubernetes CLI commands. Replaced these with Kubernetes CRD queries or `kubectl exec ds/cilium ... cilium-dbg` commands where appropriate.
- Replaced `cilium health status` with `kubectl ... cilium-health status`, matching the documented Cilium health client command.
- Updated the Cilium operator pod selector from `name=cilium-operator` to the chart's current `io.cilium/app=operator` label.
- Replaced `cilium bpf tunnel list`, which is not present in the current Cilium command reference, with `cilium-health status` for node connectivity verification.
- Removed the hard-coded Linux kernel `4.19 or later` troubleshooting guidance and pointed readers to the system requirements for their Cilium release, since current Cilium releases have different documented kernel requirements.
- Avoided duplicate top-level `operator:` YAML blocks across snippets so users can combine the shown values into one Helm values file without overwriting operator settings.

## Review Notes
- The examples now distinguish between the top-level Cilium Kubernetes CLI and commands that run inside a Cilium agent pod via `cilium-dbg` or `cilium-health`.
- The endpoint count command reports endpoints from one selected Cilium agent, not a cluster-wide endpoint total.
