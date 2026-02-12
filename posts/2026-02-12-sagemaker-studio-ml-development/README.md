# How to Use SageMaker Studio for ML Development

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, SageMaker, Machine Learning, Cloud Computing

Description: Learn how to set up and use Amazon SageMaker Studio as your integrated development environment for machine learning projects on AWS.

---

Amazon SageMaker Studio is AWS's purpose-built IDE for machine learning. If you've ever juggled between Jupyter notebooks, terminal sessions, and the AWS console while building ML models, Studio brings everything under one roof. It's not just a notebook environment - it's a full workspace with experiment tracking, model deployment tools, and collaborative features baked right in.

In this post, we'll walk through setting up SageMaker Studio, explore its key features, and build a simple workflow so you can see how the pieces fit together.

## What is SageMaker Studio?

SageMaker Studio is a web-based IDE that gives you access to every tool you need for ML development. Think of it as VS Code meets Jupyter, but specifically designed for machine learning workflows. You get notebooks, a file browser, terminal access, Git integration, and purpose-built ML tools all in one interface.

The big selling point is that you don't manage infrastructure. You pick an instance type, and Studio spins up the compute for you. Need a GPU for training? Switch your kernel. Need to go back to a small CPU instance for data exploration? Switch again. You're only paying for what you use.

## Setting Up SageMaker Studio

Before you can use Studio, you need a SageMaker Domain. This is essentially the organizational unit that manages users, permissions, and shared settings.

Here's how to create a domain and user profile using the AWS CLI.

```bash
# Create a SageMaker domain with a VPC configuration
aws sagemaker create-domain \
  --domain-name ml-team-domain \
  --auth-mode IAM \
  --default-user-settings '{
    "ExecutionRole": "arn:aws:iam::123456789012:role/SageMakerExecutionRole",
    "SecurityGroups": ["sg-0123456789abcdef0"],
    "SharingSettings": {
      "NotebookOutputOption": "Allowed",
      "S3OutputPath": "s3://my-sagemaker-bucket/sharing"
    }
  }' \
  --subnet-ids subnet-0123456789abcdef0 subnet-abcdef0123456789a \
  --vpc-id vpc-0123456789abcdef0
```

Once the domain is created, add a user profile.

```bash
# Create a user profile within the domain
aws sagemaker create-user-profile \
  --domain-id d-xxxxxxxxxxxx \
  --user-profile-name data-scientist-1 \
  --user-settings '{
    "ExecutionRole": "arn:aws:iam::123456789012:role/SageMakerExecutionRole"
  }'
```

You can also do all of this through the AWS Console. Navigate to SageMaker, click "Studio" in the sidebar, and follow the guided setup. AWS will create the necessary networking and IAM resources for you.

## Navigating the Studio Interface

When you first open Studio, you'll see a launcher page with quick-access tiles. Here's how the layout breaks down:

- **Left sidebar** - File browser, running instances, Git repos, and various ML tools
- **Main area** - Notebooks, terminals, and other editors
- **Top bar** - Kernel selection, instance type, and collaboration tools

The sidebar is where you'll spend a lot of time. It has dedicated sections for SageMaker components like Experiments, Model Registry, Pipelines, and Feature Store. Each one opens an integrated UI right inside Studio.

## Working with Notebooks

Studio notebooks work like standard Jupyter notebooks but with a few important differences. You can change the underlying compute instance without restarting your notebook, and you can share notebooks with teammates who have access to the same domain.

Here's a typical workflow for starting a new ML project in Studio.

```python
# First, let's check our environment and set up the SageMaker session
import sagemaker
import boto3
import pandas as pd

# SageMaker session handles interactions with the SageMaker API
session = sagemaker.Session()

# Get the default bucket - Studio creates one automatically
bucket = session.default_bucket()
prefix = 'studio-demo'

# Get the execution role attached to your user profile
role = sagemaker.get_execution_role()

print(f"SageMaker version: {sagemaker.__version__}")
print(f"Default bucket: {bucket}")
print(f"Role: {role}")
```

One feature that's easy to miss is the image terminal. You can open a system terminal tied to your notebook's kernel, which means you have access to all the same libraries and can run scripts directly.

## Managing Compute Resources

This is where Studio really shines. Instead of provisioning EC2 instances manually, you pick from a list of instance types and Studio handles the rest.

