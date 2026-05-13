# Validation Summary: How to Deploy OAuth2 Proxy with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- Helm and HelmRelease
- OAuth2 Proxy
- GitHub OAuth Apps
- ingress-nginx external authentication
- Kustomize

## Sources Consulted
- OAuth2 Proxy NGINX integration documentation: https://oauth2-proxy.github.io/oauth2-proxy/configuration/integrations/nginx/
- OAuth2 Proxy configuration overview and command-line options: https://oauth2-proxy.github.io/oauth2-proxy/configuration/overview/
- OAuth2 Proxy GitHub provider documentation: https://oauth2-proxy.github.io/oauth2-proxy/configuration/providers/github/
- OAuth2 Proxy Helm chart repository and chart metadata: https://github.com/oauth2-proxy/manifests
- OAuth2 Proxy Helm chart values.yaml: https://raw.githubusercontent.com/oauth2-proxy/manifests/main/helm/oauth2-proxy/values.yaml
- ingress-nginx external OAuth authentication example: https://kubernetes.github.io/ingress-nginx/examples/auth/oauth-external-auth/
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The HelmRelease pinned the OAuth2 Proxy chart to `>=7.0.0 <8.0.0`, while the current official chart is 10.x. Updated the range to `>=10.0.0 <11.0.0`.
- The Helm values used `service.port`, but the official chart now uses `service.portNumber`. Updated the value so the generated Service uses the intended port.
- The Helm values used `ingress.ingressClassName`, but the official chart uses `ingress.className`. Updated the field so the generated Ingress sets `spec.ingressClassName`.
- The ingress-nginx example requested `X-Auth-Request-*` response headers, but OAuth2 Proxy only emits those headers in auth request mode when `--set-xauthrequest` is enabled. Added `set-xauthrequest: "true"`.
- OAuth2 Proxy's NGINX integration documentation states that auth_request mode requires `--reverse-proxy`. Added `reverse-proxy: "true"` to the Helm values.
- The `skip-provider-button` comment incorrectly described health-check skipping. Corrected the comment to describe provider selection behavior.
- The Flux `Kustomization` resource was shown as `clusters/my-cluster/oauth2-proxy/kustomization.yaml`, which would conflict with the Kubernetes/Kustomize file name for the directory Flux is reconciling. Changed the example path to `clusters/my-cluster/oauth2-proxy-sync.yaml`.
- The Redis best-practice note implied Redis is required to keep sessions valid during rolling updates. Clarified that shared cookie secrets keep cookie-backed sessions valid across replicas, while Redis is useful for server-side sessions or large OIDC tokens.

## Review Notes
- The guide still creates the namespace and Kubernetes Secret imperatively with `kubectl`; for a stricter GitOps workflow, a future revision could manage these with Flux plus a secret-management approach such as SOPS or External Secrets.
- Cross-namespace `sourceRef` from the HelmRelease to a HelmRepository in `flux-system` is valid in standard Flux installations, but clusters started with Flux's no-cross-namespace references option would need a same-namespace source or adjusted controller settings.
