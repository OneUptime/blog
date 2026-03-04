# How to Use Satellite Remote Execution for Running Commands on RHEL Hosts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Satellite, Remote Execution, Automation, Management

Description: Use Red Hat Satellite's remote execution feature to run commands, scripts, and Ansible playbooks across multiple RHEL hosts simultaneously.

---

Satellite Remote Execution (REX) lets you run arbitrary commands, shell scripts, and Ansible playbooks on managed RHEL hosts directly from the Satellite interface or CLI. It uses SSH to connect to hosts and execute tasks.

## Enable Remote Execution

```bash
# Verify remote execution is enabled on the Satellite or Capsule
satellite-installer --enable-foreman-proxy-plugin-remote-execution-script

# Check that the REX SSH key exists
ls /var/lib/foreman-proxy/ssh/id_rsa_foreman_proxy.pub
```

## Distribute the SSH Key to Hosts

Hosts need the Satellite REX SSH key in their authorized_keys:

```bash
# Copy the key to a host manually
ssh-copy-id -i /var/lib/foreman-proxy/ssh/id_rsa_foreman_proxy.pub root@webserver1.example.com

# Or use the global registration template to add it automatically during registration
# The key is distributed when hosts register via the registration URL
```

## Run a Command on a Single Host

```bash
# Run a simple command
hammer job-invocation create \
    --job-template "Run Command - Script Default" \
    --inputs "command=uptime" \
    --search-query "name = webserver1.example.com"

# Check the result
hammer job-invocation output \
    --id 1 \
    --host "webserver1.example.com"
```

## Run a Command on Multiple Hosts

```bash
# Run on all hosts in a host group
hammer job-invocation create \
    --job-template "Run Command - Script Default" \
    --inputs "command=df -h" \
    --search-query "hostgroup = WebServers"

# Run on hosts matching a search query
hammer job-invocation create \
    --job-template "Run Command - Script Default" \
    --inputs "command=cat /etc/redhat-release" \
    --search-query "os = RedHat 9.3"
```

## Run a Script

```bash
# Run a multi-line script
hammer job-invocation create \
    --job-template "Run Command - Script Default" \
    --inputs "command=#!/bin/bash
echo 'Checking disk usage...'
df -h /
echo 'Checking memory...'
free -m
echo 'Last 5 login attempts:'
last -5"  \
    --search-query "hostgroup = WebServers"
```

## Apply Errata via Remote Execution

```bash
# Install a specific erratum on matching hosts
hammer job-invocation create \
    --job-template "Install Errata - Katello Script Default" \
    --inputs "errata=RHSA-2026:0123" \
    --search-query "hostgroup = Production"
```

## Run an Ansible Playbook

```bash
# Import Ansible roles first
hammer ansible roles sync --proxy-id 1

# Run an Ansible role on a host
hammer job-invocation create \
    --job-template "Ansible Roles - Ansible Default" \
    --search-query "name = webserver1.example.com"
```

## Schedule a Job

```bash
# Schedule a command to run at a specific time
hammer job-invocation create \
    --job-template "Run Command - Script Default" \
    --inputs "command=dnf update -y" \
    --search-query "hostgroup = WebServers" \
    --start-at "2026-03-08 02:00:00"
```

## Monitor Job Status

```bash
# List recent job invocations
hammer job-invocation list

# Check status of a specific job
hammer job-invocation info --id 42

# View output from a specific host
hammer job-invocation output --id 42 --host "webserver1.example.com"
```

Remote execution in Satellite provides a centralized way to manage tasks across your entire RHEL infrastructure without logging into individual hosts.
