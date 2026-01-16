# How to Set Up Python Virtual Environments (venv) on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Python, venv, Virtual Environment, Development, Tutorial

Description: Complete guide to creating and managing Python virtual environments on Ubuntu.

---

Python virtual environments are essential tools for any developer working with Python on Ubuntu. They allow you to create isolated spaces for your projects, each with its own dependencies and Python version. In this comprehensive guide, we will walk through everything you need to know about setting up and managing Python virtual environments on Ubuntu.

## Why Use Virtual Environments?

Before diving into the technical details, let us understand why virtual environments are crucial for Python development:

### Dependency Isolation

Different projects often require different versions of the same package. For example, Project A might need Django 4.2 while Project B requires Django 5.0. Without virtual environments, you would face constant conflicts.

```bash
# Without virtual environments, this becomes a nightmare:
# Project A needs: Django==4.2, requests==2.28
# Project B needs: Django==5.0, requests==2.31
# Installing one breaks the other!
```

### System Python Protection

Ubuntu uses Python for many system tools. Installing packages globally can break system utilities. Virtual environments keep your experiments separate from the system Python.

### Reproducibility

Virtual environments make it easy to share exact dependencies with your team or deploy to production with confidence.

### Clean Uninstallation

When a project is complete, simply delete the virtual environment folder. No leftover packages cluttering your system.

## Installing Python and venv on Ubuntu

Ubuntu typically comes with Python pre-installed, but you may need to install the venv module separately.

### Check Existing Python Installation

```bash
# Check if Python 3 is installed and its version
python3 --version
# Output example: Python 3.12.3

# Check where Python is installed
which python3
# Output: /usr/bin/python3
```

### Install Python and venv

```bash
# Update package lists to ensure you get the latest versions
sudo apt update

# Install Python 3 (if not already installed)
sudo apt install python3

# Install the venv module (required for creating virtual environments)
sudo apt install python3-venv

# Install pip (Python package installer)
sudo apt install python3-pip

# Verify all installations were successful
python3 --version
pip3 --version
```

### Install a Specific Python Version

If you need a specific Python version that is not available in the default repositories:

```bash
# Add the deadsnakes PPA for additional Python versions
sudo add-apt-repository ppa:deadsnakes/ppa

# Update package lists after adding the new repository
sudo apt update

# Install a specific Python version (e.g., Python 3.11)
sudo apt install python3.11 python3.11-venv python3.11-dev

# Verify the installation
python3.11 --version
# Output: Python 3.11.x
```

## Creating Virtual Environments

Now let us create your first virtual environment.

### Basic Virtual Environment Creation

```bash
# Navigate to your project directory
cd ~/projects/my_python_project

# Create a virtual environment named 'venv'
# The -m flag runs the venv module as a script
python3 -m venv venv

# This creates a 'venv' directory with the following structure:
# venv/
# ├── bin/           # Contains activation scripts and Python executable
# ├── include/       # C headers for compiling Python extensions
# ├── lib/           # Contains installed packages
# └── pyvenv.cfg     # Configuration file for the virtual environment
```

### Creating with Specific Options

```bash
# Create a virtual environment with access to system packages
# Useful when you need system-installed packages like numpy with BLAS
python3 -m venv --system-site-packages venv

# Create a virtual environment without pip (lighter weight)
python3 -m venv --without-pip venv

# Create a virtual environment and upgrade pip to latest version
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip

# Create a virtual environment with a specific Python version
python3.11 -m venv venv311
```

### Naming Conventions

```bash
# Common naming conventions for virtual environments:

# Option 1: Simple 'venv' (most common, easy to .gitignore)
python3 -m venv venv

# Option 2: Hidden directory (keeps project folder cleaner)
python3 -m venv .venv

# Option 3: Project-specific name (useful when managing multiple environments)
python3 -m venv myproject-env

# Option 4: Environment with Python version indicator
python3.11 -m venv venv-py311
```

## Activating and Deactivating Virtual Environments

### Activation

