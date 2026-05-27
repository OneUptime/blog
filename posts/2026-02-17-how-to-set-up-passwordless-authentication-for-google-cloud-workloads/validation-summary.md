# Validation Summary: How to Set Up Passwordless Authentication for Google Cloud Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud IAM service accounts
- GKE Workload Identity Federation for GKE
- Kubernetes ServiceAccount and Deployment manifests
- Compute Engine metadata server authentication
- Workload Identity Federation for AWS and GitHub Actions
- Cloud Run and Cloud Functions service identities
- Google Cloud client libraries for Python
- Google Cloud organization policies
- Cloud Logging

## Sources Consulted
- Google Kubernetes Engine Workload Identity Federation for GKE documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Cloud IAM Workload Identity Federation with other clouds documentation: https://cloud.google.com/iam/docs/workload-identity-federation-with-other-clouds
- Google Cloud IAM Workload Identity Federation deployment pipelines documentation: https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
- Google Cloud Compute Engine authentication and metadata server documentation: https://cloud.google.com/compute/docs/access/authenticate-workloads
- Google Cloud Run service identity documentation: https://cloud.google.com/run/docs/securing/service-identity
- Google Cloud Functions service identity documentation: https://cloud.google.com/functions/docs/securing/function-identity
- Google Cloud IAM best practices for service account keys: https://cloud.google.com/iam/docs/best-practices-for-managing-service-account-keys
- Google Cloud organization policy constraints documentation: https://cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints
- Google Cloud Storage Python client documentation: https://cloud.google.com/python/docs/reference/storage/latest
- Google Cloud BigQuery Python client documentation: https://cloud.google.com/python/docs/reference/bigquery/latest
- google-github-actions/auth documentation: https://github.com/google-github-actions/auth

## Issues Found
- The GKE setup enabled Workload Identity Federation on the cluster but did not include the required metadata server setting for existing Standard cluster node pools. Added the `gcloud container node-pools update ... --workload-metadata=GKE_METADATA` command.
- The Kubernetes Deployment example was missing the required `spec.selector` and matching pod template labels for an `apps/v1` Deployment. Added `selector.matchLabels` and `template.metadata.labels`.
- The Compute Engine command used `--no-service-account-key`, which is not a valid `gcloud compute instances create` flag and is unnecessary because attaching a service account to a VM does not create a service account key. Removed the flag.
- The AWS Workload Identity Federation example bound `attribute.aws_role` to a full assumed-role ARN, but the documented mapping extracts the AWS role name. Added an explicit AWS provider attribute mapping and updated the IAM member to use `attribute.aws_role/my-aws-role`.
- The GitHub Actions provider example used `ci-pool` without first creating it. Added the missing workload identity pool creation command.
- The organization policy YAML used an unqualified constraint name. Updated it to `constraints/iam.disableServiceAccountKeyCreation`.

## Review Notes
The remaining examples align with Google Cloud's documented passwordless authentication patterns. The post could later mention that some newer organization policy workflows use managed constraints and newer `gcloud org-policies` commands, but the corrected legacy organization policy example remains technically valid.
