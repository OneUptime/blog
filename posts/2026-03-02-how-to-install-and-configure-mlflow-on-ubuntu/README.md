# How to Install and Configure MLflow on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, MLflow, Machine Learning, MLOps, Python

Description: A complete guide to installing MLflow on Ubuntu, setting up a tracking server with PostgreSQL and artifact storage, and integrating it with your machine learning projects.

---

MLflow is an open-source platform for managing the machine learning lifecycle. It tracks experiments (parameters, metrics, artifacts), packages models in a reusable format, and provides a model registry for managing model versions. It integrates with TensorFlow, PyTorch, scikit-learn, and most other ML frameworks with minimal code changes.

## What MLflow Tracks

When you wrap your training code with MLflow:

- **Parameters**: hyperparameters (learning rate, batch size, number of layers)
- **Metrics**: loss, accuracy, custom metrics - logged per step or per epoch
- **Artifacts**: model files, plots, confusion matrices, feature importance charts
- **Tags**: free-form metadata (dataset version, git commit hash, owner)
- **Models**: the trained model in a standardized format that can be loaded by any MLflow-compatible tool

## Prerequisites

- Ubuntu 20.04 or 22.04
- Python 3.9+
- PostgreSQL (for production tracking server)
- sudo privileges

## Installation

```bash
# Install Python and pip
sudo apt-get update && sudo apt-get install -y python3 python3-pip python3-venv

# Create a virtual environment
python3 -m venv ~/mlflow-env
source ~/mlflow-env/bin/activate

# Install MLflow with extras
pip install mlflow[extras]  # Includes common integrations

# Or install specific components
pip install mlflow psycopg2-binary boto3 google-cloud-storage azure-storage-blob
```

## Quick Start: Local Tracking

The simplest setup uses the local filesystem:

```bash
# Start the tracking UI
mlflow ui --port 5000

# Access at http://localhost:5000
```

Log an experiment from Python:

```python
#!/usr/bin/env python3
import mlflow
import mlflow.sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score

# Load data
iris = load_iris()
X_train, X_test, y_train, y_test = train_test_split(
    iris.data, iris.target, test_size=0.2, random_state=42
)

# Set the experiment name
mlflow.set_experiment("iris-classification")

# Start a run
with mlflow.start_run(run_name="random-forest-v1"):
    # Log parameters
    n_estimators = 100
    max_depth = 5
    mlflow.log_param("n_estimators", n_estimators)
    mlflow.log_param("max_depth", max_depth)
    mlflow.log_param("dataset", "iris")

    # Train model
    model = RandomForestClassifier(n_estimators=n_estimators, max_depth=max_depth)
    model.fit(X_train, y_train)

    # Log metrics
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, average='weighted')

    mlflow.log_metric("accuracy", accuracy)
    mlflow.log_metric("f1_score", f1)

    # Log the trained model
    mlflow.sklearn.log_model(
        model,
        "random-forest-model",
        registered_model_name="iris-classifier"
    )

    print(f"Accuracy: {accuracy:.4f}")
    print(f"F1 Score: {f1:.4f}")
```

## Production Setup: MLflow Tracking Server with PostgreSQL

For team use, run MLflow as a central server with PostgreSQL backend and external artifact storage.

### Install PostgreSQL

```bash
sudo apt-get install -y postgresql postgresql-contrib

sudo systemctl enable --now postgresql

# Create the MLflow database and user
sudo -u postgres psql << 'SQL'
CREATE USER mlflow WITH PASSWORD 'your-strong-password';
CREATE DATABASE mlflow WITH OWNER mlflow;
GRANT ALL PRIVILEGES ON DATABASE mlflow TO mlflow;
\q
SQL
```

### Set Up Artifact Storage

MLflow artifacts (model files, plots, etc.) need a storage location. Options:

**Local filesystem** (for single-server setups):
```bash
sudo mkdir -p /var/lib/mlflow/artifacts
sudo chown mlflow:mlflow /var/lib/mlflow/artifacts
```

