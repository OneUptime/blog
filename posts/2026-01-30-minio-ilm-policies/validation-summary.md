# Validation Summary: How to Build MinIO ILM Policies

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- MinIO Object Lifecycle Management / ILM
- MinIO Client (`mc`)
- MinIO remote object tiering
- S3-compatible lifecycle configuration JSON
- Azure Blob Storage, Google Cloud Storage, and Amazon S3 as remote tiers
- Prometheus metrics for MinIO ILM monitoring

## Sources Consulted
- MinIO `mc ilm rule add` documentation: https://docs.min.io/aistor/reference/cli/mc-ilm-rule/mc-ilm-rule-add/
- MinIO `mc ilm rule ls` documentation: https://docs.min.io/aistor/reference/cli/mc-ilm-rule/mc-ilm-rule-ls/
- MinIO `mc ilm rule import` documentation: https://docs.min.io/aistor/reference/cli/mc-ilm-rule/mc-ilm-rule-import/
- MinIO `mc ilm rule export` documentation: https://docs.min.io/aistor/reference/cli/mc-ilm-rule/mc-ilm-rule-export/
- MinIO `mc ilm tier add` documentation: https://docs.min.io/aistor/reference/cli/mc-ilm-tier/mc-ilm-tier-add/
- MinIO `mc ilm tier info` documentation: https://docs.min.io/aistor/reference/cli/mc-ilm-tier/mc-ilm-tier-info/
- MinIO `mc ilm tier ls` documentation: https://docs.min.io/aistor/reference/cli/mc-ilm-tier/mc-ilm-tier-ls/
- MinIO `mc admin scanner status` documentation: https://docs.min.io/aistor/reference/cli/admin/mc-admin-scanner/mc-admin-scanner-status/
- MinIO Object Lifecycle Management documentation: https://docs.min.io/aistor/administration/object-lifecycle-management/
- MinIO metrics documentation: https://docs.min.io/aistor/operations/monitoring/metrics-and-alerts/
- AWS S3 lifecycle configuration examples: https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-configuration-examples.html

## Issues Found
- The post used `mc admin tier add`, `mc admin tier info`, and `mc admin tier ls`. Current MinIO documentation places remote tier commands under `mc ilm tier`, so these examples were changed to `mc ilm tier add`, `mc ilm tier info`, and `mc ilm tier ls`.
- The S3 remote tier example used the AWS Glacier storage class and a `GLACIER_TIER` name. MinIO tiering requires immediate object retrieval and documents supported S3 classes as `STANDARD`, `STANDARD-IA`, and `ONEZONE-IA`, so the examples now use `STANDARD-IA` and `S3_IA_TIER`.
- The Azure tier example used an archive-oriented tier name and omitted an access tier. MinIO supports Azure `Hot` and `Cool`, not Archive, so the example now uses `AZURE_COOL` and `--storage-class Cool`.
- The GCS tier example omitted the storage class while naming the tier `GCS_COLDLINE`. The example now explicitly sets `--storage-class COLDLINE`.
- The post implied unsupported generic S3-compatible remote tier targets such as Wasabi. MinIO documents supported tier targets as MinIO, Amazon S3, Google Cloud Storage, and Azure Blob Storage, so that wording was narrowed.
- Some diagrams and examples implied tiering directly to a local HDD pool. MinIO lifecycle tiering uses remote object storage tiers, so those references were clarified as a remote MinIO HDD-backed tier.
- The versioning examples combined `--expire-delete-marker` with object age expiration in single commands. Since expired delete marker cleanup is a separate expiration action and has S3 lifecycle constraints, the examples now show it as a separate rule.
- The lifecycle JSON placed `ExpiredObjectDeleteMarker` at the rule top level. In S3 lifecycle configuration it belongs inside the `Expiration` action, so the JSON was corrected.
- The listed Prometheus metric names (`minio_ilm_transition_count`, `minio_ilm_expiry_count`, and `minio_ilm_transition_failed_count`) did not match current MinIO metrics. They were replaced with documented ILM metrics such as `minio_ilm_transitioned_objects`, `minio_ilm_transitioned_versions`, `minio_ilm_action_count_delete`, and `minio_ilm_transition_missed_immediate_tasks`.
- The tier availability note referenced a nonexistent transition failure metric and said transitions fail silently. It now recommends monitoring documented pending and missed transition task metrics.

## Review Notes
The local environment did not have the `mc` binary installed, so command verification was performed against current official MinIO documentation rather than local `--help` output.
