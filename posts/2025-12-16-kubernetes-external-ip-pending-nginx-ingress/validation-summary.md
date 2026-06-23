# Validation Summary: How to Fix 'Kubernetes Service External IP Pending' with Nginx Ingress

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes Services
- Kubernetes Ingress
- ingress-nginx
- MetalLB
- minikube
- kind
- AWS EKS
- Google Kubernetes Engine
- Azure Kubernetes Service
- Helm

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- MetalLB installation documentation: https://metallb.universe.tf/installation/
- MetalLB configuration documentation: https://metallb.universe.tf/configuration/
- MetalLB release notes: https://metallb.universe.tf/release-notes/
- ingress-nginx bare-metal deployment documentation: https://github.com/kubernetes/ingress-nginx/blob/main/docs/deploy/baremetal.md
- ingress-nginx static deployment manifests: https://github.com/kubernetes/ingress-nginx/tree/main/deploy/static/provider
- minikube tunnel documentation: https://minikube.sigs.k8s.io/docs/commands/tunnel/
- kind ingress documentation: https://kind.sigs.k8s.io/docs/user/ingress/
- kind configuration documentation: https://kind.sigs.k8s.io/docs/user/configuration/
- Amazon EKS AWS Load Balancer Controller Helm installation documentation: https://docs.aws.amazon.com/eks/latest/userguide/lbc-helm.html
- GKE Services documentation: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/service
- AKS Standard Load Balancer documentation: https://learn.microsoft.com/en-us/azure/aks/load-balancer-standard

## Issues Found
- The MetalLB installation commands used `v0.13.12`, which is outdated. Updated the manifest URLs to `v0.16.1`, matching current MetalLB release notes.
- The HostNetwork example was shown as a partial Deployment manifest that would be misleading if applied directly. Replaced it with a `kubectl patch` command and added the required caveat that this approach does not use a Service and requires avoiding multiple Pods binding the same node ports.
- The external load balancer section recommended `externalIPs` while also telling readers to forward traffic to NodePorts. Updated it to use a NodePort Service behind the external load balancer, which matches ingress-nginx bare-metal guidance for a self-provisioned edge load balancer.
- The kind ingress-nginx install command used the moving `main` branch. Pinned it to `controller-v1.15.1`, consistent with the other ingress-nginx manifest URL.
- The AWS Load Balancer Controller Helm command omitted `helm repo update` and a chart version. Updated it to match the current Amazon EKS Helm installation example and added the EKS Auto Mode caveat.
- The GKE and AKS sections suggested checking for `cloud-controller` pods in `kube-system`, which is unreliable for managed clusters. Replaced those checks with `kubectl describe svc` guidance so readers inspect provider load balancer events directly.
- The complete setup script used an old ingress-nginx `controller-v1.9.4` manifest and the old MetalLB manifest. Updated both pinned versions.
- The summary table still recommended `externalIPs` for external load balancer integration. Updated it to recommend NodePort behind the external load balancer.

## Review Notes
The remaining examples use stable Kubernetes APIs (`v1` Service, `apps/v1` Deployment, and `networking.k8s.io/v1` Ingress). NodePort values in the examples are within the default Kubernetes NodePort range. The MetalLB L2 `IPAddressPool` and `L2Advertisement` resources match the current MetalLB CRD-based configuration model.
