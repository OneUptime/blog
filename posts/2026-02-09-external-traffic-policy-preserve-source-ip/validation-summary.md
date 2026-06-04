# Validation Summary: How to Use externalTrafficPolicy Local to Preserve Client Source IP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Services
- Kubernetes kube-proxy traffic policies
- Kubernetes topology spread constraints
- AWS Network Load Balancer annotations
- Google Kubernetes Engine LoadBalancer Services
- Azure Kubernetes Service LoadBalancer health probes
- NGINX configuration
- Go net/http logging
- kubectl commands

## Sources Consulted
- Kubernetes documentation: Using Source IP - https://kubernetes.io/docs/tutorials/services/source-ip/
- Kubernetes API reference: Service v1 - https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes documentation: Create an External Load Balancer - https://kubernetes.io/docs/tasks/access-application-cluster/create-external-load-balancer/
- Kubernetes documentation: Service Internal Traffic Policy - https://kubernetes.io/docs/concepts/services-networking/service-traffic-policy/
- Kubernetes documentation: Pod Topology Spread Constraints - https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- AWS Load Balancer Controller documentation: Service annotations - https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.10/guide/service/annotations/
- Amazon EKS documentation: Use Service Annotations to configure Network Load Balancers - https://docs.aws.amazon.com/eks/latest/userguide/auto-configure-nlb.html
- Google Cloud documentation: About LoadBalancer Services - https://docs.cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer
- Google Cloud documentation: LoadBalancer Service parameters - https://docs.cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer-parameters
- Microsoft Learn: Configure a Public Standard Load Balancer in AKS - https://learn.microsoft.com/en-us/azure/aks/configure-load-balancer-standard
- NGINX documentation: ngx_http_limit_req_module - https://nginx.org/en/docs/http/ngx_http_limit_req_module.html
- NGINX documentation: ngx_http_geo_module - https://nginx.org/en/docs/http/ngx_http_geo_module.html
- Go documentation: net/http Request - https://pkg.go.dev/net/http#Request

## Issues Found
- The NGINX example placed `limit_req_zone` inside a `server` block. That directive is only valid in the `http` context, so it was moved to the surrounding `http` block. The rate-limit key was also changed from `$remote_addr` to `$binary_remote_addr`, matching NGINX's recommended efficient per-client-IP pattern.
- The load distribution section stated that the load balancer still distributes evenly across nodes. Kubernetes documents the Local policy as routing only to node-local endpoints; exact node-level distribution depends on the external load balancer. The wording was changed to say the load balancer distributes across healthy nodes.
- The topology spread section said the example ensures exactly two pods per node. That is only true when the three nodes are eligible to run the pods. The wording now includes that condition.
- The AWS NLB example used the older cross-zone annotation. It was updated to the current load balancer attributes annotation and the AWS Load Balancer Controller NLB service annotations.
- The GCP example used invalid or misleading external load balancer annotations. It was updated to the current GKE recommendation for backend service-based external passthrough Network Load Balancers.
- The Azure example used `/health` for the health probe path with `externalTrafficPolicy: Local`. AKS uses `/healthz` for Local policy health probes, so the snippet now uses `/healthz`.
- The Go example said `X-Forwarded-For` should match `RemoteAddr` with Local policy. A layer 4 LoadBalancer does not necessarily add `X-Forwarded-For`, and `RemoteAddr` includes the remote network address. The comment now says to check `X-Forwarded-For` only if an upstream proxy adds it.
- The "When Not to Use Local Policy" section said nodes with more pods will be overloaded. With node-level traffic distribution, pods on nodes with fewer replicas can receive more per-pod traffic, so the statement was corrected.

## Review Notes
- The core explanation of `externalTrafficPolicy: Local` preserving client source IPs by restricting external Service routing to node-local endpoints is consistent with Kubernetes documentation.
- `healthCheckNodePort` only applies to LoadBalancer Services with `externalTrafficPolicy: Local`; the post's example uses that combination correctly.
- The examples are generic and cloud-provider behavior can vary by controller version, load balancer class, and target type. Future updates should consider adding version-specific notes if the blog standard allows them.
