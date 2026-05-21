# Validation Summary: How to Run Security Scans on Istio Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- istioctl
- Kubernetes
- Trivy
- Kyverno
- OPA Gatekeeper
- Rego
- GitHub Actions
- GitLab CI
- Bash
- jq

## Sources Consulted
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Gateway reference and protocol selection docs: https://istio.io/latest/docs/reference/config/networking/gateway/ and https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio 1.30 release announcement and 1.22 EOL notice: https://istio.io/latest/news/releases/1.30.x/announcing-1.30/ and https://istio.io/latest/news/support/announcing-1.22-eol/
- Trivy config CLI reference: https://trivy.dev/docs/latest/guide/references/configuration/cli/trivy_config/
- Kyverno installation docs: https://kyverno.io/docs/installation/installation/
- Kyverno validate rule docs: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno sample Istio AuthorizationPolicy policy: https://kyverno.io/policies/istio/require-authorizationpolicy/require-authorizationpolicy/
- Gatekeeper ConstraintTemplate docs: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- OPA object built-ins reference: https://www.openpolicyagent.org/docs/policy-reference/builtins/object

## Issues Found
- Fixed the GitHub Actions `GITHUB_PATH` update. The original quoted wildcard would write a literal `istio-*/bin` path instead of expanding the downloaded Istio directory.
- Updated `istioctl analyze` examples so `--use-kube=false` appears before the file path, matching the official command examples.
- Replaced the old Kyverno v1.11.0 YAML install command with the current Helm-based install path recommended by Kyverno for normal installations.
- Updated Kyverno policies from deprecated `spec.validationFailureAction` to `validate.failureAction`.
- Corrected the Kyverno AuthorizationPolicy example. The original policy only checked whether a Namespace had the `istio-injection=enabled` label and did not verify that an AuthorizationPolicy existed. The revised version uses a Kyverno `apiCall` context to list AuthorizationPolicy namespaces and deny/report injected namespaces without one.
- Added the required structural OpenAPI schema to the Gatekeeper `ConstraintTemplate` and made the Rego rule treat a missing `spec.mtls.mode` as non-compliant instead of silently skipping it.
- Updated Istio image scan examples from EOL Istio 1.22.0 images on `docker.io/istio` to Istio 1.30.0 images on the current default `registry.istio.io` registry.
- Made the custom script use fully qualified Istio CRD resource names for PeerAuthentication, AuthorizationPolicy, and Gateway to avoid ambiguity with similarly named Kubernetes Gateway API resources.
- Fixed the AuthorizationPolicy count in the custom script by using `--no-headers` and checking for zero resources directly.
- Reworked the istiod non-root check so it does not assume UID 1337 specifically; it now accepts either `runAsNonRoot: true` or any explicit non-zero `runAsUser`.

## Review Notes
- Trivy command flags and output options are current according to the official CLI reference.
- The Kyverno `ClusterPolicy` examples remain valid for the policy style used in the post, but Kyverno's policy APIs are evolving; future refreshes should check whether newer `ValidatingPolicy` examples are preferred.
- The custom Bash script is still intentionally heuristic and cluster-layout dependent, especially the mesh ConfigMap check for outbound traffic policy.
