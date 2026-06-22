# Validation Summary: How to Fix 'Workload Identity' Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Kubernetes Engine
- Workload Identity Federation for GKE
- Kubernetes service accounts
- IAM service accounts
- Google Cloud IAM
- Google Cloud CLI
- Kubernetes NetworkPolicy

## Sources Consulted
- Google Cloud: Authenticate to Google Cloud APIs from GKE workloads: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Cloud: About Workload Identity Federation for GKE: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Google Cloud: Control communication between Pods and Services using network policies: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/network-policy
- Google Cloud: Troubleshoot GKE authentication issues: https://docs.cloud.google.com/kubernetes-engine/docs/troubleshooting/authentication

## Issues Found
- The introduction and sequence diagram described Workload Identity as always working by direct Kubernetes service account impersonation of IAM service accounts. Updated the wording and diagram to reflect the current GKE model: workloads request credentials through the GKE metadata server, and linking to an IAM service account is one supported path when service account impersonation is needed.
- The cluster enablement note said node pool recreation was required. Updated it to match Google Cloud documentation: existing node pools are unaffected until new node pools are created or existing node pools are updated for GKE metadata server use.
- The node pool update note said the command causes a rolling restart. Updated it to the documented behavior that enabling the node pool immediately enables Workload Identity for workloads on that node pool.
- The Deployment example was missing the required `spec.selector` and matching pod template labels for an `apps/v1` Deployment. Added `selector.matchLabels` and matching `template.metadata.labels`.
- The NetworkPolicy metadata server egress example used incorrect or incomplete port coverage. Updated it to use `169.254.169.254/32` on ports `80` and `8080` for GKE Dataplane V2, and added the documented `169.254.169.252/32` ports `988` and `987` case for GKE 1.21.0-gke.1000 and later without Dataplane V2.
- The default Kubernetes service account pitfall implied the default KSA could not be configured for Workload Identity. Updated it to clarify that it is not configured unless explicitly annotated and bound, while preserving the recommendation to prefer a dedicated KSA.

## Review Notes
The post focuses on the IAM service account linking flow, which remains supported, but Google Cloud documentation now presents direct IAM principal identifiers as the best practice for most Workload Identity Federation for GKE setups. A future update could add that newer direct-principal flow as a separate path without replacing the linked service account troubleshooting content.
