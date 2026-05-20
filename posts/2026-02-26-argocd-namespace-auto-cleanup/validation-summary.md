# Validation Summary: How to Implement Namespace Auto-Cleanup with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet Pull Request generator
- Kubernetes Namespaces
- Kubernetes CronJobs
- Kubernetes RBAC
- kubectl
- jq
- Kyverno DeletingPolicy
- GitOps

## Sources Consulted
- Argo CD ApplicationSet Pull Request generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Pull-Request/
- Argo CD ApplicationSet application deletion and resource pruning documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Application-Deletion/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kyverno Cleanup Policy documentation: https://kyverno.io/docs/policy-types/cleanup-policy/
- Kyverno DeletingPolicy documentation: https://kyverno.io/docs/policy-types/deleting-policy/
- Kyverno CEL libraries documentation: https://kyverno.io/docs/policy-types/cel-libraries/

## Issues Found
- The Kyverno example used `ClusterCleanupPolicy` with `apiVersion: kyverno.io/v2beta1`. Current Kyverno documentation marks cleanup policies as deprecated in Kyverno v1.18 and documents stable `DeletingPolicy` resources under `policies.kyverno.io/v1`. Updated the section to use `DeletingPolicy` with CEL conditions.
- The Kyverno age expression used `time_since('', '{{target.metadata.creationTimestamp}}', '')`, which is not the current CEL-based syntax for `DeletingPolicy`. Replaced it with `time.now() - timestamp(object.metadata.creationTimestamp) > duration('168h')`.
- The Kyverno selector example was written for the old cleanup policy shape. Replaced it with a CEL condition checking the namespace `type=preview` label and added `matchConstraints` for core `v1` namespaces.
- The post did not mention that Kyverno's cleanup controller needs delete permissions on the target resource. Added a sentence noting the required `get`, `list`, `watch`, and `delete` permissions for namespaces.
- The CronJob used `bitnami/kubectl:latest` while the script requires `kubectl`, `jq`, and `curl`. Updated the example to use an image that includes those tools and added a short inline note.
- The initial command comments said the namespace command showed resource usage and that the loop counted resources, but the examples showed namespace creation time/phase and pod counts. Updated the comments to match the actual commands.

## Review Notes
- The Argo CD ApplicationSet Pull Request generator fields, including GitHub `tokenRef`, `labels`, `requeueAfterSeconds`, and `head_sha`, match the official Argo CD documentation.
- The Argo CD finalizer behavior is accurate: ApplicationSet-created Applications can include `resources-finalizer.argocd.argoproj.io`, and Argo CD deletes managed resources when the Application is deleted. A namespace created only by `CreateNamespace=true` should not be treated the same as a Namespace manifest managed by the Application.
- The Kubernetes CronJob manifest uses the current `batch/v1` API and valid `jobTemplate`, `serviceAccountName`, and `restartPolicy` placement.
