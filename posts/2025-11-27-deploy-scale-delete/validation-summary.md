# Validation Summary: How to Create, Scale, and Delete Deployments + Services with `kubectl apply`

## Status
validated

## Post Type
Tutorial / Getting Started guide

## Technologies Covered
- Kubernetes (Deployments, Services, Pods, ReplicaSets)
- `kubectl` CLI
- YAML manifests
- nginx (container image)

## Sources Consulted
- Kubernetes Deployments documentation — https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Service documentation — https://kubernetes.io/docs/concepts/services-networking/service/
- kubectl reference (`apply`, `scale`, `set image`, `rollout`, `delete`, `port-forward`) — https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Server-Side Apply — https://kubernetes.io/docs/reference/using-api/server-side-apply/
- DNS for Services and Pods — https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- nginx Docker Hub tags — https://hub.docker.com/_/nginx

## Issues Found
No technical issues found.

## Review Notes
- The Deployment manifest uses `apiVersion: apps/v1` and the Service uses `apiVersion: v1` — both correct and current.
- Resource naming is internally consistent throughout: the Deployment is `hello-app` and every subsequent command (`kubectl scale deployment hello-app`, `kubectl set image deployment/hello-app web=...`, `kubectl rollout status deployment/hello-app`, `kubectl delete deployment hello-app`) correctly references it. The container name `web` in the manifest matches the `web=nginx:1.27.1` argument in `kubectl set image`.
- The Service selector (`app: hello-app`) correctly matches the Pod template labels, so traffic routing is valid.
- ClusterIP is correctly described as the default Service type, with `LoadBalancer`/`NodePort` noted for external access.
- The Service FQDN comment `hello-web.<namespace>.svc.cluster.local` is accurate.
- `kubectl delete deployment hello-app svc hello-web` is a valid single command mixing two resource types — verified correct.
- Image tags `nginx:1.27` and `nginx:1.27.1` are both real, published Docker Hub tags.
- `kubectl apply --server-side` is a valid, current flag and the description of catching field conflicts among multiple managers is accurate.
- Minor stylistic note (not an error): several sentences use a hyphen where an em dash would read more cleanly (e.g., "workflow-create", "loop-write YAML"). This is cosmetic and outside the scope of technical correctness.