```bash
# Activate the virtual environment on Linux/Ubuntu
# This modifies your shell's PATH to use the virtual environment's Python
source venv/bin/activate

# After activation, your prompt changes to show the active environment:
# (venv) user@ubuntu:~/projects/my_python_project$

# Verify you're using the virtual environment's Python
which python
# Output: /home/user/projects/my_python_project/venv/bin/python

which pip
# Output: /home/user/projects/my_python_project/venv/bin/pip
```

### Checking Active Environment

```bash
# Check if a virtual environment is active
echo $VIRTUAL_ENV
# Output: /home/user/projects/my_python_project/venv

# If no virtual environment is active, the output will be empty

# Alternative method: check Python location
python -c "import sys; print(sys.prefix)"
# Should show your venv path when activated
```

### Deactivation

```bash
# Deactivate the virtual environment and return to system Python
deactivate

# Your prompt returns to normal:
# user@ubuntu:~/projects/my_python_project$

# Verify deactivation
which python
# Output: /usr/bin/python3 (or similar system path)
```

## Installing Packages with pip

Once your virtual environment is activated, you can install packages using pip.

### Basic Package Installation

```bash
# Ensure your virtual environment is activated first
source venv/bin/activate

# Install a single package (latest version)
pip install requests

# Install a specific version of a package
pip install requests==2.31.0

# Install a minimum version
pip install "requests>=2.28.0"

# Install multiple packages at once
pip install flask sqlalchemy redis

# Install a package with optional dependencies (extras)
pip install "fastapi[all]"
```

### Viewing Installed Packages

```bash
# List all installed packages in the virtual environment
pip list

# Example output:
# Package    Version
# ---------- -------
# pip        24.0
# requests   2.31.0
# setuptools 69.0.2

# Show detailed information about a specific package
pip show requests

# Example output:
# Name: requests
# Version: 2.31.0
# Summary: Python HTTP for Humans.
# Home-page: https://requests.readthedocs.io
# ...
```

### Upgrading and Uninstalling

```bash
# Upgrade a specific package to the latest version
pip install --upgrade requests

# Upgrade pip itself (recommended to do periodically)
pip install --upgrade pip

# Uninstall a package
pip uninstall requests

# Uninstall without confirmation prompt
pip uninstall -y requests

# Uninstall multiple packages
pip uninstall -y flask sqlalchemy redis
```

## Requirements.txt Management

The requirements.txt file is the standard way to specify project dependencies.

### Creating requirements.txt

```bash
# Generate requirements.txt from currently installed packages
pip freeze > requirements.txt

# View the contents
cat requirements.txt

# Example output:
# certifi==2024.2.2
# charset-normalizer==3.3.2
# idna==3.6
# requests==2.31.0
# urllib3==2.2.0
```

### Manual requirements.txt Creation

Create a file named `requirements.txt` with your dependencies:

```text
# requirements.txt
# Core dependencies for the web application

# Web framework - pinned to specific version for stability
flask==3.0.2

# Database ORM - allow minor version updates
sqlalchemy>=2.0.0,<3.0.0

# HTTP client library
requests~=2.31.0  # Compatible release: 2.31.x

# Development dependencies (consider using requirements-dev.txt instead)
pytest>=8.0.0
black>=24.0.0

# Package with extras
uvicorn[standard]>=0.27.0
```

### Installing from requirements.txt

```bash
# Install all packages listed in requirements.txt
pip install -r requirements.txt

# Install from multiple requirements files
pip install -r requirements.txt -r requirements-dev.txt

# Install and upgrade all packages to latest compatible versions
pip install --upgrade -r requirements.txt
```

### Organizing Requirements Files

For larger projects, split requirements into multiple files:

```bash
# Create directory structure for requirements
mkdir requirements

# Base requirements (production dependencies)
# requirements/base.txt
touch requirements/base.txt

# Development requirements
# requirements/dev.txt
touch requirements/dev.txt

# Testing requirements
# requirements/test.txt
touch requirements/test.txt
```

Example `requirements/base.txt`:
```text
# Production dependencies
flask==3.0.2
sqlalchemy==2.0.25
redis==5.0.1
celery==5.3.6
```

Example `requirements/dev.txt`:
```text
# Development dependencies
# First, include base requirements
-r base.txt

# Development tools
black==24.2.0
isort==5.13.2
mypy==1.8.0
pre-commit==3.6.0
```

