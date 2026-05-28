# Validation Summary: How to Configure Custom Containers for Dataproc Serverless Spark Jobs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Dataproc Serverless / Managed Service for Apache Spark
- Custom Docker containers
- Artifact Registry
- Cloud Build
- PySpark
- Shapely, GeoPandas, GDAL, TensorFlow, PyArrow
- Docker Buildx

## Sources Consulted
- Google Cloud Managed Service for Apache Spark custom containers documentation: https://cloud.google.com/dataproc-serverless/docs/guides/custom-containers
- Google Cloud SDK `gcloud dataproc batches submit pyspark` reference: https://cloud.google.com/sdk/gcloud/reference/dataproc/batches/submit/pyspark
- Google Cloud Artifact Registry repository creation documentation: https://cloud.google.com/artifact-registry/docs/repositories/create-repos
- Google Cloud Build substitutions documentation: https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Docker Buildx build reference: https://docs.docker.com/reference/cli/docker/buildx/build/
- Apache Spark 3.5 configuration reference: https://spark.apache.org/docs/3.5.4/configuration.html
- Shapely `within` predicate documentation: https://shapely.readthedocs.io/en/2.0.5/reference/shapely.within.html

## Issues Found
- The post incorrectly said Dataproc Serverless custom containers must be based on a Google-provided Spark base image. Current Google documentation says custom images can use an OS base image, and Spark plus Java are mounted by the service at runtime. Updated the base-image guidance and Dockerfile examples accordingly.
- The Dockerfile copied files into Spark directories and set Spark-related paths as if Spark were part of the image. Updated the examples to avoid bundling Spark, to use `SPARK_EXTRA_CLASSPATH` for custom jars, and to set `PYSPARK_PYTHON` for the custom Python runtime.
- The Dockerfile guidance said the container must run as the `spark` user. Current documentation says the service runs containers as UID/GID 1099 and ignores Dockerfile `USER` directives at runtime. Updated the guidance to create the expected user and focus on file permissions.
- The Spark configuration section baked `spark-defaults.conf` into the image. Current documentation says Spark configs are mounted into `/etc/spark/conf` at runtime, overriding existing files. Updated the section to pass Spark properties during batch submission instead.
- The geospatial PySpark example referenced `some_polygon`, which was undefined and would fail at runtime. Replaced it with a simple Shapely `Polygon` definition.
- The image optimization Dockerfile used the outdated Spark base image. Updated it to use a Python slim base image with the required Dataproc Serverless utility packages and runtime user setup.
- Several wording claims implied full control over the entire runtime. Updated them to clarify that custom containers control added workload dependencies while Spark and Java remain managed by Dataproc Serverless.

## Review Notes
The `gcloud` CLI was not installed in the local environment, so CLI flag validation was performed against the official Google Cloud SDK reference. The examples remain illustrative and use placeholder project, bucket, service account, and subnet values that must be replaced before use.
