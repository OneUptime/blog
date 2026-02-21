# How to Write Python Scripts that Invoke Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Python, Scripting, Subprocess, Automation

Description: Write Python wrapper scripts that invoke Ansible playbooks via subprocess with proper argument handling, output capture, and error management.

---

Sometimes the simplest approach is the best one. While ansible-runner and the Python API provide deep integration, many automation workflows just need to run `ansible-playbook` from a Python script with proper argument handling and output parsing. This guide covers the subprocess approach with production-ready patterns.

## Basic Subprocess Execution

The simplest way to run Ansible from Python:

```python
# run_ansible.py - Simple Ansible invocation from Python
import subprocess
import sys


def run_playbook(playbook, inventory, extra_vars=None, tags=None, limit=None,
                 check=False, verbose=0):
    """Run an Ansible playbook and return the result."""
    cmd = [
        'ansible-playbook',
        playbook,
        '-i', inventory,
    ]

    # Add extra variables
    if extra_vars:
        for key, value in extra_vars.items():
            cmd.extend(['-e', f'{key}={value}'])

    # Add tags
    if tags:
        cmd.extend(['--tags', ','.join(tags)])

    # Limit to specific hosts
    if limit:
        cmd.extend(['--limit', limit])

    # Check mode (dry run)
    if check:
        cmd.append('--check')

    # Verbosity
    if verbose > 0:
        cmd.append('-' + 'v' * verbose)

    print(f"Running: {' '.join(cmd)}")

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=1800,  # 30 minute timeout
    )

    return {
        'rc': result.returncode,
        'stdout': result.stdout,
        'stderr': result.stderr,
        'success': result.returncode == 0,
    }


if __name__ == '__main__':
    result = run_playbook(
        playbook='deploy.yml',
        inventory='inventory/production',
        extra_vars={
            'app_version': '2.5.0',
            'deploy_env': 'production',
        },
        tags=['deploy', 'restart'],
    )

    if result['success']:
        print("Deployment successful")
    else:
        print(f"Deployment failed (rc={result['rc']})")
        print(result['stderr'])
        sys.exit(1)
```

## Streaming Output in Real Time

For long-running playbooks, stream output instead of waiting for completion:

```python
# stream_ansible.py - Stream Ansible output in real time
import subprocess
import sys
import re
from datetime import datetime


def run_playbook_streaming(playbook, inventory, extra_vars=None):
    """Run a playbook and stream output in real time."""
    cmd = ['ansible-playbook', playbook, '-i', inventory]

    if extra_vars:
        for key, value in extra_vars.items():
            cmd.extend(['-e', f'{key}={value}'])

    print(f"[{datetime.now().isoformat()}] Starting: {' '.join(cmd)}")

    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,  # Line buffered
    )

    output_lines = []
    for line in process.stdout:
        line = line.rstrip()
        output_lines.append(line)

        # Color code the output
        if 'ok:' in line:
            print(f"\033[32m{line}\033[0m")  # Green
        elif 'changed:' in line:
            print(f"\033[33m{line}\033[0m")  # Yellow
        elif 'failed' in line.lower() or 'fatal' in line.lower():
            print(f"\033[31m{line}\033[0m")  # Red
        else:
            print(line)

    process.wait()

    return {
        'rc': process.returncode,
        'output': '\n'.join(output_lines),
        'success': process.returncode == 0,
    }
```

## Wrapper with JSON Output

Use Ansible's JSON callback for machine-readable output:

