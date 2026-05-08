# Validation Summary: How to Troubleshoot Cilium Administrative API Enablement

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- eBPF
- Prometheus and Grafana
- Cilium CLI and cilium-dbg

## Sources Consulted
- Cilium Administrative API Enablement: https://docs.cilium.io/en/stable/configuration/api-restrictions.html
- Cilium API Reference: https://docs.cilium.io/en/stable/api/
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/index_cilium_cli/
- cilium-dbg command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium troubleshooting guide: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium identity-relevant labels documentation: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels/
- Cilium metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/

## Issues Found
- The prerequisites listed a fixed Kubernetes version of v1.21+ for Cilium v1.14+. Cilium support is version-specific, and current Cilium documentation lists supported Kubernetes versions per release, so this was changed to require a Kubernetes version supported by the installed Cilium release.
- Several local-agent inspection commands used the Kubernetes `cilium` CLI for subcommands that are provided by `cilium-dbg` inside a Cilium agent context. These were changed to run `cilium-dbg` through `kubectl exec ds/cilium -c cilium-agent -- ...`.
- The health check used `cilium health status`, but the documented health client is `cilium-health status`. The command was corrected to run `cilium-health status` in the agent pod.
- The Helm label exclusion example used an invalid `labels.exclude` value. Cilium configures identity-relevant labels through the `labels` Helm value using label patterns, so the example was corrected to use `--set labels='!controller-uid !job-name'`.
- The operator log and health commands used the older `name=cilium-operator` selector. Current Cilium tooling defaults to `io.cilium/app=operator`, so the selector was updated.
- The troubleshooting section stated that Linux kernel 4.19 or later was sufficient. Current Cilium system requirements recommend kernel 5.10 or later, or equivalent distribution kernels such as RHEL 8.10's 4.18 kernel, so the requirement was updated.
- Policy inspection examples used `cilium policy get`, which is deprecated in current `cilium-dbg` docs and unavailable from the Kubernetes `cilium` CLI. These were replaced with Kubernetes resource inspection using `kubectl get cnp,ccnp,netpol -A`.

## Review Notes
The post title and introduction refer to Administrative API enablement, but most examples are general Cilium operational troubleshooting. The technical commands are now valid for the documented troubleshooting workflow, but a future content pass should better align the post with Cilium's administrative API access flags such as `enable-cilium-api-server-access`, `enable-cilium-health-api-server-access`, and `enable-cilium-operator-server-access`.
