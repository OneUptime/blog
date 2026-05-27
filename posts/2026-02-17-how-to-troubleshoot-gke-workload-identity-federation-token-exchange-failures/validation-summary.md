# Validation Summary: How to Troubleshoot GKE Workload Identity Federation Token Exchange Failures

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Workload Identity Federation for GKE
- Kubernetes ServiceAccounts and Pods
- Google Cloud IAM service accounts and IAM allow policies
- GKE metadata server
- Google Cloud CLI (`gcloud`)
- Kubernetes CLI (`kubectl`)
- Kubernetes NetworkPolicy

## Sources Consulted
- Google Cloud: Authenticate to Google Cloud APIs from GKE workloads: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Cloud: About Workload Identity Federation for GKE: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Google Cloud: Troubleshoot GKE authentication issues: https://docs.cloud.google.com/kubernetes-engine/docs/troubleshooting/authentication
- Kubernetes documentation: NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/network-policy-v1/

## Issues Found
- The sequence diagram showed Security Token Service calling IAM to generate the IAM service account access token. Google Cloud documentation describes STS returning a federated access token, with service account impersonation using the IAM Service Account Credentials API afterward. Updated the diagram so the GKE metadata server exchanges the KSA token with STS, then calls IAM to generate the GSA access token.
- The metadata server connectivity NetworkPolicy example allowed `169.254.169.254/32` on ports `80` and `988`. Official GKE troubleshooting guidance says strict network policies should allow `169.254.169.252/32` on TCP port `988`, or `169.254.169.254/32` on TCP port `80` for clusters running GKE Dataplane V2. Updated the example and added the Dataplane V2 note.
- The metadata server `email` endpoint explanation implied that a correct setup always returns the GCP service account email. Current GKE documentation notes that linked Kubernetes ServiceAccounts can return a Kubernetes service account style identifier unless `iam.gke.io/return-principal-id-as-email: "true"` is set. Updated the explanation to account for both expected values.

## Review Notes
- The post uses the Kubernetes ServiceAccount-to-IAM-service-account impersonation setup. Google Cloud now presents direct IAM principal identifiers as the preferred Workload Identity Federation for GKE authorization model, with IAM service account impersonation as an alternative for APIs or use cases that need it.
- The node pool metadata server checks apply to GKE Standard clusters. In GKE Autopilot, Workload Identity Federation for GKE is always enabled and every node uses the GKE metadata server.
