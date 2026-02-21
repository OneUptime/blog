# How to Install Molecule for Ansible Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Molecule, Testing, DevOps, CI/CD

Description: Complete guide to installing Molecule for Ansible role and playbook testing, including driver setup for Docker, Podman, and Vagrant.

---

Testing Ansible roles and playbooks before deploying them to production is one of those things everyone agrees is important but few teams actually do well. Molecule is the de facto testing framework for Ansible. It creates test instances, runs your roles against them, verifies the result, and tears everything down. This post covers installing Molecule from scratch, setting up drivers, and getting your first test run working.

## What Molecule Does

Molecule provides a structured workflow for testing Ansible roles:

1. **Create** test instances (containers, VMs, or cloud instances)
2. **Converge** by running your Ansible role against those instances
3. **Verify** that the role produced the expected state
4. **Destroy** the test instances when done

It also handles linting, idempotency checking, and side effect testing. The whole thing is driven by a YAML configuration file and integrates smoothly with CI/CD pipelines.

## Prerequisites

Before installing Molecule, you need:

- Python 3.8 or newer
- pip (Python package manager)
- Ansible (ansible-core 2.12+)
- A container runtime or VM provider (Docker, Podman, Vagrant, etc.)

Check your Python version first.

```bash
# Verify Python version
python3 --version

# Verify pip is available
pip3 --version

# Verify Ansible is installed
ansible --version
```

## Installing Molecule with pip

The recommended way to install Molecule is through pip.

```bash
# Install Molecule
pip install molecule

# Verify the installation
molecule --version
```

This installs the core Molecule package. Drivers for specific platforms are installed separately.

## Installing Molecule with Docker Support

Docker is the most common driver for Molecule testing. Install Molecule along with the Docker driver.

```bash
# Install Molecule with the Docker driver plugin
pip install molecule molecule-plugins[docker]

# Verify Docker is running
docker info

# Verify Molecule can see the Docker driver
molecule drivers
```

The `molecule-plugins` package includes the Docker driver along with several others. If you only want Docker, this is the way to go.

## Installing Molecule with Podman Support

For rootless container testing, use the Podman driver.

```bash
# Install Molecule with the Podman driver
pip install molecule molecule-plugins[podman]

# Verify Podman is available
podman info

# Check available drivers
molecule drivers
```

## Installing Molecule with Vagrant Support

If you need full VM testing (useful for testing kernel modules, systemd services, or OS-level changes), use the Vagrant driver.

```bash
# Install Molecule with the Vagrant driver
pip install molecule molecule-plugins[vagrant]

# Verify Vagrant is installed
vagrant --version

# Verify a provider is available (VirtualBox or libvirt)
vagrant plugin list
```

Vagrant also requires a VM provider like VirtualBox or libvirt.

```bash
# For VirtualBox on macOS
brew install --cask virtualbox

# For libvirt on Linux (Fedora/RHEL)
sudo dnf install -y libvirt libvirt-devel gcc
vagrant plugin install vagrant-libvirt
```

## Installing Multiple Drivers

You can install multiple drivers at once if you test across different platforms.

```bash
# Install Molecule with Docker and Podman drivers
pip install molecule "molecule-plugins[docker,podman]"
```

## Using a Virtual Environment

I strongly recommend installing Molecule in a Python virtual environment. This prevents conflicts with system packages and makes it easy to manage different versions across projects.

```bash
# Create a virtual environment for your Ansible project
python3 -m venv ~/.venvs/ansible-testing

# Activate the virtual environment
source ~/.venvs/ansible-testing/bin/activate

# Install everything you need
pip install ansible-core molecule "molecule-plugins[docker]" ansible-lint yamllint

# Verify the installation
molecule --version
ansible --version
```

For project-specific isolation, create the venv inside your project directory.

```bash
# Inside your Ansible role directory
cd ~/projects/my-ansible-role

# Create a project-local venv
python3 -m venv .venv

# Activate it
source .venv/bin/activate

# Install dependencies
pip install -r requirements-dev.txt
```

And the corresponding requirements file:

```
# requirements-dev.txt - development dependencies for Ansible testing
ansible-core>=2.15
molecule>=6.0
molecule-plugins[docker]>=23.0
ansible-lint>=6.0
yamllint>=1.0
pytest-testinfra>=10.0
```

## Installing from a Requirements File

For team consistency, define all testing dependencies in a file.

```bash
# Install all development dependencies
pip install -r requirements-dev.txt

# Or if using pip-tools for locked dependencies
pip-compile requirements-dev.in
pip-sync requirements-dev.txt
```

## Verifying the Installation

After installation, run through these checks to make sure everything works.

```bash
# Check Molecule version
molecule --version

# List available drivers
molecule drivers

# Check that linting tools are available
ansible-lint --version
yamllint --version
```

Expected output from `molecule drivers`:

```
default
docker
podman
vagrant
```

## Quick Smoke Test

Create a minimal role and run Molecule to verify the full stack works.

```bash
# Initialize a new role with Molecule scaffolding
molecule init role my_test_role --driver-name docker

# Move into the role directory
cd my_test_role

# Run the full Molecule test sequence
molecule test
```

This creates a role with a default Molecule scenario, runs it against a Docker container, and cleans up. If you see the full test lifecycle complete without errors, your installation is working correctly.

## Troubleshooting Common Installation Issues

### Docker Permission Denied

If Molecule fails with a Docker permission error, your user needs to be in the docker group.

```bash
# Add your user to the docker group
sudo usermod -aG docker $USER

# Log out and back in, then verify
docker info
```

### Module Not Found Errors

If you get import errors for `molecule_plugins`, make sure you installed the plugins package, not just molecule.

```bash
# This is incomplete
pip install molecule

# This is what you need
pip install molecule molecule-plugins[docker]
```

### Version Conflicts

If pip reports version conflicts, try installing in a clean virtual environment.

```bash
# Create a fresh venv
python3 -m venv ~/.venvs/molecule-clean
source ~/.venvs/molecule-clean/bin/activate
pip install --upgrade pip
pip install molecule molecule-plugins[docker]
```

### Ansible Version Mismatch

Molecule requires a minimum version of ansible-core. Check compatibility.

```bash
# Check what ansible-core version Molecule needs
pip show molecule | grep Requires

# Upgrade ansible-core if needed
pip install --upgrade ansible-core
```

## IDE Integration

If you use VS Code, install the Ansible extension and add Molecule configuration to your workspace.

```json
{
    "ansible.python.interpreterPath": "${workspaceFolder}/.venv/bin/python",
    "ansible.validation.lint.enabled": true,
    "ansible.validation.lint.path": "${workspaceFolder}/.venv/bin/ansible-lint"
}
```

## What is Next

Once Molecule is installed, you will want to:

- Create your first Molecule scenario for an existing role
- Configure the platform (Docker image, VM box) for your testing needs
- Write verify tests using either Ansible assertions or Testinfra
- Integrate Molecule into your CI/CD pipeline

The installation is the easy part. The real value comes from building a testing habit around your Ansible code. But with Molecule installed and working, you have the foundation in place to make that happen.
