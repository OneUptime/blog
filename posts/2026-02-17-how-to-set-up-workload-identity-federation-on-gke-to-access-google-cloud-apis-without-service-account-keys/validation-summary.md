# Validation Summary: How to Set Up Workload Identity Federation on GKE to Access Google Cloud APIs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Workload Identity Federation for GKE
- Kubernetes ServiceAccounts
- Google Cloud IAM service accounts and IAM policy bindings
- GKE metadata server
- Google Cloud CLI and kubectl
- Cloud Storage, BigQuery, and Pub/Sub IAM roles
- Application Default Credentials (ADC)
- Node.js and Python Google Cloud Storage client libraries

## Sources Consulted
- Google Cloud: Authenticate to Google Cloud APIs from GKE workloads: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Cloud: About Workload Identity Federation for GKE: https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Google Cloud SDK: gcloud container node-pools update reference: https://cloud.google.com/sdk/gcloud/reference/container/node-pools/update
- Google Cloud SDK: gcloud auth list reference: https://cloud.google.com/sdk/gcloud/reference/auth/list
- Kubernetes: kubectl run generated reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Google Cloud: BigQuery IAM roles and permissions: https://cloud.google.com/bigquery/docs/access-control
- Google Cloud: Running BigQuery jobs programmatically: https://cloud.google.com/bigquery/docs/running-jobs
- Google Cloud: Authenticate for using client libraries: https://cloud.google.com/docs/authentication/client-libraries
- Google Cloud Storage client libraries: https://cloud.google.com/storage/docs/reference/libraries
- Google Cloud Storage Node.js Storage class reference: https://cloud.google.com/nodejs/docs/reference/storage/latest/storage/storage
- Google Cloud Storage Python Client reference: https://cloud.google.com/python/docs/reference/storage/latest/google.cloud.storage.client

## Issues Found
- The BigQuery permissions example said the service account could write to BigQuery but only granted `roles/bigquery.dataEditor`. For common BigQuery write workflows that create jobs, Google documents that `bigquery.jobs.create` is required, commonly through `roles/bigquery.jobUser`. Added a `roles/bigquery.jobUser` binding.
- The `kubectl run` verification command used `--serviceaccount`, which is not present in the current generated `kubectl run` reference. Replaced it with a valid `--overrides` value that sets `spec.serviceAccountName`, added `--command` so `/bin/bash` is treated as the container command, and set `--restart Never` for the temporary interactive pod.
- The multiple-application example created IAM service accounts and IAM bindings for `reader-ksa` and `publisher-ksa`, but did not create or annotate those Kubernetes ServiceAccounts. Added the corresponding `kubectl create serviceaccount` and `kubectl annotate serviceaccount` commands so the examples are complete.

## Review Notes
- The post uses the supported GKE Workload Identity Federation pattern that links Kubernetes ServiceAccounts to IAM service accounts for impersonation. Google currently recommends direct IAM principal identifiers where possible, with IAM service account impersonation as the documented alternative for APIs or use cases that need it.
- Local `gcloud` and `kubectl` binaries were not installed in the review environment, so CLI verification was performed against current official command references rather than local `--help` output.