**S3-compatible storage** (MinIO for on-premises):
```bash
# Install MinIO
wget https://dl.min.io/server/minio/release/linux-amd64/minio
sudo install -m 755 minio /usr/local/bin/minio

# Create storage directory
sudo mkdir -p /data/minio
sudo chown ubuntu:ubuntu /data/minio

# Start MinIO
MINIO_ROOT_USER=admin \
MINIO_ROOT_PASSWORD=your-minio-password \
minio server /data/minio --console-address ":9001" &

# Create a bucket for MLflow artifacts
mc alias set local http://localhost:9000 admin your-minio-password
mc mb local/mlflow-artifacts
```

### Create the MLflow System User

```bash
sudo useradd --system --home /var/lib/mlflow --shell /bin/false mlflow
sudo mkdir -p /var/lib/mlflow
sudo chown mlflow:mlflow /var/lib/mlflow

# Install MLflow in a system-wide venv
sudo python3 -m venv /opt/mlflow
sudo /opt/mlflow/bin/pip install mlflow psycopg2-binary boto3
```

### Configure Environment Variables

```bash
sudo tee /etc/mlflow/mlflow.env << 'EOF'
# Database backend
MLFLOW_BACKEND_STORE_URI=postgresql://mlflow:your-strong-password@localhost/mlflow

# Artifact store (local or S3)
MLFLOW_DEFAULT_ARTIFACT_ROOT=/var/lib/mlflow/artifacts
# Or for S3/MinIO:
# MLFLOW_DEFAULT_ARTIFACT_ROOT=s3://mlflow-artifacts/

# S3/MinIO credentials (if using object storage)
# AWS_ACCESS_KEY_ID=admin
# AWS_SECRET_ACCESS_KEY=your-minio-password
# MLFLOW_S3_ENDPOINT_URL=http://localhost:9000

# Server settings
MLFLOW_HOST=0.0.0.0
MLFLOW_PORT=5000

# Authentication (optional, for basic security)
# MLFLOW_AUTH_CONFIG_PATH=/etc/mlflow/auth.ini
EOF

sudo chmod 600 /etc/mlflow/mlflow.env
sudo mkdir -p /etc/mlflow
```

### Systemd Service

```bash
sudo tee /etc/systemd/system/mlflow.service << 'EOF'
[Unit]
Description=MLflow Tracking Server
After=postgresql.service network-online.target
Wants=network-online.target

[Service]
Type=simple
User=mlflow
Group=mlflow
EnvironmentFile=/etc/mlflow/mlflow.env

ExecStart=/opt/mlflow/bin/mlflow server \
    --backend-store-uri ${MLFLOW_BACKEND_STORE_URI} \
    --default-artifact-root ${MLFLOW_DEFAULT_ARTIFACT_ROOT} \
    --host ${MLFLOW_HOST} \
    --port ${MLFLOW_PORT} \
    --workers 4

Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable mlflow
sudo systemctl start mlflow

# Verify
sudo journalctl -u mlflow -f
```

Access the UI at `http://your-server:5000`.

## Securing MLflow with Nginx and Basic Auth

```bash
sudo apt-get install -y nginx apache2-utils

# Create htpasswd file
sudo htpasswd -c /etc/nginx/.htpasswd admin
sudo htpasswd /etc/nginx/.htpasswd alice  # Add more users
```

```nginx
# /etc/nginx/sites-available/mlflow
server {
    listen 443 ssl;
    server_name mlflow.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/mlflow.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mlflow.yourdomain.com/privkey.pem;

    # Basic authentication
    auth_basic "MLflow";
    auth_basic_user_file /etc/nginx/.htpasswd;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 300;
    }
}
```

## Connecting Experiments to the Remote Server

```python
import mlflow

# Point to your remote tracking server
mlflow.set_tracking_uri("http://mlflow.yourdomain.com:5000")

# If using basic auth via Nginx
mlflow.set_tracking_uri("http://admin:password@mlflow.yourdomain.com:5000")

# Set the experiment
mlflow.set_experiment("my-project/experiment-1")

with mlflow.start_run():
    mlflow.log_param("learning_rate", 0.001)
    mlflow.log_metric("loss", 0.234)
```

