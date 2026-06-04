# Validation Summary: How to Set Up Kyverno Mutating Policies to Inject Security Defaults

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kyverno ClusterPolicy mutation rules
- Helm
- kubectl
- Kubernetes security contexts
- Kubernetes resource requests and limits
- Trivy

## Sources Consulted
- Kyverno mutation rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/mutate/
- Kyverno installation documentation: https://kyverno.io/docs/installation/installation/
- Kubernetes security context documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes seccomp documentation: https://kubernetes.io/docs/reference/node/seccomp/
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl create deployment reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/
- Trivy CLI reference: https://trivy.dev/latest/docs/references/configuration/cli/trivy/
- Trivy server reference: https://trivy.dev/latest/docs/references/configuration/cli/trivy_server/

## Issues Found
- The Kyverno Helm install command used the older `replicaCount=3` value. Current Kyverno Helm documentation configures high availability per controller, so the command now sets `admissionController.replicas`, `backgroundController.replicas`, `cleanupController.replicas`, and `reportsController.replicas`.
- The security-context and resource-limit mutation examples claimed to add defaults only when values were missing, but their patches used ordinary strategic merge fields that could replace existing scalar values. Updated the examples to use Kyverno add-if-not-present anchors such as `+(runAsNonRoot)` and `+(memory)`.
- The standalone pod test used `nginx` with `readOnlyRootFilesystem: true`, which commonly prevents NGINX from starting because it writes runtime files. Changed the test workload to a long-running BusyBox command.
- The deployment test checked the Deployment object for `securityContext`, but the shown policy matches `Pod` resources, so mutation is visible on the Pods created by the Deployment. Updated the verification command to query Pods by label.
- The Trivy sidecar example used `trivy scan`, which is not a current Trivy subcommand. Updated it to run Trivy in server mode with `server --listen 0.0.0.0:4954`.

## Review Notes
The examples use Kyverno `ClusterPolicy` mutation rules, which remain documented, while Kyverno also has newer CEL-based policy types. Future updates could consider whether the post should cover those newer policy APIs, but the corrected examples are valid for the ClusterPolicy approach described here.
