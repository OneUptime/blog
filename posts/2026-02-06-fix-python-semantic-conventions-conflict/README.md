# How to Fix the Python opentelemetry-semantic-conventions Version Conflict When Updating Instrumentation Libraries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Python, Dependencies, Version Conflicts

Description: Resolve the version conflict between opentelemetry-semantic-conventions and instrumentation libraries caused by incompatible version pins.

Updating OpenTelemetry instrumentation libraries in Python frequently results in dependency conflicts with `opentelemetry-semantic-conventions`. Different instrumentation packages pin different versions of the semantic conventions package, and pip cannot satisfy all constraints simultaneously. This post explains how to diagnose and fix these conflicts.

## The Error

```bash
$ pip install opentelemetry-instrumentation-flask==0.44b0
ERROR: pip's dependency resolver does not currently take into account all the packages
that are installed. Required by opentelemetry-instrumentation-flask==0.44b0:
  opentelemetry-semantic-conventions==0.44b0
But opentelemetry-sdk==1.22.0 requires:
  opentelemetry-semantic-conventions==0.43b0
```

Or after installation:

```bash
$ python -c "from opentelemetry.semconv.trace import SpanAttributes"
ImportError: cannot import name 'SpanAttributes' from 'opentelemetry.semconv.trace'
```

## Why This Happens

The OpenTelemetry Python project releases packages in lockstep. The SDK and all instrumentation libraries are released together with matching version numbers. When you install SDK version 1.22 but instrumentation version 0.44, their semantic conventions requirements conflict.

The version mapping follows this pattern:

| SDK Version | Instrumentation Version | Semantic Conventions |
|------------|------------------------|---------------------|
| 1.22.0 | 0.43b0 | 0.43b0 |
| 1.23.0 | 0.44b0 | 0.44b0 |
| 1.24.0 | 0.45b0 | 0.45b0 |

All three must be from the same release.

## Fix 1: Pin All Packages to the Same Release

```txt
# requirements.txt - all from the same release
opentelemetry-api==1.23.0
opentelemetry-sdk==1.23.0
opentelemetry-semantic-conventions==0.44b0
opentelemetry-exporter-otlp-proto-http==1.23.0
opentelemetry-instrumentation==0.44b0
opentelemetry-instrumentation-flask==0.44b0
opentelemetry-instrumentation-requests==0.44b0
opentelemetry-instrumentation-sqlalchemy==0.44b0
```

Use compatible release specifiers to allow patch updates:

```txt
# Allow patch updates within the same minor version
opentelemetry-api~=1.23.0
opentelemetry-sdk~=1.23.0
opentelemetry-semantic-conventions~=0.44b0
```

## Fix 2: Use opentelemetry-distro for Version Management

The `opentelemetry-distro` package provides a meta-package that pulls in compatible versions:

```bash
pip install opentelemetry-distro==0.44b0
```

This installs the SDK, API, and semantic conventions with compatible versions automatically.

## Fix 3: Let pip Resolve Dependencies

Instead of pinning individual packages, install from a clean state:

```bash
# Remove all OpenTelemetry packages
pip freeze | grep opentelemetry | xargs pip uninstall -y

# Install the SDK first (it pins the correct semantic-conventions)
pip install opentelemetry-sdk==1.23.0

# Then install instrumentations from the same release
pip install opentelemetry-instrumentation-flask==0.44b0
```

## Fix 4: Use Constraints Files

Create a constraints file that ensures version consistency:

```txt
# otel-constraints.txt
opentelemetry-api==1.23.0
opentelemetry-sdk==1.23.0
opentelemetry-semantic-conventions==0.44b0
opentelemetry-instrumentation==0.44b0
```

```bash
pip install -c otel-constraints.txt opentelemetry-instrumentation-flask
```

The constraints file forces pip to use the specified versions regardless of what the packages request.

## Diagnosing the Conflict

Use pip to check for conflicts:

```bash
# Check installed versions
pip list | grep opentelemetry

# Check for conflicts
pip check
```

Example output:

```
opentelemetry-instrumentation-flask 0.44b0 requires
  opentelemetry-semantic-conventions==0.44b0,
  but you have opentelemetry-semantic-conventions 0.43b0.
```

## pyproject.toml Setup

```toml
[project]
dependencies = [
    "opentelemetry-api~=1.23.0",
    "opentelemetry-sdk~=1.23.0",
    "opentelemetry-semantic-conventions~=0.44b0",
    "opentelemetry-exporter-otlp-proto-http~=1.23.0",
    "opentelemetry-instrumentation-flask~=0.44b0",
    "opentelemetry-instrumentation-requests~=0.44b0",
]
```

## Updating All Packages Together

When upgrading, update everything at once:

```bash
# Find the latest compatible set
pip install --upgrade \
    opentelemetry-api \
    opentelemetry-sdk \
    opentelemetry-semantic-conventions \
    opentelemetry-exporter-otlp-proto-http \
    opentelemetry-instrumentation-flask \
    opentelemetry-instrumentation-requests
```

Or use the distro package:

```bash
pip install --upgrade opentelemetry-distro
opentelemetry-bootstrap -a install
```

The `opentelemetry-bootstrap` command detects your installed libraries and installs the matching instrumentation packages.

## Creating an Update Script

```bash
#!/bin/bash
# update-otel.sh

OTEL_VERSION="1.23.0"
INSTRUMENTATION_VERSION="0.44b0"

pip install \
    "opentelemetry-api==${OTEL_VERSION}" \
    "opentelemetry-sdk==${OTEL_VERSION}" \
    "opentelemetry-semantic-conventions==${INSTRUMENTATION_VERSION}" \
    "opentelemetry-exporter-otlp-proto-http==${OTEL_VERSION}" \
    "opentelemetry-instrumentation==${INSTRUMENTATION_VERSION}" \

# Install instrumentations
opentelemetry-bootstrap -a install

# Verify no conflicts
pip check | grep opentelemetry
```

The rule of thumb is simple: all OpenTelemetry Python packages must be from the same release. Never mix versions from different releases. When updating, update everything together.