Example `requirements/test.txt`:
```text
# Testing dependencies
# Include development requirements (which includes base)
-r dev.txt

# Testing frameworks and tools
pytest==8.0.2
pytest-cov==4.1.0
pytest-asyncio==0.23.4
factory-boy==3.3.0
```

## pip freeze and Constraints

### Understanding pip freeze

```bash
# pip freeze outputs installed packages in requirements format
pip freeze

# Output includes ALL packages (including dependencies of dependencies)
# certifi==2024.2.2
# charset-normalizer==3.3.2
# idna==3.6
# requests==2.31.0
# urllib3==2.2.0

# Exclude specific packages from freeze output
pip freeze | grep -v "^-e"  # Exclude editable installs
```

### Using Constraints Files

Constraints files pin versions without requiring installation:

```bash
# Create a constraints file (constraints.txt)
cat > constraints.txt << 'EOF'
# Pin transitive dependencies for reproducibility
# These are dependencies of your direct dependencies

certifi==2024.2.2
charset-normalizer==3.3.2
idna==3.6
urllib3==2.2.0

# Security: pin to patched version
cryptography>=42.0.0
EOF

# Install packages with constraints
pip install -r requirements.txt -c constraints.txt

# The constraints file ensures consistent versions across environments
# without cluttering your requirements.txt with transitive dependencies
```

### Best Practice: Separate Direct and Transitive Dependencies

```bash
# requirements.in - Direct dependencies (what you explicitly need)
cat > requirements.in << 'EOF'
flask
requests
sqlalchemy
EOF

# Use pip-compile to generate complete requirements.txt
# First install pip-tools
pip install pip-tools

# Generate requirements.txt with all transitive dependencies
pip-compile requirements.in --output-file requirements.txt

# This creates a requirements.txt with pinned versions of everything
# including comments showing why each package is needed
```

## Virtual Environments with Different Python Versions

Managing multiple Python versions is common in development.

### Creating Environments with Different Python Versions

```bash
# First, install multiple Python versions
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update
sudo apt install python3.10 python3.10-venv
sudo apt install python3.11 python3.11-venv
sudo apt install python3.12 python3.12-venv

# Create virtual environment with Python 3.10
python3.10 -m venv venv-py310

# Create virtual environment with Python 3.11
python3.11 -m venv venv-py311

# Create virtual environment with Python 3.12
python3.12 -m venv venv-py312

# Verify the Python version in each environment
source venv-py310/bin/activate
python --version  # Output: Python 3.10.x
deactivate

source venv-py311/bin/activate
python --version  # Output: Python 3.11.x
deactivate
```

### Using pyenv for Python Version Management

```bash
# Install pyenv dependencies
sudo apt install -y make build-essential libssl-dev zlib1g-dev \
    libbz2-dev libreadline-dev libsqlite3-dev wget curl llvm \
    libncursesw5-dev xz-utils tk-dev libxml2-dev libxmlsec1-dev \
    libffi-dev liblzma-dev

# Install pyenv using the installer script
curl https://pyenv.run | bash

# Add pyenv to your shell configuration (~/.bashrc)
cat >> ~/.bashrc << 'EOF'

# Pyenv configuration
export PYENV_ROOT="$HOME/.pyenv"
[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init -)"
eval "$(pyenv virtualenv-init -)"
EOF

# Reload shell configuration
source ~/.bashrc

# List available Python versions
pyenv install --list | grep "^  3\."

# Install specific Python versions
pyenv install 3.11.8
pyenv install 3.12.2

# Create a virtual environment with pyenv-virtualenv
pyenv virtualenv 3.11.8 myproject-py311

# Activate the environment
pyenv activate myproject-py311

# Set local Python version for a project directory
cd ~/projects/my_project
pyenv local myproject-py311
# Creates .python-version file that auto-activates when you enter the directory
```

## Virtualenvwrapper

Virtualenvwrapper provides convenient commands for managing virtual environments.

### Installation and Setup

