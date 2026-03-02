# How to Install and Use pipenv on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Python, Pipenv, Virtual Environment, Development

Description: A practical guide to installing and using pipenv on Ubuntu for Python dependency management, covering Pipfile creation, virtual environments, and common workflows.

---

pipenv combines pip and virtualenv into a single tool with a better user experience. It uses two files - `Pipfile` for human-readable dependency declarations and `Pipfile.lock` for reproducible installs - and automatically manages virtual environments per project. For teams that want something more user-friendly than raw pip + venv without going all the way to Poetry or uv, pipenv hits a comfortable middle ground.

## How pipenv Compares to pip + venv

With plain pip and venv:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install requests flask
pip freeze > requirements.txt  # Not reproducible - includes all transitive deps
```

With pipenv:
```bash
pipenv install requests flask    # Manages venv automatically
pipenv run python app.py         # Runs in the venv without manual activation
# Generates Pipfile (human-readable) and Pipfile.lock (reproducible)
```

The lock file distinction matters: `requirements.txt` from `pip freeze` pins everything including transitive dependencies, making updates painful. `Pipfile` pins only your direct dependencies; `Pipfile.lock` handles the rest automatically.

## Installation

### Method 1: pip (Simplest)

```bash
pip install --user pipenv

# Add pipenv to PATH (if not already)
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Verify
pipenv --version
```

### Method 2: System Package

```bash
sudo apt-get update
sudo apt-get install -y pipenv

# Note: the apt version may be older than the pip version
pipenv --version
```

### Method 3: pipx (Recommended for Tools)

pipx installs Python CLI tools in isolated environments, which prevents conflicts:

```bash
sudo apt-get install -y pipx
pipx install pipenv
pipx ensurepath

source ~/.bashrc
pipenv --version
```

## Creating a New Project

```bash
# Create a project directory
mkdir myproject && cd myproject

# Initialize pipenv with a specific Python version
pipenv --python 3.11

# Or just initialize (uses system Python)
pipenv --python 3

# This creates:
# Pipfile        - dependency declarations
# .venv/         - virtual environment (or in ~/.local/share/virtualenvs/)
```

The virtual environment lives in `~/.local/share/virtualenvs/myproject-<hash>/` by default. Set `PIPENV_VENV_IN_PROJECT=1` to keep it inside the project directory as `.venv/`:

```bash
# Add to ~/.bashrc for all projects
export PIPENV_VENV_IN_PROJECT=1
```

## Installing Dependencies

```bash
# Install a production dependency
pipenv install requests
pipenv install flask sqlalchemy

# Install a development dependency (not needed in production)
pipenv install --dev pytest black flake8 mypy

# Install from a specific version
pipenv install "django>=4.2,<5.0"

# Install all dependencies from existing Pipfile
pipenv install

# Install including dev dependencies
pipenv install --dev
```

## The Pipfile

After installing dependencies, `Pipfile` looks like:

```toml
[[source]]
url = "https://pypi.org/simple"
verify_ssl = true
name = "pypi"

[packages]
requests = "*"
flask = "*"
sqlalchemy = ">=1.4.0"
django = ">=4.2,<5.0"

[dev-packages]
pytest = "*"
black = "*"
flake8 = "*"
mypy = "*"

[requires]
python_version = "3.11"
```

## Running Code and Commands

```bash
# Run a Python script in the virtual environment
pipenv run python app.py

# Run a module
pipenv run python -m pytest

# Run any command in the venv
pipenv run flask run
pipenv run gunicorn app:app

# Open an interactive Python shell in the venv
pipenv run python

# Activate the virtual environment for the current shell session
pipenv shell
# Now you are inside the venv:
(myproject) $ python app.py
(myproject) $ pytest
# Exit with:
exit
# or Ctrl+D
```

## Locking and Reproducible Installs

```bash
# Generate/update the lock file (done automatically on install)
pipenv lock

# Install exact versions from the lock file (for deployments)
pipenv install --deploy
# --deploy fails if Pipfile.lock is out of date, protecting against accidents

# Install for CI (no venv creation, faster)
pipenv install --system --deploy
# Installs into the system Python - useful in Docker containers
```

## Managing Python Versions with pyenv

pipenv integrates with pyenv to auto-install Python versions:

```bash
# Install pyenv
curl https://pyenv.run | bash
# Follow the instructions to add to PATH

# Install a specific Python version
pyenv install 3.11.8

