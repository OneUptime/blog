# Validation Summary: How to Implement Policy as Code with Open Policy Agent and Gatekeeper on GKE

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes admission control and workload manifests
- Open Policy Agent (OPA) Rego
- OPA Gatekeeper ConstraintTemplates and Constraints
- Gatekeeper audit and enforcement actions
- gator CLI
- Google Cloud Build
- Google Cloud Logging logs-based metrics
- Terraform Google provider

## Sources Consulted
- Gatekeeper installation documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/install/
- Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper "How to use Gatekeeper" documentation for constraints, match fields, parameters, and enforcement actions: https://open-policy-agent.github.io/gatekeeper/website/docs/howto/
- Gatekeeper handling constraint violations documentation for dryrun behavior: https://open-policy-agent.github.io/gatekeeper/website/docs/violations/
- Gatekeeper admission review input documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/input/
- Gatekeeper gator CLI documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/gator/
- Google Cloud GKE Gatekeeper policy guide: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/pod-security-policies-with-gatekeeper
- Gatekeeper Library required resources template: https://open-policy-agent.github.io/gatekeeper-library/website/validation/containerresources/
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes init containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Google Cloud Build build step ordering documentation: https://docs.cloud.google.com/build/docs/configuring-builds/configure-build-step-order
- Google Cloud Logging counter metrics documentation: https://cloud.google.com/logging/docs/logs-based-metrics/counter-metrics
- Terraform Google provider `google_logging_metric` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/logging_metric

## Issues Found
- The first policy said it blocked containers from running as root, but the Rego only rejected explicit `runAsUser: 0` and `runAsNonRoot: false`. Updated the wording and comments to clarify that the example blocks workloads explicitly configured to run as root.
- The no-root constraint matched `Deployment`, `StatefulSet`, and `DaemonSet`, but the Rego read `input.review.object.spec.containers`, which is valid for Pods but not workload controllers. Updated the Rego to read either Pod `spec` or controller `spec.template.spec`.
- The no-root template comment said it checked pod-level security context while the original rule checked container-level fields only. Added pod-level `securityContext.runAsUser` and `securityContext.runAsNonRoot` checks, plus the same `runAsNonRoot` check for init containers.
- The resource limits and allowed registry templates read only Pod `spec.containers`. Updated both templates to use a shared pod spec helper so they can evaluate Pod templates if used with workload controllers.
- The allowed registry template checked only app containers. Added an init container check so init images are covered too.
- The CI/CD section described `gator verify` as testing Kubernetes manifests against policies. Current Gatekeeper documentation defines `gator verify` as suite-based testing and `gator test` as manifest evaluation. Updated the comments to distinguish the two commands.

## Review Notes
The Gatekeeper install URL in the post pins v3.15.0, which is older than the current Gatekeeper documentation version consulted during review, but the pinned release URL format is valid. I could not run `gator --help` locally because `go` is not installed in the review environment, so gator command validation was performed against the official Gatekeeper CLI documentation.
