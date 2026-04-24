# Validation Summary: How to Publish Services (ClusterIP, NodePort, LoadBalancer) in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Kubernetes Services (`ClusterIP`, `NodePort`, `LoadBalancer`, `ExternalName`)
- Headless Services
- Kubernetes Ingress
- `kubectl`

## Sources Consulted
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes blog, Endpoints deprecation / EndpointSlice migration: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Portainer Services documentation: https://docs.portainer.io/sts/user/kubernetes/networking/services
- Portainer Add a new application using a form: https://docs.portainer.io/sts/user/kubernetes/applications/add
- Portainer Add a new application using code: https://docs.portainer.io/sts/user/kubernetes/applications/manifest
- Amazon EKS Network Load Balancer Service annotations: https://docs.aws.amazon.com/eks/latest/userguide/network-load-balancing.html
- Azure Kubernetes Service static IP and DNS label for LoadBalancer Services: https://learn.microsoft.com/en-us/azure/aks/static-ip
- Google Kubernetes Engine LoadBalancer Service documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer

## Issues Found

1. **Portainer capability was overstated.** The post said Portainer supports creating "all service types" through the application form and YAML editor. Current Portainer docs only document `ClusterIP`, `NodePort`, and `LoadBalancer` in the form UI, while manifest deployment is the documented path for arbitrary Kubernetes resources. I changed the intro and conclusion to say Portainer handles common service types in the form and more advanced definitions through manifests.

2. **`ExternalName` was described incorrectly.** The comparison table said `ExternalName` is an "External service proxy". Kubernetes documents `ExternalName` as a DNS-level alias that returns a `CNAME` record and explicitly does not proxy traffic. I changed the use case text to "DNS alias to an external service".

3. **A couple of cluster defaults were written as absolutes.** The post presented `cluster.local` and the `30000-32767` NodePort range as fixed values. Kubernetes documents both as defaults that can be configured differently by the cluster. I updated the wording to say these are default values.

4. **The LoadBalancer annotation examples were outdated or misleading.** The YAML included provider-specific annotations that do not reflect current guidance consistently across AWS, Azure, and GKE, and the GCP comment was incorrect for the annotation shown. I replaced the concrete examples with a generic note telling readers to consult their cloud provider or load balancer controller documentation before adding annotations. I also broadened the text so `LoadBalancer` is not described as cloud-provider-only.

5. **The Ingress guidance was too absolute and missed a required prerequisite.** Saying "use an Ingress instead of LoadBalancer" is too strong because both patterns are valid depending on architecture, and an Ingress resource has no effect without an installed Ingress controller. I changed the wording to "often a better fit" and added the controller requirement.

6. **The Portainer standalone service creation workflow was inaccurate.** The post instructed readers to go to `Networking -> Services` and click `+ Add service`. Current Portainer docs document `Networking -> Services` as a listing/view page, and document creation through the application form or `Applications -> Create from code`. I updated that section to match the documented workflows.

7. **The troubleshooting command used the legacy Endpoints API.** The post used `kubectl get endpoints`. Kubernetes officially deprecated the Endpoints API in v1.33+ in favor of `EndpointSlice`. I changed the command to `kubectl get endpointslice -l kubernetes.io/service-name=my-api -n production` and updated the accompanying note.

## Review Notes
- The Ingress manifest uses the current `networking.k8s.io/v1` API and is technically valid.
- Kubernetes now recommends Gateway API for some newer Layer 7 routing use cases, but the Ingress example in this post remains correct and supported.
- For `LoadBalancer` Services, the external address may appear as either an IP or a hostname, and it is populated asynchronously by the cloud provider or load balancer controller.
