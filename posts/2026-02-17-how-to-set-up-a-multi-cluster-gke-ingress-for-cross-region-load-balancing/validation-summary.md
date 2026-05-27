# Validation Summary: How to Set Up a Multi-Cluster GKE Ingress for Cross-Region Load Balancing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Kubernetes Engine (GKE)
- GKE fleets
- Multi Cluster Ingress
- MultiClusterService
- Google Cloud external Application Load Balancer
- Google Cloud CLI
- Kubernetes Deployments
- Google-managed SSL certificates

## Sources Consulted
- Google Cloud documentation: Setting up Multi Cluster Ingress - https://docs.cloud.google.com/kubernetes-engine/docs/how-to/multi-cluster-ingress-setup
- Google Cloud documentation: Deploying Ingress across clusters - https://docs.cloud.google.com/kubernetes-engine/docs/how-to/multi-cluster-ingress
- Google Cloud documentation: Multi Cluster Ingress concepts - https://docs.cloud.google.com/kubernetes-engine/docs/concepts/multi-cluster-ingress
- Google Cloud SDK reference: gcloud container fleet ingress enable - https://docs.cloud.google.com/sdk/gcloud/reference/container/fleet/ingress/enable
- Google Cloud SDK reference: gcloud container fleet memberships register - https://cloud.google.com/sdk/gcloud/reference/container/fleet/memberships/register
- Google Cloud documentation: Cloud Load Balancing health checks overview - https://docs.cloud.google.com/load-balancing/docs/health-check-concepts
- Google Kubernetes Engine pricing - https://cloud.google.com/kubernetes-engine/pricing

## Issues Found
- The post said Multi-Cluster Ingress requires GKE Enterprise. Updated this to state that it is included with GKE Enterprise and is also available with standalone Multi-Cluster Ingress pricing.
- The required API list included `trafficdirector.googleapis.com`, which is not listed in the current MCI setup guide. Removed it from the required API command.
- The Standard cluster creation commands omitted `--enable-ip-alias`, even though MCI requires Standard clusters to be VPC-native. Added `--enable-ip-alias` to each cluster creation command.
- The config cluster description implied that the cluster hosts the MCI control plane. Clarified that it hosts the Kubernetes resources watched by the Google-hosted controller.
- The `networking.gke.io/static-ip` annotation used the static address resource name. Current GKE documentation requires the literal static IP address or full address URL, not the address name. Updated the command flow and examples to use `GLOBAL_IP`.
- The MultiClusterIngress examples included `pathType: Prefix`, but current Google MCI examples use the MCI schema without `pathType`. Removed it from the MCI manifests.
- The SSL/TLS MultiClusterIngress example omitted the required default backend. Added the default backend to match MCI requirements.
- The cost section listed only a GKE Enterprise license. Updated it to mention either GKE Enterprise licensing or standalone backend Pod charges.
- The conclusion said the setup requires GKE Enterprise. Removed that requirement.

## Review Notes
The post is technically valid after the fixes. In a future update, it could mention Multi-cluster Gateway as another current GKE multi-cluster load balancing option, but that is outside the scope of correcting this MCI tutorial.