```python
# You can check available instance types programmatically
import boto3

client = boto3.client('sagemaker')

# List the apps running in your domain
response = client.list_apps(
    DomainIdEquals='d-xxxxxxxxxxxx',
    UserProfileNameEquals='data-scientist-1'
)

# See what's currently running
for app in response['Apps']:
    print(f"App: {app['AppName']}, Type: {app['AppType']}, Status: {app['Status']}")
```

A practical tip: start with a small instance (like ml.t3.medium) for data exploration and coding. When you're ready to run heavier computations, switch to a larger instance. Studio lets you do this without losing your notebook state.

## Git Integration

Studio has built-in Git support. You can clone repositories, create branches, commit changes, and push - all from the UI or the terminal.

```bash
# Clone a repo from within a Studio terminal
git clone https://github.com/your-org/ml-project.git

# Or configure Git for your user
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

The Git extension in the sidebar shows you diffs, staged changes, and commit history. It's not as feature-rich as something like GitLens, but it covers the basics well enough for most ML workflows.

## Sharing and Collaboration

One of the advantages of Studio over running local Jupyter notebooks is collaboration. Teammates in the same domain can share notebooks, and you can even share running apps.

```python
# Share a notebook snapshot to S3 for teammates
import sagemaker
from sagemaker.s3 import S3Uploader

session = sagemaker.Session()

# Upload your notebook to a shared location
S3Uploader.upload(
    local_path='./my_analysis.ipynb',
    desired_s3_uri=f's3://{session.default_bucket()}/shared-notebooks/',
    sagemaker_session=session
)

print("Notebook shared successfully!")
```

Studio also supports lifecycle configurations - scripts that run when a notebook instance starts up. This is great for standardizing environments across your team.

```bash
#!/bin/bash
# Lifecycle configuration script example
# This runs every time a new kernel gateway app starts

# Install team-specific packages
pip install great-expectations mlflow-skinny

# Set up environment variables
export TEAM_DATA_BUCKET=s3://our-team-data
export EXPERIMENT_PREFIX=team-experiments
```

## Customizing Your Environment

You're not stuck with the default images. Studio lets you bring custom Docker images, which means you can have exactly the libraries and tools your team needs.

```python
# Register a custom image with your domain
import boto3

client = boto3.client('sagemaker')

# First, create an image
client.create_image(
    ImageName='custom-ml-image',
    RoleArn='arn:aws:iam::123456789012:role/SageMakerExecutionRole',
    Description='Custom image with our ML stack'
)

# Then create an image version pointing to your ECR image
client.create_image_version(
    ImageName='custom-ml-image',
    BaseImage='123456789012.dkr.ecr.us-east-1.amazonaws.com/custom-ml:latest'
)
```

## Cost Management Tips

Studio charges you for the compute instances running underneath. Here are a few ways to keep costs down:

1. **Auto-shutdown** - Configure idle timeout policies so instances shut down when you're not using them
2. **Right-size instances** - Don't use a GPU instance for data cleaning
3. **Use shared spaces** - Instead of everyone running their own instance, share compute where possible
4. **Monitor usage** - Check the running instances panel regularly and shut down what you don't need

You can set auto-shutdown at the domain level.

```bash
# Update domain to enable auto-shutdown after 60 minutes of idle time
aws sagemaker update-domain \
  --domain-id d-xxxxxxxxxxxx \
  --default-user-settings '{
    "JupyterServerAppSettings": {
      "DefaultResourceSpec": {
        "InstanceType": "system",
        "LifecycleConfigArn": "arn:aws:sagemaker:us-east-1:123456789012:studio-lifecycle-config/auto-shutdown"
      }
    }
  }'
```

## Monitoring Your Studio Usage

You'll want to keep an eye on both costs and performance as your team uses Studio. Integrating with a monitoring platform like [OneUptime](https://oneuptime.com/blog/post/aws-cloudwatch-alerting/view) can help you track resource utilization and set up alerts when spend gets out of hand.

## Wrapping Up

SageMaker Studio takes the pain out of managing ML development environments. You get a full IDE, flexible compute, built-in ML tools, and collaboration features without managing any infrastructure yourself. The learning curve is gentle if you're already familiar with Jupyter, and the additional features grow with you as your ML projects get more sophisticated.

Start with the basics - create a domain, open a notebook, and run some code. From there, explore the sidebar tools as you need them. You don't have to use everything on day one.
