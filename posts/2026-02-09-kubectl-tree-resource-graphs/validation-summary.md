# Validation Summary: How to Build Custom Kubernetes Resource Viewers Using kubectl Tree

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- kubectl plugins
- Krew
- kubectl-tree
- Kubernetes Services, EndpointSlices, Ingress, NetworkPolicy, ownerReferences
- Bash, jq, Graphviz DOT
- Go client-go

## Sources Consulted
- kubectl-tree README and flags: https://github.com/ahmetb/kubectl-tree
- kubectl-tree Krew manifest: https://github.com/ahmetb/kubectl-tree/blob/master/.krew.yaml
- Kubernetes kubectl plugin documentation: https://kubernetes.io/docs/tasks/extend-kubectl/kubectl-plugins/
- Kubernetes owners and dependents documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/owners-dependents/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Endpoints API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/endpoints-v1/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Ingress documentation and API reference: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- client-go package documentation: https://pkg.go.dev/k8s.io/client-go/kubernetes and https://pkg.go.dev/k8s.io/client-go/tools/clientcmd

## Issues Found
- The source install instructions used `make`, but the current kubectl-tree repository does not include a `Makefile`. Changed the build command to `go build -o kubectl-tree ./cmd/kubectl-tree`.
- The `kubectl tree --only` flag is not present in current kubectl-tree documentation. Changed the example to use the supported `--resources` flag and included intermediate owner resources required for traversal.
- The service examples described all connected resources, but kubectl-tree follows ownerReferences. Updated the wording to owner-referenced resources and EndpointSlices.
- The service topology script used the deprecated Kubernetes `Endpoints` API. Replaced it with `endpointslices.discovery.k8s.io` selected by `kubernetes.io/service-name`.
- The service topology script could fail on selector-less Services because it treated `.spec.selector` as always present. Changed it to handle a missing selector with `(.spec.selector // {})`.
- The custom Go tree comment claimed all ConfigMaps and Secrets used by a Pod were included, but the code only inspects volume mounts. Narrowed the wording to mounted ConfigMaps and Secrets.
- The generated kubectl plugin binary `kubectl-resource-graph` would be invoked as `kubectl resource graph`, not `kubectl resource-graph`, under kubectl plugin naming rules. Updated the example command.
- The DOT graph script matched ownerReferences by name only, which could incorrectly match owners of another kind with the same name. Added `kind` checks for Deployments and ReplicaSets.
- The cross-namespace dependency script claimed Ingress backends in other namespaces, but standard Kubernetes Ingress service backends must be in the same namespace as the Ingress. Updated the comment and output label.
- The cross-namespace environment variable jq filter could error when an env var had no literal `value`. Added a null-safe value check.

## Review Notes
Bash snippets were syntax-checked with `bash -n`. `kubectl` and Go tooling were not installed in the review environment, so CLI behavior and Go APIs were verified against upstream documentation rather than by local execution.
