# Validation Summary: How to Set Up Istio Training Program for Developers

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- kind
- istioctl
- Envoy sidecars
- Service mesh traffic management and security policies

## Sources Consulted
- Istio Protocol Selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio Application Requirements: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio Installing the Sidecar: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio Install with Istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio Getting Started: https://istio.io/latest/docs/setup/getting-started/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Understand your Mesh with Istioctl Describe: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found
- The local lab script used the older Istio `release-1.21` Bookinfo sample URL while the rest of the script installs the Istio version represented by the user's local `istioctl`. Updated the sample URL to `release-1.30`, matching the current Istio documentation version reviewed.
- The MySQL port-naming exercise said connections would time out after 5 seconds. Current Istio documentation states MySQL is a server-first protocol and should be explicitly declared as TCP, with common MySQL port 3306 automatically assumed to be TCP. Reworded the scenario to focus on the documented behavior instead of a fixed timeout.
- The cheat sheet used `istioctl authn tls-check deploy/myapp`, which is no longer present in the current `istioctl` command reference. Replaced it with `istioctl x describe pod <pod-name>`, which current Istio documentation uses to inspect traffic and mTLS configuration.

## Review Notes
The post is focused on training design rather than complete runnable labs. The high-level Istio concepts, Kubernetes manifests, namespace injection label, protocol port naming format, `kubectl wait` usage, and `istioctl analyze`/`proxy-config` commands are consistent with current official documentation. For future updates, consider pinning the Istio install version in the kind setup script so `istioctl` and remote sample manifests always come from the same release.
