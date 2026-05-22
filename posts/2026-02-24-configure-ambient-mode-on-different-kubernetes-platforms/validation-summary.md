# Validation Summary: How to Configure Ambient Mode on Different Kubernetes Platforms

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio ambient mode
- Istio CNI and ztunnel
- Kubernetes Gateway API
- Google Kubernetes Engine (GKE)
- Amazon Elastic Kubernetes Service (EKS)
- Azure Kubernetes Service (AKS)
- kind
- k3s
- Minikube
- Red Hat OpenShift
- Helm

## Sources Consulted
- Istio ambient mode platform-specific prerequisites: https://istio.io/latest/docs/ambient/install/platform-prerequisites/
- Istio ambient install with istioctl: https://istio.io/latest/docs/ambient/install/istioctl/
- Istio ambient install with Helm: https://istio.io/latest/docs/ambient/install/helm/
- Istio CNI node agent documentation: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio GKE platform setup: https://istio.io/latest/docs/setup/platform-setup/gke/
- Istio ambient ztunnel troubleshooting and verification: https://istio.io/latest/docs/ambient/usage/troubleshoot-ztunnel/
- AKS Istio-based service mesh add-on limitations: https://learn.microsoft.com/en-us/azure/aks/istio-about
- Amazon EKS security groups for pods documentation: https://docs.aws.amazon.com/eks/latest/best-practices/sgpp.html
- kind configuration documentation: https://kind.sigs.k8s.io/docs/user/configuration/
- k3s networking documentation: https://docs.k3s.io/networking/basic-network-options
- Minikube network policy documentation: https://minikube.sigs.k8s.io/docs/handbook/network_policy/

## Issues Found
- The GKE Standard section incorrectly said ambient mode worked with no special configuration. Updated it to use `values.global.platform=gke` and added the required `system-node-critical` ResourceQuota guidance for `istio-system`.
- The GKE Autopilot section gave unsupported Istio CNI settings. Replaced it with a warning that ambient mode is not a good fit for Autopilot because ambient requires the Istio CNI node agent, which needs unavailable node-level privileges.
- The GKE Dataplane V2 section used a manual CNI binary path override. Updated it to use the supported GKE platform profile and added the Cilium `cni.exclusive=false` caveat for self-managed Cilium.
- The EKS section implied a fixed node security group lookup and omitted the current pod security group enforcing mode caveat. Replaced the security group command with an explicit placeholder and added `POD_SECURITY_GROUP_ENFORCING_MODE=standard` for pod ENI trunking with pod-attached security groups.
- The EKS Calico verification command assumed a fixed CNI config filename. Updated it to inspect the mounted host CNI config directory more generically.
- The AKS managed Istio add-on section was tentative. Updated it to state that the managed add-on does not support sidecar-less ambient mode.
- The k3s section manually set default CNI paths even though Istio provides a `global.platform=k3s` profile. Updated the main command to use the platform profile and kept explicit paths only for overridden or custom CNI layouts.
- The Gateway API CRD URL used an older v1.2.0 standard install manifest. Updated it to the current Istio-documented v1.4.0 experimental install manifest for ambient waypoint support.
- The Minikube section omitted the required `global.platform=minikube` profile for Docker-driver clusters. Added that command.
- The OpenShift section used SCC and CNI privilege overrides instead of the supported OpenShift ambient profile. Updated it to `profile=openshift-ambient` and noted the `kube-system` and OVN-Kubernetes `routingViaHost` requirements.
- The Helm values examples used `cni:` nesting for CNI chart values and omitted platform profiles. Updated the examples to use `global.platform` values and kept the Helm install command focused on the `istio-cni` chart with the ambient profile.
- Replaced remaining `istioctl install ... -y` examples with `--skip-confirmation`, matching the current Istio ambient install documentation.

## Review Notes
The post is now technically aligned with the current Istio ambient platform documentation. Some platform details, especially managed cloud service mesh support and Gateway API manifest versions, are version-sensitive and should be rechecked before publication.
