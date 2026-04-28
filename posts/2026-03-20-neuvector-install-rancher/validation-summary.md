# Validation Summary: How to Install NeuVector from Rancher UI

## Status
validated

## Post Type
Tutorial / Step-by-step installation guide

## Technologies Covered
- NeuVector (container security platform)
- Rancher (Kubernetes management platform, v2.6.5+)
- Kubernetes (Workloads, Pods, Services, PersistentVolumeClaims, Tolerations)
- Helm (chart values configuration)
- kubectl (verification commands)
- Container runtimes (Docker, containerd, CRI-O)

## Sources Consulted
- Rancher integration docs: https://ranchermanager.docs.rancher.com/integrations-in-rancher/neuvector/overview
- Rancher 2.6.5 release notes: https://github.com/rancher/rancher/releases/tag/v2.6.5
- NeuVector Helm chart values: https://github.com/neuvector/neuvector-helm/blob/master/charts/core/values.yaml
- NeuVector Helm chart README: https://github.com/neuvector/neuvector-helm/blob/master/charts/core/README.md
- NeuVector chart templates (controller-deployment.yaml, manager-service.yaml)
- NeuVector docs: https://open-docs.neuvector.com/configuration/console/
- Kubernetes 1.24 release notes (control-plane taint rename): https://kubernetes.io/blog/2022/04/07/upcoming-changes-in-kubernetes-1-24/

## Issues Found
1. **`scanner.replicas` was at the wrong YAML path.** In the official NeuVector Helm chart the scanner lives under the `cve:` block, so the correct key is `cve.scanner.replicas`, not a top-level `scanner.replicas`. Moved this value into the `cve:` block in the Step 6 YAML example.
2. **`k8s.platform: containerd` is not a valid chart key.** The NeuVector Helm chart has no `k8s.platform` field. Older versions used per-runtime toggles like `containerd.enabled` / `containerd.path`; since NeuVector 5.3.0 the runtime is auto-detected, with a top-level `runtimePath` override available. Replaced the invalid block with a comment explaining auto-detection and showing the optional `runtimePath` override.
3. **Outdated control-plane taint key in `enforcer.tolerations`.** The example only tolerated `node-role.kubernetes.io/master`, which was removed in Kubernetes 1.24+ in favor of `node-role.kubernetes.io/control-plane`. On modern clusters the original toleration is a no-op. Added a toleration for `node-role.kubernetes.io/control-plane` while keeping the legacy `master` key for backwards compatibility, mirroring the chart's own default.

## Review Notes
- The Rancher 2.6.5 integration claim, the pod naming patterns (`neuvector-controller-pod-*`, `neuvector-enforcer-pod-*`, `neuvector-manager-pod-*`, `neuvector-scanner-pod-*`), the service name `neuvector-service-webui`, the manager port 8443, the default admin/admin credentials, and the `cve.updater.schedule: "0 0 * * *"` default are all accurate against the upstream chart and Rancher docs.
- Future improvement (not a correctness issue): consider mentioning the chart's `controller.secret.bootstrapPassword` value as the recommended way to set the initial admin password on install, rather than relying on the default `admin/admin` and changing it post-install. This is the SUSE-recommended workflow following GHSA-8pxw-9c75-6w56.
- The post does not pin a specific NeuVector chart version; if NeuVector 6.x ships breaking changes to the values schema (e.g., further restructuring of the `cve:` block), this guide will need a refresh.
