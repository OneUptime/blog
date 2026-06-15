# Validation Summary: How to Use Local Docker Images with Minikube Without a Registry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Minikube
- Docker
- Container images
- Minikube registry addon
- Kubernetes Deployments

## Sources Consulted
- Minikube Handbook: Pushing images - https://minikube.sigs.k8s.io/docs/handbook/pushing/
- Minikube command reference: `minikube image` - https://minikube.sigs.k8s.io/docs/commands/image/
- Minikube Handbook: Registries - https://minikube.sigs.k8s.io/docs/handbook/registry/
- Kubernetes documentation: Images - https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes API reference: Pod `imagePullPolicy` - https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/

## Issues Found
- The post stated broadly that Minikube runs its own Docker daemon. That is accurate for the default Docker runtime, but Minikube supports other container runtimes and the `none` driver is a special case. I changed the wording to refer to Minikube's own container runtime and qualified the Docker-specific explanation.
- The `minikube image load` explanation said images are copied into Minikube's Docker. The command works with Minikube's in-cluster container runtime, not only Docker, so I updated that wording.
- The registry addon section said Linux can access the addon through `localhost:5000` automatically and used a simple port-forward for macOS/Windows. Minikube's official registry documentation does not describe automatic Linux localhost forwarding, and Docker Desktop workflows require extra forwarding. I changed the example to use `$(minikube ip):5000` for a Linux/VM-style workflow and noted insecure registry configuration may be required.
- The deployment example for the registry addon used `localhost:5000`, which is only correct for specific forwarding setups documented by Minikube. I changed it to a Minikube node IP example and added a comment to replace it with `minikube ip`.
- The post said methods 1-3 should always use `imagePullPolicy: Never`. Minikube's documentation allows either `IfNotPresent` or `Never` as long as `Always` is avoided for local images, while `Never` is the strictest no-registry option. I updated the guidance accordingly.

## Review Notes
The `docker-env`, `minikube image load`, `minikube image build`, `minikube image ls`, and `minikube image rm` commands matched current Minikube documentation. The Kubernetes Deployment snippets and `imagePullPolicy` values matched the Kubernetes API documentation. The registry addon remains environment-dependent; future revisions could split it into Linux, macOS, and Windows examples, but that would be a larger restructuring than needed for validation.
