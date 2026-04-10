# Validation Summary: How to Create BucketAccess with COSI in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (COSI driver)
- COSI (Container Object Storage Interface) — Kubernetes SIG Storage
- Kubernetes CRDs: BucketAccess, BucketClaim, BucketAccessClass
- Ceph RGW (RADOS Gateway) for S3 object storage

## Sources Consulted
- kubernetes-sigs/container-object-storage-interface-api — Go type definitions (`apis/objectstorage/v1alpha1/types.go`) and CRD YAML (`crds/objectstorage.k8s.io_bucketaccesses.yaml`)
- kubernetes-sigs/container-object-storage-interface-provisioner-sidecar — Secret creation logic (`pkg/bucketaccess/bucketaccess_controller.go`)
- kubernetes-sigs/container-object-storage-interface-api — BucketInfo struct definition (`apis/bucket_info.go`)
- Rook COSI driver source in rook/rook repository

## Issues Found

### 1. `protocol` field incorrectly marked as Required with wrong enum values
**What was wrong:** The spec fields table listed `protocol` as Required with values `s3`, `azure`, `gcs`. In the COSI API types, `protocol` is marked `+optional` and is not in the CRD's `required` list. The correct enum values are `S3`, `Azure`, `GCP` (capitalized, and `GCP` not `gcs`).
**What was changed:** Updated the table to show `protocol` as Optional (No) with correct values `S3`, `Azure`, `GCP` and a note about the default behavior. Updated all YAML examples to use `S3` instead of `s3`.

### 2. Secret format fundamentally incorrect
**What was wrong:** The blog described the generated Secret as having top-level keys `AccessKeyID`, `SecretAccessKey`, `BucketName`, and `Endpoint`, and showed a pod example using `secretKeyRef` to access them individually. The COSI provisioner sidecar actually creates a Secret with a single key `BucketInfo` containing a JSON-serialized `BucketInfo` object. The nested field names also differ (e.g., `accessKeyID` not `AccessKeyID`, `accessSecretKey` not `SecretAccessKey`).
**What was changed:** Replaced the Secret description with the correct `BucketInfo` JSON structure. Rewrote the pod example to mount the Secret as a volume and parse the JSON, since individual `secretKeyRef` lookups cannot work with the single-key JSON format.

### 3. Cross-namespace BucketAccess example would fail
**What was wrong:** The multi-application example showed BucketAccess resources in different namespaces (`service-a-ns`, `service-b-ns`) referencing a BucketClaim named `shared-bucket`. The COSI sidecar resolves `bucketClaimName` in the same namespace as the BucketAccess, so cross-namespace references fail with "not found".
**What was changed:** Updated the example to place both BucketAccess resources in the same namespace (`my-app`) as the BucketClaim, and added a note that cross-namespace references are not supported.

### 4. Minor: "Status conditions" terminology
**What was wrong:** The status fields `accessGranted` and `accountID` were described as "Status conditions to look for." These are plain status fields on `BucketAccessStatus`, not Kubernetes-style `conditions` arrays.
**What was changed:** Changed "Status conditions to look for" to "Status fields to look for."

## Review Notes
- COSI is still at v1alpha1, so the API may change in future releases. The post should be revisited when COSI reaches beta or GA.
- The pod example for consuming the BucketInfo Secret uses sed-based JSON parsing for simplicity. In production, applications should use a proper JSON parser (e.g., `jq` or application-level JSON parsing).
