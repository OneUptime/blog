# Validation Summary: Drain gRPC Connections in Kubernetes Updates Without `UNAVAILABLE` Spikes

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- gRPC and HTTP/2
- gRPC-Go
- Go
- Kubernetes Deployments, Pods, EndpointSlices, lifecycle hooks, and native gRPC probes
- Graceful shutdown and connection draining

## Sources Consulted

- [Kubernetes Pod lifecycle and termination flow](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination-flow)
- [Kubernetes Pods and Endpoint termination flow](https://kubernetes.io/docs/tutorials/services/pods-and-endpoint-termination-flow/)
- [Kubernetes container lifecycle hooks](https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks)
- [Kubernetes native gRPC probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#define-a-grpc-liveness-probe)
- [Kubernetes Deployment rolling-update strategy](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-update-deployment)
- [gRPC-Go Server API](https://pkg.go.dev/google.golang.org/grpc#Server.GracefulStop)
- [gRPC-Go health Server API](https://pkg.go.dev/google.golang.org/grpc/health#Server.Shutdown)
- [gRPC health checking protocol](https://github.com/grpc/grpc/blob/master/doc/health-checking.md)
- [gRPC-Go v1.83.2 shutdown implementation](https://github.com/grpc/grpc-go/blob/v1.83.2/server.go)

## Issues Found

No technical issues found in the original example. Retained the asynchronous `go server.Stop()` fallback after testing it against a handler that ignores cancellation. Calling `Stop` synchronously can block behind an in-progress `GracefulStop`, which waits for handlers while holding the server mutex in gRPC-Go v1.83.2. The default value of `WaitForHandlers` does not remove that concurrent shutdown interaction.

## Review Notes

- The endpoint propagation delay is necessarily environment-specific; the post correctly says to measure it through the actual production routing path.
- Native Kubernetes gRPC probes require a numeric port and do not support named ports; the example uses a numeric port correctly.
- The example allowances are illustrative rather than guarantees and correctly fit within the configured 60-second termination grace period.
- A local test with a real gRPC server reproduced the synchronous fallback exceeding its deadline. The helper initiates forced shutdown without waiting for its completion; the process shutdown coordinator must enforce the remaining budget, as the post explains. No live Kubernetes rollout was performed.
