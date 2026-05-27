# Validation Summary: How to Troubleshoot GKE Multi-Cluster Service Discovery Failures with Fleet

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- GKE Fleets
- GKE Multi-Cluster Services (MCS)
- Kubernetes ServiceExport and ServiceImport resources
- Kubernetes DNS and kube-dns
- Google Cloud IAM
- Google Cloud VPC networking and firewall rules
- Google Cloud CLI and kubectl

## Sources Consulted
- Google Cloud documentation: Configuring multi-cluster Services: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/multi-cluster-services
- Google Cloud documentation: Multi-cluster Services concepts: https://cloud.google.com/kubernetes-engine/docs/concepts/multi-cluster-services
- Google Cloud documentation: Register a cluster on Google Cloud to your fleet: https://docs.cloud.google.com/kubernetes-engine/fleet-management/docs/register/gke
- Google Cloud documentation: Get fleet membership status: https://docs.cloud.google.com/kubernetes-engine/fleet-management/docs/get-fleet-status
- Google Cloud SDK reference: gcloud container fleet multi-cluster-services enable: https://docs.cloud.google.com/sdk/gcloud/reference/container/fleet/multi-cluster-services/enable
- Google Cloud SDK reference: gcloud container fleet memberships list: https://docs.cloud.google.com/sdk/gcloud/reference/container/fleet/memberships/list
- Google Cloud SDK reference: gcloud container fleet memberships describe: https://docs.cloud.google.com/sdk/gcloud/reference/container/fleet/memberships/describe
- Google Cloud SDK reference: gcloud container fleet memberships register: https://docs.cloud.google.com/sdk/gcloud/reference/container/fleet/memberships/register
- Google Cloud SDK reference: gcloud compute firewall-rules create: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create

## Issues Found
- Fleet membership status was described as `READY`, and the example queried `state.code` from the membership. Current docs describe Fleet membership listing and detail inspection separately, while MCS readiness is reported under the MCS feature as `resourceState.state: ACTIVE` and membership `state.code: OK`. Updated the membership check and moved the OK/ACTIVE status guidance to the MCS feature check.
- The MCS importer pod selector used `app=gke-mcs-importer`. Updated it to `k8s-app=gke-mcs-importer`, which matches common GKE MCS importer labeling.
- The service endpoint verification used the deprecated Endpoints API. Current GKE MCS docs note that starting with GKE 1.33, users should use EndpointSlice for endpoint discovery and monitoring. Updated the command to query EndpointSlices by `kubernetes.io/service-name`.
- The post implied that ServiceImport appears in all Fleet clusters without mentioning namespace presence or initial propagation delay. Updated the wording to note that the namespace must exist and initial export can take about five minutes.
- The IAM binding used the older Kubernetes service account member string for the MCS importer. Current GKE MCS docs use a Workload Identity principal URI for `gke-mcs/gke-mcs-importer`. Updated the IAM grant command and policy inspection output.
- DNS troubleshooting suggested inspecting a CoreDNS ConfigMap and restarting kube-dns. GKE MCS configures Cloud DNS resources and ServiceImport records rather than requiring a visible CoreDNS zone edit, and restarting DNS is not an official first-line fix. Updated the troubleshooting to inspect ServiceImport, MCS state, kube-dns pod health, and kube-dns logs.
- Same-VPC networking was described as automatic. Current docs state that MCS manages firewall rules for pod communication, so the wording was changed to reflect MCS-managed firewall behavior.
- The pod CIDR section stated that both pod and service CIDR ranges must be unique. For the MCS routing issue described, the critical requirement is non-overlapping pod CIDR ranges. Updated the wording and firewall note accordingly.

## Review Notes
The local environment did not have `gcloud` or `kubectl` installed, so command verification was performed against current official Google Cloud and Google Cloud SDK documentation rather than local CLI help output.
