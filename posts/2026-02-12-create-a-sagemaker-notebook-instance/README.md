# How to Create a SageMaker Notebook Instance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, SageMaker, Machine Learning, Jupyter, Notebooks

Description: Step-by-step guide to creating and configuring an Amazon SageMaker notebook instance for machine learning development, including lifecycle configurations and cost management.

---

SageMaker notebook instances are managed Jupyter environments that come pre-loaded with ML libraries and have direct access to AWS services. They're the starting point for most ML projects on AWS - you explore data, prototype models, and iterate before moving to production training pipelines.

Setting one up takes about 5 minutes, but getting the configuration right saves you headaches and money down the road. Let's walk through it properly.

## Prerequisites

You need an IAM role for SageMaker. If you haven't created one yet:

```bash
# Create the SageMaker execution role
aws iam create-role \
  --role-name SageMakerNotebookRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {"Service": "sagemaker.amazonaws.com"},
        "Action": "sts:AssumeRole"
      }
    ]
  }'

# Attach necessary policies
aws iam attach-role-policy \
  --role-name SageMakerNotebookRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonSageMakerFullAccess

# S3 access for data
aws iam attach-role-policy \
  --role-name SageMakerNotebookRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess
```

For production use, you'd want a more restrictive policy instead of the full access policies. But for getting started, this works.

## Creating the Notebook Instance

Here's the basic creation command:

```bash
# Create a notebook instance
aws sagemaker create-notebook-instance \
  --notebook-instance-name my-ml-notebook \
  --instance-type ml.t3.medium \
  --role-arn arn:aws:iam::123456789012:role/SageMakerNotebookRole \
  --volume-size-in-gb 20 \
  --direct-internet-access Enabled
```

Let's break down the key parameters:

**Instance type** - Start with `ml.t3.medium` ($0.05/hour) for exploration and data analysis. Move to `ml.t3.xlarge` ($0.20/hour) or `ml.m5.xlarge` ($0.29/hour) when you need more memory. For GPU work, use `ml.g4dn.xlarge` ($0.74/hour).

**Volume size** - The EBS volume for storing notebooks, datasets, and conda environments. 20GB is fine for starting out. You can increase it later but can't decrease it.

**Direct internet access** - Enable this unless your security requirements demand otherwise. Without internet access, you can't install pip packages.

Check the instance status:

```bash
# Check status (takes 3-5 minutes to reach InService)
aws sagemaker describe-notebook-instance \
  --notebook-instance-name my-ml-notebook \
  --query "{Status: NotebookInstanceStatus, URL: Url, InstanceType: InstanceType}"
```

## Configuring Lifecycle Scripts

Lifecycle scripts run when the notebook is created or started. They're essential for installing custom packages and setting up auto-stop.

**Auto-stop script** - This is the most important lifecycle configuration. It automatically stops the notebook after a period of inactivity, preventing forgotten instances from running up your bill:

```bash
# Create the on-start lifecycle script
# This installs an auto-stop extension that shuts down after 60 minutes of idle time

cat > /tmp/on-start.sh << 'SCRIPT'
#!/bin/bash
set -e

IDLE_TIME=3600  # 60 minutes in seconds

echo "Setting up auto-stop with ${IDLE_TIME}s idle timeout"

# Install the auto-stop extension
cat > /home/ec2-user/SageMaker/auto-stop.py << 'AUTOSTOP'
import json
import os
import time
import urllib.request
from datetime import datetime

IDLE_THRESHOLD = int(os.environ.get('IDLE_TIME', 3600))
NOTEBOOK_NAME = os.environ.get('NOTEBOOK_NAME', '')

def get_notebook_name():
    log_path = '/opt/ml/metadata/resource-metadata.json'
    if os.path.exists(log_path):
        with open(log_path) as f:
            metadata = json.load(f)
            return metadata.get('ResourceName', '')
    return NOTEBOOK_NAME

def is_idle():
    """Check if any kernels are busy"""
    try:
        response = urllib.request.urlopen('http://localhost:8888/api/sessions')
        sessions = json.loads(response.read())
        for session in sessions:
            if session['kernel']['execution_state'] == 'busy':
                return False
        return True
    except Exception:
        return True

def main():
    idle_start = None
    notebook_name = get_notebook_name()

    while True:
        if is_idle():
            if idle_start is None:
                idle_start = time.time()
                print(f"Idle detected at {datetime.now()}")
            elif time.time() - idle_start > IDLE_THRESHOLD:
                print(f"Idle for {IDLE_THRESHOLD}s - stopping notebook")
                import boto3
                sm = boto3.client('sagemaker')
                sm.stop_notebook_instance(NotebookInstanceName=notebook_name)
                break
        else:
            if idle_start is not None:
                print(f"Activity detected - resetting idle timer")
            idle_start = None

        time.sleep(60)

if __name__ == '__main__':
    main()
AUTOSTOP

# Run auto-stop in the background
nohup python3 /home/ec2-user/SageMaker/auto-stop.py &

echo "Auto-stop configured"
SCRIPT

# Encode the script
ON_START=$(cat /tmp/on-start.sh | base64)

# Create the lifecycle configuration
aws sagemaker create-notebook-instance-lifecycle-config \
  --notebook-instance-lifecycle-config-name auto-stop-60min \
  --on-start "[{\"Content\": \"$ON_START\"}]"
```

