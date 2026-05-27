# Validation Summary: Use Metadata Server to Pass Configuration Data to Compute Engine Startup Scripts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Compute Engine
- Compute Engine metadata server
- Google Cloud CLI
- Startup scripts
- Python requests
- Terraform Google provider
- Google Secret Manager
- Google Kubernetes Engine Workload Identity Federation

## Sources Consulted
- Google Cloud Compute Engine: View and query VM metadata - https://docs.cloud.google.com/compute/docs/metadata/querying-metadata
- Google Cloud Compute Engine: Set and remove custom metadata - https://docs.cloud.google.com/compute/docs/metadata/setting-custom-metadata
- Google Cloud Compute Engine: Predefined metadata keys - https://docs.cloud.google.com/compute/docs/metadata/predefined-metadata-keys
- Google Cloud SDK: gcloud compute instances add-metadata - https://cloud.google.com/sdk/gcloud/reference/compute/instances/add-metadata
- Google Cloud SDK: gcloud compute project-info add-metadata - https://docs.cloud.google.com/sdk/gcloud/reference/compute/project-info/add-metadata
- Google Cloud Secret Manager: Access a secret version - https://docs.cloud.google.com/secret-manager/docs/access-secret-version
- Google Cloud SDK: gcloud secrets versions access - https://docs.cloud.google.com/sdk/gcloud/reference/secrets/versions/access
- Google Kubernetes Engine: Protecting cluster metadata - https://cloud.google.com/kubernetes-engine/docs/how-to/protecting-cluster-metadata
- Google Kubernetes Engine: Workload Identity Federation for GKE - https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Terraform Registry: google_compute_instance - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance

## Issues Found
- The post listed "secrets" as a custom metadata use case, which conflicted with the later security guidance and Google Cloud's recommendation to avoid storing secret values in metadata. Changed this to "secret names."
- The Python metadata watcher defined `main()` but never called it, called an undefined `reload_application()` function, and did not check HTTP errors. Added an executable `if __name__ == "__main__"` guard, removed the undefined function call, initialized `last_etag` to `"0"` per Google guidance, and added status handling for metadata server errors.
- The GKE security note recommended metadata concealment, which Google documents as deprecated and replaced by Workload Identity Federation for GKE. Updated the recommendation accordingly.
- The Secret Manager example stored a full secret version path in metadata but fetched a hardcoded secret ID instead of using the metadata value. Changed the metadata value to the secret ID and used `$SECRET_NAME` in the `gcloud secrets versions access` command.

## Review Notes
- The Compute Engine metadata endpoints, required `Metadata-Flavor: Google` header, `wait_for_change` / `last_etag` behavior, custom metadata commands, and Terraform `google_compute_instance` fields are consistent with current official documentation.
- The local environment did not have the Google Cloud CLI installed, so command syntax was verified against official Google Cloud CLI reference pages rather than local `gcloud --help`.