# Use it with pipenv
pipenv --python 3.11.8
```

## Updating Dependencies

```bash
# List outdated packages
pipenv update --outdated

# Update a specific package
pipenv update requests

# Update all packages to their latest allowed versions
pipenv update

# After updating, check for security vulnerabilities
pipenv check
```

## Environment Variables with .env

pipenv automatically loads `.env` files:

```bash
# .env
DATABASE_URL=postgres://user:password@localhost/mydb
SECRET_KEY=your-secret-key
DEBUG=True
API_TOKEN=your-api-token
```

Access in Python:

```python
import os

database_url = os.getenv("DATABASE_URL")
secret_key = os.environ["SECRET_KEY"]
```

```bash
# pipenv loads .env automatically when running commands
pipenv run python app.py  # DATABASE_URL etc. are available

# Or check which vars are loaded
pipenv run env | grep DATABASE
```

## Docker Integration

In Docker, you typically want to install into the system Python rather than creating a virtual environment inside the container:

```dockerfile
FROM python:3.11-slim

# Install pipenv
RUN pip install pipenv

WORKDIR /app

# Copy only the dependency files first for layer caching
COPY Pipfile Pipfile.lock ./

# Install dependencies into the system Python (no venv)
RUN pipenv install --system --deploy

# Copy application code
COPY . .

CMD ["python", "app.py"]
```

## Generating requirements.txt

If a tool or service requires a `requirements.txt`:

```bash
# Generate from the lock file
pipenv requirements > requirements.txt

# Generate dev requirements
pipenv requirements --dev > requirements-dev.txt

# Generate locked (exact versions)
pipenv requirements --dev > requirements-dev.txt
```

## Removing and Cleaning

```bash
# Remove a dependency
pipenv uninstall requests

# Remove a dev dependency
pipenv uninstall --dev pytest

# Remove packages no longer listed in Pipfile (clean unused)
pipenv clean

# Remove the entire virtual environment
pipenv --rm

# Recreate it
pipenv install
```

## Useful pipenv Environment Variables

```bash
# Keep venv inside the project directory
export PIPENV_VENV_IN_PROJECT=1

# Disable spinner (useful in CI)
export PIPENV_NOSPIN=1

# Custom virtual environments directory
export WORKON_HOME=~/.venvs

# Default Python version to use
export PIPENV_DEFAULT_PYTHON_VERSION=3.11

# Skip lock file on install (faster but not reproducible - avoid in production)
export PIPENV_SKIP_LOCK=1

# Set timeout for pip operations
export PIPENV_TIMEOUT=300
```

Add these to `~/.bashrc` for persistence.

## Workflow for a Team Project

```bash
# Project setup (first time)
git clone https://github.com/myteam/myproject.git
cd myproject

# Install everything from Pipfile.lock
pipenv install --dev

# Work
pipenv run python app.py

# Add a new dependency
pipenv install httpx

# Commit the updated Pipfile and Pipfile.lock
git add Pipfile Pipfile.lock
git commit -m "Add httpx for async HTTP requests"
```

When another team member pulls these changes:

```bash
git pull
pipenv install  # Updates their venv to match the new Pipfile.lock
```

## Troubleshooting

**pipenv: command not found:**
```bash
# Check if it was installed with --user
ls ~/.local/bin/pipenv

# Add to PATH
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Or use pipx (cleanest option)
pipx install pipenv
pipx ensurepath
```

**"Locking failed" or lock takes very long:**
```bash
# Try locking with verbose output to see what's failing
pipenv lock --verbose

# Temporarily skip lock for development
PIPENV_SKIP_LOCK=1 pipenv install package-name

# If a package has complex dependency resolution, try --categories
pipenv lock --categories "packages"
```

**Virtual environment in the wrong location:**
```bash
# Check where the venv is
pipenv --venv

# Delete and recreate with PIPENV_VENV_IN_PROJECT
export PIPENV_VENV_IN_PROJECT=1
pipenv --rm
pipenv install
```

**Python version not found:**
```bash
# List available Python versions
pyenv versions
python3 --version
python3.11 --version

# Install via pyenv if missing
pyenv install 3.11.8

# Or specify an installed version
pipenv --python $(which python3.11)
```

pipenv works well for application development where you want the simplicity of a single dependency management tool and the reproducibility of a lock file. For libraries that are published to PyPI, consider `pyproject.toml` with `build` or Poetry instead, since pipenv is primarily an application workflow tool.
