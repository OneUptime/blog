# Validation Summary: How to Configure Health Checks for MetalLB-Exposed Services

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- MetalLB
- Kubernetes Services, EndpointSlices, Endpoints, kube-proxy, and health probes
- Kubernetes PodDisruptionBudgets
- ExternalDNS
- Prometheus Operator, PrometheusRule, ServiceMonitor, and kube-state-metrics
- Node.js / Express
- Go HTTP and gRPC health endpoints
- Python FastAPI
- HAProxy health checks

## Sources Consulted
- Kubernetes documentation: Liveness, Readiness, and Startup Probes - https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes documentation: Configure Liveness, Readiness and Startup Probes - https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes documentation: Create an External Load Balancer - https://kubernetes.io/docs/tasks/access-application-cluster/create-external-load-balancer/
- Kubernetes documentation: EndpointSlices - https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes API reference: Endpoints v1 - https://kubernetes.io/docs/reference/kubernetes-api/core/endpoints-v1/
- Kubernetes documentation: PodDisruptionBudget - https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- MetalLB usage documentation - https://metallb.universe.tf/usage/
- MetalLB advanced IPAddressPool documentation - https://metallb.universe.tf/configuration/_advanced_ipaddresspool_configuration/
- ExternalDNS documentation - https://github.com/kubernetes-sigs/external-dns
- ExternalDNS TTL documentation - https://github.com/kubernetes-sigs/external-dns/blob/master/docs/advanced/ttl.md
- Prometheus Operator documentation and API reference - https://prometheus-operator.dev/docs/api-reference/api/
- kube-state-metrics endpoint and EndpointSlice metrics documentation - https://github.com/kubernetes/kube-state-metrics/tree/main/docs/metrics/service
- HAProxy health check documentation - https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/
- gRPC health checking guide - https://grpc.io/docs/guides/health-checking/

## Issues Found
- Corrected the MetalLB datapath explanation and diagram. MetalLB announces service IPs but does not proxy application traffic through the speaker.
- Replaced deprecated/legacy MetalLB annotations from `metallb.universe.tf/loadBalancerIPs` to the current `metallb.io/loadBalancerIPs`.
- Added the `app: web-application` label to the LoadBalancer Service so the ServiceMonitor selector can match it.
- Added missing Go imports for `database/sql` and the current Redis Go client package in the Go HTTP health checker example.
- Updated the FastAPI example to avoid deprecated `datetime.utcnow()` usage and to return a 503 response if the health checker is not initialized.
- Fixed the Node.js graceful shutdown example so `server.close()` is awaited via a Promise.
- Replaced the removed/deprecated kube-state-metrics expression `kube_endpoint_address_available == 0` with an expression based on current `kube_endpoint_info` and `kube_endpoint_address{ready="true"}` metrics.
- Changed the ExternalDNS section to describe DNS record management rather than DNS-level health checks, and updated ExternalDNS annotations to the current `external-dns.kubernetes.io/*` prefix.
- Fixed the gRPC Go health server example by removing an unused import, adding listener setup, and serving the gRPC server instead of immediately setting contradictory health states.

## Review Notes
`kubectl` was not installed in the local environment, so CLI command validation was performed against official Kubernetes kubectl documentation rather than local `--help` output.
