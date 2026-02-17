# How to Set Up a Vertex AI Workbench Instance for Interactive ML Development

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, Workbench, JupyterLab, Machine Learning

Description: Learn how to create and configure a Vertex AI Workbench instance for interactive machine learning development with JupyterLab.

---

If you have ever struggled with setting up a local development environment for machine learning - installing CUDA drivers, managing Python dependencies, running out of GPU memory - Vertex AI Workbench is a breath of fresh air. It gives you a fully managed JupyterLab environment in the cloud, pre-configured with popular ML frameworks, GPU support, and direct integration with GCP services. You click a few buttons, and within minutes you have a notebook environment ready to go.

## Workbench Instance Types

Vertex AI Workbench offers two types of instances:

**Managed notebooks** are fully managed by Google. They handle software updates, idle shutdown, and integrations automatically. This is what most people should use.

**User-managed notebooks** give you more control - you can SSH in, install custom software, and configure the instance as you see fit. Use these when you need specific system-level configurations.

## Creating a Managed Workbench Instance

Here is how to create a managed workbench instance using the Python SDK:

```python
# create_workbench.py
# Create a Vertex AI Workbench managed instance

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

# Create a managed notebook instance
instance = aiplatform.NotebookRuntimeTemplate.create(
    display_name='ml-dev-notebook',
    machine_type='n1-standard-8',
    # Add a GPU for training
    accelerator_type='NVIDIA_TESLA_T4',
    accelerator_count=1,
    description='Development notebook for ML experiments',
)

print(f"Workbench instance template created: {instance.resource_name}")
```

The gcloud CLI is often more convenient for this:

```bash
# Create a workbench instance using gcloud
gcloud workbench instances create ml-dev-notebook \
  --location=us-central1-a \
  --machine-type=n1-standard-8 \
  --accelerator-type=NVIDIA_TESLA_T4 \
  --accelerator-core-count=1 \
  --boot-disk-size=200GB \
  --data-disk-size=500GB \
  --install-gpu-driver
```

## Choosing the Right Machine Configuration

The machine configuration depends on your workload:

For data exploration and lightweight modeling:
```bash
# Good for pandas, sklearn, basic TensorFlow/PyTorch
gcloud workbench instances create explore-notebook \
  --location=us-central1-a \
  --machine-type=n1-standard-4 \
  --boot-disk-size=100GB \
  --data-disk-size=200GB
```

For deep learning model development:
```bash
# Good for training CNNs, transformers, and other GPU-intensive models
gcloud workbench instances create dl-notebook \
  --location=us-central1-a \
  --machine-type=n1-standard-8 \
  --accelerator-type=NVIDIA_TESLA_T4 \
  --accelerator-core-count=1 \
  --boot-disk-size=200GB \
  --data-disk-size=500GB \
  --install-gpu-driver
```

For large-scale data processing with big models:
```bash
# Good for large datasets and memory-intensive operations
gcloud workbench instances create large-notebook \
  --location=us-central1-a \
  --machine-type=n1-highmem-16 \
  --accelerator-type=NVIDIA_TESLA_V100 \
  --accelerator-core-count=1 \
  --boot-disk-size=200GB \
  --data-disk-size=1000GB \
  --install-gpu-driver
```

## Configuring Idle Shutdown

To avoid paying for an instance that is sitting idle, configure automatic shutdown:

```bash
# Set idle timeout to 60 minutes
gcloud workbench instances create auto-shutdown-notebook \
  --location=us-central1-a \
  --machine-type=n1-standard-8 \
  --idle-shutdown-timeout=60 \
  --boot-disk-size=200GB
```

This shuts down the instance after 60 minutes of inactivity, saving costs when you walk away from your desk.

## Accessing Your Workbench Instance

Once created, access your instance through the Cloud Console or get the URL directly:

```bash
# List your workbench instances
gcloud workbench instances list --location=us-central1-a

# Get details including the access URL
gcloud workbench instances describe ml-dev-notebook \
  --location=us-central1-a \
  --format="value(proxyUri)"
```

The proxy URI gives you direct access to the JupyterLab interface in your browser.

## Installing Additional Packages

The pre-built environment includes common packages, but you will often need additional ones. Install them from a notebook cell:

