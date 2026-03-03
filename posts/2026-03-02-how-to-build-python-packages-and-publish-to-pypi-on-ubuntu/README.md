# How to Build Python Packages and Publish to PyPI on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Python, PyPI, Package Management, Development

Description: Step-by-step guide to building Python packages and publishing them to PyPI from Ubuntu, covering project structure, build tools, and the upload process.

---

Publishing a Python package to PyPI is something many developers put off because the packaging ecosystem has historically been confusing. The good news is that modern tools like `build` and `twine` have made the process straightforward. This guide walks through the full workflow on Ubuntu, from project structure to live package.

## Prerequisites

You'll need Python 3 and pip installed. Most Ubuntu versions ship with Python 3, but confirm:

```bash
python3 --version
pip3 --version
```

Install the required build tools:

```bash
# Install build, twine, and wheel
pip3 install --upgrade build twine

# If you're using a virtual environment (recommended)
python3 -m venv packaging-env
source packaging-env/bin/activate
pip install --upgrade build twine
```

## Project Structure

A well-structured Python package looks like this:

```text
mypackage/
├── src/
│   └── mypackage/
│       ├── __init__.py
│       └── core.py
├── tests/
│   └── test_core.py
├── pyproject.toml
├── README.md
└── LICENSE
```

Using a `src/` layout is the modern recommendation. It prevents the package directory from being accidentally importable without installation, which catches bugs that only appear after packaging.

### The `__init__.py` File

```python
# src/mypackage/__init__.py
# Expose the public API from this file
__version__ = "0.1.0"

from .core import main_function

__all__ = ["main_function"]
```

### A Simple Module

```python
# src/mypackage/core.py

def main_function(name: str) -> str:
    """Return a greeting for the given name."""
    return f"Hello, {name}!"
```

## Configuring `pyproject.toml`

Modern Python packaging uses `pyproject.toml` as the single configuration file. Replace the old `setup.py` and `setup.cfg` approach with this:

```toml
[build-system]
# Specify the build backend
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "mypackage"
version = "0.1.0"
description = "A short description of what your package does"
readme = "README.md"
license = {file = "LICENSE"}
authors = [
  {name = "Your Name", email = "you@example.com"},
]
requires-python = ">=3.9"
dependencies = [
    "requests>=2.28.0",
]
classifiers = [
    "Programming Language :: Python :: 3",
    "License :: OSI Approved :: MIT License",
    "Operating System :: OS Independent",
]

[project.urls]
Homepage = "https://github.com/yourusername/mypackage"
Repository = "https://github.com/yourusername/mypackage"
Issues = "https://github.com/yourusername/mypackage/issues"

[tool.hatch.build.targets.wheel]
# Tell hatchling where to find the package
packages = ["src/mypackage"]
```

If you prefer setuptools (more traditional):

```toml
[build-system]
requires = ["setuptools>=68", "wheel"]
build-backend = "setuptools.backends.legacy:build"

[project]
name = "mypackage"
version = "0.1.0"
# ... rest of config same as above

[tool.setuptools.packages.find]
where = ["src"]
```

## Building the Distribution Files

With `pyproject.toml` configured, build both the source distribution (sdist) and wheel:

```bash
# Run from the project root directory
python3 -m build
```

This creates a `dist/` directory with two files:

```text
dist/
├── mypackage-0.1.0.tar.gz    # Source distribution
└── mypackage-0.1.0-py3-none-any.whl  # Wheel
```

The `.tar.gz` contains your source code and is used when there's no matching wheel. The `.whl` is what most users will download - it installs faster.

## Setting Up PyPI Credentials

### Create a PyPI Account

Go to [pypi.org](https://pypi.org) and create an account. Enable two-factor authentication while you're there.

### Generate an API Token

In your PyPI account settings, create an API token. Give it a descriptive name and scope it to the specific project if it already exists, or to your entire account for first-time uploads.

### Store Credentials

Create a `.pypirc` file in your home directory:

```ini
# ~/.pypirc
[distutils]
index-servers =
    pypi
    testpypi

[pypi]
username = __token__
password = pypi-AgEIcH...your-token-here...

[testpypi]
repository = https://test.pypi.org/legacy/
username = __token__
password = pypi-AgEIcH...your-testpypi-token...
```

Set appropriate permissions on this file:

```bash
chmod 600 ~/.pypirc
```

## Testing with TestPyPI First

Always upload to TestPyPI before the real PyPI. TestPyPI is a separate instance for testing:

```bash
# Upload to TestPyPI
twine upload --repository testpypi dist/*

# Test installing from TestPyPI
pip install --index-url https://test.pypi.org/simple/ mypackage
```

Verify the package installs and works correctly:

```python
import mypackage
print(mypackage.main_function("World"))
# Expected: Hello, World!
```

## Publishing to PyPI

Once you've confirmed everything works on TestPyPI:

```bash
# Upload to the real PyPI
twine upload dist/*
```

Your package is now live at `https://pypi.org/project/mypackage/`.

Users can install it with:

```bash
pip install mypackage
```

## Versioning and Updates

When you make changes and want to release a new version:

1. Update the version in `pyproject.toml`
2. Update your `CHANGELOG` or release notes
3. Rebuild: `python3 -m build`
4. Upload: `twine upload dist/*`

PyPI does not allow re-uploading a file with the same version number. If you make a mistake and need to fix it, you must bump the version.

A common versioning approach following semantic versioning (semver):

```text
0.1.0  -> initial release
0.1.1  -> bug fix
0.2.0  -> new feature, backwards compatible
1.0.0  -> stable release or breaking changes
```

## Automating Releases with GitHub Actions

For packages hosted on GitHub, automate the PyPI upload:

```yaml
# .github/workflows/publish.yml
name: Publish to PyPI

on:
  release:
    types: [published]

jobs:
  build-and-publish:
    runs-on: ubuntu-latest
    permissions:
      id-token: write  # Required for trusted publishing

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install build tools
        run: pip install build

      - name: Build package
        run: python -m build

      - name: Publish to PyPI
        uses: pypa/gh-action-pypi-publish@release/v1
        # Uses PyPI's trusted publishing - no token needed in secrets
```

With PyPI's trusted publishing, you don't even need to store tokens in GitHub secrets. Configure it on the PyPI project settings page.

## Common Issues

**Package not found after upload** - PyPI has a short propagation delay. Wait a minute and try again.

**`InvalidDistribution` error from twine** - Often means the package metadata is malformed. Run `twine check dist/*` before uploading to catch these issues early.

**Missing files in the distribution** - If you have non-Python files (data files, templates) to include, configure them explicitly:

```toml
[tool.hatch.build.targets.wheel]
packages = ["src/mypackage"]

[tool.hatch.build.targets.sdist]
include = [
    "src/",
    "tests/",
    "README.md",
    "LICENSE",
]
```

Building and publishing Python packages on Ubuntu is well-supported with modern tooling. The initial setup takes some time, but once you have a working `pyproject.toml` and CI pipeline, releasing new versions becomes a matter of a few commands or a git tag.
