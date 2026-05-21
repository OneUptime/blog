# Validation Summary: How to Safely Downgrade Istio to a Previous Version

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- Helm
- istioctl
- Envoy sidecar proxies
- Istio CRDs and webhooks
- Mutual TLS

## Sources Consulted
- Istio in-place upgrade and downgrade documentation: https://istio.io/latest/docs/setup/upgrade/in-place/
- Istio supported releases and control plane/data plane skew policy: https://istio.io/latest/docs/releases/supported-releases/
- Istio Helm installation documentation: https://istio.io/latest/docs/setup/install/helm/
- Istio Helm upgrade documentation: https://istio.io/latest/docs/setup/upgrade/helm/
- Istio gateway installation documentation: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio installation customization documentation: https://istio.io/latest/docs/setup/additional-setup/customize-installation/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio authentication policy task for mTLS verification patterns: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Local `istioctl` 1.20.5 help output for `upgrade`, `install`, and command availability.

## Issues Found
- The post said Istio does not officially support downgrades in the same way as upgrades. Current Istio documentation explicitly documents in-place downgrades for `istioctl` installations, with constraints. I updated the wording to state that downgrades are supported within documented version-skew limits.
- The post described the supported control plane/data plane skew as control plane N supporting data plane N and N-1, then warned about an N-1 control plane with N proxies. Official Istio documentation states that the control plane can be one version ahead of the data plane, and that the data plane cannot be ahead of the control plane. I corrected that explanation.
- The `istioctl` downgrade example used `istioctl install` as the primary command. Official Istio downgrade documentation recommends using the target-version `istioctl upgrade` command for in-place downgrades, with `istioctl install` as an alternative. I changed the main commands to `istioctl upgrade` and kept `istioctl install` as an alternative note.
- The validation command `istioctl authn tls-check <pod-name>.<namespace>` is not available in Istio 1.20.5 or current Istio. I replaced it with a practical HTTP request that checks the `X-Forwarded-Client-Cert` header, matching Istio's documented mTLS verification approach.

## Review Notes
The examples still use Istio 1.20.5 as an illustrative target version, which is no longer a currently supported Istio release as of the review date. That is acceptable for a downgrade example, but production readers should choose a supported target version whenever possible and should avoid downgrading by more than one minor version for in-place downgrades.
