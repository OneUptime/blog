# `mlrun` Is Missing in an Iguazio Jupyter Service: How to Align the Notebook Client with the Cluster Version

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MLOps, Jupyter, Python, Troubleshooting

Description: Repair a missing MLRun notebook package by checking the active Jupyter kernel, using Iguazio version alignment, and verifying client and runtime compatibility.

An Iguazio cluster can have a healthy MLRun service while a notebook raises `ModuleNotFoundError: No module named 'mlrun'`. The service and Python client are separate components. The notebook needs the package in the environment used by its active kernel.

Before installing anything, distinguish a missing package from an import that reaches MLRun and then fails while connecting to the API. A 404, authentication failure, or version warning is a different problem from Python being unable to locate the module.

## Identify the active kernel

Run this cell in the failing notebook:

```python
import sys
from importlib import metadata, util

print("Python:", sys.executable)
print("Version:", sys.version.split()[0])
print("Module found:", util.find_spec("mlrun") is not None)
try:
    print("Installed MLRun:", metadata.version("mlrun"))
except metadata.PackageNotFoundError:
    print("MLRun distribution is not installed in this kernel")
```

Package metadata inspection does not require importing MLRun, which is useful when import triggers a configuration error. Compare the interpreter path with the selected kernel and the environment in your Jupyter terminal. A terminal's `pip` can install into a different environment without affecting this notebook.

Iguazio documents preconfigured environments such as `mlrun-base` and `mlrun-extended` in its [Conda environment guide](https://www.iguazio.com/docs/v3.5/services/create-python-virt-env-conda/). Names and contents depend on the platform image. Select the intended MLRun kernel when one is already available before modifying the environment used by the Jupyter server itself.

## Align with the cluster service

Record the MLRun service version from the platform service information or your administrator's deployment record. Do not confuse the Iguazio platform version with the MLRun package version; the [support matrix](https://www.iguazio.com/docs/latest-release/cluster-mgmt/deployment/support-matrix/) lists these components separately.

For a platform-provided Jupyter service, Iguazio supplies an alignment script in the user's mounted home directory. Its [MLRun service documentation](https://www.iguazio.com/docs/latest-release/services/app-services/mlops-services/mlops-services/) identifies this supported installation/update path:

```ipython
!/User/align_mlrun.sh
```

This is notebook shell syntax. Use the platform's script for that service and review its output for the selected package version and any installation failures. If the file is absent, first check whether this is a custom notebook image or a different platform release; do not download an unrelated script with the same filename.

Restart the kernel after the installation completes. Modules imported earlier remain in memory, so a successful package upgrade on disk does not replace objects already loaded in the running Python process.

## Handle a custom environment deliberately

For a custom kernel or local IDE, install the reviewed MLRun version into that interpreter. This example prompts for the version chosen for your cluster instead of selecting a public latest release:

```python
import subprocess
import sys

approved_version = input("MLRun version approved for this cluster: ").strip()
if not approved_version:
    raise ValueError("A reviewed version is required")
subprocess.check_call([
    sys.executable, "-m", "pip", "install", f"mlrun=={approved_version}"
])
```

Follow the [client setup guide](https://docs.mlrun.org/en/stable/setup-guide.html) for the supported Python version, extras, and compatibility policy of that release. Feature-store compatibility can be stricter than the general client/server compatibility window. Matching the cluster's package version is a clear troubleshooting baseline.

Keep MLRun in the same requirements resolution as the other packages you add. An unrelated upgrade can otherwise replace a dependency that the selected MLRun version requires. Use your organization's package repository and certificate configuration if the environment is restricted.

## Verify import, connection, and execution separately

After restarting the kernel, repeat the metadata cell, then import MLRun and inspect `mlrun.__version__`. Next perform a permitted read-only API operation, such as loading an existing project. A successful import establishes Python installation; a successful API call establishes configuration and authentication.

Finally, run a small existing test function through the intended runtime and inspect its image. The notebook environment and remote function image are separate dependency sets. Installing a package into Jupyter does not update an already-built job or serving image.

Record the interpreter path, client version, server version, and runtime image together. Repeat the check after a Jupyter service restart to confirm the installation persists under your image and environment strategy. This turns a one-cell repair into a reproducible development environment instead of a package that disappears at the next restart.
