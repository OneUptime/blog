# Validation Summary: How to Set Up Istio on AWS EKS Anywhere

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS Anywhere
- Kubernetes
- Istio and istioctl
- Istio CNI
- Cilium CNI
- MetalLB
- kube-vip
- cert-manager
- AWS CloudWatch agent
- Flux GitOps

## Sources Consulted
- EKS Anywhere Cilium networking documentation: https://anywhere.eks.amazonaws.com/docs/clustermgmt/networking/networking-and-security/
- EKS Anywhere GitOps documentation: https://anywhere.eks.amazonaws.com/docs/clustermgmt/cluster-flux/
- EKS Anywhere architecture documentation: https://anywhere.eks.amazonaws.com/docs/concepts/architecture/
- Istio install with istioctl documentation: https://istio.io/latest/docs/setup/install/istioctl/
- Istio CNI documentation: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio supported releases documentation: https://istio.io/latest/docs/releases/supported-releases/
- Istio Gateway and VirtualService reference documentation: https://istio.io/latest/docs/reference/config/networking/gateway/ and https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Cilium integration with Istio documentation: https://docs.cilium.io/en/stable/network/servicemesh/istio/
- MetalLB configuration documentation: https://metallb.io/configuration/
- kube-vip Kubernetes Services documentation: https://kube-vip.io/docs/usage/kubernetes-services/
- cert-manager SelfSigned issuer documentation: https://cert-manager.io/docs/configuration/selfsigned/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- AWS CloudWatch agent documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Install-CloudWatch-Agent.html

## Issues Found
- The prerequisite "Kubernetes 1.25 or newer" was too broad and could become incorrect for current Istio releases. Changed it to require a Kubernetes version supported by both EKS Anywhere and the installed Istio version.
- The Cilium guidance incorrectly implied kube-proxy replacement must be disabled. Updated it to match Cilium's Istio guidance: kube-proxy present is the simplest setup, while kube-proxy replacement can work with the required Cilium settings.
- The Istio CNI install values were missing `values.pilot.cni.enabled: true`, which is needed so injected workloads do not use the privileged `istio-init` container path when Istio CNI is enabled.
- The kube-vip `DaemonSet` snippet was not valid `apps/v1` because it lacked a selector and pod-template labels. Added the required fields.
- The kube-vip snippet used `cidr-global` as an environment variable, which is not a valid Kubernetes environment variable name. Replaced this with the supported kube-vip load balancer IP annotation on the Istio ingress service.
- The Istio add-on install commands mixed the current downloaded Istio release with hard-coded `release-1.22` manifests. Changed them to use the `samples/addons` manifests from the downloaded Istio release.
- The CloudWatch agent section implied that a Deployment with only `AWS_REGION` was enough to send metrics. Clarified that a real setup also needs an agent configuration and AWS credentials or IAM integration.
- The CloudWatch agent `Deployment` snippet was not valid `apps/v1` because it lacked a selector and pod-template labels. Added the required fields.
- The post stated that EKS Anywhere uses Flux for cluster management. Updated this to say EKS Anywhere supports Flux GitOps when GitOps is enabled, because GitOps is optional.

## Review Notes
- The MetalLB, cert-manager, Istio Gateway, VirtualService, PodDisruptionBudget, and remote-secret examples are structurally consistent with their current APIs.
- The CloudWatch agent example is still intentionally minimal; a production deployment needs an agent configuration, AWS credentials or IAM integration, and a namespace/service account setup appropriate for the environment.
