# Validation Summary: How to Deploy Envoy Gateway with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Envoy Gateway
- Flux CD
- Kubernetes Gateway API
- Kubernetes GatewayClass, Gateway, HTTPRoute, and ReferenceGrant resources
- Flux OCIRepository, HelmRelease, and Kustomization resources
- kubectl and flux CLI commands
- cert-manager-managed TLS certificates

## Sources Consulted
- Envoy Gateway official Flux CD installation docs: https://gateway.envoyproxy.io/docs/install/install-flux/
- Envoy Gateway official Helm installation docs: https://gateway.envoyproxy.io/docs/install/install-helm/
- Envoy Gateway official Helm chart values reference: https://gateway.envoyproxy.io/docs/install/gateway-helm-api/
- Envoy Gateway official API extension reference: https://gateway.envoyproxy.io/docs/api/extension_types/
- Envoy Gateway official compatibility matrix: https://gateway.envoyproxy.io/news/releases/matrix/
- Envoy Gateway official Gateway API support docs: https://gateway.envoyproxy.io/docs/tasks/traffic/gatewayapi-support/
- Envoy Gateway official Gateway address docs: https://gateway.envoyproxy.io/docs/tasks/traffic/gateway-address/
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Kubernetes Gateway API v1.5 specification: https://gateway-api.sigs.k8s.io/reference/1.5/spec/
- Kubernetes Gateway API ReferenceGrant docs: https://gateway-api.sigs.k8s.io/api-types/referencegrant/

## Issues Found
- The post used a `HelmRepository` pointing at `https://gateway.envoyproxy.io/helm-stable`, but current Envoy Gateway documentation publishes the chart as an OCI artifact at `oci://docker.io/envoyproxy/gateway-helm`. Updated Step 1 to use Flux `OCIRepository`.
- The `HelmRelease` used `chart.spec` with a semver range for the old Helm repository pattern. Updated it to `chartRef` against the `OCIRepository`, pinned the documented chart tag, and added the retry upgrade strategy shown by the Envoy Gateway Flux docs.
- The `HelmRelease` lived in `envoy-gateway-system` without showing that the namespace exists. Added a Namespace manifest to the Flux-managed resources.
- The Helm values included unsupported fields: `config.envoyGateway.provider.kubernetes.rateLimitServer.url` and top-level `metrics.enabled`. Removed them and kept supported `config.envoyGateway`, logging, provider, and deployment resource settings.
- The prerequisite `Kubernetes 1.26+` was too broad for the pinned Envoy Gateway v1.7 line. Updated it to Kubernetes 1.32+ based on the Envoy Gateway compatibility matrix.
- The Gateway comment said the HTTP listener redirects to HTTPS, but no redirect HTTPRoute was defined. Updated the comment so it no longer claims behavior that the manifest does not implement.
- The verification command depended on a generated Envoy Service name and tested HTTP even though the application route attaches only to the HTTPS listener. Updated it to read the Gateway status address and test HTTPS with `curl --connect-to`.
- The best-practice note said to pin the GatewayClass controller name to an Envoy Gateway version. GatewayClass controller names are identifiers, not version pins, so the note now says to pin the Helm chart version and keep the controller name aligned with Envoy Gateway configuration.

## Review Notes
The corrected guide pins Envoy Gateway v1.7.3 because that is the version shown in the current official Flux CD installation example consulted during review. Envoy Gateway v1.8 is listed in the compatibility matrix, so this post may be updated later to a newer pinned chart version after checking the corresponding install docs and release notes.