```python
# json_ansible.py - Parse Ansible JSON output
import subprocess
import json
import os


def run_playbook_json(playbook, inventory, extra_vars=None):
    """Run playbook with JSON callback for structured output."""
    env = os.environ.copy()
    env['ANSIBLE_STDOUT_CALLBACK'] = 'json'
    env['ANSIBLE_LOAD_CALLBACK_PLUGINS'] = '1'

    cmd = ['ansible-playbook', playbook, '-i', inventory]
    if extra_vars:
        for key, value in extra_vars.items():
            cmd.extend(['-e', f'{key}={value}'])

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        env=env,
        timeout=1800,
    )

    # Parse the JSON output
    try:
        parsed = json.loads(result.stdout)
    except json.JSONDecodeError:
        parsed = {'raw_output': result.stdout}

    return {
        'rc': result.returncode,
        'data': parsed,
        'stderr': result.stderr,
        'success': result.returncode == 0,
    }


if __name__ == '__main__':
    result = run_playbook_json(
        'deploy.yml',
        'inventory/hosts',
        {'app_version': '2.5.0'},
    )

    if result['success']:
        # Access structured play data
        for play in result['data'].get('plays', []):
            print(f"Play: {play['play']['name']}")
            for task in play.get('tasks', []):
                for host, host_result in task.get('hosts', {}).items():
                    status = 'changed' if host_result.get('changed') else 'ok'
                    print(f"  {host}: {status} - {task['task']['name']}")
    else:
        print(f"Failed: {result['stderr']}")
```

## Building a Deployment Script

Here is a complete deployment script with argument parsing, validation, and logging:

```python
#!/usr/bin/env python3
# deploy.py - Production deployment script using Ansible
import argparse
import subprocess
import sys
import json
import logging
from datetime import datetime
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s',
)
log = logging.getLogger('deploy')


def parse_args():
    parser = argparse.ArgumentParser(description='Deploy application via Ansible')
    parser.add_argument('--version', required=True, help='Application version to deploy')
    parser.add_argument('--env', choices=['staging', 'production'], default='staging')
    parser.add_argument('--limit', help='Limit to specific hosts')
    parser.add_argument('--check', action='store_true', help='Dry run mode')
    parser.add_argument('--skip-backup', action='store_true')
    return parser.parse_args()


def run_ansible(playbook, inventory, extra_vars, limit=None, check=False):
    cmd = ['ansible-playbook', playbook, '-i', inventory]
    for key, value in extra_vars.items():
        cmd.extend(['-e', f'{key}={value}'])
    if limit:
        cmd.extend(['--limit', limit])
    if check:
        cmd.append('--check')

    log.info(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)
    return result.returncode, result.stdout, result.stderr


def main():
    args = parse_args()

    inventory = f'inventory/{args.env}'
    if not Path(inventory).exists():
        log.error(f"Inventory not found: {inventory}")
        sys.exit(1)

    extra_vars = {
        'app_version': args.version,
        'deploy_env': args.env,
        'deploy_timestamp': datetime.now().isoformat(),
    }

    # Step 1: Validate
    log.info("Validating deployment parameters...")
    rc, stdout, stderr = run_ansible(
        'playbooks/validate.yml', inventory, extra_vars, args.limit, check=True
    )
    if rc != 0:
        log.error(f"Validation failed:\n{stderr}")
        sys.exit(1)

    # Step 2: Backup (unless skipped)
    if not args.skip_backup:
        log.info("Creating backup...")
        rc, stdout, stderr = run_ansible(
            'playbooks/backup.yml', inventory, extra_vars, args.limit, args.check
        )
        if rc != 0:
            log.error(f"Backup failed:\n{stderr}")
            sys.exit(1)

    # Step 3: Deploy
    log.info(f"Deploying version {args.version} to {args.env}...")
    rc, stdout, stderr = run_ansible(
        'playbooks/deploy.yml', inventory, extra_vars, args.limit, args.check
    )

    if rc == 0:
        log.info("Deployment successful")
    else:
        log.error(f"Deployment failed:\n{stderr}")
        sys.exit(1)


if __name__ == '__main__':
    main()
```

## Summary

Writing Python scripts that invoke Ansible via subprocess is straightforward and gives you full control over the execution environment. Use `subprocess.run()` for simple runs, `subprocess.Popen()` for streaming output, and the JSON callback for structured results. Add argument parsing, logging, and multi-step workflows to build production deployment scripts. For more complex integrations, consider ansible-runner instead.
