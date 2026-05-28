# Validation Summary: How to Migrate Workloads from GKE Standard to GKE Autopilot Without Downtime

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Kubernetes Engine (GKE) Standard
- Google Kubernetes Engine (GKE) Autopilot
- Kubernetes manifests, Pods, Deployments, DaemonSets, Services, Ingress
- Google Cloud CLI (`gcloud`)
- Cloud DNS weighted round robin routing
- Google Cloud Load Balancing and Network Endpoint Groups
- Multi Cluster Ingress and Multi Cluster Services
- Persistent Volumes, Velero, and Backup for GKE

## Sources Consulted
- GKE documentation: Prepare to migrate to Autopilot from Standard: https://cloud.google.com/kubernetes-engine/docs/how-to/prepare-migrate-cluster-mode
- GKE documentation: Create an Autopilot cluster: https://cloud.google.com/kubernetes-engine/docs/how-to/creating-an-autopilot-cluster
- GKE documentation: Resource requests in Autopilot: https://cloud.google.com/kubernetes-engine/docs/concepts/autopilot-resource-requests
- GKE documentation: Autopilot security measures: https://cloud.google.com/kubernetes-engine/docs/concepts/autopilot-security
- Google Cloud DNS documentation: Configure DNS routing policies and health checks: https://cloud.google.com/dns/docs/configure-routing-policies
- GKE documentation: Deploying Ingress across clusters: https://cloud.google.com/kubernetes-engine/docs/how-to/multi-cluster-ingress
- Google Cloud SDK reference: `gcloud container clusters create-auto`: https://cloud.google.com/sdk/gcloud/reference/container/clusters/create-auto
- Google Cloud SDK reference: `gcloud dns record-sets create`: https://cloud.google.com/sdk/gcloud/reference/dns/record-sets/create

## Issues Found
- The post claimed all workloads could migrate with zero downtime. Google documents no-downtime migration for stateless workloads using multi-cluster traffic cutover, but stateful workload migration requires downtime to avoid data loss. Updated the title, description, introduction, persistent volume note, and conclusion to say minimal downtime or no downtime for stateless workloads.
- The post stated that DaemonSets are not allowed in Autopilot. Current GKE Autopilot supports DaemonSets with specific resource defaults and constraints, though many node-level agents need changes. Updated the compatibility guidance and DaemonSet migration advice.
- The post stated resource requests are mandatory and that Pods without requests fail on Autopilot. Current docs say Autopilot applies default requests when omitted and enforces minimums, maximums, and CPU-to-memory ratios. Updated the compatibility guidance and manifest example.
- The security context example suggested replacing privileged mode with `NET_ADMIN`. Autopilot drops `CAP_NET_ADMIN` by default and requires the `allow-net-admin` workload policy before using it. Updated the example to use an allowed capability and added a note for workloads that need `NET_ADMIN`.
- The Cloud DNS WRR example used the wrong `--routing-policy-data` format. Updated it to the documented weighted format.

## Review Notes
The example commands remain illustrative and use placeholder names, IP addresses, regions, and service names. Production migrations should run the official Autopilot pre-flight compatibility check and test workload manifests with server-side dry runs before cutover.
