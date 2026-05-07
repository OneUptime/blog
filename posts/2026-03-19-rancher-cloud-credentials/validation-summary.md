# Validation Summary: How to Create Cloud Credential Sets in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Amazon Web Services (AWS)
- Microsoft Azure and AKS
- Google Cloud Platform (GCP), Google Compute Engine (GCE), and GKE
- VMware vSphere
- DigitalOcean
- Azure CLI
- Google Cloud CLI (`gcloud`)
- JSON and shell commands

## Sources Consulted
- Rancher: Managing Cloud Credentials — https://ranchermanager.docs.rancher.com/reference-guides/user-settings/manage-cloud-credentials
- Rancher: User Settings — https://ranchermanager.docs.rancher.com/reference-guides/user-settings
- Rancher: Node Template Configuration — https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/downstream-cluster-configuration/node-template-configuration
- Rancher: Creating an Amazon EC2 Cluster — https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/launch-kubernetes-with-rancher/use-new-nodes-in-an-infra-provider/create-an-amazon-ec2-cluster
- Rancher: Creating an Azure Cluster — https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/launch-kubernetes-with-rancher/use-new-nodes-in-an-infra-provider/create-an-azure-cluster
- Rancher: Creating an AKS Cluster — https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/set-up-clusters-from-hosted-kubernetes-providers/aks
- Rancher: Creating a Google Compute Engine cluster — https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/launch-kubernetes-with-rancher/use-new-nodes-in-an-infra-provider/create-a-google-compute-engine-cluster
- Rancher: Creating a GKE Cluster — https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/set-up-clusters-from-hosted-kubernetes-providers/gke
- Rancher: Creating Credentials in the VMware vSphere Console — https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/launch-kubernetes-with-rancher/use-new-nodes-in-an-infra-provider/vsphere/create-credentials
- DigitalOcean: How to Create a Personal Access Token — https://docs.digitalocean.com/reference/api/create-personal-access-token/
- DigitalOcean: Scopes for API Tokens — https://docs.digitalocean.com/reference/api/scopes/
- Microsoft Learn: `az ad sp` — https://learn.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest

## Issues Found
- The post used older UI navigation for Cloud Credentials. I updated it to Rancher's current documented path under `☰ > Cluster Management > Cloud Credentials`.
- The AWS IAM policy example was overly broad and did not match Rancher's documented EC2 machine-provisioning policy. I replaced it with Rancher's current example policy structure.
- The GCP example omitted the `roles/viewer` permission required for Google GCE machine provisioning and did not distinguish GCE from GKE requirements. I added the missing role and clarified that GKE uses a different documented role set.
- The vSphere permission list was incomplete and included outdated guidance. I replaced it with the current Rancher-documented privilege set for vSphere credentials.
- The DigitalOcean token guidance assumed the older read/write scope model. I updated it to DigitalOcean's current Full Access or custom-scope token model.
- The credential-access section incorrectly implied that non-admin users can share cloud credentials by editing access settings. I corrected this to Rancher's current behavior: credentials are user-bound, and admins can manage other users' credentials.
- The rotation, audit, and deletion sections leaned on legacy node-template-centric and API-specific guidance. I removed the unverified API examples, updated the wording to include current machine-pool usage, and tightened the rotation note to avoid overstating automatic update behavior.

## Review Notes
- Rancher's previous v3 API is still available, but Rancher documents that legacy v3 API tokens are being phased out starting in Rancher v2.14. Avoiding API-specific examples here reduces version drift.
- Rancher documents that RKE1 reached end of life on July 31, 2025, and Rancher 2.12.0+ no longer supports provisioning or managing downstream RKE1 clusters. Current supported workflows center on machine pools rather than classic RKE1 node templates.
