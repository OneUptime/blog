# Validation Summary: How to Verify Your Istio Installation is Working Correctly

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Istio
- Kubernetes
- istioctl
- Envoy sidecar proxies
- Istio mutual TLS
- Istio ingress gateways
- Kubernetes DNS and LoadBalancer services

## Sources Consulted
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio DNS proxying documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- Istio authentication policy documentation: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio security FAQ: https://istio.io/latest/about/faq/security/
- Istio gateway installation documentation: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio sample manifests on GitHub, release-1.30 branch: https://raw.githubusercontent.com/istio/istio/release-1.30/samples/httpbin/httpbin.yaml and https://raw.githubusercontent.com/istio/istio/release-1.30/samples/sleep/sleep.yaml

## Issues Found
- The post used `istioctl verify-install`, which is not present in the current Istio 1.30 command reference. I changed this section to use `istioctl install --verify` and `istioctl install -f your-istio-config.yaml --verify`, matching the current documented flag.
- The sidecar injector example used a version-specific webhook name ending in `1-24`. I changed it to `istio-sidecar-injector-<revision>` so the example remains accurate across Istio revisions.
- The mTLS section checked `istioctl proxy-config secret deploy/istiod`, but `proxy-config secret` is intended for Envoy proxy configuration on pods or workloads, not for validating traffic between the sample services through `istiod`. I removed that command and changed the runtime mTLS check to verify the `X-Forwarded-Client-Cert` header on an httpbin `/headers` request, which Istio documents as evidence of mutual TLS for sidecar-mode traffic.
- The sample manifest URLs used the old `release-1.24` branch. I updated them to the current `release-1.30` branch and verified both URLs return successfully.
- The gateway test hard-coded service name `istio-ingress`. Current Istio gateway installation examples commonly use `istio-ingressgateway`, while Helm release names can vary. I updated the command to make the gateway service name explicit and to handle either a LoadBalancer IP or hostname.
- The proxy configuration examples used `deploy/httpbin`; the current Istio command reference documents `deployment/<deployment-name>`. I updated these examples to `deployment/httpbin`.

## Review Notes
The guide remains focused on sidecar-mode Istio. Ambient-mode installations have different mTLS and data plane verification commands, such as `istioctl ztunnel-config`, and could be covered separately in a future post.
