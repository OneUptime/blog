# How to Configure Puppet Bolt for Ubuntu Task Execution

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Puppet, Automation, DevOps, Configuration Management

Description: Install and configure Puppet Bolt on Ubuntu to run ad-hoc tasks and plans across remote servers without requiring a Puppet master or agent installation.

---

Puppet Bolt is an agentless task execution framework. Unlike traditional Puppet, which requires a Puppet master and agents on each managed node, Bolt connects directly to remote hosts over SSH (or WinRM for Windows) and executes tasks on demand. It is well-suited for ad-hoc operations, one-time migrations, and orchestrating complex multi-step workflows.

## How Bolt Differs from Puppet Agent

Traditional Puppet works on a pull model: agents periodically check in with the Puppet master to apply their catalog. Bolt works on a push model: you run a command on your workstation, and Bolt pushes tasks to remote hosts via SSH.

This means:
- No Puppet agent needed on target nodes
- Tasks run when you run them, not on a schedule
- Well-suited for operations that do not fit the declarative Puppet model (running a database migration, restarting services in sequence, draining a load balancer before upgrade)

## Installing Bolt on Ubuntu

```bash
# Add the Puppet repository
wget https://apt.puppet.com/puppet-tools-release-$(lsb_release -sc).deb
sudo dpkg -i puppet-tools-release-$(lsb_release -sc).deb

# Install Bolt
sudo apt update
sudo apt install -y puppet-bolt

# Verify installation
bolt --version
```

## Basic Bolt Configuration

Bolt uses a project directory to organize configuration, tasks, and plans. Create a project directory:

```bash
# Create a Bolt project
mkdir -p ~/bolt-project
cd ~/bolt-project

# Initialize a new project (creates bolt-project.yaml)
bolt project init my-infrastructure
```

The project file `bolt-project.yaml` defines project settings:

```yaml
# bolt-project.yaml
name: my-infrastructure

# Modules to load
modules:
  - puppetlabs-stdlib
  - puppetlabs-apt

# Default transport settings
config:
  ssh:
    host-key-check: false
    run-as: root
    private-key: ~/.ssh/id_ed25519
```

## Configuring Target Inventory

Bolt uses an inventory file to define the servers it can connect to:

```bash
nano ~/bolt-project/inventory.yaml
```

```yaml
# inventory.yaml - defines groups of targets

groups:
  - name: webservers
    targets:
      - host: web-01.example.com
        alias: web01
      - host: web-02.example.com
        alias: web02
    config:
      ssh:
        user: deploy
        private-key: ~/.ssh/id_ed25519

  - name: databases
    targets:
      - host: db-01.example.com
        alias: db01
    config:
      ssh:
        user: deploy
        private-key: ~/.ssh/id_ed25519
        run-as: root

  - name: all-servers
    groups:
      - webservers
      - databases
```

Verify Bolt can connect to your targets:

```bash
# Run a simple command to test connectivity
bolt command run "uname -a" --targets webservers

# Using the alias
bolt command run "hostname" --targets web01
```

## Running Commands and Scripts

Bolt can run arbitrary shell commands or upload and execute scripts:

```bash
# Run a command on a group of hosts
bolt command run "apt list --upgradable 2>/dev/null" --targets webservers

# Upload and run a local shell script
bolt script run ./scripts/check-disk.sh --targets all-servers

# Run a command as a different user
bolt command run "whoami" --targets webservers --run-as root
```

## Writing and Running Tasks

Tasks are standalone scripts that Bolt can run. They live in a `tasks/` directory within your project and support parameters.

```bash
mkdir -p ~/bolt-project/tasks
```

Create a simple task to check disk usage:

```bash
# tasks/check_disk.sh
cat > ~/bolt-project/tasks/check_disk.sh << 'EOF'
#!/bin/bash
# Task: check_disk
# Checks disk usage and reports partitions above threshold

THRESHOLD="${PT_threshold:-80}"

echo "Checking disk usage (threshold: ${THRESHOLD}%)"
df -h | awk -v threshold="$THRESHOLD" '
NR > 1 {
    usage = $5
    gsub(/%/, "", usage)
    if (usage > threshold) {
        printf "WARNING: %s is at %s\n", $6, $5
    }
}'
EOF
chmod +x ~/bolt-project/tasks/check_disk.sh
```

Each task needs a metadata file describing its parameters:

```json
{
  "description": "Check disk usage and warn on partitions above threshold",
  "parameters": {
    "threshold": {
      "description": "Usage percentage at which to warn (default: 80)",
      "type": "Optional[Integer]",
      "default": 80
    }
  },
  "input_method": "environment"
}
```