```python
# Install additional packages in a notebook cell
!pip install transformers datasets evaluate accelerate
!pip install xgboost lightgbm catboost
!pip install plotly seaborn
```

For persistent installations that survive instance restarts, use a post-startup script:

```bash
# Create a post-startup script
# Save this as post-startup.sh and reference it during instance creation

#!/bin/bash
pip install transformers datasets evaluate
pip install xgboost lightgbm catboost
pip install plotly seaborn
```

```bash
# Create instance with post-startup script
gcloud workbench instances create ml-notebook \
  --location=us-central1-a \
  --machine-type=n1-standard-8 \
  --post-startup-script=gs://your-bucket/scripts/post-startup.sh \
  --boot-disk-size=200GB
```

## Connecting to GCP Services

One of the biggest advantages of Workbench is seamless integration with GCP services. Here is how to connect to common ones.

Reading data from BigQuery:

```python
# Access BigQuery directly from a Workbench notebook
from google.cloud import bigquery

# No need to set up authentication - Workbench handles it
client = bigquery.Client()

query = """
SELECT *
FROM `your-project.dataset.table`
LIMIT 1000
"""

# Load results directly into a pandas DataFrame
df = client.query(query).to_dataframe()
print(f"Loaded {len(df)} rows from BigQuery")
```

Reading files from Cloud Storage:

```python
# Access Cloud Storage
from google.cloud import storage

client = storage.Client()
bucket = client.bucket('your-bucket')

# Download a file
blob = bucket.blob('data/training-data.csv')
blob.download_to_filename('/home/jupyter/training-data.csv')

# Or read directly into pandas
import pandas as pd
df = pd.read_csv('gs://your-bucket/data/training-data.csv')
```

Submitting Vertex AI training jobs from a notebook:

```python
# Submit a training job from your notebook
from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

# Create and run a custom training job
job = aiplatform.CustomTrainingJob(
    display_name='training-from-notebook',
    script_path='./trainer/task.py',
    container_uri='us-docker.pkg.dev/vertex-ai/training/tf-gpu.2-14.py310:latest',
)

model = job.run(
    machine_type='n1-standard-8',
    accelerator_type='NVIDIA_TESLA_T4',
    accelerator_count=1,
)
```

## Managing Instance State

Start and stop your instance to control costs:

```bash
# Stop the instance (stops billing for compute, keeps disk)
gcloud workbench instances stop ml-dev-notebook \
  --location=us-central1-a

# Start the instance back up
gcloud workbench instances start ml-dev-notebook \
  --location=us-central1-a

# Delete the instance entirely
gcloud workbench instances delete ml-dev-notebook \
  --location=us-central1-a
```

Stopping is different from deleting. A stopped instance keeps its disk and data but does not charge for compute. You only pay for disk storage.

## Setting Up Git Integration

Workbench includes Git integration for version control:

```bash
# Configure Git in the terminal (available within JupyterLab)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Clone a repository
git clone https://github.com/your-org/ml-project.git

# Or use SSH if you have keys configured
git clone git@github.com:your-org/ml-project.git
```

JupyterLab also has a built-in Git extension that provides a visual interface for staging, committing, and pushing changes.

## Security Considerations

By default, Workbench instances are accessible only to users with the appropriate IAM roles. Here are some security best practices:

Use a custom service account with least-privilege permissions:

```bash
# Create an instance with a specific service account
gcloud workbench instances create secure-notebook \
  --location=us-central1-a \
  --machine-type=n1-standard-4 \
  --service-account=notebook-sa@your-project-id.iam.gserviceaccount.com
```

Place your instance in a VPC with appropriate firewall rules:

```bash
# Create in a specific network and subnet
gcloud workbench instances create vpc-notebook \
  --location=us-central1-a \
  --machine-type=n1-standard-4 \
  --network=projects/your-project-id/global/networks/your-vpc \
  --subnet=projects/your-project-id/regions/us-central1/subnetworks/your-subnet \
  --no-public-ip
```

## Wrapping Up

Vertex AI Workbench gives you a production-quality notebook environment without the hassle of managing your own infrastructure. It comes pre-loaded with ML frameworks, integrates natively with GCP services, and supports GPUs for training. The key is choosing the right machine configuration for your workload and setting up idle shutdown to control costs. Use it for interactive development and prototyping, and then use Vertex AI custom training jobs for production training runs.
