# How to Set Up uv (Fast Python Package Manager) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Python, uv, Package Management, Development

Description: Learn how to install and use uv - the extremely fast Python package manager written in Rust - on Ubuntu for managing Python versions, virtual environments, and dependencies.

---

uv is a Python package manager written in Rust by Astral (the team behind Ruff). It is a drop-in replacement for pip, pip-tools, virtualenv, pyenv, and pipenv - handling all aspects of Python environment management from a single binary. Its primary appeal is speed: dependency resolution and package installation that takes minutes with pip completes in seconds with uv.

Benchmarks from Astral show uv is typically 10-100x faster than pip for dependency resolution, primarily because of the Rust implementation and a better-designed resolver.

## What uv Replaces

| Tool | uv equivalent |
|---|---|
| `pip install` | `uv pip install` |
| `virtualenv` / `python -m venv` | `uv venv` |
| `pip-compile` (pip-tools) | `uv pip compile` |
| `pyenv install` | `uv python install` |
| `pipenv` | `uv` project commands |
| `poetry` | `uv` project commands |

## Prerequisites

- Ubuntu 20.04 or 22.04
- Internet access for installation

## Installation

The recommended installation method is via the official installer script:

```bash
# Install via the standalone installer
curl -LsSf https://astral.sh/uv/install.sh | sh

# Or use pipx if you prefer
pipx install uv

# Or download a specific version directly
wget https://github.com/astral-sh/uv/releases/latest/download/uv-x86_64-unknown-linux-gnu.tar.gz
tar -xzf uv-x86_64-unknown-linux-gnu.tar.gz
sudo install -m 755 uv /usr/local/bin/
sudo install -m 755 uvx /usr/local/bin/
```

Add to PATH (if using the installer script):

```bash
# The installer adds this automatically, but verify it is in ~/.bashrc or ~/.zshrc
source ~/.bashrc  # or ~/.zshrc

# Verify
uv --version
```

## Installing Python Versions

uv can install and manage Python versions directly, without needing pyenv:

```bash
# Install a specific Python version
uv python install 3.11
uv python install 3.12
uv python install 3.13

# List available Python versions
uv python list

# List installed Python versions
uv python list --only-installed

# Show where the installed Pythons are located
uv python find 3.11
```

Python installations are stored in `~/.local/share/uv/python/` and do not interfere with system Python.

## Creating Virtual Environments

```bash
# Create a venv using the system Python
uv venv

# Create with a specific Python version
uv venv --python 3.11
uv venv --python 3.12.0

# Create in a specific directory
uv venv myenv

# Create with a specific name in the default location
uv venv .venv  # Creates .venv/ in current directory

# Activate (standard activation - same as virtualenv)
source .venv/bin/activate

# Deactivate
deactivate
```

## Using uv as a pip Drop-in

uv's `pip` subcommand is a near-perfect replacement for pip:

```bash
# Install packages (works exactly like pip)
uv pip install requests flask
uv pip install "django>=4.2,<5.0"

# Install from requirements.txt
uv pip install -r requirements.txt

# Install in development mode
uv pip install -e .

# Uninstall
uv pip uninstall requests

# List installed packages
uv pip list

# Show package info
uv pip show requests

# Check for outdated packages
uv pip list --outdated
```

The speed difference is most noticeable with complex dependency sets:

```bash
# Install the full data science stack
time uv pip install numpy pandas scikit-learn matplotlib seaborn
# Completes in ~5-15 seconds depending on network

# Compare with pip:
time pip install numpy pandas scikit-learn matplotlib seaborn
# Typically 1-3 minutes
```

## Project Management (Like pipenv/Poetry)

uv has its own project management mode that competes directly with Poetry and pipenv:

### Initializing a New Project

```bash
# Create a new project
uv init myproject
cd myproject

# Project structure:
# myproject/
#   .python-version    # Pinned Python version
#   pyproject.toml     # Project metadata and dependencies
#   README.md
#   src/
#     myproject/
#       __init__.py

# Or add uv project management to an existing directory
cd existing-project
uv init
```

### Adding Dependencies

```bash
# Add a runtime dependency
uv add requests
uv add "flask>=3.0"
uv add sqlalchemy aiohttp

# Add a dev dependency
uv add --dev pytest black mypy ruff

# Add with version constraints
uv add "httpx>=0.25.0,<1.0"

# Add an optional dependency group
uv add --optional ml torch scikit-learn
```

This updates `pyproject.toml` and creates/updates `uv.lock`:

```toml
# pyproject.toml
[project]
name = "myproject"
version = "0.1.0"
description = ""
requires-python = ">=3.11"
dependencies = [
    "requests>=2.31.0",
    "flask>=3.0.0",
    "sqlalchemy>=2.0.0",
]

[project.optional-dependencies]
ml = [
    "torch>=2.0.0",
    "scikit-learn>=1.3.0",
]

[dependency-groups]
dev = [
    "pytest>=7.4.0",
    "black>=23.0.0",
    "mypy>=1.5.0",
    "ruff>=0.1.0",
]
```