Save this as `~/bolt-project/tasks/check_disk.json`.

```bash
# Run the task
bolt task run my-infrastructure::check_disk --targets all-servers

# Run with a parameter
bolt task run my-infrastructure::check_disk threshold=90 --targets webservers
```

### Python Task Example

Tasks can be written in any language:

```python
#!/usr/bin/env python3
# tasks/get_services.py
# Lists services matching a pattern

import subprocess
import json
import os
import sys

# Parameters come via environment variables with PT_ prefix
pattern = os.environ.get("PT_pattern", "")

try:
    cmd = ["systemctl", "list-units", "--type=service", "--state=running",
           "--no-pager", "--plain"]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)

    services = []
    for line in result.stdout.splitlines():
        if line and not line.startswith("UNIT"):
            parts = line.split()
            if parts and (not pattern or pattern in parts[0]):
                services.append(parts[0])

    print(json.dumps({"running_services": services, "count": len(services)}))
except subprocess.CalledProcessError as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
```

```json
{
  "description": "List running systemd services, optionally filtered by pattern",
  "parameters": {
    "pattern": {
      "description": "Filter services by this string",
      "type": "Optional[String]"
    }
  },
  "input_method": "environment"
}
```

```bash
# Run the Python task
bolt task run my-infrastructure::get_services --targets webservers
bolt task run my-infrastructure::get_services pattern=nginx --targets webservers
```

## Writing Plans for Multi-Step Workflows

Plans orchestrate multiple tasks and commands in sequence. They are written in Puppet Language or YAML:

```bash
mkdir -p ~/bolt-project/plans
```

```puppet
# plans/rolling_restart.pp
# Restart nginx on webservers one at a time with health check

plan my-infrastructure::rolling_restart(
  TargetSpec $targets = 'webservers',
  Integer $wait_seconds = 10,
) {
  $target_list = get_targets($targets)

  $target_list.each |$target| {
    out::message("Restarting nginx on ${target.name}")

    # Stop nginx
    run_command("systemctl stop nginx", $target)

    # Brief pause
    ctrl::sleep($wait_seconds)

    # Start nginx
    $result = run_command("systemctl start nginx", $target)

    # Verify it started
    $status = run_command("systemctl is-active nginx", $target)
    if $status.first['stdout'].strip != 'active' {
      fail_plan("nginx failed to start on ${target.name}")
    }

    out::message("nginx restarted successfully on ${target.name}")
  }

  out::message("Rolling restart complete")
}
```

```bash
# Run the plan
bolt plan run my-infrastructure::rolling_restart --targets webservers

# Run with custom parameters
bolt plan run my-infrastructure::rolling_restart wait_seconds=30
```

### YAML Plan Example

YAML plans are simpler for linear workflows:

```yaml
# plans/update_packages.yaml
parameters:
  targets:
    type: TargetSpec

steps:
  - name: update_cache
    command: apt-get update
    targets: $targets

  - name: upgrade_packages
    command: apt-get upgrade -y
    targets: $targets

  - name: check_reboot_required
    command: "[ -f /var/run/reboot-required ] && echo 'REBOOT REQUIRED' || echo 'No reboot needed'"
    targets: $targets

return: $check_reboot_required
```

```bash
bolt plan run my-infrastructure::update_packages targets=webservers
```

## Using Bolt with Puppet Content

Bolt can download and use modules from the Puppet Forge:

```bash
# Install modules defined in bolt-project.yaml
bolt module install

# Or install a specific module
bolt module add puppetlabs-apache
```

Use Forge tasks in your plans:

```bash
# Run a task from an installed module
bolt task run package action=upgrade name=nginx --targets webservers
```

## Logging and Output

```bash
# Enable verbose output for debugging
bolt command run "df -h" --targets webservers --verbose

# Save output to a file
bolt command run "cat /etc/os-release" --targets all-servers \
  --format json > server-os-report.json

# Format output as JSON
bolt command run "free -h" --targets webservers --format json
```

## Securing Bolt Credentials

Store SSH keys and passwords securely rather than in plain text:

```bash
# Use SSH agent forwarding for private keys
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Then run bolt without specifying the key
bolt command run "whoami" --targets webservers
```

For vault-based secret management, Bolt supports plugins for HashiCorp Vault and other secret stores. Add to `bolt-project.yaml`:

```yaml
plugins:
  vault:
    server_url: https://vault.example.com:8200
    token: "{{env.VAULT_TOKEN}}"
```

Bolt fills the gap between manual SSH operations and full configuration management. For teams that need repeatable automation without the overhead of a Puppet master deployment, it is a practical choice for Ubuntu infrastructure management.
