# Validation Summary: How to Handle Environment-Specific Istio Configuration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio VirtualService
- Istio AuthorizationPolicy
- Istio Telemetry
- Istio PeerAuthentication
- Kubernetes Kustomize
- Helm
- Argo CD ApplicationSet
- GitOps deployment workflows

## Sources Consulted
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio Telemetry reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl kustomize reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- Helm upgrade reference: https://helm.sh/docs/helm/helm_upgrade/
- Argo CD ApplicationSet generators documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/

## Issues Found
- The dev `AuthorizationPolicy` patch used `source.namespaces: ["dev"]` while the surrounding example describes relaxed dev authorization and pairs dev with PERMISSIVE mTLS. Istio documents that `source.namespaces` is derived from the peer certificate and requires mTLS, so plaintext traffic allowed by PERMISSIVE mode would not match that rule. Changed the dev patch to `rules: - {}`, which is Istio's documented allow-all rule for an ALLOW policy.

## Review Notes
- The Istio resources use current `v1` API versions and valid fields for VirtualService retries/timeouts, Telemetry sampling/access logging/metrics overrides, AuthorizationPolicy rules, and PeerAuthentication mTLS modes.
- The Kustomize `patches` examples use supported inline JSON 6902 patches with explicit targets.
- The Helm values files are chart-specific input examples, not Istio API resources by themselves; the `helm upgrade --install -f ... -n ...` command form is valid.
- The Argo CD ApplicationSet list generator example follows the documented pattern for rendering generated parameters into an Application template.
- `kubectl` and `helm` were not installed in the local review environment, so CLI behavior was verified against official command documentation rather than local `--help` output.
