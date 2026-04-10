# Validation Summary: How to Set Up Cloud Transition for Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Ceph cloud transition (cloud-s3 tier)
- radosgw-admin CLI
- AWS S3 API (via aws s3api CLI)
- S3-compatible object storage lifecycle rules

## Sources Consulted
- Ceph official documentation — Cloud Transition: https://docs.ceph.com/en/latest/radosgw/cloud-transition/
- Ceph official documentation — Cloud Restore: https://docs.ceph.com/en/latest/radosgw/cloud-restore/
- Ceph official documentation — Placement Targets: https://docs.ceph.com/en/latest/radosgw/placement/

## Issues Found

1. **Step 1 used incorrect commands to configure cloud transition (critical)**
   - **What was wrong:** The post used `radosgw-admin zone create --tier-type cloud-s3` to create a new zone, followed by `radosgw-admin zone placement modify` to configure it. Cloud transition does not involve creating a new zone. It is configured by adding a storage class with `--tier-type=cloud-s3` to an existing zonegroup placement.
   - **What was changed:** Replaced the two commands with `radosgw-admin zonegroup placement add` (to add the storage class) and `radosgw-admin zonegroup placement modify` (to configure the tier-config with remote S3 credentials). Updated section title from "Configure the Remote Cloud Zone" to "Configure the Cloud Storage Class."
   - **Why:** The official Ceph docs explicitly state that cloud-s3 storage classes are defined in terms of zonegroup placement targets and do not need a data pool or a separate zone.

2. **Architecture Overview incorrectly claimed transparent reads (critical)**
   - **What was wrong:** Point 4 stated "Reads of transitioned objects are transparently fetched from the remote (or restored locally)."
   - **What was changed:** Corrected to state that accessing transitioned object data requires an explicit restore operation via the S3 RestoreObject API.
   - **Why:** Per Ceph docs, a GET on a transitioned object returns `403 InvalidObjectState`. Transparent read-through is only available if `allow_read_through=true` is explicitly configured (not the default).

3. **GLACIER storage class mapping claim was incorrect (moderate)**
   - **What was wrong:** The note stated "RGW maps the GLACIER storage class to the cloud-s3 tier for transition purposes," implying automatic mapping.
   - **What was changed:** Clarified that the StorageClass in the lifecycle rule must match the user-defined storage class name from the zonegroup placement configuration. RGW does not automatically map any storage class names.
   - **Why:** Storage class names are entirely user-defined when creating the cloud-s3 tier. There is no built-in mapping.

4. **"Accessing Transitioned Objects" section incorrectly described transparent access (critical)**
   - **What was wrong:** The section claimed objects are "fetched transparently from the remote store on GET" by default, and that restore is only needed when `retain_head_object=false`.
   - **What was changed:** Replaced with correct information: GET returns 403, RestoreObject API must be used, and `retain_head_object=true` is a prerequisite for restore to work. Added a working `aws s3api restore-object` command example.
   - **Why:** Per Ceph docs, even with `retain_head_object=true`, GET operations fail with `InvalidObjectState`. The `retain_head_object` flag controls metadata retention, not data read access.

## Review Notes
- The `allow_read_through` tier-config option (available in newer Ceph versions) can enable transparent GET access to transitioned objects, but this is not the default and was not mentioned. This could be a useful addition in a future update.
- The `--tier-type=cloud-s3-glacier` variant exists for transitioning to S3 Glacier-class storage on the remote end (using multipart upload with Glacier storage class), which differs from `cloud-s3`. The post doesn't distinguish these, which is fine for an introductory tutorial.
- The `period update --commit` step is only needed in multisite configurations. In single-site setups, it's a no-op but harmless. The post could clarify this in a future update.
