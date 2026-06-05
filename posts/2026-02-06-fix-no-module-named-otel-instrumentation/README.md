# How to Fix the 'No Module Named opentelemetry.instrumentation' Error After

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Python, Installation, Troubleshooting

Description: Resolve the ModuleNotFoundError for opentelemetry.instrumentation by fixing common Python package installation issues.

The error `ModuleNotFoundError: No module named 'opentelemetry.instrumentation'` appears even after you have installed the OpenTelemetry instrumentation packages. This typically means the packages were installed in a different Python environment than the one running your application. Here is how to diagnose and fix it.

## Common Causes

### Cause 1: Wrong Python Environment

You installed with one Python but run with another:

```bash
# Installed with system pip

pip install opentelemetry-instrumentation-flask

# But running with a virtualenv Python
python app.py  # Uses virtualenv that does not have the package
```

**Diagnosis:**

```bash
# Check which Python is running
which python
python --version

# Check which pip is installing
which pip
pip --version

# They should point to the same environment
```

**Fix:**

```bash
# Activate the correct virtualenv
source .venv/bin/activate

# Or use the virtualenv's pip directly
.venv/bin/pip install opentelemetry-instrumentation-flask

# Verify installation
.venv/bin/python -c "import opentelemetry.instrumentation; print('OK')"
```

### Cause 2: Missing the Base Package

Individual instrumentation packages depend on `opentelemetry-instrumentation` (the base package), and pip normally installs it automatically. If the dependency is missing because an install was interrupted or packages were copied between environments:

```bash
pip install opentelemetry-instrumentation
pip install opentelemetry-instrumentation-flask
```

### Cause 3: Namespace Package Conflict

OpenTelemetry uses Python namespace packages (`opentelemetry` is split across multiple packages). If one package is installed in editable mode or a `.pth` file conflicts, the namespace resolution breaks.

**Diagnosis:**

```python
import opentelemetry
print(opentelemetry.__path__)
# Should point to the expected site-packages directory or directories
```

**Fix:**

```bash
# Reinstall all OpenTelemetry packages
pip freeze | grep opentelemetry | xargs pip uninstall -y
pip install opentelemetry-sdk opentelemetry-instrumentation-flask
```

### Cause 4: Docker COPY Order

In Docker, if you install packages and then COPY a directory that overwrites the virtual environment:

```dockerfile
# BROKEN
FROM python:3.12
WORKDIR /app
RUN python -m venv .venv
RUN .venv/bin/pip install opentelemetry-instrumentation-flask
COPY . .  # This might overwrite .venv if your build context contains a local .venv
```

**Fix:**

```dockerfile
FROM python:3.12
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .  # Copy app code, with virtual environments excluded by .dockerignore
```

```dockerignore
.venv
venv
```

### Cause 5: Using opentelemetry-instrument Without Installation

The `opentelemetry-instrument` CLI requires the instrumentation packages to be installed separately:

```bash
# This alone does not install flask instrumentation
pip install opentelemetry-distro

# You also need the specific instrumentation
pip install opentelemetry-instrumentation-flask

# Or use bootstrap to auto-install
opentelemetry-bootstrap -a install
```

## The Complete Installation Process

```bash
# 1. Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate

# 2. Install your application dependencies
pip install flask requests sqlalchemy

# 3. Install OpenTelemetry core
pip install opentelemetry-api opentelemetry-sdk

# 4. Install the exporter
pip install opentelemetry-exporter-otlp-proto-http

# 5. Install the auto-instrumentation CLI
pip install opentelemetry-distro

# 6. Auto-detect and install instrumentations for your libraries
opentelemetry-bootstrap -a install

# 7. Verify
python -c "from opentelemetry.instrumentation.flask import FlaskInstrumentor; print('OK')"
```

## Verifying the Installation

```bash
# List all installed OpenTelemetry packages
pip list | grep opentelemetry

# Expected output:
# opentelemetry-api                    1.42.1
# opentelemetry-sdk                    1.42.1
# opentelemetry-semantic-conventions   0.63b1
# opentelemetry-instrumentation        0.63b1
# opentelemetry-instrumentation-flask  0.63b1
# opentelemetry-exporter-otlp-proto-http 1.42.1
```

If `opentelemetry-instrumentation` (without a suffix) is missing, install it:

```bash
pip install opentelemetry-instrumentation
```

## requirements.txt Template

```txt
# Core
opentelemetry-api>=1.42.1,<2.0
opentelemetry-sdk>=1.42.1,<2.0
opentelemetry-semantic-conventions>=0.63b1

# Exporter
opentelemetry-exporter-otlp-proto-http>=1.42.1,<2.0

# Instrumentation base (required)
opentelemetry-instrumentation>=0.63b1

# Individual instrumentations
opentelemetry-instrumentation-flask>=0.63b1
opentelemetry-instrumentation-requests>=0.63b1
opentelemetry-instrumentation-sqlalchemy>=0.63b1

# Auto-instrumentation CLI
opentelemetry-distro>=0.63b1
```

The most common cause of this error is a mismatch between the Python environment where packages are installed and where your application runs. Always verify with `which python` and `pip list` that you are using the same environment.
