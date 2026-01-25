# How to Configure DVC for Data Versioning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DVC, Data Versioning, MLOps, Git, Machine Learning

Description: Learn how to use DVC for versioning datasets and ML models, creating reproducible pipelines, and collaborating on ML projects with Git-like workflows.

---

Git tracks code changes brilliantly, but it struggles with large files like datasets and model weights. DVC (Data Version Control) extends Git to handle large files and ML pipelines. Your data stays in cloud storage while DVC tracks versions through lightweight pointer files in Git.

## Why DVC?

DVC solves common ML data challenges:

- Version control for large datasets and models
- Reproducible ML pipelines
- Storage-agnostic (S3, GCS, Azure, SSH, local)
- Git-based workflow for collaboration
- Experiment tracking and comparison
- Works with any ML framework

## Installation

Install DVC with your storage backend:

```bash
# Core DVC
pip install dvc

# With S3 support
pip install "dvc[s3]"

# With Google Cloud Storage
pip install "dvc[gs]"

# With Azure Blob Storage
pip install "dvc[azure]"

# With SSH/SFTP support
pip install "dvc[ssh]"

# All backends
pip install "dvc[all]"
```

## Getting Started

Initialize DVC in an existing Git repository:

```bash
# Initialize DVC (creates .dvc directory)
dvc init

# The initialization creates these files
git status
# .dvc/.gitignore
# .dvc/config
# .dvcignore

# Commit DVC initialization
git add .dvc
git commit -m "Initialize DVC"
```

## Tracking Data Files

Add data files to DVC tracking:

```bash
# Add a single file
dvc add data/training_data.csv

# Add an entire directory
dvc add data/images/

# DVC creates pointer files (.dvc files)
ls data/
# training_data.csv
# training_data.csv.dvc  <- This is tracked by Git

# The .dvc file contains hash and size
cat data/training_data.csv.dvc
# outs:
# - md5: abc123...
#   size: 1048576
#   path: training_data.csv

# Add pointer files to Git
git add data/training_data.csv.dvc data/.gitignore
git commit -m "Add training data"
```

## Configuring Remote Storage

Set up remote storage for your data:

```bash
# Add S3 remote
dvc remote add -d myremote s3://mybucket/dvc-storage

# Or Google Cloud Storage
dvc remote add -d myremote gs://mybucket/dvc-storage

# Or Azure Blob Storage
dvc remote add -d myremote azure://mycontainer/dvc-storage

# Or SSH server
dvc remote add -d myremote ssh://user@server:/path/to/storage

# Or local/network path
dvc remote add -d myremote /mnt/shared/dvc-storage

# Configure credentials (for S3)
dvc remote modify myremote access_key_id 'your-key'
dvc remote modify myremote secret_access_key 'your-secret'

# Or use environment variables / IAM roles (recommended)
dvc remote modify myremote profile 'my-aws-profile'

# Push data to remote
dvc push

# Commit remote configuration
git add .dvc/config
git commit -m "Configure DVC remote storage"
```

## Basic Workflow

```bash
# Clone a project with DVC
git clone https://github.com/example/ml-project.git
cd ml-project

# Pull the data from remote storage
dvc pull

# Make changes to data
python scripts/augment_data.py

# Track the changes
dvc add data/training_data.csv

# Commit both code and data changes
git add data/training_data.csv.dvc scripts/augment_data.py
git commit -m "Add data augmentation"

# Push data to remote
dvc push

# Push code to Git
git push
```

## Creating Reproducible Pipelines

Define ML pipelines that DVC can track and reproduce:

```yaml
# dvc.yaml
stages:
  prepare:
    cmd: python src/prepare.py
    deps:
      - src/prepare.py
      - data/raw/
    params:
      - prepare.split_ratio
      - prepare.seed
    outs:
      - data/prepared/

  featurize:
    cmd: python src/featurize.py
    deps:
      - src/featurize.py
      - data/prepared/
    params:
      - featurize.max_features
      - featurize.ngrams
    outs:
      - data/features/

  train:
    cmd: python src/train.py
    deps:
      - src/train.py
      - data/features/
    params:
      - train.n_estimators
      - train.max_depth
      - train.learning_rate
    outs:
      - models/model.pkl
    metrics:
      - metrics/train_metrics.json:
          cache: false

  evaluate:
    cmd: python src/evaluate.py
    deps:
      - src/evaluate.py
      - models/model.pkl
      - data/features/
    metrics:
      - metrics/eval_metrics.json:
          cache: false
    plots:
      - metrics/plots/:
          cache: false
```

Define parameters in `params.yaml`:

```yaml
# params.yaml
prepare:
  split_ratio: 0.2
  seed: 42

featurize:
  max_features: 5000
  ngrams: 2

train:
  n_estimators: 100
  max_depth: 10
  learning_rate: 0.1
```

Access parameters in your code:

