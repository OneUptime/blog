# Validation Summary: Securing a Sample Network Policy in Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Kubernetes Deployments and Services
- Kubernetes DNS
- kubectl
- HTTP L7 policy filtering
- DNS-aware FQDN egress policy

## Sources Consulted
- Cilium DNS-based policy documentation: https://docs.cilium.io/en/stable/security/dns/
- Cilium Layer 7 policy documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium Kubernetes policy selector documentation: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- Cilium Helm reference for `l7Proxy`: https://docs.cilium.io/en/latest/helm-reference/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes nginx Deployment example documentation: https://kubernetes.io/docs/tasks/run-application/run-stateless-application-deployment/

## Issues Found
- The sample `api-backend` Deployment used `nginx:1.27` with `containerPort: 8080`, but the standard nginx image listens on port 80 by default. Changed the backend container port, policy ingress port, Mermaid diagram, and verification curl commands to use port 80.
- The verification commands called `http://api-backend`, but the sample setup only created Deployments. Kubernetes DNS names like `api-backend` require a Service. Added a ClusterIP Service named `api-backend` that selects the backend pods and exposes port 80.
- The DNS egress rule only allowed UDP/53 as L4 traffic. Cilium FQDN policies rely on DNS responses learned through DNS proxy policy rules, so the DNS rule now uses `protocol: ANY` with `rules.dns.matchPattern: "*"` as shown in Cilium's DNS policy examples.
- The introduction said the sample demonstrates all listed Cilium extensions, including gRPC and CIDR-based access control, but the policy demonstrates only several of them. Changed the wording to "several of these capabilities."

## Review Notes
- The YAML snippets parse successfully after the corrections.
- `kubectl` is not installed in this review environment, so CLI behavior was checked against Kubernetes and Cilium documentation rather than a live cluster.
- The Prometheus and database selectors remain illustrative; the post does not include sample Prometheus or database workloads.
