# How to Troubleshoot OpenTelemetry Python Auto-Instrumentation Not Working After Running uv sync

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Python, uv, Package Management

Description: Fix OpenTelemetry auto-instrumentation failures caused by uv sync removing or not installing instrumentation packages correctly.

The `uv` package manager is gaining popularity as a fast alternative to pip and poetry. However, running `uv sync` can break OpenTelemetry auto-instrumentation by removing packages that were installed separately or by placing packages in a virtual environment that `opentelemetry-instrument` cannot find.

## The Problem

After running `uv sync`, the `opentelemetry-instrument` command fails:

```bash
$ opentelemetry-instrument python app.py
# No spans are produced, or you get import errors
```

Or you see errors like:

```
ModuleNotFoundError: No module named 'opentelemetry.instrumentation.flask'
```

## Why uv sync Breaks Things

`uv sync` reads your `pyproject.toml` and installs exactly those dependencies, removing anything not listed. If your OpenTelemetry instrumentation packages were installed via `opentelemetry-bootstrap -a install` (which pip-installs packages directly), `uv sync` removes them because they are not in `pyproject.toml`.

## Fix 1: Add All Instrumentation Packages to pyproject.toml

List every OpenTelemetry package explicitly:

```toml
# pyproject.toml
[project]
name = "my-service"
version = "0.1.0"
dependencies = [
    "flask>=3.0",
    "opentelemetry-api>=1.20",
    "opentelemetry-sdk>=1.20",
    "opentelemetry-exporter-otlp-proto-http>=1.20",
    "opentelemetry-instrumentation-flask>=0.42b0",
    "opentelemetry-instrumentation-requests>=0.42b0",
    "opentelemetry-instrumentation-sqlalchemy>=0.42b0",
]
```

Then run:

```bash
uv sync
```

All packages are now tracked by uv and will not be removed on subsequent syncs.

## Fix 2: Use opentelemetry-bootstrap to Discover Needed Packages

The `opentelemetry-bootstrap` command detects which instrumentation packages you need based on your installed libraries:

```bash
# First, install the bootstrap tool
uv pip install opentelemetry-instrumentation

# List the required instrumentation packages
opentelemetry-bootstrap --action=requirements
```

This outputs something like:

```
opentelemetry-instrumentation-flask==0.42b0
opentelemetry-instrumentation-requests==0.42b0
opentelemetry-instrumentation-sqlalchemy==0.42b0
```

Add these to your `pyproject.toml` dependencies and run `uv sync` again.

## Fix 3: Use uv pip install Instead of uv sync

If you do not want to modify `pyproject.toml`, install instrumentation packages directly into the virtual environment:

```bash
# Install project dependencies
uv sync

# Then install instrumentation packages separately
uv pip install opentelemetry-instrumentation-flask
uv pip install opentelemetry-instrumentation-requests
```

But be aware that the next `uv sync` will remove these packages again. This is a temporary fix.

## Fix 4: Use Optional Dependencies Group

Group OpenTelemetry packages as optional dependencies:

```toml
# pyproject.toml
[project.optional-dependencies]
telemetry = [
    "opentelemetry-api>=1.20",
    "opentelemetry-sdk>=1.20",
    "opentelemetry-exporter-otlp-proto-http>=1.20",
    "opentelemetry-instrumentation>=0.42b0",
    "opentelemetry-instrumentation-flask>=0.42b0",
    "opentelemetry-instrumentation-requests>=0.42b0",
]
```

Install with:

```bash
uv sync --extra telemetry
```

This makes tracing optional, which is useful if you want to run without it in development.

## Verifying the Installation

After installing, verify that all packages are present:

```bash
# Check that the instrumentation CLI is available
uv run opentelemetry-instrument --help

# Check installed instrumentation packages
uv run pip list | grep opentelemetry

# Verify bootstrap finds what it needs
uv run opentelemetry-bootstrap --action=requirements
```

If `opentelemetry-bootstrap --action=requirements` returns an empty list, all needed instrumentations are installed.

## Running with uv

When using `uv`, prefix your commands to use the virtual environment:

```bash
# Run with auto-instrumentation
uv run opentelemetry-instrument \
    --service_name my-service \
    python app.py
```

Or set environment variables:

```bash
OTEL_SERVICE_NAME=my-service \
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 \
uv run opentelemetry-instrument python app.py
```

## The Script Approach

Create a run script that handles everything:

```bash
#!/bin/bash
# run.sh

# Ensure all OpenTelemetry packages are installed
uv sync --extra telemetry

# Run with auto-instrumentation
export OTEL_SERVICE_NAME=${OTEL_SERVICE_NAME:-my-service}
export OTEL_EXPORTER_OTLP_ENDPOINT=${OTEL_EXPORTER_OTLP_ENDPOINT:-http://localhost:4318}

uv run opentelemetry-instrument python app.py
```

## Docker with uv

```dockerfile
FROM python:3.12-slim
WORKDIR /app

# Install uv
RUN pip install uv

COPY pyproject.toml uv.lock ./
RUN uv sync --extra telemetry --frozen

COPY . .

CMD ["uv", "run", "opentelemetry-instrument", "python", "app.py"]
```

The key takeaway is that `uv sync` is strict about only keeping listed dependencies. Always list your OpenTelemetry packages in `pyproject.toml` so they survive the sync process. Using the optional dependencies group gives you flexibility to include or exclude tracing per environment.
