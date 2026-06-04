# Validation Summary: How to Build a Custom Prometheus Exporter for Kubernetes CRD Metrics in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- Prometheus Go client
- Kubernetes Custom Resource Definitions
- Kubernetes dynamic client and dynamic informers
- Kubernetes RBAC
- Prometheus Operator ServiceMonitor
- kubectl

## Sources Consulted
- Prometheus Go client package documentation: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus
- Kubernetes client-go dynamic client documentation: https://pkg.go.dev/k8s.io/client-go/dynamic
- Kubernetes client-go dynamic informer documentation: https://pkg.go.dev/k8s.io/client-go/dynamic/dynamicinformer
- Kubernetes client-go cache/informer documentation: https://pkg.go.dev/k8s.io/client-go/tools/cache
- Kubernetes apimachinery unstructured helpers documentation: https://pkg.go.dev/k8s.io/apimachinery/pkg/apis/meta/v1/unstructured
- Kubernetes RBAC API documentation: https://kubernetes.io/docs/reference/kubernetes-api/rbac/
- Kubernetes CRD status subresource documentation: https://kubernetes.io/docs/reference/kubernetes-api/apiextensions/custom-resource-definition-v1/
- Kubernetes kubectl subresource conventions: https://kubernetes.io/docs/reference/kubectl/conventions/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Prometheus Operator ServiceMonitor documentation: https://prometheus-operator.dev/docs/developer/getting-started/

## Issues Found
- The Go import block omitted `sync`, which is required by `sync.RWMutex`, and `metav1`, which is required by `metav1.ListOptions`. Added both imports.
- The `backup_status` description said `0=failure`, but the code emits `0` for any non-`Completed` phase, not only failures. Updated the description to `0=not completed`.
- The duration parsing ignored `time.Parse` errors, which could produce invalid durations from zero-value timestamps. Added error checks before emitting `backup_duration_seconds`.
- The informer delete handler assumed every delete event contains `*unstructured.Unstructured`. Kubernetes informers can deliver `cache.DeletedFinalStateUnknown` tombstones when delete events are missed. Added tombstone handling.
- The ServiceAccount manifest did not set `namespace: monitoring`, while the Deployment and ClusterRoleBinding subject expect the ServiceAccount in `monitoring`. Added the namespace to the ServiceAccount.
- The test resource applied `status` through the main custom resource endpoint. For CRDs with the status subresource enabled, normal create/update/patch requests ignore the status stanza. Changed the test to create the spec first and then patch `--subresource=status`.

## Review Notes
- The examples now align with the documented Prometheus collector APIs, Kubernetes dynamic client APIs, dynamic informer behavior, RBAC fields, ServiceMonitor selection pattern, and CRD status subresource behavior.
- Local command verification was limited because `go` and `kubectl` are not installed in this workspace, so CLI and compile checks were verified against official documentation rather than local binaries.
