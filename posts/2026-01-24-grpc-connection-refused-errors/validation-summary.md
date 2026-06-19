# Validation Summary: How to Fix 'Connection Refused' Errors in gRPC

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- gRPC
- Python grpcio
- gRPC-Go
- TCP networking and DNS diagnostics
- Linux networking tools (`ss`, `netstat`, `nc`, `tcpdump`, `iptables`, `firewalld`)
- Kubernetes Services, Deployments, readiness/liveness probes, and NetworkPolicy
- Docker Compose
- AWS Application Load Balancer and AWS Load Balancer Controller
- grpcurl and grpc_health_probe

## Sources Consulted
- gRPC status codes guide: https://grpc.io/docs/guides/status-codes/
- gRPC health checking guide: https://grpc.io/docs/guides/health-checking/
- gRPC service config guide: https://grpc.io/docs/guides/service-config/
- gRPC Python API documentation: https://grpc.github.io/grpc/python/grpc.html
- gRPC-Go API documentation: https://pkg.go.dev/google.golang.org/grpc
- gRPC-Go insecure credentials documentation: https://pkg.go.dev/google.golang.org/grpc/credentials/insecure
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- AWS ALB target group health check documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html
- AWS Load Balancer Controller ingress annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/annotations/
- Docker Compose `version` top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The post implied DNS resolution failures, TLS mismatch, and generic firewall blocking are direct causes of TCP "connection refused." I clarified that connection refused usually means an active TCP rejection, while DNS, TLS, and blocking firewalls are related connection failures that can surface differently.
- The Python diagnostic snippet used `channel.check_connectivity_state(True)`, which is not part of the documented public synchronous gRPC Python Channel API. I changed it to use `channel.subscribe(..., try_to_connect=True)` with `grpc.channel_ready_future(...)`.
- The Kubernetes NetworkPolicy selected `app: grpc-service`, but the later Service and Deployment use pods labeled `app: grpc-server`. I changed the NetworkPolicy pod selectors to `app: grpc-server` so the policy matches the shown workload.
- The NetworkPolicy examples used custom namespace labels named `name`. I changed them to Kubernetes' standard namespace label `kubernetes.io/metadata.name` for the shown `default` and `client-namespace` selectors.
- The Go client snippet used deprecated gRPC-Go APIs and options: `grpc.DialContext`, `grpc.WithInsecure`, `grpc.WithBlock`, and `grpc.WithTimeout`. I updated it to `grpc.NewClient`, `grpc.WithTransportCredentials(insecure.NewCredentials())`, and explicit readiness waiting with `Connect`, `GetState`, and `WaitForStateChange`.
- The Go client snippet imported `codes` and `status` without using them, which would not compile. I removed those imports.
- The Go service config used `{"service": ""}` for a default method config. I changed it to `{"name": [{}]}` for a default method config applying to all methods.
- The Docker Compose snippet used the obsolete top-level `version: '3.8'` property. I removed it.
- The AWS ALB gRPC health check example used the gRPC health check method path but did not set gRPC success code `0`; ALB's default gRPC success code is `12`. I added `alb.ingress.kubernetes.io/success-codes: "0"`.

## Review Notes
The remaining snippets are partial examples and assume generated service types, application-specific stubs, installed tools, and reachable Kubernetes/Docker environments. I could not compile the Go or Python snippets locally because Go and `grpcio` are not installed in this workspace, so the review was validated against official API documentation rather than local builds.
