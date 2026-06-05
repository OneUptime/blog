# Validation Summary: How to Fix the Operator Finalizer Blocking Namespace Deletion When Cluster RBAC

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes namespaces and finalizers
- Kubernetes RBAC
- kubectl
- OpenTelemetry Operator
- Helm hooks
- jq

## Sources Consulted
- Kubernetes finalizers documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/
- Kubernetes Namespace API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/namespace-v1/
- Kubernetes kubectl api-resources reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Helm chart hooks documentation: https://helm.sh/docs/topics/charts_hooks/
- OpenTelemetry Operator documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/
- OpenTelemetry Operator upstream RBAC manifest: https://github.com/open-telemetry/opentelemetry-operator/blob/main/config/rbac/role.yaml
- OpenTelemetry Operator upstream ClusterRoleBinding manifest: https://github.com/open-telemetry/opentelemetry-operator/blob/main/config/rbac/role_binding.yaml
- OpenTelemetry Operator controller source and changelog: https://github.com/open-telemetry/opentelemetry-operator

## Issues Found
- The post said `kubectl get namespace ... -o yaml` reveals an OpenTelemetry Operator finalizer directly on the namespace. Updated this to say the namespace output shows remaining namespaced content, while the finalizer is on the remaining OpenTelemetry resource.
- The post said the Operator adds finalizers to custom resources such as both `OpenTelemetryCollector` and `Instrumentation`. Upstream OpenTelemetry Operator RBAC and controller code show the collector finalizer is the relevant Operator finalizer, so the wording now focuses on `OpenTelemetryCollector` and treats Instrumentation finalizers as possible unrelated/custom finalizers.
- The example finalizer key used `opentelemetrycollectors.opentelemetry.io/finalizer`. Upstream controller code uses `opentelemetrycollector.opentelemetry.io/finalizer`, so the example was corrected.
- The RBAC example omitted `patch` on core and apps resources and listed only `update` for `opentelemetrycollectors/finalizers`. Updated the verbs to align with current upstream Operator RBAC.
- The Helm pre-delete hook used `${NAMESPACE}` without defining it and did not mention that the hook pod needs RBAC. Added a `serviceAccountName` and a Downward API `NAMESPACE` environment variable, and clarified that the ServiceAccount must be able to delete the custom resources.

## Review Notes
The `kubectl replace --raw "/api/v1/namespaces/my-namespace/finalize"` namespace finalization pattern is technically valid but remains a last resort. Kubernetes documentation warns that removing finalizers manually should only be done when the finalizer's purpose is understood and cleanup has been handled another way.
