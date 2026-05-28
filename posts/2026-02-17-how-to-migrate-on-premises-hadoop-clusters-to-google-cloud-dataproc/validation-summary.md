# Validation Summary: How to Migrate On-Premises Hadoop Clusters to Google Cloud Dataproc

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Cloud Dataproc
- Dataproc Metastore
- Cloud Storage
- Storage Transfer Service
- Cloud SQL for MySQL
- Cloud Scheduler
- Hadoop HDFS, DistCp, YARN
- Hive and Hive Metastore
- Spark and PySpark
- Oozie

## Sources Consulted
- Google Cloud SDK reference: `gcloud transfer jobs create` - https://cloud.google.com/sdk/gcloud/reference/transfer/jobs/create
- Google Cloud SDK reference: `gcloud dataproc clusters create` - https://cloud.google.com/sdk/gcloud/reference/dataproc/clusters/create
- Dataproc image version lists - https://cloud.google.com/dataproc/docs/concepts/versioning/dataproc-version-clusters
- Dataproc autoscaling documentation - https://cloud.google.com/dataproc/docs/concepts/configuring-clusters/autoscaling
- Google Cloud SDK reference: `gcloud dataproc autoscaling-policies import` - https://cloud.google.com/sdk/gcloud/reference/dataproc/autoscaling-policies/import
- Google Cloud SDK reference: `gcloud dataproc jobs submit spark` - https://cloud.google.com/sdk/gcloud/reference/dataproc/jobs/submit/spark
- Google Cloud SDK reference: `gcloud dataproc workflow-templates add-job spark` - https://cloud.google.com/sdk/gcloud/reference/dataproc/workflow-templates/add-job/spark
- Google Cloud SDK reference: `gcloud scheduler jobs create http` - https://cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- Dataproc Workflow Templates REST API: instantiate - https://cloud.google.com/dataproc/docs/reference/rest/v1/projects.regions.workflowTemplates/instantiate
- Dataproc workflow using Cloud Scheduler tutorial - https://cloud.google.com/dataproc/docs/tutorials/workflow-scheduler
- Dataproc Metastore version support - https://cloud.google.com/dataproc-metastore/docs/version-policy
- Google Cloud SDK reference: `gcloud metastore services create` - https://cloud.google.com/sdk/gcloud/reference/metastore/services/create

## Issues Found
- The Storage Transfer Service command used unsupported `--source-directory` and `--destination-bucket` flags. I changed it to the documented positional `SOURCE DESTINATION` form with an HDFS source URI and `--source-agent-pool`.
- The Dataproc batch cluster used image version `2.1-debian11`, which is past its support date as of this review. I updated it to the current supported GA image family `2.3-debian12`.
- The autoscaling policy example used `gcloud dataproc autoscaling-policies create` with flags that are not part of the current CLI. I replaced it with a YAML autoscaling policy and the documented `gcloud dataproc autoscaling-policies import` command.
- The Cloud SQL Hive metastore JDBC URL contained `<hive_metastore>` as a literal-looking placeholder in the database portion of the URL. I changed it to `hive_metastore`.
- The Dataproc Metastore service tier was shown as `DEVELOPER`; the current CLI documents lowercase `developer` and `enterprise` values. I changed it to `developer`.
- The workflow-template Spark step used `--jars` for the main application jar. The current workflow-template command expects `--jar` with `--class` for the main jar, so I changed it to `--jar`.
- The Cloud Scheduler command omitted the required location, did not include the empty JSON request body shown in the Dataproc scheduler guidance, and omitted the `alt=json` API URL suffix used in the official tutorial. I added `--location us-central1`, `--message-body "{}"`, and updated the URL.

## Review Notes
The post is technically relevant and implementation-oriented. I could not verify commands against a local `gcloud` installation because the CLI is not installed in this workspace, so validation was performed against current official Google Cloud documentation.
