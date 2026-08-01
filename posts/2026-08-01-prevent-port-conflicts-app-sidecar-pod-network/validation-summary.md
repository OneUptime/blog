# Validation Summary: How to Prevent Port Conflicts When App and Sidecar Share a Pod Network

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Pods and multi-container Pod networking
- Sidecar containers and mutating admission webhooks
- Kubernetes Services and named target ports
- Liveness and readiness probes
- NetworkPolicy port rules
- `hostPort` and `hostNetwork`
- `kubectl` diagnostics and ephemeral debug containers
- Linux TCP and UDP socket binding
- Service-mesh probe rewriting

## Sources Consulted
- [Kubernetes: Services, Load Balancing, and Networking](https://kubernetes.io/docs/concepts/services-networking/)
- [Kubernetes: Pods](https://kubernetes.io/docs/concepts/workloads/pods/)
- [Kubernetes API: Pod v1](https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/)
- [Kubernetes: Service](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes: Configure Liveness, Readiness and Startup Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Kubernetes API: NetworkPolicy v1](https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/)
- [Kubernetes: Dynamic Admission Control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [Kubernetes: Debug Running Pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/)
- [Kubernetes CLI: kubectl debug](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/)
- [Kubernetes CLI: kubectl logs](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [Istio: Health Checking of Istio Services](https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/)
- [Linux manual: ip(7)](https://man7.org/linux/man-pages/man7/ip.7.html)

## Issues Found
- The socket-allocation guidance said that each listener should have a unique `(protocol, address, port)` tuple. That was insufficient because a wildcard bind such as `0.0.0.0:8080` covers all local IPv4 addresses and can conflict with a nominally different specific-address bind such as `127.0.0.1:8080`. The text now requires non-overlapping bindings and explains the wildcard overlap.
- The post described a generated Pod as entirely immutable. Kubernetes permits limited in-place Pod updates, but container commands and declared ports cannot be updated. The text now identifies the relevant immutable fields and directs readers to update the workload template or injector configuration.

## Review Notes
- The image names, digests, and listen flags in the snippets are illustrative placeholders and must be replaced with values supported by real images before deployment.
- `ss -p` may not identify processes in other containers unless process visibility and permissions allow it, although the shared network namespace still permits socket inspection. The post already qualifies listener visibility by permissions.
- Service-mesh behavior is implementation-specific. The post correctly advises checking the mesh documentation and inspecting the admitted Pod; Istio's current documentation confirms probe rewriting as one concrete example.
