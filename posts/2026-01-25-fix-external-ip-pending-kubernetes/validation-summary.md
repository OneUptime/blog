# Validation Summary: How to Resolve 'Service External IP Pending' Issues in Kubernetes

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes Services
- LoadBalancer Services
- Cloud Controller Manager
- AWS EKS and AWS Load Balancer Controller
- GKE
- Azure AKS
- MetalLB
- Minikube
- kind
- K3s ServiceLB
- NodePort
- Ingress
- kubectl port-forward

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Amazon EKS AWS Load Balancer Controller documentation: https://docs.aws.amazon.com/eks/latest/userguide/aws-load-balancer-controller.html
- Amazon EKS load balancing best practices: https://docs.aws.amazon.com/eks/latest/best-practices/load-balancing.html
- GKE exposing applications using Services: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/exposing-apps
- AKS public Standard Load Balancer documentation: https://learn.microsoft.com/en-us/azure/aks/load-balancer-standard
- MetalLB installation documentation: https://metallb.universe.tf/installation/
- MetalLB configuration documentation: https://metallb.universe.tf/configuration/
- Minikube accessing applications documentation: https://minikube.sigs.k8s.io/docs/handbook/accessing/
- kind LoadBalancer documentation: https://kind.sigs.k8s.io/docs/user/loadbalancer/
- K3s networking services documentation: https://docs.k3s.io/networking/networking-services

## Issues Found
- The post said EKS requires the AWS Load Balancer Controller for LoadBalancer Services. AWS documentation says the controller is recommended for new load balancers and manages Service resources, but legacy AWS cloud provider behavior and EKS Auto Mode can also provision load balancers. Updated the EKS table entry and EKS section wording to reflect the current options.
- The post listed only MetalLB or port forwarding for kind. The official kind documentation now recommends Cloud Provider KIND for LoadBalancer Services. Updated the table to include Cloud Provider KIND.
- The MetalLB installation command pinned `v0.14.3`, which is older than the current documented release stream. Updated the manifest URL to `v0.16.1` and verified that the `app=metallb` selector still matches the current native manifest labels.
- The AKS section implied cloud controller manager logs are always available and referred only to service principal permissions. Current managed AKS clusters may not expose those pods and commonly use managed identities. Updated the snippet to check Service events first and to cover either a service principal or managed identity.

## Review Notes
The YAML examples use current Kubernetes `Service` and `Ingress` APIs, and the MetalLB `IPAddressPool` and `L2Advertisement` resources match the documented `metallb.io/v1beta1` configuration. The local environment does not have `kubectl` installed, so CLI behavior was checked against official Kubernetes documentation rather than local `--help` output.
