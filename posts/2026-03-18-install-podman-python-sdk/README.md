# How to Install the Podman Python SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Python, SDK, Installation, Container

Description: A complete guide to installing the Podman Python SDK on Linux, macOS, and Windows, including prerequisites, virtual environments, and troubleshooting common installation issues.

---

> The Podman Python SDK gives you programmatic control over containers, images, volumes, and networks directly from your Python scripts. Getting it installed correctly is the first step toward container automation.

If you have ever wanted to manage containers from Python code rather than the command line, the Podman Python SDK is the tool you need. It provides a Pythonic interface to the Podman REST API, letting you build, run, and manage containers with clean, readable code. This guide walks you through every step of installing the SDK on your system and verifying that everything works.

---

## Prerequisites

Before installing the Podman Python SDK, you need two things on your system: Podman itself and Python 3.9 or later. The SDK communicates with Podman through its REST API, so a working Podman installation is essential.

### Installing Podman

On Fedora or RHEL-based systems:

```bash
sudo dnf install podman
```

On Ubuntu or Debian-based systems:

```bash
sudo apt-get update
sudo apt-get install podman
```

On macOS using Homebrew:

```bash
brew install podman
podman machine init
podman machine start
```

Verify your Podman installation:

```bash
podman --version
```

### Installing Python

Most Linux distributions come with Python pre-installed. Check your version:

```bash
python3 --version
```

If you need to install Python, use your package manager:

```bash
# Fedora/RHEL

sudo dnf install python3 python3-pip

# Ubuntu/Debian
sudo apt-get install python3 python3-pip
```

## Setting Up a Virtual Environment

It is a best practice to install the SDK inside a Python virtual environment. This keeps your project dependencies isolated and avoids conflicts with system packages.

```bash
# Create a virtual environment
python3 -m venv podman-env

# Activate it on Linux/macOS
source podman-env/bin/activate

# Activate it on Windows
podman-env\Scripts\activate
```

Once activated, your shell prompt will show the environment name, confirming you are working inside the virtual environment.

## Installing the Podman Python SDK

The SDK is available on PyPI under the package name `podman`. Install it with pip:

```bash
pip install podman
```

This installs the latest stable version of the SDK along with its dependencies. If you need a specific version, pin it:

```bash
pip install podman==5.0.0
```

To install with testing dependencies for contributing or testing:

```bash
pip install podman[test]
```

### Installing from Source

If you need the latest development version, you can install directly from the Git repository:

```bash
pip install git+https://github.com/containers/podman-py.git
```

Or clone and install locally:

```bash
git clone https://github.com/containers/podman-py.git
cd podman-py
pip install -e .
```

The `-e` flag installs in editable mode, which is useful if you plan to modify the SDK source code.

## Verifying the Installation

After installation, verify that the SDK is importable and can communicate with Podman:

```python
import podman

# Check the SDK version
print(podman.__version__)

# Create a client and check the Podman version
client = podman.PodmanClient()
version = client.version()
print(f"Podman version: {version['Version']}")
client.close()
```

Save this as `verify_install.py` and run it:

```bash
python3 verify_install.py
```

You should see the SDK version and the Podman version printed to the console. If both appear without errors, your installation is complete and working.

## Enabling the Podman Socket

The Python SDK communicates with Podman through a Unix socket. On Linux, you need to enable and start the Podman socket service:

```bash
# For rootless Podman (recommended)
systemctl --user enable --now podman.socket

# Verify the socket is active
systemctl --user status podman.socket
```

Check that the socket file exists:

```bash
ls -la /run/user/$(id -u)/podman/podman.sock
```

For rootful Podman:

```bash
sudo systemctl enable --now podman.socket
sudo ls -la /run/podman/podman.sock
```

On macOS, the Podman machine handles the socket automatically when the machine is running.

## Understanding the SDK Dependencies

The Podman Python SDK has a minimal set of dependencies:

```bash
pip show podman
```

Key dependencies include `requests` for HTTP communication, `urllib3` for connection pooling, and `tomli` for configuration file parsing on Python versions before 3.11. The SDK uses these to communicate with the Podman REST API over the Unix socket.

You can see the full dependency tree:

```bash
pip install pipdeptree
pipdeptree -p podman
```

## Adding the SDK to Your Project

For production projects, pin the SDK version in your requirements file:

```bash
# requirements.txt
podman==5.0.0
```

Or if you use `pyproject.toml`:

```toml
[project]
dependencies = [
    "podman>=5.0.0",
]
```

For Poetry users:

```bash
poetry add podman
```

## Troubleshooting Common Issues

### Permission Denied Errors

If you see permission errors when connecting to the socket, check that the socket service is running and that your user has the correct permissions:

```bash
systemctl --user status podman.socket
```

If the socket is not running, start it:

```bash
systemctl --user start podman.socket
```

### Module Not Found

If Python cannot find the `podman` module, verify that you are using the correct Python interpreter and that the SDK is installed in the active environment:

```bash
which python3
pip list | grep podman
```

### Connection Refused

If the client raises a connection error, the Podman service may not be running. Restart it:

```bash
systemctl --user restart podman.socket
```

On macOS, check that the Podman machine is running:

```bash
podman machine list
podman machine start
```

### Version Mismatch Warnings

The SDK version should be compatible with your Podman version. If you see warnings about API version mismatches, upgrade either the SDK or Podman:

```bash
pip install --upgrade podman
```

## Conclusion

Installing the Podman Python SDK is straightforward once you have Podman and Python set up correctly. The key steps are enabling the Podman socket, installing the SDK with pip, and verifying the connection. With the SDK installed, you are ready to start automating container operations from Python. In the next guide, we will cover how to connect to Podman and configure the client for different environments.
