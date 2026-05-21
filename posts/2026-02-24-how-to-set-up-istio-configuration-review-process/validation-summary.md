# Validation Summary: How to Set Up Istio Configuration Review Process

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- GitHub Actions
- GitHub CODEOWNERS
- Bash
- Prometheus
- Kustomize
- yamllint

## Sources Consulted
- Istio `istioctl analyze` documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio command reference for `istioctl analyze` and `istioctl proxy-status`: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio getting started and download documentation: https://istio.io/latest/docs/setup/getting-started/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy reference and tasks: https://istio.io/latest/docs/reference/config/security/authorization-policy/ and https://istio.io/latest/docs/tasks/security/authorization/
- Istio Telemetry reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- GitHub CODEOWNERS documentation: https://docs.github.com/articles/about-code-owners

## Issues Found
- Fixed the CODEOWNERS example to use GitHub's documented team syntax (`@org/team-name`) instead of bare team names.
- Reordered and clarified the CODEOWNERS example so later matching security and EnvoyFilter ownership rules are not unintentionally overridden by broader service-directory rules.
- Updated the Istio install example from `ISTIO_VERSION=1.24.0` to `ISTIO_VERSION=1.30.0`, matching the current official getting-started documentation checked on 2026-05-21.
- Replaced `istioctl analyze -R istio/` with `istioctl analyze --use-kube=false istio/`. Current `istioctl analyze` accepts file and directory inputs directly, supports `--use-kube=false` for offline local-file validation, and exits non-zero at the configured failure threshold.
- Fixed the wildcard-principal grep pattern so it matches inline YAML such as `principals: ["*"]`.
- Corrected the VirtualService checklist item that said route weights should sum to 100. Istio treats route weights as relative proportions using `weight / sum(weights)`.
- Tightened the staging authorization test so it verifies an HTTP 403 response instead of treating any `curl` failure as a successful denial.

## Review Notes
- The shell checks in the CI example are intentionally lightweight and still will not catch every YAML representation, such as multiline wildcard principal lists. A production implementation should use a structured YAML/policy tool such as OPA, Kyverno, or a purpose-built validation script.
- The EnvoyFilter warning correctly treats a selector-less EnvoyFilter in the root configuration namespace as mesh-wide, but the example assumes `istio-system` is the root namespace. Some Istio installations use a different root namespace.
