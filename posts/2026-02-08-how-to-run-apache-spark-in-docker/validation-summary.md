# Validation Summary: How to Run Apache Spark in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Spark 3.5.1
- Docker and Docker Compose
- Spark Standalone master and worker processes
- Spark Shell, PySpark, and spark-submit
- Jupyter PySpark notebooks
- PostgreSQL JDBC access from Spark
- Delta Lake Python package

## Sources Consulted
- Apache Spark 3.5.1 submitting applications documentation: https://downloads.apache.org/spark/docs/3.5.1/submitting-applications.html
- Apache Spark 3.5.1 standalone cluster documentation: https://downloads.apache.org/spark/docs/3.5.1/spark-standalone.html
- Apache Spark 3.5.1 Python package installation documentation: https://downloads.apache.org/spark/docs/3.5.1/api/python/getting_started/install.html
- Apache Spark Docker image documentation and local inspection of `apache/spark:3.5.1`: https://hub.docker.com/r/apache/spark
- Jupyter Docker Stacks documentation: https://jupyter-docker-stacks.readthedocs.io/
- Delta Lake releases / Python package compatibility information: https://docs.delta.io/latest/releases.html
- PostgreSQL JDBC driver downloads: https://jdbc.postgresql.org/download/
- Docker CLI and Docker Compose local help/version output

## Issues Found
- The post used `apache/spark-py:3.5.1`, but that Docker image tag could not be resolved. Replaced it with the official `apache/spark:3.5.1` image, which includes Python and runs `/opt/spark/bin/pyspark` successfully.
- The Docker Compose example included `SPARK_MODE` and `SPARK_MASTER_URL` variables that are not used by the official Apache Spark image in this command-based setup. Removed those variables while keeping the explicit `spark-class` commands.
- The Jupyter service used `SPARK_MASTER`, which does not reliably configure PySpark notebooks to use the standalone cluster. Replaced it with `PYSPARK_SUBMIT_ARGS=--master spark://spark-master:7077 pyspark-shell`.
- The custom image installed `delta-spark` without a version pin, which can install a Delta Lake package line incompatible with Spark 3.5.1. Pinned it to `delta-spark==3.2.0`, a Spark 3.5-compatible line.
- The PostgreSQL JDBC example used an older 42.7.x driver filename. Updated the Dockerfile and Spark config consistently to `postgresql-42.7.11.jar`.
- The conclusion referred to the Spark UI on port 8080 for job execution. Corrected this to distinguish the Spark Master UI on port 8080 from the per-application Spark UI on port 4040.

## Review Notes
- I locally pulled and inspected `apache/spark:3.5.1`, confirmed the bundled `spark-examples_2.12-3.5.1.jar`, confirmed PySpark is available in that image, and ran the Compose master/worker setup with the bundled `SparkPi` job successfully.
- Docker Compose still accepts the `version: "3.8"` field, though recent Compose implementations treat it as obsolete metadata. This is not a functional error.
