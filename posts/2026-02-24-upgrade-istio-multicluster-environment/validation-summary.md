# Validation Summary: How to Upgrade Istio in a Multicluster Environment

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Istio
- Kubernetes
- Istio multicluster meshes
- Istio control plane and data plane upgrades
- Helm
- istioctl
- East-west gateways
- Prometheus / PromQL

## Sources Consulted
- Istio Upgrade documentation: https://istio.io/latest/docs/setup/upgrade/
- Istio Upgrade with Helm documentation: https://istio.io/latest/docs/setup/upgrade/helm/
- Istio Supported Releases and control plane/data plane skew policy: https://istio.io/latest/docs/releases/supported-releases/
- Istio multicluster primary-remote install documentation: https://istio.io/latest/docs/setup/install/multicluster/primary-remote/
- Istio multicluster before-you-begin trust documentation: https://istio.io/latest/docs/setup/install/multicluster/before-you-begin/
- Istio multicluster verification documentation: https://istio.io/latest/docs/setup/install/multicluster/verify/
- Istio gateway installation and upgrade documentation: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/

## Issues Found
- The post described multicluster service sharing as control planes directly communicating with each other. Updated this to Istiod discovering remote services by watching attached clusters' Kubernetes API servers, and clarified primary-remote behavior.
- The compatibility guidance said all control planes should be within one minor version of each other. Updated this to match Istio's documented control plane/data plane skew policy: the control plane can be one minor ahead of the data plane, but the data plane should not be ahead of the control plane.
- The examples used Istio 1.20, 1.21, and 1.22, which are no longer supported as of 2026-05-21. Updated examples to supported-era versions and changed upgrade snippets to Istio 1.30.0.
- The primary-remote remote cluster examples checked `deployment/istiod` after remote upgrades. In primary-remote topologies, remotes do not have the same primary control plane deployment, so the validation commands were changed to `istioctl version`.
- The root CA section implied every multicluster topology always shares one root CA and referred to "citadel." Updated the wording to describe shared trust more accurately and to refer to Istio CA with the `cacerts` secret.
- The east-west gateway Helm upgrade example omitted the Helm values used by Istio's current primary-remote gateway installation docs. Added `name` and `networkGateway` settings and updated the chart version.
- The rollback examples used `helm rollback istiod 1`, which may roll back to the first release revision rather than the previous known-good revision. Updated the snippet to check Helm history and roll back to `<previous-revision>`.

## Review Notes
The guide is technically relevant and broadly accurate after the fixes. The post still presents in-place upgrades for simplicity; Istio's official documentation recommends canary or revision-based upgrades for safer production rollouts.
