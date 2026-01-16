# How to Install Multiple Python Versions on Ubuntu with pyenv

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Python, pyenv, Development, Version Management, Tutorial

Description: Master Python version management on Ubuntu using pyenv to install, switch between, and manage multiple Python versions for different projects.

---

Different projects often require different Python versions. System Python can't be easily changed, and installing multiple versions manually is messy. pyenv solves this by letting you install and switch between Python versions effortlessly. This guide covers installation, usage, and integration with virtual environments.

## Why pyenv?

- **Multiple versions**: Install Python 2.7, 3.8, 3.11, 3.12 side by side
- **Per-project versions**: Automatically use the right version in each directory
- **No sudo required**: Everything installs in your home directory
- **Clean separation**: Doesn't touch system Python

## Prerequisites

Install build dependencies required to compile Python:

```bash
# Update package lists
sudo apt update

# Install dependencies for building Python from source
sudo apt install -y make build-essential libssl-dev zlib1g-dev \
  libbz2-dev libreadline-dev libsqlite3-dev wget curl llvm \
  libncursesw5-dev xz-utils tk-dev libxml2-dev libxmlsec1-dev \
  libffi-dev liblzma-dev
```

## Installing pyenv

### Method 1: Automatic Installer (Recommended)

The easiest way to install pyenv:

```bash
# Download and run the pyenv installer
curl https://pyenv.run | bash
```

This installs:
- pyenv itself
- pyenv-virtualenv (for managing virtual environments)
- pyenv-update (for updating pyenv)

### Method 2: Manual Installation

Clone the repository directly:

```bash
# Clone pyenv to ~/.pyenv
git clone https://github.com/pyenv/pyenv.git ~/.pyenv

# Optional: Compile dynamic bash extension for speed
cd ~/.pyenv && src/configure && make -C src
```

## Configure Shell

Add pyenv to your shell configuration:

### For Bash

```bash
# Add to ~/.bashrc
cat >> ~/.bashrc << 'EOF'

# pyenv configuration
export PYENV_ROOT="$HOME/.pyenv"
command -v pyenv >/dev/null || export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init -)"

# Optional: pyenv-virtualenv auto-activation
eval "$(pyenv virtualenv-init -)"
EOF

# Reload shell configuration
source ~/.bashrc
```

### For Zsh

```bash
# Add to ~/.zshrc
cat >> ~/.zshrc << 'EOF'

# pyenv configuration
export PYENV_ROOT="$HOME/.pyenv"
command -v pyenv >/dev/null || export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init -)"
eval "$(pyenv virtualenv-init -)"
EOF

source ~/.zshrc
```

## Verify Installation

```bash
# Check pyenv is installed
pyenv --version

# List available commands
pyenv commands
```

## Installing Python Versions

### List Available Versions

```bash
# List all available Python versions
pyenv install --list

# Filter for specific versions
pyenv install --list | grep "3.12"

# List only stable CPython releases
pyenv install --list | grep -E "^\s*3\.[0-9]+\.[0-9]+$"
```

### Install Python Versions

```bash
# Install Python 3.12.1 (or latest 3.12.x)
pyenv install 3.12.1

# Install Python 3.11.7
pyenv install 3.11.7

# Install Python 3.10.13
pyenv install 3.10.13

# Install older version if needed for legacy projects
pyenv install 3.8.18
```

Installation compiles Python from source, which takes a few minutes.

### List Installed Versions

```bash
# Show all installed Python versions
pyenv versions

# Show current active version
pyenv version
```

## Switching Python Versions

### Global Version

Set the default Python for your user:

```bash
# Set global Python version
pyenv global 3.12.1

# Verify
python --version
which python
```

### Local Version (Per-Project)

Set Python version for a specific directory:

```bash
# Navigate to your project
cd ~/projects/my-project

# Set local version (creates .python-version file)
pyenv local 3.11.7

# Verify
python --version
cat .python-version
```

When you enter this directory, pyenv automatically activates Python 3.11.7.

### Shell Version (Temporary)

Set Python for current shell session only:

```bash
# Override version for this terminal session
pyenv shell 3.10.13

# Verify
python --version

# Unset to return to global/local
pyenv shell --unset
```

## Managing Virtual Environments

pyenv-virtualenv integrates virtual environments with pyenv.

### Create Virtual Environment

```bash
# Create virtualenv with specific Python version
pyenv virtualenv 3.12.1 myproject-env

# Create virtualenv using current Python version
pyenv virtualenv my-other-env
```

