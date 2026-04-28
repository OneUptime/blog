# Validation Summary: How to Upgrade NeuVector

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- NeuVector (container security platform)
- Kubernetes (kubectl, deployments, daemonsets, CRDs)
- Helm (helm upgrade, helm rollback, helm-diff plugin)
- Rancher (Apps & Marketplace UI)
- NeuVector REST API (v1)
- Bash scripting / curl / jq

## Sources Consulted
- NeuVector manifests repository: https://github.com/neuvector/manifests (verified directory structure)
- NeuVector Helm chart repository: https://github.com/neuvector/neuvector-helm (verified `charts/core` exists, current chart version 2.8.13 / app version 5.5.1)
- Verified the CRD YAML URL with HTTP HEAD: https://raw.githubusercontent.com/neuvector/manifests/main/kubernetes/crd-k8s-1.19.yaml (200 OK)
- Verified `kubernetes/5.x/crd-k8s-1.19.yaml` does not exist (404)
- NeuVector official docs (open-docs.neuvector.com) for deployment manifest names and CRD list

## Issues Found
1. **Incorrect CRD download URL.** The post pointed to `https://raw.githubusercontent.com/neuvector/manifests/main/kubernetes/5.x/crd-k8s-1.19.yaml`, which returns 404. The NeuVector manifests repo has no `5.x/` subdirectory under `kubernetes/`; the actual CRD file lives at `kubernetes/crd-k8s-1.19.yaml`. Updated the URL to the correct path so `kubectl apply -f` will work.
2. **Misuse of the "Discover → Monitor → Protect" terminology in the conclusion.** Discover/Monitor/Protect are NeuVector's runtime policy enforcement modes for groups/services, not an upgrade workflow. Replaced "By following the Discover → Monitor → Protect upgrade workflow" with "By following the step-by-step upgrade workflow above" to remove the technical conflation while preserving the surrounding sentence.

## Review Notes
- Deployment / DaemonSet names (`neuvector-controller-pod`, `neuvector-enforcer-pod`, `neuvector-manager-pod`, `neuvector-scanner-pod`) and the matching container names used with `kubectl set image` are consistent with the upstream NeuVector manifests.
- CRD names `nvsecurityrules` (namespaced) and `nvclustersecurityrules` (cluster-scoped) are correct. The post uses `nvclusterSecurityrules` with a mixed-case S; kubectl resource matching is case-insensitive, so this still works and was left as-is.
- `helm diff upgrade` requires the third-party `helm-diff` plugin (`helm plugin install https://github.com/databus23/helm-diff`). Not strictly an error — the post is a guide and many readers will already have it — but readers without the plugin will hit "unknown command" and may want to install it first.
- The chart version `2.7.0` and app version `5.3.2` used as examples are real, historical releases (chart is now at 2.8.13 / app 5.5.1). They are clearly meant as placeholders, so no change needed.
- `neuvector/scanner:latest` is documented by NeuVector as acceptable for the scanner image because the scanner pulls a fresh CVE database on each scan; using `:latest` here is intentional, not a mistake.
- The `/v1/auth`, `/v1/system/summary`, `/v1/policy/rule`, and `/v1/group` endpoints exist in the NeuVector REST API. Exact JSON field names inside `summary` (e.g., `controller_version`, `total_enforcers`, `total_workloads`) vary across versions and may not all be present verbatim in every release — readers running the verification script should be prepared to adjust the `jq` selectors against `curl ${NV_URL}/v1/system/summary` output for their specific NeuVector version.
- Readers should note the post does not cover NeuVector Federation upgrades (multi-cluster master/remote setups) where master and remote clusters need version compatibility considerations.
