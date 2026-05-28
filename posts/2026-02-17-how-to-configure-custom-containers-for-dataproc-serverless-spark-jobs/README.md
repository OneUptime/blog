# How to Configure Custom Containers for Dataproc Serverless Spark Jobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud Dataproc, Serverless, Docker, Custom Containers

Description: Build and configure custom Docker containers for Dataproc Serverless Spark jobs to include specific dependencies, libraries, and runtime configurations.

---

Dataproc Serverless provides a default runtime environment with common libraries pre-installed. But what happens when your PySpark job needs a specific version of TensorFlow, a compiled C extension, or a proprietary library that is not available through pip? The default environment falls short.

Custom containers solve this. You build a Docker image with exactly the dependencies you need, push it to Artifact Registry, and tell Dataproc Serverless to use it as the runtime for your Spark jobs. Your jobs run with the exact same added dependencies every time, while Dataproc Serverless still mounts the managed Spark and Java runtime.

## Why Custom Containers

There are several scenarios where custom containers are the right approach.

Your job depends on compiled native libraries (like GDAL for geospatial processing, or OpenCV for image processing) that cannot be installed via pip alone.

You need a specific Python version that differs from the default runtime.

Your organization has proprietary packages distributed as internal wheels or conda packages.

You want reproducible builds. A Dockerfile pins every dependency explicitly, so your job behaves the same today as it will six months from now.

## The Base Image

Dataproc Serverless custom containers can use your own Linux base image. Do not install Spark, Hadoop, or Java in the image; Dataproc Serverless mounts the supported Spark runtime into the container at job startup. The image does need basic Linux utilities required by the runtime, including `procps` and `tini`. Google's examples also install `libjemalloc2` and enable it as the default memory allocator.

```bash
# Use a Linux base image that matches the CPU architecture used by Dataproc Serverless.
# The examples below use Debian 12 through the official Python slim image.
docker pull python:3.11-slim-bookworm
```

Choose a Python version supported by the Dataproc Serverless runtime you submit the job with, and keep the container architecture compatible with Dataproc Serverless.

## Building a Custom Container

Here is a Dockerfile that builds a custom runtime image with additional dependencies.

```dockerfile
# Dockerfile for custom Dataproc Serverless container
# Start from a Linux base image. Dataproc Serverless mounts Spark at runtime.
FROM python:3.11-slim-bookworm

# Switch to root for installations
USER root

# Install system-level dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    procps \
    tini \
    libjemalloc2 \
    libgdal-dev \
    gdal-bin \
    libproj-dev \
    libgeos-dev \
    libspatialindex-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
# Pin all versions for reproducibility
RUN pip3 install --no-cache-dir \
    pandas==2.1.0 \
    numpy==1.25.0 \
    scikit-learn==1.3.0 \
    tensorflow==2.14.0 \
    pyarrow==13.0.0 \
    geopandas==0.14.0 \
    shapely==2.0.1 \
    fiona==1.9.4 \
    rasterio==1.3.8 \
    google-cloud-bigquery==3.12.0 \
    google-cloud-storage==2.11.0

# Copy any custom JARs needed by Spark
COPY jars/ /opt/custom-jars/
ENV SPARK_EXTRA_CLASSPATH="/opt/custom-jars/*"

# Create the user Dataproc Serverless expects inside the container
RUN groupadd -g 1099 spark && \
    useradd -u 1099 -g 1099 -d /home/spark -m spark && \
    chown -R spark:spark /opt/custom-jars

# Set file ownership checks to match the runtime Spark user
USER spark

# Set environment variables
ENV PYSPARK_PYTHON="/usr/local/bin/python"
ENV LD_PRELOAD="/usr/lib/x86_64-linux-gnu/libjemalloc.so.2"
ENV GDAL_DATA="/usr/share/gdal"
```

## Creating the Spark Configuration

Pass Spark configuration as batch properties when you submit the job. Dataproc Serverless mounts Spark and its configuration into the container at runtime, so a `spark-defaults.conf` file baked into the image is not the reliable way to configure a serverless batch.

