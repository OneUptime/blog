# Validation Summary: How Portainer KaaS Cluster Provisioning Worked (Deprecated in 2.30)

## Status
validated

## Post Type
Historical overview / reference

## Technologies Covered
- Portainer Business Edition
- Portainer KaaS cluster provisioning
- Kubernetes
- Amazon EKS
- Azure AKS
- Google Kubernetes Engine (GKE)
- Civo Kubernetes
- Linode Kubernetes Engine (LKE) / Akamai Connected Cloud
- DigitalOcean Kubernetes (DOKS)
- `eksctl`
- AWS CLI
- Azure CLI
- Terraform
- Crossplane
- Cluster API (CAPI)

## Sources Consulted
- Portainer deprecated features: https://docs.portainer.io/advanced/deprecated
- Portainer KaaS provisioning overview: https://docs.portainer.io/admin/environments/add/kaas
- Portainer shared credentials: https://docs.portainer.io/admin/settings/credentials
- Portainer AWS credentials: https://docs.portainer.io/admin/settings/credentials/eks
- Portainer Azure KaaS provisioning: https://docs.portainer.io/admin/environments/add/kaas/aks
- Portainer Google Cloud credentials: https://docs.portainer.io/sts/admin/settings/credentials/gke
- Portainer Kubernetes import flow: https://docs.portainer.io/admin/environments/add/kubernetes/import
- Portainer Kubernetes agent onboarding: https://docs.portainer.io/admin/environments/add/kubernetes/agent
- Amazon EKS cluster creation with `eksctl`: https://docs.aws.amazon.com/eks/latest/eksctl/creating-and-managing-clusters.html
- Amazon EKS cluster creation overview: https://docs.aws.amazon.com/eks/latest/userguide/create-cluster.html
- AWS CLI `eks update-kubeconfig`: https://docs.aws.amazon.com/cli/latest/reference/eks/update-kubeconfig.html
- AKS quickstart with Azure CLI: https://learn.microsoft.com/en-us/azure/aks/learn/quick-kubernetes-deploy-cli
- Azure CLI `az aks` reference: https://learn.microsoft.com/en-us/cli/azure/aks?source=docs&view=azure-cli-latest
- AKS managed identity guidance: https://learn.microsoft.com/en-us/azure/aks/system-assigned-managed-identity

## Issues Found
1. **Incomplete provider list**: The post listed only EKS, AKS, and GKE as supported providers. Portainer’s KaaS documentation also lists Civo, Akamai Connected Cloud / Linode Kubernetes Engine, and DigitalOcean. I added the missing providers and their credential types.
2. **Incorrect Portainer menu label**: The post said credentials were added under `Settings > Credentials`. Portainer documents this area as `Settings > Shared credentials`. I corrected the navigation path.
3. **EKS migration example not aligned with current documented `eksctl` flow**: I simplified the `eksctl create cluster` command to the documented cluster-creation flags and removed the nodegroup-specific flags from the example.
4. **AKS migration example missing a documented creation flag**: I added `--generate-ssh-keys` to the `az aks create` example so it matches Microsoft’s documented create flow more closely.
5. **Portainer re-onboarding guidance was misleading**: The post told readers to import the cluster into Portainer by pasting kubeconfig content. Portainer documents kubeconfig import as a legacy option with extra requirements and recommends agent-based onboarding for most use cases. I replaced that guidance with supported onboarding wording.
6. **Overstated attribution and feature claim**: The wording implied an official Portainer recommendation for Terraform/Crossplane/CAPI and claimed “full feature parity.” I changed this to neutral, technically accurate wording that matches the docs: KaaS provisioning was deprecated, but externally provisioned clusters can still be connected and managed in Portainer.

## Review Notes
- Portainer’s deprecated-features table confirms the Provision KaaS Cluster feature was deprecated in `2.30.0`; the removal release remained `TBD` in the documentation as of `2026-04-24`.
- Portainer still documents KaaS provisioning pages after deprecation, but marks the feature as deprecated and notes that KaaS-specific management functionality will not be available going forward.
- Portainer’s kubeconfig import flow has specific requirements, including a self-contained kubeconfig, `current-context`, cluster-admin credentials, and a load balancer-enabled cluster. This is an important caveat for any cloud-cluster migration workflow.
