# Validation Summary: How to Configure Dataproc Optional Components like Jupyter and Hive

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Google Cloud Dataproc
- Dataproc optional components
- Jupyter
- Hive and Hive WebHCat
- Dataproc Metastore
- Trino
- Zeppelin
- Google Cloud CLI

## Sources Consulted
- Google Cloud Dataproc optional components overview: https://cloud.google.com/dataproc/docs/concepts/components/overview
- Google Cloud Dataproc optional Jupyter component: https://cloud.google.com/dataproc/docs/concepts/components/jupyter
- Google Cloud Dataproc optional Hive WebHCat component: https://cloud.google.com/dataproc/docs/concepts/components/hivewebhcat
- Google Cloud Dataproc optional Trino component: https://cloud.google.com/dataproc/docs/concepts/components/trino
- Google Cloud Dataproc optional Zeppelin component: https://cloud.google.com/dataproc/docs/concepts/components/zeppelin
- Google Cloud Dataproc Component Gateway: https://cloud.google.com/dataproc/docs/concepts/accessing/dataproc-gateways
- Google Cloud Dataproc cluster properties: https://cloud.google.com/dataproc/docs/concepts/configuring-clusters/cluster-properties
- Google Cloud Dataproc Python environment configuration: https://cloud.google.com/dataproc/docs/tutorials/python-configuration
- Google Cloud Dataproc Metastore service creation: https://cloud.google.com/dataproc-metastore/docs/create-service
- Google Cloud Dataproc Metastore cluster attachment: https://cloud.google.com/dataproc-metastore/docs/attach-dataproc

## Issues Found
- The post described Hive as an optional component. Hive is installed on standard Dataproc images; the optional component is Hive WebHCat. Updated the terminology and examples to describe `HIVE_WEBHCAT` as the HCatalog REST API.
- The post used Presto examples for current/default clusters. Dataproc image versions 2.1 and later use Trino (`TRINO`) instead of Presto (`PRESTO`). Updated examples and descriptions to use Trino while noting the Presto relationship.
- Spark cluster properties omitted the required `spark:` file prefix. Updated `spark.jars.packages`, executor, and driver settings to use `spark:` prefixes.
- The Jupyter notebook persistence example used `jupyter:jupyter_notebook_dir`, which is not the current Dataproc property. Updated it to `dataproc:jupyter.notebook.gcs.dir`.
- The post said Jupyter notebooks are stored on the master node by default. Google Cloud documentation says Jupyter notebooks are saved in Cloud Storage in the Dataproc staging bucket by default. Updated the explanation.
- Python package installation used `PIP_PACKAGES` metadata. Updated examples to use the documented `dataproc:pip.packages` cluster property with an alternate delimiter for comma-separated package values.
- The Cloud SQL Hive metastore section used an unsupported/incomplete direct Cloud SQL JDBC pattern for Dataproc cluster creation. Replaced it with the supported Dataproc Metastore flow using `gcloud metastore services create` and `--dataproc-metastore`.
- The custom Jupyter example used an unsupported `jupyter:jupyter_port` property. Replaced it with a documented Jupyter notebook storage property and kept the Spark tuning settings.

## Review Notes
The Google Cloud CLI was not installed in the local environment, so command validation was performed against current official Google Cloud documentation rather than local `gcloud --help` output.
