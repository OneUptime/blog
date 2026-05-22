# Validation Summary: How to Perform a Canary Upgrade of Istio Control Plane

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- istioctl
- Helm
- Envoy sidecar injection
- Istio control plane revisions

## Sources Consulted
- Istio Canary Upgrades documentation: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Install with Istioctl documentation: https://istio.io/latest/docs/setup/install/istioctl/
- Istio Upgrade with Helm documentation: https://istio.io/latest/docs/setup/upgrade/helm/
- Istio Supported Releases documentation: https://istio.io/latest/docs/releases/supported-releases/
- Istio Support Announcements: https://istio.io/latest/news/support/

## Issues Found
- The examples used Istio 1.20 and 1.21, which are end-of-life releases. Updated the examples to use Istio 1.28 to 1.29 and the download command to use Istio 1.29.2.
- The uninstall section used `istioctl uninstall --revision=default -y` ambiguously and repeated it for an installation that did not use revisions. Updated it to use a concrete old revision example and to show uninstalling with the original IstioOperator profile file for unrevised installs, matching the official Istio canary upgrade guidance.
- The post said having both `istio-injection=enabled` and `istio.io/rev=canary` produces undefined behavior. Official Istio documentation says `istio-injection` takes precedence over `istio.io/rev` for backward compatibility, so the explanation was corrected.

## Review Notes
- The canary upgrade flow, revision labels, workload restarts, `istioctl proxy-status`, `istioctl analyze`, `istioctl proxy-config routes`, and Helm uninstall example are consistent with official Istio documentation.
- Official Istio documentation recommends running `istioctl x precheck` before upgrades. The post does not include that step, but the existing flow is still technically valid.
