# Validation Summary: How to Fix 'OCI pull failed' Error in Flux CD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD
- Flux source-controller
- OCIRepository
- HelmRepository and HelmChart
- OCI container registries
- Kubernetes Secrets
- AWS ECR, Google Artifact Registry, and Azure Container Registry
- Flux CLI, crane, and oras

## Sources Consulted
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux CLI `flux pull artifact` documentation: https://fluxcd.io/flux/cmd/flux_pull_artifact/
- Flux CLI `flux push artifact` documentation: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux CLI `flux create secret oci` documentation: https://fluxcd.io/flux/cmd/flux_create_secret_oci/
- Flux CLI `flux create secret proxy` documentation: https://fluxcd.io/flux/cmd/flux_create_secret_proxy/

## Issues Found
- The post told readers to inspect an OCI `HelmRepository` for OCI chart pull errors. Flux documentation describes OCI HelmRepository as a data container, while pull failures usually surface on the `HelmChart` or `HelmRelease` that consumes it. Updated the diagnostic command to describe the related `HelmChart`.
- The AWS long-lived authentication note referred to an "ECR credential provider", which could be confused with Kubernetes image credential provider behavior. Updated it to Flux provider authentication with EKS worker node IAM role or IRSA.
- The GCP and Azure snippets implied that setting `provider` alone configures workload identity. Updated comments to clarify that workload identity, access scopes, or managed identity must be configured for `source-controller`.
- The digest section described a "digest mismatch" as if Flux compares an expected digest with a tag's current digest. Flux resolves `.spec.ref.digest` directly and it takes precedence over other reference fields. Updated this to "incorrect digest reference" and adjusted the summary wording.
- The insecure registry section described `insecure: true` as a workaround for self-signed certificates. Flux documents this field as allowing insecure HTTP registry connections, while custom CA certificates belong under `certSecretRef`. Updated the surrounding text to plain HTTP registries.

## Review Notes
The OCI HelmRepository API remains valid but is documented as being in maintenance mode; Flux recommends using OCIRepository for improved OCI Helm chart support. The existing HelmRepository example was left in place because it is still supported and relevant to the troubleshooting scenario.