**Custom package installation script** - Install your standard ML toolkit on creation:

```bash
cat > /tmp/on-create.sh << 'SCRIPT'
#!/bin/bash
set -e

# Install custom packages in the conda environment
source activate python3

pip install --quiet \
  xgboost \
  lightgbm \
  shap \
  plotly \
  optuna \
  mlflow

# Install JupyterLab extensions
jupyter labextension install @jupyter-widgets/jupyterlab-manager --no-build
jupyter lab build --minimize=False

source deactivate

echo "Custom packages installed"
SCRIPT

ON_CREATE=$(cat /tmp/on-create.sh | base64)

# Update the lifecycle config with both scripts
aws sagemaker create-notebook-instance-lifecycle-config \
  --notebook-instance-lifecycle-config-name ml-dev-setup \
  --on-create "[{\"Content\": \"$ON_CREATE\"}]" \
  --on-start "[{\"Content\": \"$ON_START\"}]"
```

Apply the lifecycle configuration to your notebook:

```bash
# Create a new notebook with the lifecycle config
aws sagemaker create-notebook-instance \
  --notebook-instance-name my-ml-notebook-v2 \
  --instance-type ml.t3.medium \
  --role-arn arn:aws:iam::123456789012:role/SageMakerNotebookRole \
  --volume-size-in-gb 20 \
  --lifecycle-config-name ml-dev-setup \
  --direct-internet-access Enabled

# Or update an existing one (requires stopping first)
aws sagemaker stop-notebook-instance \
  --notebook-instance-name my-ml-notebook

# Wait for it to stop
aws sagemaker wait notebook-instance-stopped \
  --notebook-instance-name my-ml-notebook

aws sagemaker update-notebook-instance \
  --notebook-instance-name my-ml-notebook \
  --lifecycle-config-name ml-dev-setup

aws sagemaker start-notebook-instance \
  --notebook-instance-name my-ml-notebook
```

## Accessing Your Notebook

Once the instance is in `InService` status, get the URL:

```bash
# Get the presigned URL to access the notebook
aws sagemaker create-presigned-notebook-instance-url \
  --notebook-instance-name my-ml-notebook \
  --query "AuthorizedUrl" \
  --output text
```

This gives you a time-limited URL that opens directly in your browser. You can choose between JupyterLab (recommended) and classic Jupyter.

## Setting Up Git Integration

Connect your notebook to a Git repository for version control:

```bash
# Add a Git repository to SageMaker
aws sagemaker create-code-repository \
  --code-repository-name my-ml-repo \
  --git-config '{
    "RepositoryUrl": "https://github.com/your-org/ml-experiments.git",
    "Branch": "main"
  }'

# Associate with your notebook instance
aws sagemaker update-notebook-instance \
  --notebook-instance-name my-ml-notebook \
  --default-code-repository my-ml-repo
```

The repository gets cloned into `/home/ec2-user/SageMaker/` and persists across notebook stops and starts.

## Your First Notebook

Create a quick verification notebook to make sure everything works:

