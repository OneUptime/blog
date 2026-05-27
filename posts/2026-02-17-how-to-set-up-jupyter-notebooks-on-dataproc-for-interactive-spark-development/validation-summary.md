# Validation Summary: How to Set Up Jupyter Notebooks on Dataproc for Interactive Spark Development

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Dataproc / Managed Service for Apache Spark
- JupyterLab and Jupyter notebooks
- Apache Spark and PySpark
- Spark BigQuery connector
- Google Cloud Storage
- Google Cloud CLI
- Dataproc initialization actions
- Python visualization libraries

## Sources Consulted
- Google Cloud Dataproc optional Jupyter component documentation: https://docs.cloud.google.com/dataproc/docs/concepts/components/jupyter
- Google Cloud Dataproc Component Gateway documentation: https://docs.cloud.google.com/dataproc/docs/concepts/accessing/dataproc-gateways
- Google Cloud SDK `gcloud dataproc clusters create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/dataproc/clusters/create
- Google Cloud Dataproc cluster image version list: https://docs.cloud.google.com/dataproc/docs/concepts/versioning/dataproc-version-clusters
- Google Cloud Dataproc cluster properties documentation: https://docs.cloud.google.com/dataproc/docs/concepts/configuring-clusters/cluster-properties
- Google Cloud Dataproc initialization actions documentation: https://docs.cloud.google.com/dataproc/docs/concepts/configuring-clusters/init-actions
- GoogleCloudDataproc initialization-actions Python README: https://raw.githubusercontent.com/GoogleCloudDataproc/initialization-actions/master/python/README.md
- Google Cloud Spark BigQuery connector documentation: https://docs.cloud.google.com/dataproc/docs/tutorials/bigquery-connector-spark-example
- Apache Spark PySpark DataFrame API documentation: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/dataframe.html
- Apache Spark SQL performance tuning documentation: https://spark.apache.org/docs/3.5.4/sql-performance-tuning.html
- Sparkmagic project documentation for PySpark kernels and `%%sql`: https://github.com/jupyter-incubator/sparkmagic

## Issues Found
- The cluster creation examples used `--image-version=2.1-debian11`. As of 2026-05-27, Dataproc image `2.1-debian11` is past its supported-until date of 2026-03-31, so the examples now use supported GA image `2.3-debian12`.
- The post said `--bucket` specifies where notebooks are stored and showed `gs://my-notebooks-bucket/notebooks/jupyter/` as the notebook path. Official Dataproc documentation says `--bucket` sets the staging bucket, while the Jupyter notebook directory is controlled with the `dataproc:jupyter.notebook.gcs.dir` cluster property. I updated the command, flag explanation, and notebook persistence section accordingly.

## Review Notes
- The BigQuery example relies on the Spark BigQuery connector, which is available for Dataproc image versions 2.1 and later; using image 2.3 keeps that example valid.
- Installing notebook packages with the `PIP_PACKAGES` metadata key and `python/pip-install.sh` initialization action remains consistent with the GoogleCloudDataproc initialization-actions documentation. For production, package versions should be pinned for reproducibility.
