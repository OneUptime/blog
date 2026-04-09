# Validation Summary: How to Use Rook-Ceph with Harbor Container Registry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (RGW object storage, RBD block storage)
- Harbor container registry
- Kubernetes (PVCs, namespaces, secrets, deployments)
- Helm 3
- AWS CLI (S3 API for RGW interaction)
- radosgw-admin
- Docker (image push/pull)
- Trivy (vulnerability scanner)
- PostgreSQL, Redis (Harbor internal components)

## Sources Consulted
- Harbor Helm chart source (goharbor/harbor-helm) values.yaml for chart version 1.15.x — https://github.com/goharbor/harbor-helm
- Harbor Helm chart templates: registry-pvc.yaml, registry-dpl.yaml, registry-secret.yaml — verified PVC creation conditions and existingSecret support
- Rook-Ceph documentation for RGW service naming conventions and radosgw-admin commands — https://rook.io/docs/rook/latest/
- Ceph radosgw-admin CLI reference for user creation flags (--uid, --display-name, --access-key, --secret-key)
- Docker Distribution S3 storage driver configuration reference

## Issues Found

### 1. Missing AWS credentials in bucket creation command (Step 1)
- **What was wrong:** The `aws s3 mb` command to create the Harbor bucket did not include `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variables. Without these, the command would fail with an authentication error.
- **What was changed:** Added `AWS_ACCESS_KEY_ID=harbor-access-key` and `AWS_SECRET_ACCESS_KEY=harbor-secret-key` as environment variable prefixes to the `aws s3 mb` command, consistent with how credentials are passed in the verification command in Step 6.
- **Why:** The radosgw-admin user is created with explicit access/secret keys, and the AWS CLI needs these credentials to authenticate against the RGW S3 endpoint.

### 2. Incorrect Trivy storage configuration structure (Step 7)
- **What was wrong:** The Trivy storage configuration used `trivy.storage.reports` and `trivy.storage.cache` as Helm value paths. These fields do not exist in the Harbor Helm chart. The `trivy:` top-level key only contains runtime/scanner settings (image, replicas, severity, etc.), not storage configuration.
- **What was changed:** Replaced the incorrect YAML with the correct `persistence.persistentVolumeClaim.trivy` structure, which is where Trivy persistence is configured in the Harbor Helm chart. Updated the explanatory text to clarify this belongs in the `persistence.persistentVolumeClaim` section.
- **Why:** The Harbor Helm chart (verified in goharbor/harbor-helm values.yaml) places all PVC configuration under `persistence.persistentVolumeClaim.<component>`. Using the incorrect path would result in the values being silently ignored and Trivy using emptyDir storage instead.

## Review Notes
- **Unused Kubernetes secret (Step 2):** The post creates a secret `harbor-s3-credentials` with keys `accesskey` and `secretkey`, but this secret is never referenced in the Helm values. The S3 credentials are instead hardcoded directly in the values file under `persistence.imageChartStorage.s3`. The Harbor chart does support `existingSecret` for S3 credentials (requiring keys `REGISTRY_STORAGE_S3_ACCESSKEY` and `REGISTRY_STORAGE_S3_SECRETKEY`), but the post doesn't use this feature. The unused secret is harmless but may confuse readers.
- **Registry PVC configuration is a no-op (Step 4):** The Helm values include `persistence.persistentVolumeClaim.registry` with a storageClass and size, but when `imageChartStorage.type` is set to `s3`, the Harbor chart does not create a registry PVC at all (the template has an explicit conditional). This configuration is silently ignored. It is not harmful but may give the false impression that a registry PVC is provisioned.
- **Hardcoded credentials:** The post uses plaintext access keys and passwords throughout. While acceptable for a tutorial, a production note recommending Kubernetes secrets or external secret management would be beneficial.
- **Helm chart version:** The post pins to `--version 1.15.0` which corresponds to Harbor v2.11.x. The values structure has been verified against this version. Future chart versions may change the values schema.