### List Virtual Environments

```bash
# List all virtualenvs
pyenv virtualenvs
```

### Activate/Deactivate

```bash
# Manual activation
pyenv activate myproject-env

# Deactivate
pyenv deactivate

# Or use local version for auto-activation
cd ~/projects/myproject
pyenv local myproject-env  # Auto-activates when entering directory
```

### Delete Virtual Environment

```bash
# Remove a virtualenv
pyenv virtualenv-delete myproject-env
```

## Practical Workflow Example

Setting up a new project with pyenv:

```bash
# Create project directory
mkdir ~/projects/webapp && cd ~/projects/webapp

# Install desired Python version if not already installed
pyenv install 3.12.1

# Create project-specific virtualenv
pyenv virtualenv 3.12.1 webapp-env

# Set as local Python (auto-activates in this directory)
pyenv local webapp-env

# Verify environment
python --version
which python  # Should show ~/.pyenv/versions/webapp-env/bin/python

# Install project dependencies
pip install flask requests pytest

# Dependencies stay isolated in this virtualenv
pip list
```

## Useful pyenv Commands

```bash
# Update pyenv itself
pyenv update

# Uninstall a Python version
pyenv uninstall 3.9.18

# Rehash (rebuild shim binaries after installing packages with executables)
pyenv rehash

# Show where a specific version is installed
pyenv prefix 3.12.1

# Show which pyenv version provides a command
pyenv which python
pyenv which pip
```

## Integration with pip and pipx

### pip

pip works normally within pyenv:

```bash
# pip uses the active Python version
pip install package-name

# Install specific versions
pip install django==4.2
```

### pipx (for CLI tools)

Install global Python CLI tools that work with any pyenv version:

```bash
# Install pipx
pip install pipx
pipx ensurepath

# Install CLI tools globally
pipx install black
pipx install flake8
pipx install poetry
```

## Common Issues and Solutions

### Build Fails with Missing Dependencies

Install missing build dependencies:

```bash
# Common missing packages
sudo apt install -y libbz2-dev libncurses5-dev libncursesw5-dev \
  libreadline-dev libsqlite3-dev libssl-dev

# Retry installation
pyenv install 3.12.1
```

### OpenSSL Issues

Ubuntu's OpenSSL version might conflict:

```bash
# Install specific OpenSSL for Python builds
sudo apt install libssl-dev

# If still failing, try with custom OpenSSL path
PYTHON_CONFIGURE_OPTS="--with-openssl=/usr" pyenv install 3.12.1
```

### pyenv command not found

Shell configuration wasn't loaded:

```bash
# Reload shell config
source ~/.bashrc  # or ~/.zshrc

# Or restart terminal

# Verify pyenv is in PATH
echo $PATH | grep pyenv
```

### Wrong Python Version Activating

Check version precedence:

```bash
# Show version selection reason
pyenv version

# Check for .python-version files in parent directories
find . -name ".python-version" 2>/dev/null

# Check global setting
cat ~/.pyenv/version
```

### Virtual Environment Not Auto-Activating

Ensure pyenv-virtualenv init is in your shell config:

```bash
# Check if virtualenv-init is configured
grep "virtualenv-init" ~/.bashrc

# Should see this line:
# eval "$(pyenv virtualenv-init -)"
```

## Performance Tips

### Speed Up Shell Startup

Lazy-load pyenv if startup is slow:

```bash
# Replace standard init with lazy loading in ~/.bashrc
export PYENV_ROOT="$HOME/.pyenv"
export PATH="$PYENV_ROOT/bin:$PATH"

pyenv() {
    eval "$(command pyenv init -)"
    eval "$(command pyenv virtualenv-init -)"
    pyenv "$@"
}
```

### Compile Optimizations

Build Python with optimizations for better performance:

```bash
# Install with profile-guided optimization (slower build, faster Python)
PYTHON_CONFIGURE_OPTS="--enable-optimizations" pyenv install 3.12.1
```

## Uninstalling pyenv

To completely remove pyenv:

```bash
# Remove pyenv directory
rm -rf ~/.pyenv

# Remove shell configuration (edit manually)
# Remove pyenv lines from ~/.bashrc or ~/.zshrc
```

---

With pyenv, managing Python versions becomes straightforward. Each project can specify its exact Python requirement in a `.python-version` file, ensuring consistent environments across development machines. Combined with virtual environments, you get complete isolation between projects while keeping system Python untouched.
