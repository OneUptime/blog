# Validation Summary: How to Run Hive Queries on Dataproc with the Hive Metastore

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Dataproc
- Dataproc Metastore
- Apache Hive and HiveQL
- Hive WebHCat
- Beeline and HiveServer2
- Google Cloud Storage
- Google Cloud CLI

## Sources Consulted
- Google Cloud SDK reference: gcloud metastore services create: https://docs.cloud.google.com/sdk/gcloud/reference/metastore/services/create
- Dataproc Metastore guide: Create a Dataproc Metastore service: https://docs.cloud.google.com/dataproc-metastore/docs/create-service
- Dataproc Metastore guide: Attach a cluster: https://docs.cloud.google.com/dataproc-metastore/docs/attach-dataproc
- Google Cloud SDK reference: gcloud dataproc jobs submit hive: https://docs.cloud.google.com/sdk/gcloud/reference/dataproc/jobs/submit/hive
- Dataproc optional Hive WebHCat component: https://cloud.google.com/dataproc/docs/concepts/components/hivewebhcat
- Dataproc services documentation: https://docs.cloud.google.com/dataproc/docs/concepts/services
- Dataproc 2.1 image release versions: https://cloud.google.com/dataproc/docs/concepts/versioning/dataproc-release-2.1
- Dataproc 2.2 image release versions: https://cloud.google.com/dataproc/docs/concepts/versioning/dataproc-release-2.2
- Apache Hive LanguageManual DDL: https://hive.apache.org/docs/latest/language/languagemanual-ddl/
- Apache Hive LanguageManual Select: https://hive.apache.org/docs/latest/language/languagemanual-select/

## Issues Found
- The post said Dataproc has only two Hive metastore choices. Google documents the local cluster metastore, Dataproc Metastore, and Cloud SQL as metastore database options. I updated the section to list three options and clarified that the local metastore is tied to the cluster lifecycle.
- The post described `HIVE_WEBHCAT` as enabling the HiveServer2 web interface. Google documents Hive WebHCat as a REST API for HCatalog, available on the cluster's first master node. I corrected the description.
- The metastore tier examples used uppercase `DEVELOPER` and `ENTERPRISE`. The current gcloud reference documents the enum values as `developer` and `enterprise`, so I normalized the command and explanation to those values.

## Review Notes
- The local environment did not have `gcloud` installed, so command validation was done against the official Google Cloud CLI reference instead of local `--help` output.
- The examples use placeholder project and bucket names such as `my-project` and `my-data-bucket`; readers must replace them with real resources.
