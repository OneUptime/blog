# Validation Summary: How to Choose the Right Istio Installation Configuration Profile

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- istioctl
- Kubernetes
- IstioOperator configuration
- Istio installation profiles

## Sources Consulted
- Istio Installation Configuration Profiles: https://istio.io/latest/docs/setup/additional-setup/config-profiles/
- Istio Install with Istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio OpenShift platform setup: https://istio.io/latest/docs/setup/platform-setup/openshift/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio CNI installation documentation: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio 1.24.0 release announcement: https://istio.io/latest/news/releases/1.24.x/announcing-1.24/
- Istio 1.24.0 profile manifests: https://github.com/istio/istio/tree/1.24.0/manifests/profiles

## Issues Found
- The post used `istioctl profile list`, `istioctl profile diff`, and `istioctl profile dump`, but these commands are not available in Istio 1.24.0. Replaced them with release profile file listing and `istioctl manifest generate` examples.
- The Istio 1.24 profile list omitted documented deployment profiles `ambient` and `preview`, and treated `openshift` as a deployment profile. Updated the list to separate documented deployment profiles from platform profiles.
- The profile comparison introduced the table as covering every profile, while it only covered sidecar-focused profiles plus OpenShift. Narrowed the wording to avoid implying that ambient and preview were included in that table.
- The demo profile text said lower resource limits, but the shown values are resource requests. Updated the wording to say lower resource requests.
- The post used `istioctl verify-install`, which is not available in Istio 1.24.0. Replaced it with `kubectl get deployments,daemonsets -n istio-system` and noted the supported `--verify` install/upgrade flag.

## Review Notes
The remaining IstioOperator snippets use the documented `install.istio.io/v1alpha1` API shape and current `istioctl install --set` customization model. The post intentionally remains focused on sidecar-mode installation profiles; a future update could add a separate ambient profile section if the article wants to cover all Istio 1.24 deployment profiles in detail.
