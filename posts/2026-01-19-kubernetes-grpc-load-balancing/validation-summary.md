# Validation Summary: How to Set Up gRPC Load Balancing in Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes Services, DNS, probes, and Ingress
- gRPC, gRPC-Go, gRPC Python, health checking, and xDS
- Istio DestinationRule and VirtualService
- Linkerd load balancing and ServiceProfiles
- NGINX Ingress Controller, Traefik, Envoy Gateway, and Gateway API GRPCRoute
- Prometheus metrics for gRPC

## Sources Consulted
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Services and appProtocol: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes liveness, readiness, startup, and gRPC probes: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- gRPC custom load balancing: https://grpc.io/docs/guides/custom-load-balancing/
- gRPC service config: https://grpc.io/docs/guides/service-config/
- gRPC health checking: https://grpc.io/docs/guides/health-checking/
- gRPC-Go package documentation: https://pkg.go.dev/google.golang.org/grpc
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio protocol selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Linkerd load balancing: https://linkerd.io/2-edge/features/load-balancing/
- Linkerd HTTP, HTTP/2, and gRPC proxying: https://linkerd.io/2-edge/features/http-grpc/
- Linkerd ServiceProfiles reference: https://linkerd.io/2-edge/reference/service-profiles/
- Ingress-NGINX gRPC example: https://kubernetes.github.io/ingress-nginx/examples/grpc/
- Traefik Kubernetes CRD provider docs: https://doc.traefik.io/traefik/routing/providers/kubernetes-crd/
- Gateway API gRPC routing guide: https://gateway-api.sigs.k8s.io/guides/user-guides/grpc-routing/
- Gateway API GRPCRoute API reference: https://gateway-api.sigs.k8s.io/reference/api-spec/main/spec/
- go-grpc-middleware Prometheus provider: https://pkg.go.dev/github.com/grpc-ecosystem/go-grpc-middleware/providers/prometheus

## Issues Found
- The Go round-robin client imported `roundrobin` and `resolver` as regular imports, which would not compile because they were unused. Changed `roundrobin` to a blank import for policy registration and removed the unused `resolver` import.
- The Go client examples used deprecated `grpc.Dial`. Updated them to `grpc.NewClient`, which is the current gRPC-Go client constructor.
- The Python example imported `grpc.experimental` but did not use it. Removed the unused import.
- The Traefik CRD example used the older `traefik.containo.us/v1alpha1` API group and included an unused `ServersTransport` resource for an h2c backend. Updated the API group to `traefik.io/v1alpha1` and removed the unused transport resource.
- The gRPC health-check Go snippet used `*grpc.Server` without importing `google.golang.org/grpc`. Added the missing import.
- The Kubernetes gRPC probe Deployment was missing required selector and pod labels. Added `spec.selector.matchLabels` and matching `template.metadata.labels`.
- The Kubernetes probe comment said only "Kubernetes 1.24+" for native gRPC probes. Clarified that gRPC probes became stable in Kubernetes 1.27 and were beta in 1.24+.
- The Prometheus example used the archived `github.com/grpc-ecosystem/go-grpc-prometheus` package. Updated it to the maintained `github.com/grpc-ecosystem/go-grpc-middleware/providers/prometheus` provider API.
- The PromQL examples grouped by `grpc_server_method`, which is not the label used by the common gRPC Prometheus metrics. Updated the queries to use `grpc_service` and `grpc_method`, and adjusted the request-distribution query to compare per-instance rates.
- The named port best-practice snippet described port naming as strictly required and `appProtocol` as only an alternative. Adjusted the wording to match Kubernetes and mesh behavior: port names are used by meshes and ingress controllers for protocol detection, while `appProtocol` is the Kubernetes protocol hint.

## Review Notes
- The Linkerd ServiceProfile example remains technically valid but ServiceProfiles have been superseded by Gateway API resources in newer Linkerd versions and are now primarily for backward compatibility.
- The headless Service plus gRPC client-side round-robin pattern depends on clients resolving multiple backend addresses from Kubernetes DNS and using a gRPC load-balancing policy that connects to all resolved addresses.
- Ingress examples are appropriate for external gRPC traffic, but exact behavior still depends on the installed controller version and controller-specific Gateway or CRD support.
