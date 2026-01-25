# How to Create Virtual Environments in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Virtual Environments, venv, pip, Dependency Management

Description: Learn how to create and manage Python virtual environments using venv, virtualenv, and conda. Isolate project dependencies and avoid version conflicts.

---

> Virtual environments are one of Python's most important tools for dependency management. They let you maintain separate, isolated Python installations for each project, preventing the "works on my machine" problem and keeping your global Python clean.

Without virtual environments, all your projects share the same installed packages. Install Django 4.0 for one project, and suddenly your Django 3.2 project breaks. Virtual environments solve this by giving each project its own isolated set of packages.

---

## Why Virtual Environments Matter

Consider this scenario:

```
Project A needs: Django==3.2, requests==2.25
Project B needs: Django==4.0, requests==2.28
```

Without virtual environments, you can only have one version of each package installed. Switching between projects means constantly reinstalling packages or dealing with incompatibilities.

With virtual environments, each project has its own isolated Python with its own packages. They can coexist without conflicts.

---

## Creating Virtual Environments with venv

Python 3.3+ includes the `venv` module in the standard library. This is the recommended way to create virtual environments.

### Basic Creation

```bash
# Navigate to your project directory
cd my_project

# Create a virtual environment named 'venv'
python3 -m venv venv

# This creates a 'venv' directory containing:
# - bin/ (or Scripts/ on Windows) - executables
# - lib/ - Python packages
# - pyvenv.cfg - configuration
```

### Activating the Environment

You must activate the environment before using it:

```bash
# On Linux/macOS
source venv/bin/activate

# On Windows (Command Prompt)
venv\Scripts\activate.bat

# On Windows (PowerShell)
venv\Scripts\Activate.ps1

# Your prompt will change to show the active environment
(venv) user@machine:~/my_project$
```

### Verifying Activation

```bash
# Check which Python is being used
which python   # Linux/Mac
where python   # Windows

# Should show path inside your venv directory
# /home/user/my_project/venv/bin/python

# Check pip location too
which pip
```

### Deactivating the Environment

```bash
# Simply run deactivate
deactivate

# Your prompt returns to normal
user@machine:~/my_project$
```

---

## Installing Packages in Virtual Environments

With the environment activated, pip installs packages locally:

```bash
# Activate first
source venv/bin/activate

# Install packages
pip install requests flask sqlalchemy

# Packages are installed in venv/lib/python3.x/site-packages/

# List installed packages
pip list

# Check package location
python -c "import requests; print(requests.__file__)"
# Shows path inside venv
```

---

## Managing Dependencies with requirements.txt

### Creating requirements.txt

```bash
# Export all installed packages
pip freeze > requirements.txt

# The file looks like:
# Flask==2.3.0
# requests==2.28.0
# SQLAlchemy==2.0.0
# ...
```

### Installing from requirements.txt

```bash
# In a new environment or on another machine
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Best Practice: Pin Versions

```
# requirements.txt - pin exact versions
Flask==2.3.0
requests==2.28.0
SQLAlchemy==2.0.0

# Or use >= for flexibility (but less reproducible)
Flask>=2.0.0
requests>=2.25.0
```

---

## Virtual Environment Options

### Specify Python Version

```bash
# Use a specific Python version
python3.10 -m venv venv
python3.11 -m venv venv

# This requires that version to be installed
```

### Create Without pip

```bash
# Lightweight environment without pip
python3 -m venv --without-pip venv

# You will need to install pip manually if needed
```

### Include System Packages

```bash
# Allow access to globally installed packages
python3 -m venv --system-site-packages venv

# Useful when you have large packages like numpy installed globally
```

### Upgrade pip Immediately

```bash
# Good practice after creating a new environment
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
```

---

## Alternative: virtualenv

The `virtualenv` package predates `venv` and offers additional features:

```bash
# Install virtualenv
pip install virtualenv

# Create environment
virtualenv venv

# Create with specific Python
virtualenv -p python3.10 venv

# Create with no pip/wheel/setuptools
virtualenv --no-pip --no-wheel --no-setuptools venv
```

### When to Use virtualenv Over venv

- Need to support Python 2 (though you should migrate)
- Need faster environment creation
- Need additional features like relocatable environments

---

## Virtual Environments with Conda

Conda provides its own environment management:

```bash
# Create environment with specific Python version
conda create -n myenv python=3.10

