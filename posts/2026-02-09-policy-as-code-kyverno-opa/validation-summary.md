# Validation Summary: How to Build Policy as Code Frameworks for Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- Kyverno
- OPA Gatekeeper
- Rego
- Helm
- kubectl
- Kubernetes CronJob and RBAC
- Python subprocess/json scripting

## Sources Consulted
- Kyverno installation documentation: https://kyverno.io/docs/installation/installation/
- Kyverno validate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno generate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/generate/
- Kyverno policy reports documentation: https://kyverno.io/docs/policy-reports/
- Kyverno require requests/limits policy library: https://kyverno.io/policies/best-practices/require-pod-requests-limits/require-pod-requests-limits/
- Gatekeeper installation documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/install/
- Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper data replication documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/v3.6.x/sync/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/
- kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found
- Kyverno Helm install used the obsolete top-level `replicaCount` value. Updated it to current per-controller replica values for admission, background, cleanup, and reports controllers.
- Gatekeeper installation used the `master` branch manifest. Updated it to the current release manifest URL shown in the official Gatekeeper installation docs.
- The Kyverno/Gatekeeper coordination snippet contained an invalid Kyverno ClusterPolicy rule with no validate, mutate, generate, verifyImages, or cleanup behavior. Removed that invalid policy and added concrete namespace exclusions to the Kyverno policies that would otherwise match Gatekeeper resources.
- Kyverno validation policies used deprecated `spec.validationFailureAction`. Moved enforcement to `validate.failureAction: Enforce`, matching current Kyverno guidance.
- The Kyverno NetworkPolicy generate rule omitted `generate.apiVersion`, which is required for the generated resource. Added `apiVersion: networking.k8s.io/v1`.
- Gatekeeper ConstraintTemplates used `templates.gatekeeper.sh/v1beta1` and lacked structural schemas. Updated them to `templates.gatekeeper.sh/v1` with `openAPIV3Schema.type: object`.
- Gatekeeper Rego referenced nonexistent `data.kubernetes.*` paths. Added Gatekeeper `sync.syncOnly` inventory configuration and updated Rego lookups to the documented `data.inventory` structure.
- The dashboard CronJob referenced a namespace and service account that were not defined and lacked RBAC for reading policy reports and constraints. Added the namespace, service account, ClusterRole, and ClusterRoleBinding.
- The final test Pod claimed OPA would reject the default ServiceAccount, but the default ServiceAccount normally exists. Changed the test to use a missing ServiceAccount and removed an inaccurate label-related comment.
- Reworded the Gatekeeper description from "external API integration" to "external data integration" to avoid implying arbitrary API calls from Gatekeeper Rego.

## Review Notes
YAML snippets parse successfully and the Python dashboard snippet compiles. I could not run live `kubectl apply` validation because `kubectl` is not installed in this workspace.
