# Validation Summary: How to Use tmpfs for Controller Temp Directories in Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux
- Kubernetes
- Kustomize
- tmpfs
- emptyDir volumes
- kubectl
- Prometheus metrics

## Sources Consulted
- Kubernetes Volumes documentation: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux source-controller repository: https://github.com/fluxcd/source-controller
- Flux kustomize-controller repository: https://github.com/fluxcd/kustomize-controller
- Flux helm-controller repository: https://github.com/fluxcd/helm-controller
- Go os package documentation: https://pkg.go.dev/os

## Issues Found
- The post said tmpfs "eliminates disk latency entirely." This was too broad because the patch only affects temporary file I/O under the mounted path. Changed the wording to say temporary file I/O happens in memory and avoids disk latency for those files.
- The post said emptyDir contents are lost when the pod restarts. Kubernetes documents that emptyDir data persists across container crashes and is deleted when the Pod is removed from a node. Changed the wording to "when the pod is removed or recreated."
- The post said tmpfs memory counts against the container's memory limits and recommended increasing memory limits by at least the full `sizeLimit`. Kubernetes documents that memory-backed emptyDir files count against the memory limit of the container that wrote them, but `sizeLimit` is a cap rather than reserved memory. Changed the recommendation to ensure enough memory headroom for expected usage, up to `sizeLimit`.
- The metrics example used `kubectl exec` with `curl` inside the source-controller container. This depends on `curl` being available in the controller image and is not a reliable Flux measurement command. Replaced it with `kubectl port-forward` to the controller metrics port and a local `curl` command.

## Review Notes
The Kubernetes `emptyDir` and Kustomize patch snippets use current APIs and valid field names. The Flux metrics name and default `/metrics` endpoint on port 8080 match the official Flux metrics documentation.
