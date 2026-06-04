# Validation Summary: How to Use Kubernetes ExternalTrafficPolicy Local to Preserve Client Source IP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Services
- Kubernetes LoadBalancer and NodePort traffic policy
- Kubernetes healthCheckNodePort
- Kubernetes topology spread constraints and pod anti-affinity
- Kubernetes NetworkPolicy
- NGINX rate limiting
- Express.js
- Flask
- Prometheus Operator ServiceMonitor
- PromQL
- kubectl

## Sources Consulted
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes external LoadBalancer task documentation: https://kubernetes.io/docs/tasks/access-application-cluster/create-external-load-balancer/
- Kubernetes source IP tutorial: https://v1-32.docs.kubernetes.io/docs/tutorials/services/source-ip/
- NGINX ngx_http_limit_req_module documentation: https://nginx.org/en/docs/http/ngx_http_limit_req_module.html
- Prometheus Operator API reference for ServiceMonitor: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- Clarified that `externalTrafficPolicy: Local` drops traffic sent to nodes without local endpoints, and that the external load balancer should rely on service health checks to route only to nodes with endpoints. This matches the Kubernetes Service API description.
- Corrected the health check explanation to say Kubernetes allocates `healthCheckNodePort` for LoadBalancer Services using Local policy, and that external load balancers can use that port. Also changed the hardcoded curl example to use the discovered port.
- Fixed the uneven load distribution example. Local policy does not generally weight nodes by pod count; the external load balancer balances across healthy nodes, then each node distributes only to its local endpoints.
- Replaced `nginx:latest` in the deployment example with `your-web-app:latest` because the rest of the post assumes an application listening on port 8080, while the stock NGINX image listens on port 80 unless reconfigured.
- Fixed the NGINX rate limiting example. `limit_req` is valid in `http`, `server`, and `location` contexts, not inside an `if` block. The updated example uses a `map` and a second rate limit zone for external clients.
- Added Service labels and named ports where examples later depend on label selection or named ports.
- Clarified the ServiceMonitor example so it targets a Service with matching labels and a named metrics port, as required by the Prometheus Operator ServiceMonitor API.
- Fixed the failover script so it selects a single running pod before deleting it. The previous command piped `kubectl delete` output to `head`, which would still delete all matching pods.

## Review Notes
`kubectl` was not installed in the local workspace, so CLI syntax was reviewed against Kubernetes documentation and common kubectl behavior rather than local `kubectl --help` output. NetworkPolicy `ipBlock` behavior also depends on the cluster CNI implementation, so users should verify source-IP matching in their specific environment.
