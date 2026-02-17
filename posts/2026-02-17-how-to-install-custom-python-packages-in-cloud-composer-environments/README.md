# How to Install Custom Python Packages in Cloud Composer Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Composer, Python, Airflow, Dependencies

Description: Learn the different methods for installing custom Python packages in Cloud Composer environments, from PyPI packages to private dependencies.

---

Every Airflow pipeline eventually needs a Python package that is not in the default Composer environment. Maybe you need `pandas-gbq` for BigQuery integration, `requests` for API calls, or a custom internal library. Cloud Composer provides several ways to install Python packages, each with different trade-offs.

This guide covers all the methods, from the simplest PyPI installs to private packages hosted in Artifact Registry.

## Method 1: Install PyPI Packages Through the Console or CLI

The most straightforward approach is to specify packages through the gcloud CLI or the Cloud Console. Composer manages the installation across all worker nodes.

```bash
# Install PyPI packages in a Composer environment
gcloud composer environments update my-composer-env \
  --location=us-central1 \
  --update-pypi-packages-from-file=requirements.txt
```

Your `requirements.txt` file should pin versions for reproducibility:

```
# requirements.txt - Pin versions for consistent deployments
pandas==2.1.4
requests==2.31.0
pandas-gbq==0.20.0
google-cloud-secret-manager==2.18.1
slack-sdk==3.27.0
pyarrow==14.0.2
```

You can also install packages individually:

```bash
# Install a single PyPI package
gcloud composer environments update my-composer-env \
  --location=us-central1 \
  --update-pypi-package="pandas-gbq==0.20.0"

# Install multiple packages at once
gcloud composer environments update my-composer-env \
  --location=us-central1 \
  --update-pypi-package="requests>=2.31.0" \
  --update-pypi-package="slack-sdk>=3.27.0"
```

To remove a package:

```bash
# Remove a PyPI package from the environment
gcloud composer environments update my-composer-env \
  --location=us-central1 \
  --remove-pypi-packages="slack-sdk"
```

## Method 2: Use a requirements.txt File

For managing many packages, maintain a `requirements.txt` file in version control and apply it to the environment:

```bash
# Apply a full requirements file to the environment
gcloud composer environments update my-composer-env \
  --location=us-central1 \
  --update-pypi-packages-from-file=requirements.txt
```

A well-organized requirements file for a data engineering team might look like this:

```
# requirements.txt

# Data processing
pandas==2.1.4
pyarrow==14.0.2
numpy==1.26.3

# GCP integrations
google-cloud-secret-manager==2.18.1
google-cloud-pubsub==2.19.0
pandas-gbq==0.20.0

# API clients
requests==2.31.0
slack-sdk==3.27.0

# Utilities
python-dateutil==2.8.2
pyyaml==6.0.1
jinja2==3.1.3

# Testing (for DAG validation)
pytest==7.4.4
```

Important: When you apply a requirements file, it replaces all previously installed custom packages. Make sure the file includes everything you need.

## Method 3: Install Packages from Private Repositories

If your team has internal Python packages hosted in a private PyPI repository or Artifact Registry, you can configure Composer to install from there.

### Using Google Artifact Registry

First, create a Python repository in Artifact Registry:

```bash
# Create a Python package repository in Artifact Registry
gcloud artifacts repositories create python-packages \
  --repository-format=python \
  --location=us-central1 \
  --description="Internal Python packages"
```

Upload your internal package:

```bash
# Build and upload your package to Artifact Registry
pip install twine build

# Build the package
python -m build

# Upload to Artifact Registry
python -m twine upload \
  --repository-url https://us-central1-python.pkg.dev/my-project/python-packages/ \
  dist/*
```

Configure Composer to install from Artifact Registry by specifying an extra index URL:

```bash
# Update the environment with a private package from Artifact Registry
gcloud composer environments update my-composer-env \
  --location=us-central1 \
  --update-pypi-package="my-internal-package>=1.0.0" \
  --update-airflow-configs="\
core-index_url=https://us-central1-python.pkg.dev/my-project/python-packages/simple/"
```

### Using a pip.conf with Extra Index URLs

For more complex setups, create a pip configuration:

