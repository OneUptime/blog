# Validation Summary: How to Configure gRPC with Kubernetes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- gRPC and Protocol Buffers
- Go gRPC server and client APIs
- Kubernetes Deployments, Services, probes, HPA, and PodDisruptionBudgets
- Docker multi-stage builds
- NGINX Ingress Controller
- Traefik IngressRoute CRDs
- Istio VirtualService and DestinationRule
- cert-manager Certificates and TLS/mTLS
- Prometheus ServiceMonitor

## Sources Consulted
- Kubernetes documentation: Configure Liveness, Readiness and Startup Probes - https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes documentation: Services and headless Services - https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes documentation: DNS for Services and Pods - https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- gRPC-Go package documentation - https://pkg.go.dev/google.golang.org/grpc
- gRPC custom load balancing guide - https://grpc.io/docs/guides/custom-load-balancing/
- grpc-health-probe project and container package - https://github.com/grpc-ecosystem/grpc-health-probe and https://github.com/orgs/grpc-ecosystem/packages/container/package/grpc-health-probe
- Ingress-NGINX gRPC example - https://kubernetes.github.io/ingress-nginx/examples/grpc/
- Ingress-NGINX annotations documentation - https://github.com/kubernetes/ingress-nginx/blob/main/docs/user-guide/nginx-configuration/annotations.md
- Traefik IngressRoute documentation - https://doc.traefik.io/traefik/routing/providers/kubernetes-crd/
- Istio DestinationRule reference - https://istio.io/latest/docs/reference/config/networking/destination-rule/
- cert-manager Certificate documentation - https://cert-manager.io/docs/usage/certificate/

## Issues Found
- The Dockerfile copied from a `grpc-health-probe` stage that was never declared. Added an explicit `ghcr.io/grpc-ecosystem/grpc-health-probe:v0.4.45` stage before the runtime image.
- The Go client snippet used `grpc.Dial`, `grpc.WithBlock`, and `grpc.WithTimeout`; current gRPC-Go documentation recommends `grpc.NewClient`, and `WithBlock`/`WithTimeout` are ignored by `NewClient`. Updated the snippet to use `grpc.NewClient` and an explicit readiness wait with `Connect`, `GetState`, and `WaitForStateChange`.
- The Go client snippet did not compile because `fmt` was missing, `context` was unused, and the `roundrobin` package was imported without being referenced. Added `fmt`, used `context` for the connection timeout, and changed the round-robin import to a blank import for balancer registration.
- The custom Kubernetes resolver example implied that the `kubernetes:///` scheme works by default. Added a note that a registered Kubernetes resolver implementation is required.
- The NGINX Ingress annotation used `nginx.ingress.kubernetes.io/server-snippets`, but the documented annotation is `nginx.ingress.kubernetes.io/server-snippet`. Corrected the annotation key.
- The Traefik CRD examples used the older `traefik.containo.us/v1alpha1` API group. Updated them to the current `traefik.io/v1alpha1` API group.
- The TLS examples imported deprecated `io/ioutil` and unused packages. Replaced `ioutil.ReadFile` with `os.ReadFile` and removed unused imports.
- The TLS client `ServerName` was `user-service`, which did not match the certificate DNS names shown in the post. Updated it to `user-service.default.svc.cluster.local`.
- The table claim that gRPC "Cannot use HTTP path routing" was too broad because gRPC requests do have HTTP/2 paths such as service and method paths. Reworded it to say gRPC cannot rely on REST-style path routing.

## Review Notes
The Kubernetes native gRPC probe examples use numeric ports, which matches Kubernetes documentation because gRPC probes do not support named ports. The cert-manager example keeps `commonName`; cert-manager documents that DNS names should usually be represented with `dnsNames`, but the shown `commonName` value is also present in `dnsNames`, so it is not invalid.
