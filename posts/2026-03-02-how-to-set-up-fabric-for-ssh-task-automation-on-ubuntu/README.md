# How to Set Up Fabric for SSH Task Automation on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Fabric, SSH, Automation, Python, DevOps

Description: Learn how to install and use Fabric 2 on Ubuntu for SSH-based task automation, covering remote command execution, file transfers, and multi-host deployments.

---

Fabric is a Python library and command-line tool for executing shell commands over SSH on remote servers. Where Ansible is a full configuration management system, Fabric sits at a lower level - it is essentially a nicer wrapper around Paramiko (Python SSH) with a task-based interface. If you are comfortable with Python and want programmatic control over SSH automation without the overhead of a full CM tool, Fabric fits well.

This guide covers Fabric 2 (the current version), which is substantially different from Fabric 1.x.

## Installation

```bash
# Create a virtual environment for your automation scripts
python3 -m venv ~/fabric-env
source ~/fabric-env/bin/activate

# Install Fabric
pip install fabric

# Verify
fab --version
```

## SSH Configuration

Fabric uses your existing SSH config and keys. Make sure your key-based auth is working before using Fabric:

```bash
# Test basic SSH connectivity to your remote hosts
ssh user@remote-server-1 "hostname"

# If using a specific key or non-standard port
ssh -i ~/.ssh/mykey -p 2222 user@remote-server-1 "hostname"
```

Fabric reads `~/.ssh/config`, so entries there work automatically:

```text
# ~/.ssh/config
Host web1
    HostName web1.example.com
    User deploy
    IdentityFile ~/.ssh/deploy_key
    Port 22

Host db1
    HostName db1.example.com
    User ubuntu
    IdentityFile ~/.ssh/deploy_key
```

## Basic fabfile.py

Fabric tasks live in a `fabfile.py` in your project directory:

```python
# fabfile.py - Basic Fabric task examples

from fabric import task, Connection

# A simple task that runs on a remote host
@task
def hostname(ctx):
    """Print the hostname of the remote server."""
    result = ctx.run('hostname -f', hide=True)
    print(f"Remote hostname: {result.stdout.strip()}")

@task
def disk_usage(ctx):
    """Show disk usage on the remote server."""
    ctx.run('df -h')

@task
def who(ctx):
    """Show who is logged into the remote server."""
    ctx.run('who')

@task
def uptime(ctx):
    """Show server uptime."""
    ctx.run('uptime')
```

Run tasks with the `fab` command:

```bash
# Run a task on a specific host
fab -H web1 hostname

# Run on multiple hosts (comma-separated)
fab -H web1,web2,web3 disk_usage

# Run with a specific user
fab -H deploy@web1 disk_usage
```

## Working with Connection Objects

For more control, use `Connection` objects directly:

```python
# connections.py - Direct connection usage

from fabric import Connection, Config

def connect_to_server(host, user='ubuntu', key='~/.ssh/id_rsa'):
    """Create a connection to a remote server."""
    config = Config(overrides={
        'sudo': {'password': None}  # Use key-based sudo if needed
    })

    return Connection(
        host=host,
        user=user,
        connect_kwargs={
            'key_filename': key,
        },
        config=config
    )

# Running commands
with Connection('web1') as conn:
    # Run as the connected user
    result = conn.run('ls /var/www/html', hide=True)
    print(result.stdout)

    # Run as root with sudo
    result = conn.sudo('systemctl status nginx', hide=True)
    print(result.stdout)

    # Check if command succeeded
    result = conn.run('systemctl is-active nginx', warn=True, hide=True)
    if result.return_code == 0:
        print("nginx is running")
    else:
        print("nginx is not running")
```

## File Transfers

```python
# transfers.py - Uploading and downloading files

from fabric import Connection

def deploy_config(conn, local_path, remote_path):
    """Upload a config file to a remote server."""
    conn.put(local_path, remote=remote_path)
    print(f"Uploaded {local_path} -> {remote_path}")

def download_log(conn, remote_path, local_path):
    """Download a log file from a remote server."""
    conn.get(remote_path, local=local_path)
    print(f"Downloaded {remote_path} -> {local_path}")

# Example usage
with Connection('web1') as conn:
    # Upload a new nginx config
    deploy_config(conn, 'configs/nginx.conf', '/tmp/nginx.conf')

    # Move it to the right place with sudo
    conn.sudo('cp /tmp/nginx.conf /etc/nginx/nginx.conf')
    conn.sudo('nginx -t')  # Validate
    conn.sudo('systemctl reload nginx')

    # Download the latest error log
    download_log(conn, '/var/log/nginx/error.log', f'./logs/web1_error.log')
```