```bash
# Custom Spark settings passed at submit time
--properties="\
spark.serializer=org.apache.spark.serializer.KryoSerializer,\
spark.sql.adaptive.enabled=true,\
spark.sql.adaptive.coalescePartitions.enabled=true,\
spark.sql.adaptive.skewJoin.enabled=true,\
spark.hadoop.mapreduce.fileoutputcommitter.algorithm.version=2"
```

## Building and Pushing the Image

Build the Docker image and push it to Google Artifact Registry.

```bash
# Create an Artifact Registry repository if you do not have one
gcloud artifacts repositories create dataproc-images \
  --repository-format=docker \
  --location=us-central1 \
  --description="Custom Dataproc Serverless images"

# Build the Docker image
docker build -t us-central1-docker.pkg.dev/my-project/dataproc-images/spark-custom:v1.0 .

# Push to Artifact Registry
docker push us-central1-docker.pkg.dev/my-project/dataproc-images/spark-custom:v1.0
```

If you are building on a Mac with Apple Silicon, make sure to build for the correct platform.

```bash
# Build for amd64 (required for Dataproc Serverless)
docker buildx build \
  --platform linux/amd64 \
  -t us-central1-docker.pkg.dev/my-project/dataproc-images/spark-custom:v1.0 \
  --push .
```

## Submitting Jobs with Custom Containers

Reference your custom container when submitting a batch job.

```bash
# Submit a PySpark job using the custom container
gcloud dataproc batches submit pyspark \
  gs://my-bucket/jobs/geospatial_analysis.py \
  --region=us-central1 \
  --subnet=default \
  --service-account=my-sa@my-project.iam.gserviceaccount.com \
  --container-image=us-central1-docker.pkg.dev/my-project/dataproc-images/spark-custom:v1.0 \
  --properties="\
spark.executor.memory=8g,\
spark.executor.cores=4,\
spark.dynamicAllocation.maxExecutors=20" \
  -- --input=gs://my-bucket/geodata/ \
     --output=gs://my-bucket/results/
```

The `--container-image` flag tells Dataproc Serverless to use your custom image instead of the default runtime.

## Example: Geospatial Processing Job

Here is a PySpark job that uses libraries only available through the custom container.

```python
# geospatial_analysis.py - Requires GDAL, geopandas from custom container
from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import StructType, StructField, StringType, DoubleType
import argparse

def process_geospatial(spark, input_path, output_path):
    """Process geospatial data using libraries from custom container."""

    # Read raw location data
    locations = spark.read.parquet(f"{input_path}/locations/")

    # Register a UDF that uses geopandas (from custom container)
    @F.udf(returnType=StringType())
    def reverse_geocode(lat, lon):
        """Convert lat/lon to a region name using shapely."""
        from shapely.geometry import Point, Polygon

        # Create a point from coordinates
        point = Point(lon, lat)
        region_a = Polygon([
            (-125.0, 24.0),
            (-66.0, 24.0),
            (-66.0, 50.0),
            (-125.0, 50.0),
            (-125.0, 24.0),
        ])

        # Simple region classification based on coordinates
        # In production, this would use actual boundary data
        if point.within(region_a):
            return "Region A"
        return "Unknown"

    # Apply geospatial processing
    enriched = locations \
        .withColumn("region",
            reverse_geocode(F.col("latitude"), F.col("longitude")))

    # Compute statistics per region
    region_stats = enriched.groupBy("region").agg(
        F.count("*").alias("point_count"),
        F.avg("latitude").alias("centroid_lat"),
        F.avg("longitude").alias("centroid_lon")
    )

    # Write results
    region_stats.write \
        .mode("overwrite") \
        .parquet(f"{output_path}/region_stats/")

    print(f"Processed {enriched.count()} locations into {region_stats.count()} regions")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    spark = SparkSession.builder \
        .appName("GeospatialAnalysis") \
        .getOrCreate()

    # Verify custom libraries are available
    import geopandas
    import shapely
    print(f"geopandas version: {geopandas.__version__}")
    print(f"shapely version: {shapely.__version__}")

    process_geospatial(spark, args.input, args.output)
    spark.stop()

if __name__ == "__main__":
    main()
```