# Activate
conda activate myenv

# Deactivate
conda deactivate

# List environments
conda env list

# Remove environment
conda env remove -n myenv
```

### Export Conda Environment

```bash
# Export to YAML
conda env export > environment.yml

# Create from YAML
conda env create -f environment.yml
```

---

## Project Structure with Virtual Environments

### Recommended Directory Layout

```
my_project/
    venv/               # Virtual environment (not in git)
    src/
        my_package/
            __init__.py
            main.py
    tests/
        test_main.py
    requirements.txt    # Dependencies
    requirements-dev.txt # Dev dependencies
    .gitignore
    README.md
```

### .gitignore for Virtual Environments

```gitignore
# Virtual environments
venv/
.venv/
env/
.env/
ENV/

# Don't commit pip cache
.pip/

# Python cache
__pycache__/
*.py[cod]
```

---

## Using Virtual Environments in IDEs

### VS Code

VS Code can automatically detect virtual environments:

1. Open your project folder
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P`)
3. Type "Python: Select Interpreter"
4. Choose the interpreter from your venv

Or configure in `.vscode/settings.json`:

```json
{
    "python.defaultInterpreterPath": "${workspaceFolder}/venv/bin/python"
}
```

### PyCharm

1. Go to Settings > Project > Python Interpreter
2. Click the gear icon > Add
3. Select "Existing environment"
4. Browse to `venv/bin/python`

---

## Common Workflows

### Setting Up a New Project

```bash
# Create project directory
mkdir my_project && cd my_project

# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install flask requests

# Save requirements
pip freeze > requirements.txt

# Initialize git
git init
echo "venv/" >> .gitignore
```

### Cloning a Project

```bash
# Clone the repository
git clone https://github.com/user/project.git
cd project

# Create virtual environment
python3 -m venv venv

# Activate
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Updating Dependencies

```bash
# Activate environment
source venv/bin/activate

# Upgrade a specific package
pip install --upgrade requests

# Upgrade all packages (use with caution)
pip list --outdated
pip install --upgrade package1 package2

# Update requirements.txt
pip freeze > requirements.txt
```

### Recreating a Corrupted Environment

```bash
# Delete the old environment
rm -rf venv

# Create a new one
python3 -m venv venv
source venv/bin/activate

# Reinstall from requirements
pip install -r requirements.txt
```

---

## Advanced: Multiple Requirement Files

For larger projects, separate development and production dependencies:

```
# requirements.txt (production)
Flask==2.3.0
SQLAlchemy==2.0.0
gunicorn==21.0.0

# requirements-dev.txt (development)
-r requirements.txt  # Include production deps
pytest==7.3.0
black==23.3.0
flake8==6.0.0
```

```bash
# Production install
pip install -r requirements.txt

# Development install
pip install -r requirements-dev.txt
```

---

## Troubleshooting

### "Command not found: activate"

```bash
# Make sure you use 'source' on Linux/Mac
source venv/bin/activate  # Correct
./venv/bin/activate       # Wrong

# On Windows, use the correct script for your shell
venv\Scripts\activate.bat    # Command Prompt
venv\Scripts\Activate.ps1    # PowerShell
```

### Permission Denied (PowerShell)

```powershell
# You may need to allow script execution
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Then activate
venv\Scripts\Activate.ps1
```

### Virtual Environment Not Using Correct Python

```bash
# Check the Python version in your venv
./venv/bin/python --version

# If wrong, delete and recreate with correct Python
rm -rf venv
python3.10 -m venv venv
```

### Packages Not Found After Activation

```bash
# Verify activation worked
echo $VIRTUAL_ENV  # Should show your venv path

# Check pip is from venv
which pip  # Should be inside venv

# If not, try explicit path
./venv/bin/pip install requests
```

---

## Summary

Virtual environments are essential for Python development:

1. **Create** with `python3 -m venv venv`
2. **Activate** with `source venv/bin/activate`
3. **Install** packages with `pip install`
4. **Save** dependencies with `pip freeze > requirements.txt`
5. **Deactivate** with `deactivate`
6. **Never commit** the venv directory to version control

Make creating a virtual environment the first step of every new project. Your future self (and your teammates) will thank you.
