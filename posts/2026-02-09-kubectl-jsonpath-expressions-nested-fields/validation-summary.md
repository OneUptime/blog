# Validation Summary: How to Use kubectl JSONPath Expressions to Extract Nested Resource Fields

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- kubectl
- Kubernetes JSONPath
- jq
- Bash shell pipelines

## Sources Consulted
- Kubernetes JSONPath Support documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes Pod v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes Node v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/node-v1/
- Kubernetes Service v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes client-go JSONPath package documentation: https://pkg.go.dev/k8s.io/client-go/util/jsonpath
- Kubernetes client-go JSONPath source: https://github.com/kubernetes/client-go/blob/master/util/jsonpath/jsonpath.go

## Issues Found
- The post said most `kubectl get` commands return a list "even for single resources." This is inaccurate: collection requests such as `kubectl get pods` return a list with `.items`, while named resources such as `kubectl get deployment nginx` return a single object. Updated the explanation to distinguish collection and named-resource output.
- The missing-fields section suggested using shell `||` to provide defaults. Missing JSONPath fields usually produce empty output while `kubectl` can still exit successfully, so `||` does not provide per-field defaults. Updated the comment to recommend post-processing when explicit defaults are needed.
- The jq comparison claimed JSONPath "runs faster" for simple queries. That performance claim was not established by official documentation and depends on environment, response size, and pipeline overhead. Reworded it to say JSONPath is convenient for simple queries.

## Review Notes
The JSONPath examples use kubectl-supported syntax, including optional root `$`, wildcard selection, filters, range/end iteration, and interpreted string literals for tabs and newlines. Several examples inspect only the first container status or first container in a pod, which is technically valid but may not capture all containers in multi-container pods.
