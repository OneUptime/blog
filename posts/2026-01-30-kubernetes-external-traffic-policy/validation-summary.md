# Validation Summary: How to Implement Kubernetes External Traffic Policy

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kubernetes Services
- Kubernetes `externalTrafficPolicy`
- Kubernetes LoadBalancer and NodePort traffic behavior
- Kubernetes health check node ports
- Kubernetes pod anti-affinity and topology spread constraints
- Go HTTP server example
- Docker multi-stage builds
- AWS EKS Network Load Balancers
- Google Kubernetes Engine LoadBalancer Services
- Azure Kubernetes Service LoadBalancer Services
- kubectl troubleshooting commands

## Sources Consulted
- Kubernetes: Create an External Load Balancer - https://kubernetes.io/docs/tasks/access-application-cluster/create-external-load-balancer/
- Kubernetes: Using Source IP - https://kubernetes.io/docs/tutorials/services/source-ip/
- Kubernetes: Service documentation - https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes: Pod Topology Spread Constraints - https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes API reference for ServiceSpec - https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.36/#servicespec-v1-core
- AWS Load Balancer Controller annotations - https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/
- AWS Load Balancer Controller Network Load Balancer guide - https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/nlb/
- Amazon EKS Auto Mode NLB annotations - https://docs.aws.amazon.com/eks/latest/userguide/auto-configure-nlb.html
- Google Cloud: About GKE LoadBalancer Services - https://docs.cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer
- Google Cloud: GKE LoadBalancer Service parameters - https://docs.cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer-parameters
- Google Cloud: GKE Ingress configuration - https://docs.cloud.google.com/kubernetes-engine/docs/how-to/ingress-configuration
- Go release history and policy - https://go.dev/doc/devel/release
- Go 1.26 release notes - https://go.dev/doc/go1.26

## Issues Found
- The Dockerfile used `golang:1.21-alpine`, which is no longer a supported Go release as of June 2026. Updated it to `golang:1.26-alpine`.
- The Local-mode health check explanation said nodes are healthy when pods exist. Kubernetes and GKE health checks depend on ready local serving endpoints, so the wording and diagram labels were updated to say ready pods / ready local endpoints.
- The health check node port text implied all Local-mode Services get `healthCheckNodePort`. Clarified that this applies to LoadBalancer Services with `externalTrafficPolicy: Local`.
- The AWS production example used the deprecated `service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled` annotation. Replaced it with `service.beta.kubernetes.io/aws-load-balancer-attributes: "load_balancing.cross_zone.enabled=true"`.
- The AWS examples used `service.beta.kubernetes.io/aws-load-balancer-type: "nlb"`, while current AWS guidance recommends `external` for new deployments. Updated the examples to `external`.
- The AWS EKS example used NLB IP targets without the additional source-IP-preservation caveat required for TCP IP targets. Changed the example to `service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: "instance"` so it matches the article's node-local `externalTrafficPolicy: Local` behavior.
- The GKE example included `cloud.google.com/neg: '{"ingress": true}'` and `cloud.google.com/backend-config`, which are Ingress-related annotations and are misleading for a Service `type: LoadBalancer` example. Removed those annotations from the LoadBalancer Service snippet.

## Review Notes
- All YAML snippets were parsed successfully with PyYAML.
- The Go example compiled successfully using Docker with `golang:1.26-alpine` and `go test main.go`.
- The core explanation of `externalTrafficPolicy: Cluster` versus `Local` matches Kubernetes documentation: Cluster can obscure source IP and may add an extra hop, while Local preserves client source IP by only proxying to local endpoints.
- Some provider behavior still depends on the cloud controller or load balancer implementation, especially health check defaults and source IP behavior with direct pod/IP targets.
