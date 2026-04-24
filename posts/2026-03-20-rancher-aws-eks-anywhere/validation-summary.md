# Validation Summary: How to Set Up Rancher on AWS with EKS Anywhere

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher
- Amazon EKS Anywhere
- Kubernetes
- VMware vSphere
- Helm
- cert-manager
- ingress-nginx
- MetalLB

## Sources Consulted
- EKS Anywhere vSphere prerequisites: https://anywhere.eks.amazonaws.com/docs/getting-started/vsphere/vsphere-prereq/
- EKS Anywhere vSphere getting started: https://anywhere.eks.amazonaws.com/docs/getting-started/vsphere/vsphere-getstarted/
- EKS Anywhere vSphere cluster spec reference: https://anywhere.eks.amazonaws.com/docs/getting-started/vsphere/vsphere-spec/
- EKS Anywhere `anywhere create cluster` CLI reference: https://anywhere.eks.amazonaws.com/docs/reference/eksctl/anywhere_create_cluster/
- EKS Anywhere `anywhere upgrade cluster` CLI reference: https://anywhere.eks.amazonaws.com/docs/reference/eksctl/anywhere_upgrade_cluster/
- EKS Anywhere ingress guidance: https://anywhere.eks.amazonaws.com/docs/workloadmgmt/ingress/
- EKS Anywhere Kubernetes version lifecycle: https://anywhere.eks.amazonaws.com/docs/concepts/support-versions/
- Rancher install/upgrade on a Kubernetes cluster: https://ranchermanager.docs.rancher.com/v2.13/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher Helm version requirements: https://ranchermanager.docs.rancher.com/v2.12/getting-started/installation-and-upgrade/resources/helm-version-requirements
- Rancher TLS settings: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/tls-settings
- Rancher registering existing clusters: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/register-existing-clusters
- cert-manager Helm installation: https://cert-manager.io/docs/installation/helm/
- Rancher charts repository index: https://charts.rancher.io/index.yaml

## Issues Found
- The title implied EKS Anywhere runs on AWS infrastructure. AWS's own EKS Anywhere FAQ says it is not supported to run in AWS or other clouds, so the title was corrected to describe Rancher on an EKS Anywhere cluster instead.
- The vSphere prerequisite was outdated. The post said `vCenter 6.7+`, but current EKS Anywhere docs require a vSphere 7 or 8 environment running vCenter, so that prerequisite was corrected.
- The prerequisite for Helm was too specific and outdated. Rancher now documents Helm version selection in terms of Kubernetes compatibility rather than an old `v3.8+` floor, so the wording was updated to require Helm 3.
- The example EKS Anywhere cluster spec was incomplete for a practical vSphere HA setup. I added `controlPlaneConfiguration.endpoint.host`, a required worker node group `name`, and `externalEtcdConfiguration`, and I updated the example Kubernetes version from `1.29` to `1.31` to reflect current EKS Anywhere guidance to use a newer supported version.
- The cert-manager install used an outdated chart value and an old pinned version. I replaced `installCRDs=true` and the `v1.14.0` pin with the current `crds.enabled=true` install pattern and expanded the readiness check to include the webhook and cainjector deployments.
- The Rancher install section omitted a critical TLS caveat for Let's Encrypt on newer Rancher releases. Rancher documents that with `agent-tls-mode=strict`, Let's Encrypt installs also need `--set privateCA=true` and the CA uploaded to Rancher, so both the Helm value and the note were added.
- The ingress section incorrectly implied EKS Anywhere already comes with MetalLB or another load balancer. EKS Anywhere docs say ingress and load-balancing are operational add-ons, so the text now makes the `LoadBalancer` requirement explicit and keeps `ingress-nginx` as a self-managed choice.
- The workload-cluster creation command was incomplete. Official EKS Anywhere docs require setting `spec.managementCluster.name` and using the management cluster kubeconfig when creating workload clusters with `eksctl anywhere`, so that flow was corrected.
- The post incorrectly claimed Rancher can drive EKS Anywhere cluster upgrades from the UI. Rancher documents EKS Anywhere as an imported cluster type without full lifecycle support, so the section was rewritten to use `eksctl anywhere upgrade cluster` directly.
- The monitoring commands referenced `rancher-charts/...` without first adding the Rancher charts repository. I added the missing `helm repo add rancher-charts https://charts.rancher.io` step.

## Review Notes
- This guide assumes a public, internet-reachable hostname when using Let's Encrypt because Rancher uses HTTP-01 validation in that flow.
- The post now reflects documentation current as of 2026-04-24.
- In production, chart versions for Rancher system apps such as monitoring should be pinned to versions compatible with the Rancher release you deploy.
