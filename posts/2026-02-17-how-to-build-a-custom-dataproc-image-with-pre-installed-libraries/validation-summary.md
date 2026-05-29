# Validation Summary: How to Build a Custom Dataproc Image with Pre-Installed Libraries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Dataproc / Managed Service for Apache Spark
- Dataproc custom images
- Google Cloud CLI
- Cloud Build
- Apache Spark
- Delta Lake
- Spark BigQuery connector
- Python packaging with pip
- Bash scripting

## Sources Consulted
- Google Cloud documentation: Create a Managed Service for Apache Spark custom image - https://docs.cloud.google.com/dataproc/docs/guides/dataproc-images
- Google Cloud documentation: Managed Service for Apache Spark cluster image version lists - https://docs.cloud.google.com/dataproc/docs/concepts/versioning/dataproc-version-clusters
- Google Cloud documentation: 2.3.x release image versions - https://docs.cloud.google.com/dataproc/docs/concepts/versioning/dataproc-release-2.3
- Google Cloud SDK documentation: gcloud dataproc clusters create - https://docs.cloud.google.com/sdk/gcloud/reference/dataproc/clusters/create
- Google Cloud documentation: Use the Spark BigQuery connector - https://docs.cloud.google.com/dataproc/docs/tutorials/bigquery-connector-spark-example
- Google Cloud SDK documentation: Google Cloud CLI Docker image - https://docs.cloud.google.com/sdk/docs/downloads-docker
- Google Cloud Build documentation: Cloud builders - https://cloud.google.com/build/docs/cloud-builders
- GoogleCloudDataproc/custom-images official repository and generate_custom_image.py help output - https://github.com/GoogleCloudDataproc/custom-images
- PyPI package index checks for the pinned Python package versions.

## Issues Found
- The post used `2.1.27-debian11`, which is no longer a supported Dataproc image version as of the validation date. Updated the examples to `2.3.30-debian12`, a current supported 2.3 Debian image version.
- The post manually downloaded a Spark 3.3 BigQuery connector JAR and Delta Lake 2.4.0 JARs. Dataproc 2.3 includes a compatible Spark BigQuery connector, and Delta Lake is supported as the `DELTA` optional component. Removed the manual JAR downloads and added `--optional-components=DELTA` to image build and cluster creation examples.
- The Cloud Build example used the plain `python:3.9` image, but `generate_custom_image.py` requires the Google Cloud CLI. Changed the build step to use `gcr.io/google.com/cloudsdktool/google-cloud-cli:stable`.
- The smoke test only set a Spark configuration and did not actually verify Delta Lake functionality. Updated it to write and read a small Delta dataset.
- The changelog referenced the outdated Dataproc base image and connector versions. Updated those entries to match the corrected examples.

## Review Notes
- Google documentation now presents Dataproc cluster deployments under the Managed Service for Apache Spark name, but the `gcloud dataproc` commands remain valid.
- Dataproc custom images can only be used to create new clusters for 365 days after image creation. The post already discusses image lifecycle management, but future revisions could call out the 365-day limit explicitly.
- `gcloud` was not installed in the local environment, so CLI validation was done against the official Google Cloud SDK command reference and the official custom-images script help output.