### Running Commands

```bash
# Run a command in the project venv
uv run python main.py
uv run pytest
uv run flask run

# Run a module
uv run python -m pytest tests/
uv run python -m myproject.cli

# Install all dependencies and sync the environment
uv sync

# Install with dev dependencies
uv sync --dev
```

uv automatically creates and manages the virtual environment - you do not need to activate it manually when using `uv run`.

### Locking Dependencies

```bash
# Generate/update the lock file
uv lock

# Install exact versions from the lock file (for CI/deployment)
uv sync --frozen  # Fails if lock file is outdated
```

## Running Scripts with Inline Dependencies

uv can run Python scripts with dependencies declared inline using PEP 723:

```python
#!/usr/bin/env -S uv run
# script.py

# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "requests>=2.31.0",
#   "rich",
# ]
# ///

import requests
from rich.console import Console

console = Console()
response = requests.get("https://api.github.com")
console.print(f"GitHub API status: [bold green]{response.status_code}[/bold green]")
```

```bash
# Run the script - uv automatically creates an isolated env with the dependencies
uv run script.py
```

This is particularly useful for one-off scripts that need dependencies without setting up a full project.

## uvx: Running Tools Without Installing

`uvx` (or `uv tool run`) runs Python tools in temporary isolated environments:

```bash
# Run a tool without installing it permanently
uvx black .             # Format code with Black
uvx ruff check .        # Lint with Ruff
uvx pytest              # Run tests
uvx mypy src/           # Type check

# Run a specific version
uvx black==24.1.0 .
uvx "ruff>=0.3.0" check .
```

This is the uv equivalent of `pipx run` - great for CI pipelines where you want the latest tool version without managing it in the project dependencies.

### Installing Tools Globally

```bash
# Install a tool globally (available in PATH)
uv tool install ruff
uv tool install black
uv tool install mypy
uv tool install httpie

# Now use them directly
ruff check .
black .

# List installed tools
uv tool list

# Update a tool
uv tool upgrade ruff

# Uninstall a tool
uv tool uninstall black
```

## pip-tools Workflow: Compiling Requirements

If you use pip-tools style `requirements.in` / `requirements.txt` workflow:

```bash
# requirements.in contains direct dependencies
cat requirements.in
# flask>=3.0
# sqlalchemy>=2.0
# requests

# Compile to a locked requirements.txt
uv pip compile requirements.in -o requirements.txt

# Compile dev requirements
uv pip compile requirements-dev.in -o requirements-dev.txt

# Sync the environment to match requirements.txt
uv pip sync requirements.txt requirements-dev.txt
```

## CI/CD Integration

uv is particularly useful in CI because of its speed:

```yaml
# .github/workflows/test.yml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install uv
        uses: astral-sh/setup-uv@v3
        with:
          version: "0.4.18"
          enable-cache: true

      - name: Set up Python
        run: uv python install 3.11

      - name: Install dependencies
        run: uv sync --frozen --dev

      - name: Run tests
        run: uv run pytest tests/

      - name: Check formatting
        run: uv run black --check .

      - name: Lint
        run: uv run ruff check .
```

## Docker Integration

```dockerfile
FROM python:3.11-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies (no virtual env needed in Docker)
RUN uv sync --frozen --no-dev --no-editable

# Copy source
COPY . .

CMD ["uv", "run", "python", "app.py"]
```

## Configuring uv

uv configuration lives in `~/.config/uv/uv.toml` (per-user) or `uv.toml` / `pyproject.toml` (per-project):

```toml
# ~/.config/uv/uv.toml

# Default Python version
python-preference = "managed"  # Use uv-managed Pythons

# Cache location
cache-dir = "/home/ubuntu/.cache/uv"

# Concurrent downloads
concurrent-downloads = 20

# Extra index URL (e.g., for private packages)
[[index]]
url = "https://pypi.example.com/simple/"
name = "private-pypi"
```

## Troubleshooting

**uv: command not found after installation:**
```bash
# Source the updated PATH
source ~/.bashrc

# Or find where uv installed it
ls ~/.local/bin/uv
ls ~/.cargo/bin/uv

# Add to PATH manually
export PATH="$HOME/.local/bin:$PATH"
```

**Package not found in registry:**
```bash
# Search PyPI
uv pip search requests  # Note: requires --index-url for private registries

# Check if the package exists
pip index versions requests  # Fallback to pip for searching

# Use --extra-index-url for private registries
uv pip install mypackage --extra-index-url https://pypi.example.com/simple/
```

**Lock file conflicts in a team:**
```bash
# Regenerate the lock file from scratch
uv lock --refresh

# If that fails, check for version constraint conflicts
uv lock --verbose
```

uv's speed makes it particularly compelling in CI environments where installing dependencies happens frequently. For development, the combination of fast installs, built-in Python version management, and a single binary that replaces five tools is a meaningful improvement over the traditional pip + venv + pyenv workflow.
