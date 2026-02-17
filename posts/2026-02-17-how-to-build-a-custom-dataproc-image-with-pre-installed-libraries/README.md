# How to Build a Custom Dataproc Image with Pre-Installed Libraries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud Dataproc, Custom Image, Hadoop, Spark

Description: Build custom Dataproc images with pre-installed libraries and configurations to speed up cluster creation and ensure consistent environments across deployments.

---

Initialization actions are great for small customizations, but when you need to install large frameworks, compile native libraries, or set up complex configurations, they slow down cluster creation significantly. A cluster that takes 10 minutes to initialize because of init scripts could boot in 2 minutes with a custom image.

Custom Dataproc images let you bake all your dependencies into a VM image. When a cluster starts, nodes boot from your image with everything already installed. No downloading, no compiling, no waiting.

## Why Custom Images

There are several good reasons to use custom images over initialization actions.

Cluster creation is faster. A custom image with pre-installed packages boots in the same time as a standard image. Init scripts add minutes to cluster creation, which matters for ephemeral clusters that are created and destroyed frequently.

Consistency is guaranteed. With init scripts, a package repository might be temporarily unavailable, or a dependency might have been updated, causing different clusters to end up with different software versions. A custom image gives you the exact same environment every time.

Air-gapped environments are supported. If your clusters run in a VPC without internet access, init scripts that download packages will fail. Custom images work because everything is already on the disk.

## Prerequisites

You need the `generate_custom_image.py` script from Google's Dataproc custom images repository. This script handles creating the image correctly.

```bash
# Clone the Dataproc custom images tool
git clone https://github.com/GoogleCloudDataproc/custom-images.git
cd custom-images

# Install dependencies
pip3 install -r requirements.txt
```

## Creating a Customization Script

The customization script is similar to an initialization action but runs once during image creation rather than at every cluster boot.

```bash
#!/bin/bash
# custom-image-script.sh
# Installs all required software into the custom image

set -euxo pipefail

echo "Starting custom image build"

# Update system packages
apt-get update && apt-get upgrade -y

# Install system-level dependencies
apt-get install -y \
    build-essential \
    libssl-dev \
    libffi-dev \
    python3-dev \
    unixodbc-dev \
    default-libmysqlclient-dev \
    jq \
    htop

# Install Python data science stack
pip3 install --no-cache-dir \
    pandas==2.1.0 \
    numpy==1.25.0 \
    scikit-learn==1.3.0 \
    scipy==1.11.0 \
    matplotlib==3.8.0 \
    seaborn==0.12.0 \
    pyarrow==13.0.0 \
    google-cloud-bigquery==3.12.0 \
    google-cloud-storage==2.11.0 \
    google-cloud-bigtable==2.21.0 \
    pyspark-stubs==3.0.0

# Install Java libraries needed by Spark jobs
# Download JARs to the Spark jars directory
SPARK_JARS_DIR="/usr/lib/spark/jars"
cd "$SPARK_JARS_DIR"

# BigQuery connector
wget -q "https://repo1.maven.org/maven2/com/google/cloud/spark/spark-3.3-bigquery/0.32.2/spark-3.3-bigquery-0.32.2.jar"

# Delta Lake support
wget -q "https://repo1.maven.org/maven2/io/delta/delta-core_2.12/2.4.0/delta-core_2.12-2.4.0.jar"
wget -q "https://repo1.maven.org/maven2/io/delta/delta-storage/2.4.0/delta-storage-2.4.0.jar"

# Configure Spark defaults
cat >> /etc/spark/conf/spark-defaults.conf << 'EOF'
spark.sql.extensions=io.delta.sql.DeltaSparkSessionExtension
spark.sql.catalog.spark_catalog=org.apache.spark.sql.delta.catalog.DeltaCatalog
spark.serializer=org.apache.spark.serializer.KryoSerializer
spark.sql.adaptive.enabled=true
spark.sql.adaptive.coalescePartitions.enabled=true
EOF

# Set up custom logging configuration
cat > /etc/spark/conf/log4j2.properties << 'EOF'
rootLogger.level=WARN
rootLogger.appenderRef.console.ref=console
appender.console.type=Console
appender.console.name=console
appender.console.layout.type=PatternLayout
appender.console.layout.pattern=%d{yyyy-MM-dd HH:mm:ss} %-5p %c{1}: %m%n
logger.spark.name=org.apache.spark
logger.spark.level=WARN
logger.custom.name=com.mycompany
logger.custom.level=INFO
EOF

# Clean up to reduce image size
apt-get clean
rm -rf /var/lib/apt/lists/*
pip3 cache purge

echo "Custom image build complete"
```

## Building the Image

Use the `generate_custom_image.py` script to create the image.

```bash
# Build the custom Dataproc image
python3 generate_custom_image.py \
  --image-name=dataproc-custom-v1 \
  --dataproc-version=2.1.27-debian11 \
  --customization-script=custom-image-script.sh \
  --zone=us-central1-a \
  --gcs-bucket=gs://my-bucket/dataproc-images \
  --disk-size=100 \
  --no-smoke-test
```

This process creates a temporary Compute Engine VM, runs your customization script on it, captures a disk image, and cleans up. It takes about 15-30 minutes depending on the size of your installations.

The key parameters:

- `--image-name`: Name for the resulting image in your project
- `--dataproc-version`: The base Dataproc image version to customize
- `--customization-script`: Path to your customization script
- `--disk-size`: Size of the boot disk in GB (increase if you install large software)
- `--no-smoke-test`: Skip the validation test (useful during development)