```bash
# Install virtualenvwrapper
pip3 install virtualenvwrapper

# Add configuration to ~/.bashrc
cat >> ~/.bashrc << 'EOF'

# Virtualenvwrapper configuration
export WORKON_HOME=$HOME/.virtualenvs      # Directory for all virtual environments
export PROJECT_HOME=$HOME/projects          # Directory for projects
export VIRTUALENVWRAPPER_PYTHON=/usr/bin/python3
export VIRTUALENVWRAPPER_VIRTUALENV=/usr/local/bin/virtualenv
source /usr/local/bin/virtualenvwrapper.sh
EOF

# Reload shell configuration
source ~/.bashrc

# Create the environments directory if it doesn't exist
mkdir -p $WORKON_HOME
```

### Using Virtualenvwrapper Commands

```bash
# Create a new virtual environment
mkvirtualenv myproject
# Creates: ~/.virtualenvs/myproject/

# Create with specific Python version
mkvirtualenv -p python3.11 myproject-py311

# List all virtual environments
workon
# Output:
# myproject
# myproject-py311

# Switch to a virtual environment
workon myproject

# Deactivate current environment
deactivate

# Remove a virtual environment
rmvirtualenv myproject

# Create project with associated virtual environment
mkproject webapp
# Creates both ~/projects/webapp/ and ~/.virtualenvs/webapp/

# Navigate to project directory
cdproject

# Navigate to site-packages directory
cdsitepackages

# Navigate to virtual environment directory
cdvirtualenv

# List packages in current environment
lssitepackages
```

### Hooks and Customization

```bash
# Post-activate hook (runs after environment activation)
# Edit: $WORKON_HOME/postactivate
cat > $WORKON_HOME/postactivate << 'EOF'
#!/bin/bash
# Display reminder about current project
echo "Activated: $VIRTUAL_ENV"
echo "Python: $(python --version)"
EOF

# Pre-deactivate hook
# Edit: $WORKON_HOME/predeactivate
cat > $WORKON_HOME/predeactivate << 'EOF'
#!/bin/bash
echo "Deactivating: $VIRTUAL_ENV"
EOF

# Per-environment hooks
# Create hooks in $WORKON_HOME/myproject/bin/
# postactivate, predeactivate, etc.
```

## Conda as an Alternative

Conda is a powerful alternative that handles both Python versions and system libraries.

### Installing Miniconda

```bash
# Download Miniconda installer for Linux
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh

# Make installer executable and run it
bash Miniconda3-latest-Linux-x86_64.sh

# Follow the prompts:
# - Accept license terms
# - Choose installation location (default: ~/miniconda3)
# - Initialize Miniconda (adds to ~/.bashrc)

# Restart terminal or source bashrc
source ~/.bashrc

# Verify installation
conda --version
```

### Creating and Managing Conda Environments

```bash
# Create a new environment with specific Python version
conda create --name myproject python=3.11

# Create environment with packages
conda create --name datascience python=3.11 numpy pandas matplotlib

# Activate environment
conda activate myproject

# Deactivate environment
conda deactivate

# List all environments
conda env list
# Output:
# base                  *  /home/user/miniconda3
# myproject                /home/user/miniconda3/envs/myproject
# datascience              /home/user/miniconda3/envs/datascience

# Remove an environment
conda env remove --name myproject
```

### Installing Packages with Conda

```bash
# Activate your environment first
conda activate myproject

# Install packages from default channel
conda install numpy pandas

# Install from conda-forge channel (larger package selection)
conda install -c conda-forge package_name

# Install specific version
conda install numpy=1.26.0

# Install pip packages within conda environment
# (Use when package is not available in conda)
pip install some_package

# List installed packages
conda list

# Export environment to file
conda env export > environment.yml

# Create environment from file
conda env create -f environment.yml
```

### Environment.yml Example

```yaml
# environment.yml - Conda environment specification
name: myproject
channels:
  - conda-forge
  - defaults
dependencies:
  - python=3.11
  - numpy>=1.24.0
  - pandas>=2.0.0
  - scikit-learn>=1.3.0
  - matplotlib>=3.7.0
  - jupyter>=1.0.0
  # pip dependencies (packages not in conda)
  - pip:
    - fastapi>=0.109.0
    - uvicorn>=0.27.0
```

## VS Code Integration

VS Code has excellent support for Python virtual environments.

### Automatic Environment Detection

