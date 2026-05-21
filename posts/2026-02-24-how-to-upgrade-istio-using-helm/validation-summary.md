# Validation Summary: How to Upgrade Istio Using Helm

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Helm
- Kubernetes
- Istio sidecar injection and revisions
- Istio gateways

## Sources Consulted
- Istio documentation: Upgrade with Helm - https://istio.io/latest/docs/setup/upgrade/helm/
- Istio documentation: Canary Upgrades - https://istio.io/latest/docs/setup/upgrade/canary/
- Istio documentation: In-place Upgrades - https://istio.io/latest/docs/setup/upgrade/in-place/
- Istio documentation: Install with Helm - https://istio.io/latest/docs/setup/install/helm/
- Istio documentation: Supported Releases - https://istio.io/latest/docs/releases/supported-releases/
- Helm documentation: helm upgrade - https://helm.sh/docs/helm/helm_upgrade/
- Helm documentation: helm rollback - https://helm.sh/docs/helm/helm_rollback/
- Helm documentation: helm get values - https://helm.sh/docs/helm/helm_get_values/

## Issues Found
- The post stated that Istio only supports upgrading one minor version at a time. Updated this to match Istio's documented distinction: in-place upgrades require the installed version to be no more than one minor behind the target, while revision-based canary upgrades can skip farther, though upgrading across more than two minor versions is not officially tested or recommended.
- The pre-upgrade checklist used `istioctl analyze` but omitted Istio's recommended upgrade compatibility check. Added `istioctl x precheck` in both the checklist and automation script.
- The examples used Istio 1.24.0, which is no longer a supported release as of May 21, 2026. Updated examples to Istio 1.30.0 and revision name `1-30-0`, which matches the current supported release guidance and avoids invalid `.` characters in revision names.
- The standard upgrade section said rolling `istiod` means no control plane downtime. Reworded this to avoid an absolute guarantee and added the production recommendation to run at least two `istiod` replicas with a PodDisruptionBudget.
- The introduction said Helm upgrades always have a clear rollback path. Reworded this to say operators can plan one, because rollback behavior depends on which charts and cluster-wide resources were changed.
- The canary upgrade flow skipped the required base chart upgrade and did not cover revision-specific gateways. Added the base chart upgrade, `--wait`, and an optional revision-specific gateway installation command.
- The canary cleanup omitted setting the base chart `defaultRevision` after migration. Added the Helm command to set `defaultRevision=1-30-0`.
- The workload restart loop only covered namespaces labeled `istio-injection=enabled`. Updated it to include namespaces using revision labels as well.
- The canary rollback command still referenced the old `istiod-1-24` release name. Updated it to the new `istiod-1-30-0` release and included the matching canary gateway uninstall.

## Review Notes
The post is technically relevant and useful as an operational guide. Future improvements could mention revision tags for larger production environments and clarify that restarting only Deployments does not cover StatefulSets, DaemonSets, Jobs, or manually managed Pods.
