# Validation Summary: How to Install Istio on Kubernetes Using istioctl Step by Step

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Istio
- Kubernetes
- istioctl
- Envoy sidecar injection
- Istio Gateway and VirtualService
- IstioOperator configuration

## Sources Consulted
- Istio: Download the Istio release - https://istio.io/latest/docs/setup/additional-setup/download-istio-release/
- Istio: Platform Setup - https://istio.io/latest/docs/setup/platform-setup/
- Istio: Install with Istioctl - https://istio.io/latest/docs/setup/install/istioctl/
- Istio: Installation Configuration Profiles - https://istio.io/latest/docs/setup/additional-setup/config-profiles/
- Istio: Installing the Sidecar - https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio: Getting Started without the Gateway API - https://istio.io/latest/docs/setup/additional-setup/getting-started-istio-apis/
- Istio: istioctl command reference - https://istio.io/latest/docs/reference/commands/istioctl/
- Istio: In-place Upgrades - https://istio.io/latest/docs/setup/upgrade/in-place/
- Istio: Canary Upgrades - https://istio.io/latest/docs/setup/upgrade/canary/

## Issues Found
- The prerequisites listed Kubernetes 1.25 or later, which is outdated for current Istio. Updated the requirement to say users should use a Kubernetes version supported by their Istio release and noted that Istio 1.30 supports Kubernetes 1.32 through 1.36.
- The download section used Istio 1.24.0 as the example latest release. Updated the example directory, version variable, and `cd` command to Istio 1.30.0 to match the current official documentation.
- The verification section used `istioctl verify-install`, which has been removed from current Istio installation documentation and is not present in the current command reference. Replaced it with `istioctl analyze` and adjusted the explanation accordingly.
- The ingress host command only read `.status.loadBalancer.ingress[0].ip`, even though the text says cloud providers may return a hostname. Added a hostname fallback for load balancers such as AWS ELB.
- The useful commands section used `istioctl dashboard envoy`, which the current command reference marks as deprecated. Replaced it with `istioctl dashboard proxy`.
- The upgrade section said `istioctl upgrade -y` performs a canary upgrade. Corrected this to say it performs an in-place upgrade and noted that Istio recommends revision-based canary upgrades for safer production rollouts.
- The uninstall section said `--purge` removes everything, including CRDs and webhooks. Updated the wording to match Istio documentation: it removes all Istio resources, including cluster-scoped resources that may be shared with other control planes.

## Review Notes
The tutorial uses the legacy Istio Gateway and VirtualService API for Bookinfo ingress. This is still documented by Istio under "Getting Started without the Gateway API," but Istio's main getting started path now emphasizes the Kubernetes Gateway API.