Or set via environment variable:

```bash
export MLFLOW_TRACKING_URI="http://mlflow.yourdomain.com:5000"
python3 train.py  # Uses the remote server automatically
```

## PyTorch Integration

```python
import mlflow
import mlflow.pytorch
import torch
import torch.nn as nn

mlflow.set_experiment("pytorch-experiments")

with mlflow.start_run():
    # Enable automatic logging
    mlflow.pytorch.autolog()

    # ... your training code ...
    # mlflow.pytorch.autolog() will log:
    # - parameters from optimizer
    # - training and validation metrics per epoch
    # - the trained model

    # Or log manually
    for epoch in range(num_epochs):
        train_loss = train_one_epoch(model, train_loader, optimizer)
        val_loss = validate(model, val_loader)

        mlflow.log_metrics({
            "train_loss": train_loss,
            "val_loss": val_loss,
        }, step=epoch)

    # Log the final model
    mlflow.pytorch.log_model(model, "pytorch-model")

    # Log artifacts
    mlflow.log_artifact("training_curve.png")
    mlflow.log_artifact("confusion_matrix.png")
```

## Model Registry

The model registry lets you manage model versions with lifecycle stages:

```python
from mlflow.tracking import MlflowClient

client = MlflowClient()

# Register a model from an existing run
run_id = "your-run-id"
model_uri = f"runs:/{run_id}/model"
mv = mlflow.register_model(model_uri, "MyModel")

# Transition to staging
client.transition_model_version_stage(
    name="MyModel",
    version=mv.version,
    stage="Staging",
    archive_existing_versions=False
)

# After validation, promote to production
client.transition_model_version_stage(
    name="MyModel",
    version=mv.version,
    stage="Production"
)

# Load the production model
model = mlflow.pyfunc.load_model("models:/MyModel/Production")
predictions = model.predict(test_data)
```

## Querying Experiments Programmatically

```python
from mlflow.tracking import MlflowClient

client = MlflowClient()

# Get all experiments
experiments = client.search_experiments()
for exp in experiments:
    print(f"{exp.experiment_id}: {exp.name}")

# Search runs in an experiment
runs = client.search_runs(
    experiment_ids=["1"],
    filter_string="metrics.accuracy > 0.9 AND params.n_estimators = '100'",
    order_by=["metrics.accuracy DESC"],
    max_results=10
)

for run in runs:
    print(f"Run: {run.info.run_id}, Accuracy: {run.data.metrics.get('accuracy', 'N/A')}")
```

## Troubleshooting

**MLflow server can't connect to PostgreSQL:**
```bash
# Test the connection
sudo -u mlflow psql "postgresql://mlflow:password@localhost/mlflow"

# Check PostgreSQL is listening
sudo ss -tlnp | grep 5432

# Check pg_hba.conf allows password auth for local connections
sudo grep -v '^#' /etc/postgresql/*/main/pg_hba.conf
```

**Artifacts not being saved:**
```bash
# Verify the artifact directory is writable by the mlflow user
ls -la /var/lib/mlflow/artifacts
sudo chown -R mlflow:mlflow /var/lib/mlflow/

# For S3/MinIO, check credentials and endpoint
aws s3 ls s3://mlflow-artifacts/ --endpoint-url http://localhost:9000
```

**Runs showing "Failed" status:**
```bash
# Check MLflow server logs
sudo journalctl -u mlflow --since "10 minutes ago"

# Client-side errors are printed to stderr
python3 train.py 2>&1 | tail -50
```

MLflow fits well into a workflow where experiments need to be reproducible and comparable. The combination of parameter logging, metric tracking, and artifact storage means you can always go back to any past run, understand exactly what produced the results, and reproduce them. The model registry adds the governance layer that production deployments need.