## Using the Custom Image

Once the image is built, reference it when creating clusters.

```bash
# Create a cluster using the custom image
gcloud dataproc clusters create my-cluster \
  --region=us-central1 \
  --image=dataproc-custom-v1 \
  --num-workers=4 \
  --worker-machine-type=n1-standard-8 \
  --master-machine-type=n1-standard-4
```

The cluster creates much faster because there are no init scripts to run. All software is already on the disk.

## Versioning Your Images

Treat custom images like any other build artifact. Version them and keep track of what is in each version.

```bash
# Build with version number in the image name
python3 generate_custom_image.py \
  --image-name=dataproc-custom-v2-0-1 \
  --dataproc-version=2.1.27-debian11 \
  --customization-script=custom-image-script.sh \
  --zone=us-central1-a \
  --gcs-bucket=gs://my-bucket/dataproc-images
```

Keep a changelog that records what changed in each version.

```
# Image Changelog

## v2.0.1 (2026-02-17)
- Updated pandas to 2.1.0
- Added Delta Lake 2.4.0 support
- Enabled Spark adaptive query execution by default

## v2.0.0 (2026-02-01)
- Based on Dataproc 2.1.27-debian11
- Initial custom image with data science stack
- Includes BigQuery connector 0.32.2
```

## Automating Image Builds with Cloud Build

Automate image creation with Cloud Build so new images are built consistently.

```yaml
# cloudbuild.yaml - Automated custom image build
steps:
  # Clone the custom images tool
  - name: 'gcr.io/cloud-builders/git'
    args: ['clone', 'https://github.com/GoogleCloudDataproc/custom-images.git']

  # Run the image generation script
  - name: 'python:3.9'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        cd custom-images
        pip install -r requirements.txt
        python generate_custom_image.py \
          --image-name=dataproc-custom-${SHORT_SHA} \
          --dataproc-version=2.1.27-debian11 \
          --customization-script=../custom-image-script.sh \
          --zone=us-central1-a \
          --gcs-bucket=gs://my-bucket/dataproc-images \
          --disk-size=100

timeout: '3600s'  # 1 hour timeout for image build
```

Trigger the build on commits to your infrastructure repository. This way, updating the customization script automatically produces a new image.

## Testing Custom Images

Always test a new image before using it for production workloads.

```bash
# Create a test cluster with the new image
gcloud dataproc clusters create test-image \
  --region=us-central1 \
  --image=dataproc-custom-v2-0-1 \
  --single-node

# Run a smoke test job
gcloud dataproc jobs submit pyspark \
  --cluster=test-image \
  --region=us-central1 \
  smoke-test.py

# Clean up
gcloud dataproc clusters delete test-image --region=us-central1 --quiet
```

Here is a simple smoke test that verifies key packages are installed.

```python
# smoke-test.py - Verify custom image has expected software
from pyspark.sql import SparkSession
import sys

def main():
    spark = SparkSession.builder.appName("ImageSmokeTest").getOrCreate()

    # Test that required Python packages are importable
    required_packages = ['pandas', 'numpy', 'sklearn', 'pyarrow']
    for pkg in required_packages:
        try:
            __import__(pkg)
            print(f"OK: {pkg} is installed")
        except ImportError:
            print(f"FAIL: {pkg} is missing")
            sys.exit(1)

    # Test that Spark works correctly
    df = spark.range(100).selectExpr("id", "id * 2 as doubled")
    assert df.count() == 100, "Spark basic operation failed"
    print("OK: Spark is working")

    # Test BigQuery connector
    try:
        spark.conf.set("spark.sql.catalog.spark_catalog",
                       "org.apache.spark.sql.delta.catalog.DeltaCatalog")
        print("OK: Delta Lake catalog configured")
    except Exception as e:
        print(f"FAIL: Delta Lake configuration issue: {e}")
        sys.exit(1)

    print("All smoke tests passed")
    spark.stop()

if __name__ == "__main__":
    main()
```

## Image Size Management

Custom images can grow large if you install many packages. Large images take longer to copy during cluster creation, partially negating the speed benefit.

Keep images lean by cleaning up after installations, removing unnecessary documentation, and avoiding duplicate package installations between the base image and your customizations.

```bash
# Check what is using space in the image
du -sh /usr/lib/spark/jars/ 2>/dev/null
du -sh /usr/local/lib/python3.*/dist-packages/ 2>/dev/null
du -sh /var/cache/ 2>/dev/null
```

## Image Expiry and Lifecycle

Custom images are stored as Compute Engine images in your project. Set up image family management to keep things organized.

```bash
# Build image in a family for easy reference
python3 generate_custom_image.py \
  --image-name=dataproc-custom-v2-0-1 \
  --dataproc-version=2.1.27-debian11 \
  --customization-script=custom-image-script.sh \
  --zone=us-central1-a \
  --gcs-bucket=gs://my-bucket/dataproc-images \
  --family=dataproc-custom
```

With image families, your cluster creation command can reference the family instead of a specific version. The latest image in the family is used automatically.

```bash
# Use the latest image in the family
gcloud dataproc clusters create my-cluster \
  --region=us-central1 \
  --image=projects/my-project/global/images/family/dataproc-custom \
  --num-workers=4
```

Custom images are the professional way to manage Dataproc cluster configurations. The upfront effort of setting up an image build pipeline pays for itself quickly through faster cluster creation, more consistent environments, and simpler cluster configuration.
