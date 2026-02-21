# How to Write Molecule Verify Tests with Testinfra

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Molecule, Testinfra, Python Testing, DevOps

Description: Use Testinfra with Molecule to write Python-based infrastructure tests that verify your Ansible roles produce the correct system state.

---

While using Ansible itself as a Molecule verifier works fine, Testinfra brings the power of Python and pytest to your infrastructure testing. Testinfra is a Python library that provides modules for testing the actual state of servers. It can check packages, services, files, processes, sockets, and more through a clean, readable API. When combined with Molecule, it gives you a testing experience that feels more like writing unit tests than writing more Ansible YAML.

## Why Testinfra Over Ansible Verification

The Ansible verifier works by running a playbook that checks state. Testinfra takes a different approach: it gives you Python functions that query the system directly. The advantages include:

- **Familiar testing patterns.** If you know pytest, you already know how to organize and run Testinfra tests.
- **Better assertion messages.** pytest provides detailed failure output showing exactly what was expected versus what was found.
- **Parameterized tests.** You can use pytest's parametrize decorator to run the same test with different inputs.
- **Fixtures and setup/teardown.** pytest fixtures give you flexible test setup and cleanup.
- **Test discovery and selection.** Run specific tests with `-k` or mark-based selection.

## Installing Testinfra

Install Testinfra alongside Molecule.

```bash
# Install Testinfra
pip install pytest-testinfra

# Or install everything together
pip install molecule molecule-plugins[docker] pytest-testinfra
```

## Configuring Molecule for Testinfra

Tell Molecule to use Testinfra as the verifier.

```yaml
# molecule/default/molecule.yml - Testinfra verifier configuration
driver:
  name: docker

platforms:
  - name: instance
    image: "geerlingguy/docker-ubuntu2204-ansible:latest"
    pre_build_image: true
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    cgroupns_mode: host
    command: ""
    tmpfs:
      - /run
      - /tmp

provisioner:
  name: ansible

verifier:
  name: testinfra
  options:
    v: true      # verbose output
    sudo: true   # run commands with sudo on the instance
```

Testinfra test files go in the scenario directory, typically as `test_default.py` or any file matching `test_*.py`.

## Writing Your First Testinfra Test

Create a test file in the scenario directory.

```python
# molecule/default/test_default.py - basic Testinfra tests

def test_nginx_is_installed(host):
    """Verify that nginx package is installed."""
    nginx = host.package("nginx")
    assert nginx.is_installed


def test_nginx_is_running(host):
    """Verify that nginx service is running and enabled."""
    nginx = host.service("nginx")
    assert nginx.is_running
    assert nginx.is_enabled


def test_nginx_config_exists(host):
    """Verify the main nginx config file exists with correct permissions."""
    config = host.file("/etc/nginx/nginx.conf")
    assert config.exists
    assert config.is_file
    assert config.user == "root"
    assert config.group == "root"
    assert oct(config.mode) == "0o644"


def test_nginx_listens_on_port_80(host):
    """Verify nginx is listening on port 80."""
    socket = host.socket("tcp://0.0.0.0:80")
    assert socket.is_listening
```

The `host` parameter is a pytest fixture provided by Testinfra. It represents the test instance and gives you access to all of Testinfra's modules.

## Testinfra Modules Reference

Here are the modules you will use most often, with examples.

### Testing Packages

```python
# test_packages.py - verify package installation

def test_required_packages(host):
    """Check that all required packages are installed."""
    packages = ["nginx", "openssl", "curl", "logrotate"]
    for pkg_name in packages:
        pkg = host.package(pkg_name)
        assert pkg.is_installed, f"Package {pkg_name} is not installed"


def test_nginx_version(host):
    """Verify nginx is at least version 1.18."""
    nginx = host.package("nginx")
    assert nginx.is_installed
    # Version is a string like "1.24.0-1ubuntu1"
    major, minor = nginx.version.split(".")[:2]
    assert int(major) >= 1
    assert int(minor) >= 18
```

### Testing Services

```python
# test_services.py - verify service state

def test_nginx_service(host):
    """Verify nginx is running and enabled."""
    svc = host.service("nginx")
    assert svc.is_running
    assert svc.is_enabled


def test_cron_service(host):
    """Verify cron is running."""
    # Service name varies by distro
    os_family = host.system_info.distribution
    if os_family in ("ubuntu", "debian"):
        svc = host.service("cron")
    else:
        svc = host.service("crond")
    assert svc.is_running
```

### Testing Files and Directories

```python
# test_files.py - verify file system state

def test_document_root(host):
    """Verify the web document root directory exists."""
    docroot = host.file("/var/www/html")
    assert docroot.exists
    assert docroot.is_directory
    assert docroot.user == "www-data"
    assert docroot.group == "www-data"


def test_nginx_config_content(host):
    """Verify nginx config contains expected directives."""
    config = host.file("/etc/nginx/nginx.conf")
    assert config.contains("worker_processes")
    assert config.contains("worker_connections 1024")


def test_ssl_certificate(host):
    """Verify SSL certificate is in place."""
    cert = host.file("/etc/ssl/certs/myapp.crt")
    assert cert.exists
    assert cert.is_file
    assert oct(cert.mode) == "0o644"


def test_private_key_permissions(host):
    """Verify private key has restrictive permissions."""
    key = host.file("/etc/ssl/private/myapp.key")
    assert key.exists
    assert oct(key.mode) == "0o600"
    assert key.user == "root"
```

