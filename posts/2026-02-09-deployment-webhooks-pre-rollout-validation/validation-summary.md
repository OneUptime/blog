# Validation Summary: How to Set Up Deployment Webhooks for Pre-Rollout Validation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes admission webhooks
- ValidatingWebhookConfiguration and admissionregistration.k8s.io/v1
- Node.js / Express webhook server
- Kubernetes Deployment, Service, ServiceAccount, Role, and RoleBinding resources
- Argo Rollouts AnalysisTemplate and web metrics
- Open Policy Agent / Gatekeeper and Rego
- kubectl, Docker, yq, Trivy, and bash CI scripts

## Sources Consulted
- Kubernetes Dynamic Admission Control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes ValidatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-webhook-configuration-v1/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Argo Rollouts Analysis documentation: https://argo-rollouts.readthedocs.io/en/stable/features/analysis/
- OPA Gatekeeper installation documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/next/install/
- OPA Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- CNCF Distribution Registry HTTP API V2 specification: https://distribution.github.io/distribution/spec/api/
- Trivy vulnerability scanning documentation: https://trivy.dev/docs/latest/scanner/vulnerability/

## Issues Found
- The webhook server used plain `app.listen()` even though Kubernetes admission webhooks are called over HTTPS when configured through `clientConfig.service`. Updated the example to create an HTTPS server with the mounted TLS certificate and key.
- The image validation request built an invalid registry manifest URL for images that include a registry, repository, and tag. Updated it to parse image references and use the Registry HTTP API V2 `HEAD /v2/<name>/manifests/<reference>` endpoint with manifest Accept headers.
- The ConfigMap validation code called an undefined `checkConfigMapExists()` helper and claimed to validate Secrets without doing so. Added Kubernetes API lookup logic for ConfigMaps and Secrets referenced by volumes, `envFrom`, and environment variable key refs.
- The deployment manifest did not grant the webhook permissions needed to read ConfigMaps and Secrets. Added a ServiceAccount, Role, RoleBinding, and `NODE_EXTRA_CA_CERTS` environment variable for in-cluster Kubernetes API calls.
- The Argo Rollouts example described a pre-rollout check but configured background canary analysis after rollout start, and it referenced `{{ args.version }}` without declaring or passing the argument. Changed it to an inline analysis step before the first canary traffic shift and added the required argument wiring.
- The OPA/Rego resource-limits rule denied only when no container had limits, not when any container was missing limits. Updated the rule to bind each container and deny if that container has no limits.
- The pre-flight bash script used unquoted file and image variables. Added `set -euo pipefail` and quoted variable expansions.

## Review Notes
JavaScript snippets and the bash script were syntax-checked locally. `kubectl`, `yq`, `trivy`, and a local YAML parser were not available in the workspace, so those examples were checked against official documentation rather than executed end to end. The resource quantity parser remains intentionally simple and covers the binary units shown in the post, but a production webhook should use Kubernetes quantity parsing semantics.