## Deployment Task Example

A real-world deployment task:

```python
# deploy.py - Application deployment with Fabric

from fabric import task, Connection
import datetime

APP_DIR = '/var/www/myapp'
REPO_URL = 'git@github.com:myorg/myapp.git'

@task
def deploy(ctx, host, branch='main'):
    """
    Deploy the application to a server.

    Usage: fab -H web1 deploy
           fab -H web1 deploy --branch=staging
    """
    timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    release_dir = f'{APP_DIR}/releases/{timestamp}'
    current_link = f'{APP_DIR}/current'

    with Connection(host) as conn:
        print(f"Deploying branch '{branch}' to {host}...")

        # Create release directory
        conn.sudo(f'mkdir -p {release_dir}')

        # Clone the repository
        conn.run(f'git clone --branch {branch} --depth 1 {REPO_URL} {release_dir}')

        # Install dependencies
        with conn.cd(release_dir):
            conn.run('pip install -r requirements.txt --quiet')

        # Run database migrations
        with conn.cd(release_dir):
            conn.run('python manage.py migrate --no-input')

        # Collect static files
        with conn.cd(release_dir):
            conn.run('python manage.py collectstatic --no-input --quiet')

        # Atomic switch: update symlink
        conn.sudo(f'ln -sfn {release_dir} {current_link}')

        # Restart application service
        conn.sudo('systemctl restart myapp')

        # Wait and verify
        import time
        time.sleep(3)
        result = conn.sudo('systemctl is-active myapp', warn=True, hide=True)
        if result.return_code == 0:
            print(f"Deploy successful! Running from {release_dir}")
        else:
            print("Deploy may have failed - check service status")
            conn.sudo('journalctl -u myapp -n 30 --no-pager')

        # Clean up old releases (keep last 5)
        conn.run(
            f'ls -dt {APP_DIR}/releases/* | tail -n +6 | xargs rm -rf'
        )

@task
def rollback(ctx, host):
    """Roll back to the previous release."""
    with Connection(host) as conn:
        # Get second-to-last release
        result = conn.run(
            f'ls -dt {APP_DIR}/releases/* | sed -n 2p',
            hide=True
        )
        prev_release = result.stdout.strip()

        if not prev_release:
            print("No previous release found")
            return

        conn.sudo(f'ln -sfn {prev_release} {APP_DIR}/current')
        conn.sudo('systemctl restart myapp')
        print(f"Rolled back to {prev_release}")
```

## Multi-Host Operations

```python
# multi_host.py - Running tasks across multiple servers

from fabric import Connection
from concurrent.futures import ThreadPoolExecutor, as_completed

def run_on_all(hosts, command):
    """Run a command on multiple hosts in parallel."""
    results = {}

    def run_single(host):
        with Connection(host) as conn:
            try:
                result = conn.run(command, hide=True)
                return host, result.stdout.strip(), None
            except Exception as e:
                return host, None, str(e)

    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(run_single, host): host for host in hosts}
        for future in as_completed(futures):
            host, output, error = future.result()
            results[host] = {'output': output, 'error': error}

    return results

# Check nginx status across all web servers
web_servers = ['web1', 'web2', 'web3', 'web4']
results = run_on_all(web_servers, 'systemctl is-active nginx')

for host, data in results.items():
    status = data['output'] or f"ERROR: {data['error']}"
    print(f"{host}: {status}")
```

## Using Environment Variables

```python
# Passing environment to remote commands
with Connection('web1') as conn:
    conn.run(
        'python3 manage.py shell',
        env={'DJANGO_SETTINGS_MODULE': 'myproject.settings.production'}
    )
```

Fabric works best for teams that already know Python and want to write deployment and administration logic without learning a new DSL. For large fleets, Ansible or similar tools scale better. For smaller setups or one-off automation that needs programmatic control, Fabric hits a nice sweet spot between raw SSH scripting and full configuration management.
