# Validation Summary: How to Upgrade Istio Using Helm Charts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Helm
- istioctl
- Kubernetes Custom Resource Definitions

## Sources Consulted
- Istio documentation: Upgrade with Helm - https://istio.io/latest/docs/setup/upgrade/helm/
- Istio documentation: Install with Helm - https://istio.io/latest/docs/setup/install/helm/
- Istio documentation: Supported Releases - https://istio.io/latest/docs/releases/supported-releases/
- Istio documentation: istioctl command reference - https://istio.io/latest/docs/reference/commands/istioctl/
- Helm documentation: helm upgrade - https://helm.sh/docs/v3/helm/helm_upgrade/
- Kubernetes documentation: Versions in CustomResourceDefinitions - https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/
- Official Istio Helm chart repository index - https://istio-release.storage.googleapis.com/charts/index.yaml
- Official Istio 1.30.0 istiod Helm chart values - https://istio-release.storage.googleapis.com/charts/istiod-1.30.0.tgz

## Issues Found
- The post used Istio `1.21.0` throughout the Helm examples. Istio 1.21 is no longer supported, and the current Istio documentation on the review date lists 1.30 as current. Updated the examples to `1.30.0` and added a note to choose a currently supported version.
- The prerequisites omitted `istioctl`, even though the post uses `istioctl proxy-status`, `istioctl analyze`, and `istioctl version`. Added `istioctl` to the prerequisites and added the officially recommended `istioctl x precheck` command before upgrade steps.
- The istiod values example used the older `pilot.resources`, `pilot.autoscaleMin`, and `pilot.autoscaleMax` shape. In the current Istio 1.30.0 Helm chart, these are top-level chart values. Updated the snippet to use `resources`, `autoscaleMin`, and `autoscaleMax`.
- The CRD verification text said stored versions would be updated. Kubernetes does not automatically migrate existing custom resources to a new stored version just because a CRD is updated. Changed the wording to say schemas and served versions are updated.
- The revision-based Helm upgrade flow removed the old `istiod` release but did not update the base chart's `defaultRevision`. Added the `helm upgrade istio-base ... --set defaultRevision=canary` command, matching Istio's Helm canary upgrade guidance.

## Review Notes
The main Helm upgrade order in the post is correct for sidecar-mode Helm installations: base chart first, then istiod, then gateway charts, then workload restarts for sidecar proxy updates. Future improvements could mention ambient-mode components such as CNI and ztunnel, but that is outside the sidecar-focused scope of this post.
