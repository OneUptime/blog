# Validation Summary: How to Create GCP Dataproc Clusters with Terraform

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Terraform (HashiCorp Configuration Language)
- Google Cloud Platform (GCP)
- Google Cloud Dataproc (managed Apache Spark and Hadoop)
- Apache Spark
- Apache Hadoop / YARN / HDFS
- Google Cloud Storage (GCS) — staging bucket
- Google Cloud IAM (service accounts and roles)
- Google Compute Engine (n2 machine types, persistent disks)
- Dataproc Autoscaling Policies
- Dataproc Workflow Templates
- Dataproc Initialization Actions
- PySpark

## Sources Consulted
- Terraform Google provider `google_dataproc_cluster`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/dataproc_cluster
- Terraform Google provider `google_dataproc_autoscaling_policy`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/dataproc_autoscaling_policy
- Terraform Google provider `google_dataproc_job`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/dataproc_job
- Terraform Google provider `google_dataproc_workflow_template`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/dataproc_workflow_template
- GCP Dataproc Optional Components documentation: https://cloud.google.com/dataproc/docs/concepts/components/overview
- GCP Dataproc 2.1 image release notes: https://cloud.google.com/dataproc/docs/concepts/versioning/dataproc-release-2.1
- GCP Dataproc Initialization Actions docs: https://cloud.google.com/dataproc/docs/concepts/configuring-clusters/init-actions

## Issues Found
No technical issues found.

All resources, block names, and field names were verified against the official Terraform Google provider schema and match current documentation:
- `google_dataproc_cluster` blocks (`cluster_config`, `master_config`, `worker_config`, `software_config`, `gce_cluster_config`, `initialization_action` (singular, repeatable), `preemptible_worker_config`, `autoscaling_config`) are all correctly named.
- Optional components `JUPYTER` and `DOCKER` are valid values supported by Dataproc.
- `google_dataproc_autoscaling_policy` correctly uses `location` (not `region`) and the `basic_algorithm.yarn_config` fields (including `graceful_decommission_timeout` nested inside `yarn_config`) are accurate.
- `google_dataproc_job` `pyspark_config` and `force_delete` are valid.
- `google_dataproc_workflow_template` structure (`placement.managed_cluster.config`, `jobs.pyspark_job`) is correct — note `pyspark_job` is the correct sub-block name for workflow template jobs (different from `pyspark_config` on `google_dataproc_job`); the post uses both correctly.
- Init-action bucket pattern `gs://goog-dataproc-initialization-actions-<REGION>/connectors/connectors.sh` is the correct Google-hosted path.
- Machine types (`n2-standard-4`, `n2-standard-8`, `n2-highmem-8`) and disk types (`pd-ssd`, `pd-standard`) are valid.

## Review Notes
- Image version `2.1-debian11` is still supported as of May 2026, but the 2.2 series (e.g., `2.2-debian12`) is now Google's preferred current image series. Dataproc 1.x and 2.0 image versions reach end of support on Aug 25, 2026. Authors may wish to consider updating to `2.2-debian12` in a future revision, though `2.1-debian11` is not yet incorrect.
- The IAM resource `bigquery_user` is named loosely — it actually grants `roles/bigquery.dataEditor`. This is a naming inconsistency in the example but not a technical error, and was left as-is per the "only fix technical errors" guideline.
- For production use, Google recommends copying Google-hosted initialization-action scripts (`goog-dataproc-initialization-actions-<REGION>`) to a versioned private bucket to avoid surprise changes. The post does not mention this caveat but its guidance is otherwise sound.
- The "about 90 seconds" cluster creation figure is roughly accurate for small clusters but real-world provisioning often takes 2–3 minutes; this is a reasonable approximation.