```bash
# VS Code automatically detects virtual environments in:
# - ./venv
# - ./.venv
# - ./env
# - ./.env
# - Any folder in WORKON_HOME (virtualenvwrapper)
# - Conda environments
```

### Selecting Python Interpreter

1. Open VS Code in your project directory
2. Press `Ctrl+Shift+P` to open Command Palette
3. Type "Python: Select Interpreter"
4. Choose your virtual environment from the list

Alternatively, create a workspace settings file:

```bash
# Create VS Code settings directory
mkdir -p .vscode

# Create settings.json with Python configuration
cat > .vscode/settings.json << 'EOF'
{
    // Path to Python interpreter in virtual environment
    "python.defaultInterpreterPath": "${workspaceFolder}/venv/bin/python",

    // Use virtual environment for terminal
    "python.terminal.activateEnvironment": true,

    // Linting configuration
    "python.linting.enabled": true,
    "python.linting.pylintEnabled": true,

    // Formatting configuration
    "python.formatting.provider": "black",
    "editor.formatOnSave": true,

    // Testing configuration
    "python.testing.pytestEnabled": true,
    "python.testing.pytestArgs": [
        "tests"
    ]
}
EOF
```

### VS Code Extensions for Python Development

Recommended extensions for Python development:

```bash
# Install Python extension (required)
code --install-extension ms-python.python

# Install Pylance for enhanced language support
code --install-extension ms-python.vscode-pylance

# Install Black formatter
code --install-extension ms-python.black-formatter

# Install isort for import sorting
code --install-extension ms-python.isort
```

### Integrated Terminal Configuration

```bash
# VS Code automatically activates the selected interpreter in integrated terminal
# You can verify by opening a new terminal (Ctrl+`)
# The prompt should show your virtual environment name: (venv) user@ubuntu:...$

# If auto-activation doesn't work, add to settings.json:
# "python.terminal.activateEnvironment": true
```

## Best Practices

### Project Structure

```bash
# Recommended project structure with virtual environment
myproject/
├── .venv/                    # Virtual environment (gitignored)
├── .vscode/                  # VS Code settings (optional, can be gitignored)
│   └── settings.json
├── src/                      # Source code
│   └── myproject/
│       ├── __init__.py
│       └── main.py
├── tests/                    # Test files
│   ├── __init__.py
│   └── test_main.py
├── requirements/             # Requirements files
│   ├── base.txt
│   ├── dev.txt
│   └── test.txt
├── .gitignore               # Git ignore file
├── pyproject.toml           # Project configuration
└── README.md                # Project documentation
```

### .gitignore Configuration

```bash
# Create comprehensive .gitignore for Python projects
cat > .gitignore << 'EOF'
# Virtual environments
venv/
.venv/
env/
.env/
ENV/
.python-version

# Python cache files
__pycache__/
*.py[cod]
*$py.class
*.so

# Distribution / packaging
dist/
build/
*.egg-info/
*.egg
.eggs/

# IDE settings (optional - some teams share these)
.vscode/
.idea/
*.swp
*.swo

# Test and coverage
.pytest_cache/
.coverage
htmlcov/
.tox/
.nox/

# Jupyter Notebooks
.ipynb_checkpoints/

# Environment variables (never commit!)
.env.local
.env.*.local
*.env

# OS files
.DS_Store
Thumbs.db
EOF
```

### Security Best Practices

```bash
# Never commit sensitive data
# Create .env file for environment variables (gitignored)
cat > .env << 'EOF'
# Database configuration
DATABASE_URL=postgresql://user:password@localhost/dbname

# API keys
API_SECRET_KEY=your-secret-key-here

# Debug mode (set to False in production)
DEBUG=True
EOF

# Use python-dotenv to load environment variables
pip install python-dotenv

# In your Python code:
# from dotenv import load_dotenv
# load_dotenv()  # Loads variables from .env file
```

### Reproducibility Tips

```bash
# 1. Always pin your dependencies
pip freeze > requirements.txt

# 2. Include Python version in documentation or use .python-version file
echo "3.11.8" > .python-version

# 3. Use pip-tools for better dependency management
pip install pip-tools

# Create requirements.in with direct dependencies
cat > requirements.in << 'EOF'
flask
sqlalchemy
requests
EOF

