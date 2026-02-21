# How to Use the Ansible tree Callback Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, Logging, Reporting

Description: Use the Ansible tree callback plugin to save per-host task results as individual JSON files in a directory tree for later analysis and auditing.

---

The `tree` callback plugin writes the results of each host's playbook run to individual JSON files in a directory structure. Instead of just seeing output scroll by in the terminal, you get a persistent record of what happened on each host saved to disk. This is valuable for auditing, post-run analysis, and integrating Ansible results into other tools.

## How the Tree Callback Works

When enabled, the tree callback creates a file for each host after the playbook run completes. Each file contains the JSON results of all tasks that ran on that host. The files are saved to a configurable directory, with each file named after the host.

The result is a directory that looks like this:

```
tree_output/
  web-01
  web-02
  web-03
  db-01
  db-02
```

Each file contains the JSON result of the last task that ran on that host (or all results depending on the version).

## Enabling the Tree Callback

The tree callback is a notification callback, not a stdout callback. This means it runs alongside your normal output and does not replace it:

```ini
# ansible.cfg - Enable the tree callback alongside normal output
[defaults]
# Keep your preferred stdout callback
stdout_callback = default
# Enable tree as an additional callback
callback_whitelist = tree

[callback_tree]
directory = ./ansible_tree_output
```

The environment variable approach:

```bash
# Enable tree callback via environment variables
export ANSIBLE_CALLBACK_WHITELIST=tree
export ANSIBLE_CALLBACK_TREE_DIRECTORY=./ansible_tree_output
```

## Configuring the Output Directory

Set the directory where results will be saved:

```ini
# ansible.cfg - Configure tree output location
[callback_tree]
directory = /var/log/ansible/tree
```

Make sure the directory exists and Ansible has write permissions:

```bash
# Create the output directory
mkdir -p /var/log/ansible/tree
```

If the directory does not exist, the tree callback will create it automatically in most versions.

## Examining the Output

Run a playbook with the tree callback enabled:

```bash
# Run a playbook with tree callback
ansible-playbook -i inventory site.yml
```

Then look at the results:

```bash
# List the generated files
ls ansible_tree_output/
# web-01  web-02  web-03  db-01  db-02

# View results for a specific host
cat ansible_tree_output/web-01
```

The content of each file is JSON:

```json
{
    "changed": false,
    "msg": "All items completed",
    "results": [
        {
            "ansible_loop_var": "item",
            "changed": false,
            "item": "nginx",
            "msg": "nginx is already the newest version (1.24.0-1)"
        }
    ]
}
```

## Using Tree for Post-Run Analysis

The tree output is useful for scripting analysis after playbook runs:

```bash
#!/bin/bash
# analyze-tree.sh - Analyze tree callback output
TREE_DIR="./ansible_tree_output"

echo "=== Host Result Summary ==="
for host_file in "$TREE_DIR"/*; do
    host=$(basename "$host_file")
    changed=$(jq -r '.changed // false' "$host_file")
    failed=$(jq -r '.failed // false' "$host_file")

    if [ "$failed" = "true" ]; then
        echo "FAILED: $host"
        jq -r '.msg' "$host_file"
    elif [ "$changed" = "true" ]; then
        echo "CHANGED: $host"
    else
        echo "OK: $host"
    fi
done
```

## Tree Callback for Compliance Auditing

If you need to prove that specific configurations were applied to specific hosts, the tree callback provides that evidence:

```yaml
# compliance-check.yml - Run compliance checks with tree output
---
- name: Check compliance settings
  hosts: all
  gather_facts: true

  tasks:
    - name: Verify SSH configuration
      lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "^PermitRootLogin"
        line: "PermitRootLogin no"
        state: present
      check_mode: true
      register: ssh_config

    - name: Verify firewall is running
      service:
        name: firewalld
        state: started
      check_mode: true
      register: firewall_status

    - name: Record compliance results
      set_fact:
        compliance_results:
          ssh_hardened: "{{ not ssh_config.changed }}"
          firewall_running: "{{ not firewall_status.changed }}"
          hostname: "{{ ansible_hostname }}"
          check_time: "{{ ansible_date_time.iso8601 }}"

    - name: Display compliance
      debug:
        var: compliance_results
```

After running, the tree output for each host contains the compliance check results that you can archive and reference later.

## Integrating Tree Output with Monitoring

Feed tree results into your monitoring system:

```python
#!/usr/bin/env python3
# push-tree-results.py - Push tree callback results to monitoring
import json
import os
import sys
import requests

tree_dir = sys.argv[1] if len(sys.argv) > 1 else "./ansible_tree_output"

results = []
for filename in os.listdir(tree_dir):
    filepath = os.path.join(tree_dir, filename)
    with open(filepath) as f:
        try:
            data = json.load(f)
            results.append({
                "host": filename,
                "changed": data.get("changed", False),
                "failed": data.get("failed", False),
                "msg": data.get("msg", ""),
            })
        except json.JSONDecodeError:
            results.append({
                "host": filename,
                "error": "Invalid JSON in tree output",
            })

# Send to monitoring endpoint
payload = {
    "source": "ansible-tree",
    "results": results,
    "total_hosts": len(results),
    "failed_hosts": len([r for r in results if r.get("failed")]),
}

requests.post("https://monitoring.example.com/api/ansible-results", json=payload)
print(f"Pushed results for {len(results)} hosts")
```

## Tree Callback with Ansible Tower/AWX

If you use AWX, the tree callback can supplement AWX's built-in logging by writing results to a shared filesystem:

```ini
# ansible.cfg for AWX projects
[defaults]
callback_whitelist = tree

[callback_tree]
# Write to a shared NFS mount that other tools can access
directory = /mnt/shared/ansible-results/{{ lookup('pipe', 'date +%Y-%m-%d_%H%M%S') }}
```

## Rotating Tree Output

The tree callback overwrites existing files for the same hostname. To keep historical data, use timestamped directories:

```bash
#!/bin/bash
# run-with-tree-history.sh - Run playbook with timestamped tree output
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TREE_DIR="/var/log/ansible/tree/${TIMESTAMP}"
mkdir -p "$TREE_DIR"

export ANSIBLE_CALLBACK_WHITELIST=tree
export ANSIBLE_CALLBACK_TREE_DIRECTORY="$TREE_DIR"

ansible-playbook -i inventory site.yml

echo "Results saved to: $TREE_DIR"

# Clean up old results (keep 30 days)
find /var/log/ansible/tree -maxdepth 1 -type d -mtime +30 -exec rm -rf {} \;
```

## Combining Tree with Other Callbacks

Since tree is a notification callback, it works alongside any stdout callback and other notification callbacks:

```ini
# ansible.cfg - Tree with other callbacks
[defaults]
stdout_callback = yaml
callback_whitelist = tree, timer, profile_tasks

[callback_tree]
directory = ./tree_results
```

You get your preferred terminal output plus persistent per-host files.

The tree callback is an underappreciated tool for anyone who needs to keep records of what Ansible did to each host. It does not change your workflow or output format. It just quietly saves results to disk where you can analyze them later. For compliance-focused environments, it is close to essential.