```python
# Cell 1: Verify SageMaker access
import sagemaker
import boto3

session = sagemaker.Session()
role = sagemaker.get_execution_role()
bucket = session.default_bucket()

print(f"SageMaker SDK version: {sagemaker.__version__}")
print(f"Role: {role}")
print(f"Default bucket: {bucket}")
print(f"Region: {session.boto_region_name}")
```

```python
# Cell 2: Check GPU availability (if using a GPU instance)
import torch

if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(f"GPU memory: {torch.cuda.get_device_properties(0).total_mem / 1e9:.1f} GB")
else:
    print("No GPU available (CPU instance)")
```

```python
# Cell 3: Quick ML workflow test
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score

# Load data
X, y = load_iris(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

# Train
model = RandomForestClassifier(n_estimators=100)
model.fit(X_train, y_train)

# Evaluate
accuracy = accuracy_score(y_test, model.predict(X_test))
print(f"Test accuracy: {accuracy:.4f}")
```

## Managing Costs

Notebook instances charge by the hour, even when you're not actively using them. Here's how to keep costs down:

**Stop when not in use:**

```bash
# Stop the notebook instance
aws sagemaker stop-notebook-instance \
  --notebook-instance-name my-ml-notebook
```

**Start when you need it:**

```bash
# Start the notebook instance
aws sagemaker start-notebook-instance \
  --notebook-instance-name my-ml-notebook

# Wait for it to be ready
aws sagemaker wait notebook-instance-in-service \
  --notebook-instance-name my-ml-notebook
```

**Schedule start/stop for team notebooks:**

```python
import boto3

sm = boto3.client('sagemaker')

def scheduled_notebook_action(event, context):
    """Start or stop notebook instances based on schedule"""
    action = event.get('action', 'stop')
    notebooks = event.get('notebooks', [])

    for nb_name in notebooks:
        try:
            if action == 'start':
                sm.start_notebook_instance(NotebookInstanceName=nb_name)
                print(f"Starting {nb_name}")
            else:
                sm.stop_notebook_instance(NotebookInstanceName=nb_name)
                print(f"Stopping {nb_name}")
        except Exception as e:
            print(f"Error with {nb_name}: {e}")
```

**Check costs with a quick audit:**

```bash
# List all notebook instances and their status
aws sagemaker list-notebook-instances \
  --query "NotebookInstances[].{
    Name: NotebookInstanceName,
    Status: NotebookInstanceStatus,
    Type: InstanceType,
    Created: CreationTime
  }" \
  --output table
```

For more on scheduling non-production resources, see our guide on [scheduling non-production resources to save costs](https://oneuptime.com/blog/post/2026-02-12-schedule-non-production-resources-to-save-costs/view).

## Choosing Between Notebook Instances and SageMaker Studio

SageMaker Studio is the newer IDE option. Here's when to use each:

**Use Notebook Instances when:**
- You want a simple, familiar Jupyter experience
- You need full control over the underlying EC2 instance
- You're working solo or in a small team
- You want predictable pricing (per-hour)

**Use SageMaker Studio when:**
- You need collaboration features
- You want integrated experiment tracking
- You're building ML pipelines
- You want fast instance switching without restarting

For beginners, notebook instances are simpler to set up and understand. Move to Studio when you outgrow them.

## Persistence and Data

Important things to know about data on notebook instances:

- **/home/ec2-user/SageMaker/** - Persists across stop/start cycles. Put your notebooks and data here.
- **/tmp/ and other directories** - Lost when the instance stops. Don't store anything important here.
- **Conda environments** - Custom environments persist on the EBS volume, but may need reinstallation of packages after major updates.
- **The EBS volume** - Persists as long as the notebook instance exists. Deleted when you delete the instance.

Always store important data in S3, not on the notebook's local storage. The notebook instance is a compute resource, not a storage solution.

## Key Takeaways

SageMaker notebook instances are the quickest way to start doing ML on AWS. Start with ml.t3.medium for cost efficiency, configure auto-stop to prevent surprise bills, use lifecycle scripts to automate your setup, and connect a Git repo for version control. The whole setup takes about 10 minutes and gives you a production-grade ML development environment.

For the next step of actually training models, check out our guide on [getting started with Amazon SageMaker](https://oneuptime.com/blog/post/2026-02-12-get-started-with-amazon-sagemaker/view).