## Automating Image Builds with Cloud Build

Automate the container build process with Cloud Build.

```yaml
# cloudbuild.yaml - Build and push custom Dataproc container
steps:
  # Build the Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/dataproc-images/spark-custom:${SHORT_SHA}'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/dataproc-images/spark-custom:latest'
      - '.'

  # Push both tags
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '--all-tags', 'us-central1-docker.pkg.dev/$PROJECT_ID/dataproc-images/spark-custom']

  # Run a smoke test to verify the image works
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'dataproc'
      - 'batches'
      - 'submit'
      - 'pyspark'
      - 'gs://${PROJECT_ID}-dataproc/tests/smoke_test.py'
      - '--region=us-central1'
      - '--subnet=default'
      - '--container-image=us-central1-docker.pkg.dev/$PROJECT_ID/dataproc-images/spark-custom:${SHORT_SHA}'
    timeout: '600s'

images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/dataproc-images/spark-custom:${SHORT_SHA}'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/dataproc-images/spark-custom:latest'

timeout: '1800s'
```

## Image Size Optimization

Large images take longer to pull when Dataproc Serverless starts your job. Keep your images lean.

```dockerfile
# Use multi-stage build to reduce final image size
FROM python:3.10-slim AS builder

# Install build dependencies and compile packages
RUN apt-get update && apt-get install -y build-essential
RUN pip install --user \
    numpy==1.25.0 \
    pandas==2.1.0 \
    scikit-learn==1.3.0

# Final stage - copy only the built packages
FROM python:3.10-slim

USER root

RUN apt-get update && apt-get install -y --no-install-recommends \
    procps \
    tini \
    libjemalloc2 \
    && rm -rf /var/lib/apt/lists/*

# Copy pre-built Python packages from builder stage
COPY --from=builder /root/.local /root/.local
ENV PATH="/root/.local/bin:$PATH"
ENV PYSPARK_PYTHON="/usr/local/bin/python"
ENV LD_PRELOAD="/usr/lib/x86_64-linux-gnu/libjemalloc.so.2"

RUN groupadd -g 1099 spark && \
    useradd -u 1099 -g 1099 -d /home/spark -m spark

USER spark
```

## Versioning Strategy

Tag your images with both a semantic version and a commit hash. This lets you reference a specific version in production while also tracking exactly which code produced each image.

```bash
# Tag with version and commit hash
VERSION="1.2.0"
COMMIT=$(git rev-parse --short HEAD)

docker build \
  -t us-central1-docker.pkg.dev/my-project/dataproc-images/spark-custom:${VERSION} \
  -t us-central1-docker.pkg.dev/my-project/dataproc-images/spark-custom:${COMMIT} \
  -t us-central1-docker.pkg.dev/my-project/dataproc-images/spark-custom:latest \
  .

docker push --all-tags us-central1-docker.pkg.dev/my-project/dataproc-images/spark-custom
```

In your job submission scripts, reference the specific version, not `latest`. This prevents unexpected behavior when a new image is pushed.

## Debugging Custom Container Issues

When a job fails with a custom container, check these common issues.

Create a `spark` user with UID and GID 1099 in the image and make sure files needed at runtime are readable by that user.

Do not install Spark, Hadoop, or Java in the image. Dataproc Serverless mounts the runtime version you choose when the batch starts.

If Python packages conflict with packages in your custom Python environment, you may need to force reinstall them. Use `pip install --force-reinstall` for packages that conflict.

Check the batch job logs for container pull errors.

```bash
# Check batch logs for container-related errors
gcloud dataproc batches describe BATCH_ID \
  --region=us-central1 \
  --format="yaml(stateHistory, runtimeInfo)"
```

Custom containers give you control over the Dataproc Serverless workload dependencies you add to the managed runtime. They are essential for production jobs with complex dependencies and for teams that need reproducible, versioned execution environments.
