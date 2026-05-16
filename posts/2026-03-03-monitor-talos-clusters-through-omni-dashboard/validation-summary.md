# Validation Summary: How to Monitor Talos Clusters Through Omni Dashboard

## Status
validated

## Post Type
Guide / Tutorial — overview of using the Sidero Omni dashboard to monitor Talos Linux clusters, with supplementary `talosctl` and Prometheus snippets.

## Technologies Covered
- Talos Linux
- Sidero Omni (SaaS management platform)
- `talosctl` CLI
- `omnictl` CLI
- Kubernetes (control plane components: API server, controller manager, scheduler, etcd)
- Prometheus / Alertmanager (`PrometheusRule` CRD from `monitoring.coreos.com/v1`)

## Sources Consulted
- Sidero Omni documentation — Install Talos: https://docs.siderolabs.com/omni/how-to-guides/install-talos
- Sidero Omni — Getting Started: https://docs.siderolabs.com/omni/getting-started/getting-started
- Talos `talosctl` CLI reference: https://www.talos.dev/v1.11/reference/cli/
- Talos Image Factory: https://github.com/siderolabs/image-factory and https://factory.talos.dev
- prometheus-operator `PrometheusRule` CRD (`monitoring.coreos.com/v1`)

## Issues Found
1. **Fabricated Omni image download URL.** The original snippet used `curl -LO https://omni.siderolabs.com/image/talos/v1.6.0/metal-amd64.iso`, which is not a real Omni endpoint. Omni images are tied to a specific Omni instance/account and include the SideroLink configuration. Per the Sidero docs, the correct approach is `omnictl download iso` (or the "Download Installation Media" wizard in the Omni UI). Replaced the `curl` command with `omnictl download iso` and a pointer to `omnictl download iso --help` for customization. The surrounding narrative about booting and auto-registration is unchanged.
2. **Missing markdown heading marker.** The "Resource Usage Monitoring" line was plain text instead of an `##` heading, so it wasn't rendered as a section. Added the `##` prefix so it matches the other section headings.

## Review Notes
- The `talosctl etcd members` and `talosctl logs <service>` (kubelet/apid/etcd) commands are correct.
- The PrometheusRule example is syntactically valid for the `monitoring.coreos.com/v1` CRD and the PromQL CPU-pressure expression is the standard idiom.
- The post calls Omni "SaaS-based." Omni is primarily offered as SaaS but Sidero now also offers a self-hosted option for enterprise customers; the SaaS framing is still accurate for the common case and didn't need rewording.
- Talos `v1.6.0` and Kubernetes `v1.29.0` in the sample YAML are illustrative and not load-bearing — left as-is since they are clearly example values rather than claims about current releases.
- The statement that Kubernetes can take "several minutes" to mark a node `NotReady` reflects historical defaults; current `kubelet`/controller-manager defaults are tighter (~40s grace + eviction timeout) but "several minutes" is still defensible for clusters using legacy or conservative defaults, so it was left unchanged.