```python
# src/train.py
import yaml
import pickle
import json
from sklearn.ensemble import GradientBoostingClassifier

# Load parameters
with open("params.yaml") as f:
    params = yaml.safe_load(f)

train_params = params["train"]

# Load features
# (code to load data/features/)

# Train model
model = GradientBoostingClassifier(
    n_estimators=train_params["n_estimators"],
    max_depth=train_params["max_depth"],
    learning_rate=train_params["learning_rate"]
)
model.fit(X_train, y_train)

# Save model
with open("models/model.pkl", "wb") as f:
    pickle.dump(model, f)

# Save metrics
metrics = {
    "train_accuracy": model.score(X_train, y_train),
    "params": train_params
}
with open("metrics/train_metrics.json", "w") as f:
    json.dump(metrics, f, indent=2)
```

## Running Pipelines

```bash
# Run the entire pipeline
dvc repro

# Run a specific stage
dvc repro train

# Force re-run even if nothing changed
dvc repro -f

# Show pipeline graph
dvc dag

# Show what would run without running
dvc repro --dry
```

## Experiment Tracking

DVC tracks experiments automatically:

```bash
# Run an experiment with different parameters
dvc exp run -S train.n_estimators=200 -S train.max_depth=15

# Run multiple experiments in parallel
dvc exp run --queue -S train.n_estimators=100
dvc exp run --queue -S train.n_estimators=200
dvc exp run --queue -S train.n_estimators=300
dvc exp run --run-all --parallel 4

# List experiments
dvc exp show

# Compare experiments
dvc exp diff exp-abc123 exp-def456

# Apply an experiment to workspace
dvc exp apply exp-abc123

# Create a Git branch from an experiment
dvc exp branch exp-abc123 best-model

# Remove experiments
dvc exp remove exp-abc123
```

## Comparing Metrics

```bash
# Show current metrics
dvc metrics show

# Compare metrics across Git commits
dvc metrics diff HEAD~1

# Compare with specific revision
dvc metrics diff v1.0.0

# Show as table
dvc metrics show --all-commits

# Export metrics
dvc metrics show --json > metrics_report.json
```

## Plots and Visualization

Create plots from logged metrics:

```bash
# Generate plots
dvc plots show

# Compare plots across experiments
dvc plots diff exp-abc123 exp-def456

# Customize plot output
dvc plots show -o custom_plots/
```

Configure plots in `dvc.yaml`:

```yaml
plots:
  - metrics/roc_curve.csv:
      x: fpr
      y: tpr
      title: "ROC Curve"
  - metrics/training_loss.csv:
      x: epoch
      y: loss
      title: "Training Loss"
```

## Data Registry

Create a central data registry for your organization:

```bash
# Create a dedicated data registry repository
mkdir data-registry && cd data-registry
git init
dvc init

# Add datasets
dvc add datasets/customer_data_v1.parquet
dvc add datasets/product_images/

# Push to remote storage
dvc remote add -d registry s3://company-data-registry/
dvc push

# Tag versions
git add .
git commit -m "Customer data v1"
git tag -a customer-data-v1 -m "Initial customer dataset"
git push --tags

# In other projects, import from registry
dvc import https://github.com/company/data-registry \
    datasets/customer_data_v1.parquet \
    -o data/customers.parquet

# Update when registry changes
dvc update data/customers.parquet.dvc
```

## CI/CD Integration

Integrate DVC with your CI pipeline:

```yaml
# .github/workflows/ml-pipeline.yml
name: ML Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  train:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'

      - name: Install dependencies
        run: |
          pip install dvc[s3] pandas scikit-learn

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Pull data
        run: dvc pull

      - name: Run pipeline
        run: dvc repro

      - name: Push results
        if: github.ref == 'refs/heads/main'
        run: |
          dvc push
          git add dvc.lock metrics/
          git commit -m "Update pipeline results [skip ci]" || true
          git push
```

## Best Practices

1. **Keep .dvc files in Git**: They are lightweight pointers to your data
2. **Use meaningful commit messages**: Describe both code and data changes
3. **Tag important versions**: Makes it easy to reproduce specific model versions
4. **Separate raw and processed data**: Makes pipelines cleaner
5. **Use params.yaml**: Keeps hyperparameters separate from code
6. **Set up remote storage early**: Enables collaboration from the start

```bash
# Example project structure
my-ml-project/
  data/
    raw/              # Original data (DVC tracked)
    processed/        # Pipeline outputs (DVC tracked)
  models/             # Trained models (DVC tracked)
  src/
    prepare.py
    train.py
    evaluate.py
  metrics/            # Metrics files (Git tracked)
  params.yaml         # Parameters (Git tracked)
  dvc.yaml            # Pipeline definition (Git tracked)
  dvc.lock            # Pipeline state (Git tracked)
  requirements.txt
```

---

DVC brings Git-like version control to ML datasets and models. Start by tracking your data files, then graduate to pipelines as your workflow matures. The Git integration means your existing collaboration workflow transfers directly to data versioning.
