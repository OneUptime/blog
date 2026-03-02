# How to Use Python for System Administration on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Python, System Administration, Automation, DevOps

Description: A practical guide to using Python for common system administration tasks on Ubuntu, covering process management, file operations, service control, and monitoring.

---

Python has become the default scripting language for system administrators who need more power than Bash but do not want the overhead of compiled languages. Ubuntu includes Python 3 by default, and its standard library covers most common sysadmin tasks without any pip installs required.

This guide focuses on practical patterns - the kinds of things you actually need when managing servers rather than toy examples.

## Setting Up Your Environment

```bash
# Ubuntu 22.04+ comes with Python 3, verify version
python3 --version

# Install pip and venv
sudo apt install -y python3-pip python3-venv

# Create a venv for your admin scripts
python3 -m venv ~/sysadmin-env
source ~/sysadmin-env/bin/activate

# Common useful packages for sysadmin work
pip install psutil paramiko requests PyYAML
```

## Running Shell Commands from Python

The `subprocess` module is the standard way to run system commands:

```python
#!/usr/bin/env python3
# run_commands.py - Executing shell commands from Python

import subprocess
import shlex

def run_command(command, capture=True, check=True):
    """Run a shell command and return its output."""
    if isinstance(command, str):
        command = shlex.split(command)

    result = subprocess.run(
        command,
        capture_output=capture,
        text=True,
        check=check  # Raises CalledProcessError on non-zero exit
    )
    return result.stdout.strip(), result.stderr.strip()

# Simple examples
stdout, stderr = run_command("df -h")
print(stdout)

# Get disk usage as structured data
stdout, _ = run_command("df -h --output=target,size,used,avail,pcent")
for line in stdout.splitlines()[1:]:  # Skip header
    parts = line.split()
    if len(parts) == 5:
        mount, size, used, avail, percent = parts
        print(f"Mount: {mount}, Used: {percent}")

# Run a command that might fail (check=False prevents exception)
stdout, stderr = run_command("systemctl is-active nginx", check=False)
print(f"nginx status: {stdout}")
```

## Process Management with psutil

`psutil` provides cross-platform access to system and process information:

```python
#!/usr/bin/env python3
# process_manager.py - Process inspection and management

import psutil
import datetime

def list_processes_by_cpu(top_n=10):
    """List top N processes by CPU usage."""
    processes = []
    for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'username']):
        try:
            processes.append(proc.info)
        except psutil.NoSuchProcess:
            pass

    # Sort by CPU (need to call once to initialize, then again)
    for proc in psutil.process_iter(['pid', 'name', 'cpu_percent']):
        proc.cpu_percent()  # Initialize

    import time
    time.sleep(1)  # Wait for measurement

    processes = []
    for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'username']):
        try:
            processes.append(proc.info)
        except psutil.NoSuchProcess:
            pass

    processes.sort(key=lambda x: x.get('cpu_percent', 0), reverse=True)
    return processes[:top_n]

def check_process_running(process_name):
    """Check if a process with given name is running."""
    for proc in psutil.process_iter(['name']):
        try:
            if proc.info['name'] == process_name:
                return True
        except psutil.NoSuchProcess:
            pass
    return False

def system_memory_report():
    """Get a memory usage report."""
    mem = psutil.virtual_memory()
    swap = psutil.swap_memory()

    return {
        'total_gb': round(mem.total / (1024**3), 2),
        'used_gb': round(mem.used / (1024**3), 2),
        'available_gb': round(mem.available / (1024**3), 2),
        'percent': mem.percent,
        'swap_used_gb': round(swap.used / (1024**3), 2),
        'swap_percent': swap.percent
    }

def disk_usage_report():
    """Get disk usage for all mounted partitions."""
    report = []
    for partition in psutil.disk_partitions():
        try:
            usage = psutil.disk_usage(partition.mountpoint)
            report.append({
                'device': partition.device,
                'mountpoint': partition.mountpoint,
                'fstype': partition.fstype,
                'total_gb': round(usage.total / (1024**3), 2),
                'used_gb': round(usage.used / (1024**3), 2),
                'percent': usage.percent
            })
        except PermissionError:
            pass
    return report

if __name__ == '__main__':
    print("=== Memory Report ===")
    mem = system_memory_report()
    print(f"RAM: {mem['used_gb']}GB / {mem['total_gb']}GB ({mem['percent']}%)")

    print("\n=== Disk Report ===")
    for disk in disk_usage_report():
        flag = " <-- WARNING" if disk['percent'] > 80 else ""
        print(f"{disk['mountpoint']}: {disk['used_gb']}GB / {disk['total_gb']}GB ({disk['percent']}%){flag}")
```

## File and Directory Operations

