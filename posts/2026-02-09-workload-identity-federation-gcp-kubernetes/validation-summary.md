# Validation Summary: How to Implement Workload Identity Federation for GCP from Kubernetes Pods

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Google Kubernetes Engine
- Workload Identity Federation for GKE
- Google Cloud IAM service accounts
- Kubernetes ServiceAccounts and Deployments
- Google Cloud CLI
- kubectl
- Cloud Storage
- Python Google Cloud Storage client library
- Cloud Logging and Cloud Monitoring

## Sources Consulted
- Google Cloud GKE documentation: Authenticate to Google Cloud APIs from GKE workloads: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Cloud GKE documentation: About Workload Identity Federation for GKE: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Google Cloud SDK reference: gcloud container node-pools update: https://docs.cloud.google.com/sdk/gcloud/reference/container/node-pools/update
- Google Cloud SDK reference: gcloud container clusters update: https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/update
- Google Cloud SDK reference: gcloud monitoring policies create: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Kubernetes kubectl reference: kubectl run: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Google Cloud Storage IAM roles documentation: https://docs.cloud.google.com/storage/docs/access-control/iam-roles
- Google Cloud Resource Manager organization policy constraints: https://docs.cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints

## Issues Found
- The Kubernetes namespace examples applied service accounts into `production` and `jobs` without creating those namespaces. Added idempotent namespace creation commands before creating resources in those namespaces.
- The deployment and test pods could be scheduled onto a Standard GKE node pool that was not using the GKE metadata server when only a new Workload Identity node pool was created. Added the documented `iam.gke.io/gke-metadata-server-enabled: "true"` node selector to the workload examples.
- The `kubectl run --serviceaccount=...` flag is not present in the current generated `kubectl run` reference. Replaced those commands with `--overrides` JSON that sets `spec.serviceAccountName`.
- The test command used `gcloud auth list` to verify metadata-server identity. Replaced it with a metadata server `curl` check that directly returns the linked IAM service account email.
- The post granted `roles/storage.objectViewer`, which can list objects in a bucket but does not list all buckets. Changed `gcloud storage ls` and the Python sample from project bucket listing to object listing in `gs://my-bucket/`.
- The Python sample included an unused `os` import and an upload helper that needed write permission. Removed the unused import and noted that uploads require `storage.objects.create`.
- The Cloud Monitoring alert example used unsupported flags `--condition-threshold-value` and `--condition-threshold-duration`. Replaced them with current `gcloud monitoring policies create` flags: `--condition-filter`, `--aggregation`, `--duration`, and `--if`.
- The best-practices section claimed `gcloud iam service-accounts get-iam-policy` checks when a service account was last used. Corrected the comment to say it reviews IAM policy bindings.
- The best-practices section said to use organization policy constraints to require Workload Identity. Current public constraints support preventing service account key creation, while the GKE Workload Identity org-policy language is not a general "require Workload Identity" control. Narrowed the statement to preventing service account key creation.

## Review Notes
The main GKE Workload Identity Federation flow, IAM service account annotation, `roles/iam.workloadIdentityUser` binding format, and GKE metadata server explanation were consistent with current Google Cloud documentation. The examples still use placeholder project, bucket, cluster, and service account names that must be replaced in a real environment.