# Generate locked requirements.txt
pip-compile requirements.in

# Sync environment to match requirements exactly
pip-sync requirements.txt

# 4. Consider using pyproject.toml for modern Python projects
cat > pyproject.toml << 'EOF'
[build-system]
requires = ["setuptools>=61.0"]
build-backend = "setuptools.build_meta"

[project]
name = "myproject"
version = "0.1.0"
description = "My Python project"
requires-python = ">=3.10"
dependencies = [
    "flask>=3.0.0",
    "sqlalchemy>=2.0.0",
    "requests>=2.31.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "black>=24.0.0",
    "mypy>=1.8.0",
]
EOF
```

### Automation with Shell Aliases

```bash
# Add helpful aliases to ~/.bashrc
cat >> ~/.bashrc << 'EOF'

# Python virtual environment aliases
alias ve='python3 -m venv .venv'           # Create virtual environment
alias va='source .venv/bin/activate'       # Activate virtual environment
alias vd='deactivate'                       # Deactivate virtual environment
alias vr='rm -rf .venv'                     # Remove virtual environment

# Pip aliases
alias pipreq='pip freeze > requirements.txt'  # Save requirements
alias pipinst='pip install -r requirements.txt'  # Install requirements
alias pipup='pip install --upgrade pip'   # Upgrade pip

# Combined workflow alias
alias vnew='ve && va && pipup'            # Create, activate, upgrade pip
EOF

# Reload configuration
source ~/.bashrc

# Usage:
# vnew           # Creates new .venv, activates it, upgrades pip
# pipinst        # Installs from requirements.txt
# pipreq         # Saves current packages to requirements.txt
```

### Common Troubleshooting

```bash
# Problem: "python3-venv is not installed"
# Solution:
sudo apt install python3-venv

# Problem: Permission denied when creating venv
# Solution: Don't use sudo for venv creation
# Wrong: sudo python3 -m venv venv
# Correct: python3 -m venv venv

# Problem: pip not found after activation
# Solution: Recreate venv or manually install pip
python3 -m venv --clear venv
source venv/bin/activate
python -m ensurepip --upgrade

# Problem: Cannot install packages (externally-managed-environment)
# This happens on newer Ubuntu versions with PEP 668
# Solution: Always use virtual environments (the whole point of this guide!)
python3 -m venv venv
source venv/bin/activate
pip install package_name

# Problem: Wrong Python version in venv
# Solution: Specify Python version when creating
python3.11 -m venv venv

# Problem: Packages from system Python appearing in venv
# Solution: Create without system-site-packages (default)
python3 -m venv venv  # Do NOT use --system-site-packages
```

## Conclusion

Python virtual environments are indispensable tools for modern Python development on Ubuntu. They provide isolation, reproducibility, and cleanliness that every professional Python developer needs. Whether you choose the built-in venv module, virtualenvwrapper for convenience, or Conda for data science workflows, the principles remain the same: isolate your projects, pin your dependencies, and automate your workflows.

Key takeaways:
- Always use virtual environments for Python projects
- Pin your dependencies in requirements.txt or pyproject.toml
- Use tools like pip-tools or pip-compile for better dependency management
- Consider virtualenvwrapper or pyenv for managing multiple environments
- Configure VS Code to automatically detect and use your virtual environments
- Never commit virtual environments or sensitive data to version control

---

## Monitoring Your Python Applications with OneUptime

Once you have set up your Python virtual environments and deployed your applications to production, monitoring becomes essential. **OneUptime** is a comprehensive open-source observability platform that helps you keep your Python applications running smoothly.

With OneUptime, you can:

- **Monitor application uptime** - Get instant alerts when your Python web services go down
- **Track performance metrics** - Monitor response times, throughput, and resource usage
- **Set up custom alerts** - Create alerting rules based on your specific requirements
- **Visualize logs and traces** - Debug issues quickly with centralized logging and distributed tracing
- **Create status pages** - Keep your users informed about service status

Whether you are running Flask, Django, FastAPI, or any other Python framework, OneUptime integrates seamlessly with your existing infrastructure to provide complete observability.

Get started with OneUptime at [https://oneuptime.com](https://oneuptime.com) and ensure your Python applications are always performing at their best.