```python
#!/usr/bin/env python3
# file_ops.py - Common file system operations

import os
import shutil
import hashlib
import pathlib
from datetime import datetime, timedelta

def find_large_files(directory, min_size_mb=100):
    """Find files larger than min_size_mb megabytes."""
    min_size = min_size_mb * 1024 * 1024
    large_files = []

    for root, dirs, files in os.walk(directory):
        # Skip certain directories
        dirs[:] = [d for d in dirs if d not in ['.git', '__pycache__', 'node_modules']]

        for filename in files:
            filepath = os.path.join(root, filename)
            try:
                size = os.path.getsize(filepath)
                if size >= min_size:
                    large_files.append((filepath, size))
            except OSError:
                pass

    large_files.sort(key=lambda x: x[1], reverse=True)
    return large_files

def find_old_files(directory, days_old=30):
    """Find files not modified in the last days_old days."""
    cutoff = datetime.now() - timedelta(days=days_old)
    old_files = []

    for root, dirs, files in os.walk(directory):
        for filename in files:
            filepath = os.path.join(root, filename)
            try:
                mtime = datetime.fromtimestamp(os.path.getmtime(filepath))
                if mtime < cutoff:
                    old_files.append((filepath, mtime))
            except OSError:
                pass

    return sorted(old_files, key=lambda x: x[1])

def safe_file_write(filepath, content):
    """Write to a file atomically using a temp file."""
    import tempfile

    dirpath = os.path.dirname(filepath)
    # Write to temp file first, then rename (atomic on most filesystems)
    with tempfile.NamedTemporaryFile(mode='w', dir=dirpath, delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    os.replace(tmp_path, filepath)

def hash_file(filepath, algorithm='sha256'):
    """Calculate hash of a file."""
    h = hashlib.new(algorithm)
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            h.update(chunk)
    return h.hexdigest()

def cleanup_old_logs(log_dir, days_to_keep=30):
    """Delete log files older than days_to_keep."""
    cutoff = datetime.now() - timedelta(days=days_to_keep)
    deleted_count = 0
    freed_bytes = 0

    for filepath in pathlib.Path(log_dir).glob('**/*.log*'):
        try:
            mtime = datetime.fromtimestamp(filepath.stat().st_mtime)
            if mtime < cutoff:
                size = filepath.stat().st_size
                filepath.unlink()
                deleted_count += 1
                freed_bytes += size
        except OSError:
            pass

    print(f"Deleted {deleted_count} files, freed {freed_bytes // (1024*1024)} MB")
```

## Service Management via systemd

```python
#!/usr/bin/env python3
# service_manager.py - Control systemd services from Python

import subprocess

def service_status(service_name):
    """Get the status of a systemd service."""
    result = subprocess.run(
        ['systemctl', 'is-active', service_name],
        capture_output=True,
        text=True
    )
    return result.stdout.strip()

def service_action(service_name, action):
    """Start, stop, restart, or reload a service."""
    valid_actions = ['start', 'stop', 'restart', 'reload', 'enable', 'disable']
    if action not in valid_actions:
        raise ValueError(f"Invalid action: {action}")

    result = subprocess.run(
        ['systemctl', action, service_name],
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        raise RuntimeError(f"systemctl {action} {service_name} failed: {result.stderr}")

    return True

def list_failed_services():
    """List all failed systemd services."""
    result = subprocess.run(
        ['systemctl', 'list-units', '--state=failed', '--no-legend', '--no-pager'],
        capture_output=True,
        text=True
    )
    failed = []
    for line in result.stdout.splitlines():
        parts = line.split()
        if parts:
            failed.append(parts[0])
    return failed

# Example usage
services_to_check = ['nginx', 'postgresql', 'redis', 'fail2ban']

for service in services_to_check:
    status = service_status(service)
    print(f"{service}: {status}")
```

## Parsing Log Files

```python
#!/usr/bin/env python3
# log_parser.py - Parse common Ubuntu log formats

import re
from datetime import datetime
from collections import Counter

def parse_auth_log(log_file='/var/log/auth.log'):
    """Parse failed SSH login attempts from auth.log."""
    failed_attempts = []
    ip_pattern = re.compile(r'Failed password.*from (\d+\.\d+\.\d+\.\d+)')

    try:
        with open(log_file, 'r') as f:
            for line in f:
                match = ip_pattern.search(line)
                if match:
                    failed_attempts.append(match.group(1))
    except PermissionError:
        print(f"Cannot read {log_file} - run as root")
        return {}

    return Counter(failed_attempts)

def check_disk_warning_from_logs():
    """Check for disk-related warnings in syslog."""
    warnings = []
    patterns = [
        r'No space left on device',
        r'disk quota exceeded',
        r'I/O error',
        r'filesystem error'
    ]

    log_files = ['/var/log/syslog', '/var/log/kern.log']

    for log_file in log_files:
        try:
            with open(log_file, 'r') as f:
                for line in f:
                    for pattern in patterns:
                        if re.search(pattern, line, re.IGNORECASE):
                            warnings.append(line.strip())
                            break
        except (PermissionError, FileNotFoundError):
            pass

    return warnings

if __name__ == '__main__':
    print("Top attacking IPs from auth.log:")
    failures = parse_auth_log()
    for ip, count in failures.most_common(10):
        print(f"  {ip}: {count} attempts")
```

## Sending Notifications

```python
#!/usr/bin/env python3
# notify.py - Send alerts via email or webhook

import smtplib
import json
import urllib.request
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_email_alert(subject, body, recipient, smtp_host='localhost', smtp_port=25):
    """Send an email alert."""
    msg = MIMEMultipart()
    msg['From'] = f'alerts@{__import__("socket").gethostname()}'
    msg['To'] = recipient
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.sendmail(msg['From'], recipient, msg.as_string())

def send_slack_alert(webhook_url, message):
    """Send a Slack notification via webhook."""
    payload = json.dumps({'text': message}).encode('utf-8')
    req = urllib.request.Request(
        webhook_url,
        data=payload,
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as response:
        return response.status == 200
```

Python's standard library is extensive enough for most sysadmin needs. Add `psutil` for process and system metrics, `paramiko` for SSH-based remote administration, and `PyYAML` for configuration files, and you have a robust toolkit. Keep scripts in version control, add basic argument parsing with `argparse`, and run them via cron or systemd timers for scheduled tasks.