### Testing Sockets and Ports

```python
# test_sockets.py - verify network listeners

def test_http_listening(host):
    """Verify HTTP is listening."""
    assert host.socket("tcp://0.0.0.0:80").is_listening


def test_https_listening(host):
    """Verify HTTPS is listening."""
    assert host.socket("tcp://0.0.0.0:443").is_listening


def test_only_expected_ports(host):
    """Verify no unexpected services are listening."""
    allowed_ports = [22, 80, 443]
    listening = host.socket.get_listening_sockets()
    for sock in listening:
        if sock.startswith("tcp://"):
            port = int(sock.split(":")[-1])
            assert port in allowed_ports, f"Unexpected listener on port {port}"
```

### Testing Commands

```python
# test_commands.py - verify command output

def test_nginx_syntax(host):
    """Verify nginx configuration syntax is valid."""
    result = host.run("nginx -t")
    assert result.rc == 0
    assert "syntax is ok" in result.stderr


def test_curl_localhost(host):
    """Verify the web server responds to HTTP requests."""
    result = host.run("curl -s -o /dev/null -w '%{http_code}' http://localhost/")
    assert result.stdout.strip("'") == "200"
```

### Testing Users and Groups

```python
# test_users.py - verify user configuration

def test_app_user_exists(host):
    """Verify application user exists with correct properties."""
    user = host.user("appuser")
    assert user.exists
    assert user.shell == "/bin/bash"
    assert "www-data" in user.groups


def test_app_group_exists(host):
    """Verify application group exists."""
    group = host.group("appgroup")
    assert group.exists
```

## Using Pytest Parametrize

Test the same condition across multiple inputs without code duplication.

```python
# test_parametrized.py - parameterized tests
import pytest


@pytest.mark.parametrize("pkg_name", [
    "nginx",
    "openssl",
    "curl",
    "python3",
    "logrotate",
])
def test_package_installed(host, pkg_name):
    """Verify each required package is installed."""
    assert host.package(pkg_name).is_installed


@pytest.mark.parametrize("filepath,owner,mode", [
    ("/etc/nginx/nginx.conf", "root", "0o644"),
    ("/etc/nginx/sites-enabled/myapp.conf", "root", "0o644"),
    ("/var/www/html/index.html", "www-data", "0o644"),
])
def test_file_properties(host, filepath, owner, mode):
    """Verify file ownership and permissions."""
    f = host.file(filepath)
    assert f.exists, f"{filepath} does not exist"
    assert f.user == owner, f"{filepath} owned by {f.user}, expected {owner}"
    assert oct(f.mode) == mode, f"{filepath} has mode {oct(f.mode)}, expected {mode}"


@pytest.mark.parametrize("port", [80, 443])
def test_listening_ports(host, port):
    """Verify expected ports are listening."""
    assert host.socket(f"tcp://0.0.0.0:{port}").is_listening
```

## Multi-Host Testing

When your Molecule scenario has multiple platforms, Testinfra runs against each one. You can write host-specific tests.

```python
# test_multihost.py - tests that differ per host

def test_webserver_role(host):
    """Tests that only apply to web servers."""
    hostname = host.backend.get_hostname()
    if "web" not in hostname:
        pytest.skip("Not a web server")

    assert host.package("nginx").is_installed
    assert host.socket("tcp://0.0.0.0:80").is_listening


def test_database_role(host):
    """Tests that only apply to database servers."""
    hostname = host.backend.get_hostname()
    if "db" not in hostname:
        pytest.skip("Not a database server")

    assert host.package("postgresql").is_installed
    assert host.socket("tcp://0.0.0.0:5432").is_listening
```

## Running Tests

Molecule runs Testinfra automatically during `molecule verify` or `molecule test`. You can also run Testinfra directly for faster iteration.

```bash
# Run the full Molecule test lifecycle
molecule test

# Run only the verify step (faster during development)
molecule verify

# Run a specific test file
molecule verify -- -k "test_nginx"

# Run with extra verbose output
molecule verify -- -vvv
```

## Tips

1. **Name tests descriptively.** Test function names become the test output. `test_nginx_listens_on_port_80` is much better than `test_port`.

2. **Use parametrize for lists.** If you are testing the same thing for multiple packages, files, or ports, parametrize saves you from writing repetitive code.

3. **Check behavior, not implementation.** Test that port 80 is listening rather than that a specific configuration line exists. This makes tests more resilient to role changes.

4. **Keep tests fast.** Avoid unnecessary sleeps or waits. If a service is not ready yet, that is a role problem, not a test problem.

Testinfra brings the rigor of software testing to infrastructure verification. Once you get comfortable with it, writing infrastructure tests becomes second nature.