```bash
# Set a custom PyPI repository URL in the environment
gcloud composer environments update my-composer-env \
  --location=us-central1 \
  --update-env-variables="\
PIP_EXTRA_INDEX_URL=https://us-central1-python.pkg.dev/my-project/python-packages/simple/"
```

## Method 4: Use the Plugins Directory

For small, self-contained Python modules that do not need a full package installation, use the Composer plugins directory. Files placed here are automatically available to all DAGs.

```bash
# Upload a Python module to the plugins directory
gcloud composer environments storage plugins import \
  --environment=my-composer-env \
  --location=us-central1 \
  --source=my_utils.py

# Upload an entire directory of plugins
gcloud composer environments storage plugins import \
  --environment=my-composer-env \
  --location=us-central1 \
  --source=plugins/
```

Your plugin module is then importable in any DAG:

```python
# In your DAG file, import from the plugins directory
from my_utils import format_date, send_notification

def process_data(**context):
    formatted = format_date(context["ds"])
    send_notification(f"Processing data for {formatted}")
```

## Method 5: Include Dependencies in DAG Files

For simple, single-file dependencies, you can include them directly in your DAGs folder:

```bash
# Upload helper modules alongside your DAGs
gcloud composer environments storage dags import \
  --environment=my-composer-env \
  --location=us-central1 \
  --source=dags/helpers/

# Your DAGs folder structure:
# dags/
#   my_dag.py
#   helpers/
#     __init__.py
#     data_utils.py
#     notification.py
```

Import them in your DAGs using relative or absolute imports:

```python
# Import from helper modules in the DAGs directory
from helpers.data_utils import transform_data
from helpers.notification import alert_on_failure
```

## Handling Dependency Conflicts

One of the trickiest parts of package management in Composer is dealing with dependency conflicts. Airflow and its providers have their own dependency trees, and adding packages can create conflicts.

Check for conflicts before installing:

```bash
# Run a dry-run to check for dependency conflicts
gcloud composer environments run my-composer-env \
  --location=us-central1 \
  pip check
```

If you hit conflicts, you have a few options:

1. **Adjust version ranges** - Use flexible version specifiers (`>=1.0,<2.0`) instead of exact pins
2. **Use the KubernetesPodOperator** - Run tasks in isolated containers with their own dependencies
3. **Use virtualenvs** - The `PythonVirtualenvOperator` creates an isolated environment per task

Using PythonVirtualenvOperator to avoid conflicts:

```python
# Use PythonVirtualenvOperator for tasks with conflicting dependencies
from airflow.operators.python import PythonVirtualenvOperator

def ml_training_task():
    """This function runs in its own virtualenv."""
    import tensorflow as tf  # Installed only in this virtualenv
    # Your ML training code here
    print(f"TensorFlow version: {tf.__version__}")

train_model = PythonVirtualenvOperator(
    task_id="train_model",
    python_callable=ml_training_task,
    requirements=["tensorflow==2.15.0", "scikit-learn==1.3.2"],
    system_site_packages=False,
)
```

## Checking Installed Packages

Verify what is installed in your environment:

```bash
# List all installed Python packages
gcloud composer environments run my-composer-env \
  --location=us-central1 \
  pip list

# Check the version of a specific package
gcloud composer environments run my-composer-env \
  --location=us-central1 \
  pip show -- pandas
```

## Best Practices

1. **Always pin versions** - Unpinned dependencies can change between environment updates, breaking your DAGs
2. **Test locally first** - Use the Composer local development CLI tool to test package compatibility before deploying
3. **Keep the package list minimal** - Only install what you actually need
4. **Use the plugins directory for small modules** - Do not install a PyPI package for code you control
5. **Monitor environment updates** - Package installations trigger an environment update that takes several minutes

## Wrapping Up

Cloud Composer gives you multiple ways to install Python packages, from simple PyPI installs to private Artifact Registry packages. Start with the gcloud CLI for standard PyPI packages, use the plugins directory for internal modules, and fall back to `PythonVirtualenvOperator` or `KubernetesPodOperator` when you hit dependency conflicts. Keep your requirements pinned and version-controlled, and test changes in a development environment before applying them to production.
