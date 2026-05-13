# Validation Summary: How to Deploy MinIO Tenant with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MinIO Operator and Tenant CRD
- MinIO Client (`mc`)
- Kubernetes Namespace, Secret, ConfigMap, Ingress, Job, and PersistentVolumeClaim resources
- Flux CD Kustomization
- S3-compatible bucket policies and lifecycle rules

## Sources Consulted
- MinIO Operator GitHub README: https://github.com/minio/operator
- MinIO Operator Tenant CRD reference: https://raw.githubusercontent.com/minio/operator/master/docs/tenant_crd.adoc
- MinIO Operator example Tenant manifest: https://raw.githubusercontent.com/minio/operator/master/examples/kustomization/base/tenant.yaml
- MinIO `mc admin policy create` reference: https://min.io/docs/minio/linux/reference/minio-mc-admin/mc-admin-policy-create.html
- MinIO `mc ilm rule import` reference: https://min.io/docs/minio/linux/reference/minio-mc/mc-ilm-rule-import.html
- MinIO `mc version` reference: https://min.io/docs/minio/linux/reference/minio-mc/mc-version.html
- MinIO `mc alias` reference: https://min.io/docs/minio/linux/reference/minio-mc/mc-alias.html
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/

## Issues Found
- Updated the Kubernetes prerequisite from v1.26+ to v1.30+ to match the current MinIO Operator v7.1.1 requirement.
- Added `credentials.yaml` and `init-job.yaml` to the example directory layout because later steps create and reference those files.
- Removed the obsolete `flux.weave.works/automated` annotation from the Tenant manifest because it is not a current Flux v2 image automation control.
- Added Tenant `features.domains` for the external S3 and Console ingress hostnames, matching the MinIO Tenant CRD's external domain configuration.
- Removed the invalid Tenant `spec.lifecycle.expiry.days` example. In the Tenant CRD, `lifecycle` is the Kubernetes container lifecycle hook field, not MinIO bucket ILM.
- Changed the bucket policy section title from "Configure" to "Store" and mounted the ConfigMap into the init Job, then created the policy with `mc admin policy create`.
- Split the IAM policy into bucket-level `s3:ListBucket` and object-level object actions so the resource ARNs match the action types.
- Updated the S3 ingress backend to use the Operator-created `minio` service on port 443 instead of the headless service on port 9000.
- Updated the Console ingress to use HTTPS backend protocol, TLS, and port 9443 for the Operator-created Console service.
- Updated the init Job to target the `minio` service on port 443, put `--insecure` in the documented global flag position, use `mc mb --ignore-existing`, and use the current `mc ilm rule import` command form.

## Review Notes
The tutorial still uses example root credentials and `minio/mc:latest`; for a production GitOps repository, those values should be sealed or otherwise injected securely and image tags should be pinned. The MinIO open-source Operator repository is archived as of March 20, 2026, but its Tenant CRD and examples remain authoritative for this post's MinIO Operator workflow.
