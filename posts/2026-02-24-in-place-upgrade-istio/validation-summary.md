# Validation Summary: How to Perform an In-Place Upgrade of Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- istioctl
- Kubernetes
- Kubernetes sidecar workloads
- Istio control plane and data plane upgrades

## Sources Consulted
- Istio In-place Upgrades documentation: https://istio.io/latest/docs/setup/upgrade/in-place/
- Istio Canary Upgrades documentation: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Install with istioctl documentation: https://istio.io/latest/docs/setup/install/istioctl/
- Istio Supported Releases documentation: https://istio.io/latest/docs/releases/supported-releases/
- Istio 1.24.0 change notes: https://istio.io/latest/news/releases/1.24.x/announcing-1.24/change-notes/

## Issues Found
- The examples used Istio 1.20.x and 1.21.x, which are no longer supported releases as of 2026-05-21. Updated examples to use Istio 1.29.2 and 1.30.0, matching the currently supported release documentation.
- The post recommended `istioctl manifest diff`, but current Istio versions no longer document that subcommand. Replaced it with a generic `diff -u old-manifest.yaml new-manifest.yaml` command for comparing generated manifests.
- The backup command was described as exporting all Istio custom resources, but it only listed common traffic-management resources. Updated the comment to describe the command accurately.
- The rollback example used `istioctl install` with an outdated 1.20.5 binary path. Updated it to use the old-version `istioctl upgrade` flow, which the official in-place upgrade documentation describes as the downgrade path.
- The unsupported version-jump example used old 1.19 to 1.21 versions. Updated it to a current 1.28 to 1.30 example.

## Review Notes
The guide is technically relevant and generally aligned with Istio's in-place upgrade workflow. Future improvements could mention running at least two `istiod` replicas and configuring a PodDisruptionBudget, which the official in-place upgrade documentation recommends to reduce disruption during upgrades.
