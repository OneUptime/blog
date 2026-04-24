# Validation Summary: How to Expose Portainer on Kubernetes via LoadBalancer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes Services (`LoadBalancer`)
- Helm
- Amazon EKS / AWS Network Load Balancer
- Azure Kubernetes Service (AKS)
- Google Kubernetes Engine (GKE)
- MetalLB
- Kubernetes NetworkPolicy
- DNS

## Sources Consulted
- Portainer Kubernetes install docs: https://docs.portainer.io/start/install/server/kubernetes/baremetal
- Portainer Helm chart configuration options: https://docs.portainer.io/sts/advanced/helm-chart-configuration-options
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Amazon EKS NLB annotations: https://docs.aws.amazon.com/eks/latest/userguide/auto-configure-nlb.html
- AWS Load Balancer Controller service annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/
- AKS LoadBalancer annotations and health probes: https://learn.microsoft.com/en-us/azure/aks/configure-load-balancer-standard
- GKE internal LoadBalancer documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/internal-load-balancing
- MetalLB installation docs: https://metallb.io/installation/
- Portainer chart templates used for service ports and labels: https://github.com/portainer/k8s/releases/download/portainer-239.1.0/portainer-239.1.0.tgz
- Portainer public status endpoint handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/system/status.go
- Portainer system router showing `/system/status` is public: https://github.com/portainer/portainer/blob/develop/api/http/handler/system/handler.go

## Issues Found
- The introduction and access steps assumed every Kubernetes `LoadBalancer` returns a public IP. I changed this to “external address” and updated the shell example to read either `.status.loadBalancer.ingress[0].ip` or `.hostname`, because AWS commonly exposes a hostname instead of an IP.
- The prerequisites said “Portainer installed via Helm”, which was inconsistent with Step 1 and technically incorrect as a prerequisite. I changed this to require Helm access instead.
- The Helm install command omitted `--create-namespace`, which Portainer’s official Kubernetes install docs require when deploying into a new `portainer` namespace. I added the flag.
- The values example suggested `spec.loadBalancerIP` for static addressing. Kubernetes deprecated `.spec.loadBalancerIP` in v1.24, so I replaced that guidance with provider-specific annotations.
- The generic GKE annotation example used `cloud.google.com/load-balancer-type: "External"`, which is not the current documented way to request an external GKE load balancer. I removed that and kept the current internal-load-balancer annotation example instead.
- The sample `kubectl get svc` output only showed `9443`, but the current Portainer Helm chart exposes `9000`, `9443`, and `8000` on a `LoadBalancer` Service by default. I updated the example output to match the chart templates.
- The AWS NLB TLS example used `aws-load-balancer-ssl-ports: "443"` without changing Portainer’s service HTTPS port to `443`, and it sent backend traffic as plain `tcp` even though Portainer serves HTTPS on `9443`. I corrected the example to set `httpsPort: 443` and use `aws-load-balancer-backend-protocol: "ssl"`.
- The AKS example used only the global `azure-load-balancer-health-probe-request-path` annotation. Per Microsoft’s docs, that path is ignored for TCP services unless probe protocol is explicitly HTTP/HTTPS. I switched the example to the port-specific `port_9443_health-probe_protocol` and `port_9443_health-probe_request-path` annotations.
- The GKE internal load balancer example used the older `cloud.google.com/load-balancer-type` annotation. I updated it to the current `networking.gke.io/load-balancer-type: "Internal"` annotation.
- The MetalLB installation manifest was pinned to `v0.13.7`, which is outdated relative to current official install docs. I updated it to `v0.15.3`.
- The DNS section assumed an A record only. I updated it to distinguish between A records for IP-based providers and CNAME records for hostname-based providers such as AWS.
- The `NetworkPolicy` selected pods using `app: portainer`, but the current Portainer Helm chart labels pods with `app.kubernetes.io/name` and `app.kubernetes.io/instance`. I updated the selector to match the chart’s actual labels.
- The troubleshooting `curl` example assumed an IP literal. I changed it to use a generic external address placeholder and clarified that `9000` only matters if HTTP is intentionally exposed.

## Review Notes
- The post is now technically sound for current upstream docs, but some AWS behavior still depends on whether the cluster uses EKS Auto Mode or the AWS Load Balancer Controller. The updated examples avoid deprecated or mismatched annotations, but controller-specific defaults can still vary by cluster setup.
- Portainer’s current Helm chart exposes the Edge port (`8000`) on the `LoadBalancer` Service by default. The post now reflects that in the sample service output, but further hardening may be appropriate if Edge is not used.
