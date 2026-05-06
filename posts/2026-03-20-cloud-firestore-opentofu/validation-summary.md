# Validation Summary: How to Configure Cloud Firestore with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / HCL
- Google Cloud Firestore
- Google Cloud IAM
- Google provider resources for Firestore (`google_firestore_database`, `google_firestore_index`, `google_firestore_backup_schedule`, `google_project_iam_member`)

## Sources Consulted
- [google_firestore_database resource docs](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/firestore_database)
- [google_firestore_index resource docs](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/firestore_index)
- [google_firestore_backup_schedule resource docs](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/firestore_backup_schedule)
- [google_firestore_field resource docs](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/firestore_field)
- [Create and manage databases](https://cloud.google.com/firestore/native/docs/manage-databases)
- [Firestore locations](https://cloud.google.com/firestore/native/docs/locations)
- [Back up and restore data](https://cloud.google.com/firestore/native/docs/backups)
- [Manage indexes in Cloud Firestore](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Firestore roles and permissions](https://cloud.google.com/iam/docs/roles-permissions/firestore)
- Verified author link: [https://github.com/nawazdhandala](https://github.com/nawazdhandala)

## Issues Found
1. **Invalid Firestore location ID**: The post used `location_id = "us-central"` for `google_firestore_database`. Firestore database locations use region or multi-region IDs such as `us-central1`, `us-east1`, or `nam5`. Updated the example to `us-central1`.
2. **Point-in-time recovery was described imprecisely**: The post wording around `point_in_time_recovery_enablement` implied PITR was a backup feature. Firestore documents PITR and scheduled backups as separate disaster-recovery features, so the PITR wording was corrected to describe short-term recovery rather than backups.
3. **TTL comment did not match the code**: The post labeled `app_engine_integration_mode = "DISABLED"` as a TTL policy. TTL is configured separately on a field, typically with `google_firestore_field` and `ttl_config {}`. The comment was corrected to describe App Engine integration instead.
4. **Description conflated IAM with Security Rules**: The post description referred to "IAM security rules", but the example uses project IAM (`google_project_iam_member` with `roles/datastore.user`), not Firestore Security Rules. Updated the description to say IAM access control.

## Review Notes
- The `google_firestore_index` examples are technically valid. Composite indexes use `google_firestore_index`, while TTL and single-field settings are managed separately with `google_firestore_field`.
- The backup schedule example is valid and uses the documented maximum retention value of `8467200s` (14 weeks / 98 days).
- The named-database claim is correct. Firestore supports multiple databases per project; Google Cloud documentation currently documents a default limit of 100 databases per project.
- The IAM example is valid for granting application-level read/write access through `roles/datastore.user`, but it is IAM-based access control, not Firestore Security Rules.
