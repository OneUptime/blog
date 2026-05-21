# Validation Summary: How to Upgrade Istio Across Multiple Minor Versions

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Istio
- Kubernetes
- istioctl
- kubectl
- Service mesh control plane and data plane upgrades

## Sources Consulted
- Istio In-place Upgrades: https://istio.io/latest/docs/setup/upgrade/in-place/
- Istio Canary Upgrades: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio Supported Releases and control plane/data plane skew: https://istio.io/latest/docs/releases/supported-releases/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Download the Istio release: https://istio.io/latest/docs/setup/additional-setup/download-istio-release/
- Istio 1.19.x releases: https://istio.io/latest/news/releases/1.19.x/
- Istio 1.20.x releases: https://istio.io/latest/news/releases/1.20.x/
- Istio 1.21.x releases: https://istio.io/latest/news/releases/1.21.x/
- Istio 1.22.x releases: https://istio.io/latest/news/releases/1.22.x/
- Istio 1.19 upgrade notes: https://istio.io/latest/news/releases/1.19.x/announcing-1.19/upgrade-notes/
- Istio 1.20 upgrade notes: https://istio.io/latest/news/releases/1.20.x/announcing-1.20/upgrade-notes/
- Istio 1.21 upgrade notes: https://istio.io/latest/news/releases/1.21.x/announcing-1.21/upgrade-notes/
- Istio 1.22 upgrade notes: https://istio.io/latest/news/releases/1.22.x/announcing-1.22/upgrade-notes/
- Kubernetes kubectl rollout restart reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Kubernetes kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/

## Issues Found
- The post described "one minor version at a time" as a general Istio upgrade rule. Istio's docs make that requirement for in-place `istioctl upgrade`; revision-based canary upgrades support jumping across two minor versions. Updated the intro and related wording to scope the guide to in-place upgrades.
- The post did not state the documented `istioctl upgrade` prerequisites. Added a short note that this walkthrough assumes an istioctl-managed install without `--revision`, and points revision-based users to the canary workflow.
- Patch-version examples were outdated for the 1.19 through 1.22 minor lines. Updated the examples and script to use 1.19.10, 1.20.8, 1.21.6, and 1.22.8.
- The data plane skew statement was imprecise. Updated it to say the control plane can be one minor version ahead of the data plane, but the data plane cannot be ahead of the control plane.
- The script used `kubectl rollout status deployment -n $ns`, but Kubernetes documents rollout status as requiring `TYPE NAME` or `TYPE/NAME`. Updated the script to iterate named deployments after restarting all deployments in each namespace.
- The claim about API deprecations having a one-version grace period was too specific. Updated it to "version-specific migration windows" to match Istio's feature and deprecation policies.

## Review Notes
The reviewed procedure is an in-place upgrade workflow. Istio's official documentation recommends canary upgrades as the safer production method, and the post now explicitly identifies revision-based installs as a case where readers should follow that workflow instead.
