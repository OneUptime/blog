# Validation Summary: How to Use Rancher with Google Cloud Marketplace

## Status
validated

## Post Type
Guide

## Technologies Covered
- SUSE Rancher / Rancher Manager
- Google Cloud Marketplace
- Google Kubernetes Engine (GKE)
- Helm
- cert-manager
- Traefik
- Google Cloud DNS
- Workload Identity Federation for GKE
- Google Workspace / Google OAuth
- Cloud Billing / BigQuery

## Sources Consulted
- Rancher: Installing Rancher on a Google Kubernetes Engine Cluster  
  https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster/rancher-on-gke
- Rancher: Install/Upgrade Rancher on a Kubernetes Cluster  
  https://ranchermanager.docs.rancher.com/v2.11/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- SUSE Rancher Manager: Cloud Marketplace Integration  
  https://documentation.suse.com/cloudnative/rancher-manager/v2.9/en/installation-and-upgrade/hosted-kubernetes/cloud-marketplace/cloud-marketplace.html
- SUSE Rancher Manager: Creating a GKE Cluster  
  https://documentation.suse.com/cloudnative/rancher-manager/v2.10/en/cluster-deployment/hosted-kubernetes/gke/gke.html
- SUSE Rancher Manager: Helm Chart Options  
  https://documentation.suse.com/cloudnative/rancher-manager/latest/en/installation-and-upgrade/references/helm-chart-options.html
- Rancher: Configure Google OAuth  
  https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/configure-google-oauth
- Google Cloud: Deploying an application from Cloud Marketplace  
  https://cloud.google.com/kubernetes-engine/docs/how-to/deploying-marketplace-app
- Google Cloud: Authenticate to Google Cloud APIs from GKE workloads  
  https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Cloud Marketplace: Private Offers  
  https://docs.cloud.google.com/marketplace/docs/offers/discover-private-offers
- Google Cloud Marketplace: Billing for Google Cloud Marketplace products  
  https://cloud.google.com/marketplace/docs/billing
- Google Cloud Billing: Structure of Detailed data export  
  https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery-tables/detailed-usage
- cert-manager: Helm installation  
  https://cert-manager.io/docs/installation/helm/

## Issues Found
- The post originally described Google Cloud Marketplace as a direct click-to-deploy Rancher path on GKE. I changed this to a procurement/subscription flow followed by the standard Helm-based Rancher installation on GKE, because current Rancher documentation documents AWS Marketplace integration specifically and the supported GKE path is a standard cluster install.
- The prerequisites omitted the requirement that Rancher server installs on GKE must use Standard mode, not Autopilot. I added that requirement because Rancher documents Autopilot as unsupported for this install path.
- The cert-manager example used `installCRDs=true`, while current cert-manager docs recommend `crds.enabled=true`. I updated the command accordingly.
- The Rancher deployment section assumed Rancher could be exposed directly without first installing a compatible ingress controller on GKE. I added a Traefik installation step, set the Rancher ingress class to `traefik`, and kept the Let's Encrypt settings aligned with Rancher documentation.
- The post fetched the external IP from the Rancher `Ingress`, which does not match the corrected ingress-controller-based setup. I changed the DNS step to read the external IP from the Traefik `Service`.
- The post claimed `global.cattle.psp.enabled=false` was generally required on GKE 1.25+. I removed that guidance because Rancher documents it as a version-specific workaround, not a universal requirement for current releases.
- The Workload Identity section implied that Rancher itself should be wired to Google Cloud APIs this way and that this replaces Rancher's GKE provisioning credentials. I narrowed the section to an optional workload-level GKE integration and noted that Rancher's built-in GKE provisioning still uses Google Cloud credentials configured in Rancher.
- The authentication section labeled the setup as Google OIDC and only referenced an OAuth client ID and secret. I corrected it to Rancher's Google OAuth flow, including the need for Google Workspace Admin SDK access and delegated service account credentials.
- The billing query filtered `service.description` for `%Rancher%`, which is not a reliable way to identify Marketplace charges in Cloud Billing export. I replaced it with a query based on documented detailed billing export fields, including `invoice.publisher_type = "PARTNER"`.
- The conclusion overstated availability by tying GKE's managed control plane directly to Rancher HA for the provided zonal example. I rewrote it to make a narrower, accurate claim about procurement, authentication, and optional workload identity usage.

## Review Notes
- The corrected post is technically sound as of April 23, 2026, but the exact Marketplace procurement path can vary by organization because Google Cloud Marketplace private offers and Private Marketplace controls are tenant-specific.
- The guide intentionally keeps chart versions unpinned. That keeps it concise, but future chart changes could still require minor updates.
