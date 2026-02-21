# How to Use Ansible to Run Commands on the Control Node

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Automation, DevOps, Command Execution

Description: Learn how to run commands on the Ansible control node using local_action, delegate_to, and connection local strategies.

---

Most Ansible playbooks target remote hosts. But there are plenty of real-world situations where you need to run something on the control node itself. Maybe you need to generate a file locally before pushing it out, or you want to trigger a webhook from the machine running the playbook, or you need to query a local database for inventory data. Whatever the reason, Ansible gives you several ways to execute commands on the control node.

In this post, we will cover the three main approaches: `local_action`, `delegate_to: localhost`, and `connection: local`. Each has its strengths, and understanding when to use which one will save you from unexpected behavior in your playbooks.

## Using local_action

The `local_action` keyword is the simplest way to run a single task on the control node. It takes any module and executes it locally instead of on the target host.

Here is a basic example that creates a timestamp file on the control node:

```yaml
# playbook that creates a local timestamp file before deploying
---
- name: Deploy application with local prep
  hosts: webservers
  tasks:
    - name: Record deployment start time locally
      local_action:
        module: ansible.builtin.copy
        content: "Deployment started at {{ ansible_date_time.iso8601 }}"
        dest: /tmp/deploy_timestamp.txt
      run_once: true

    - name: Deploy the application
      ansible.builtin.copy:
        src: /opt/releases/app-latest.tar.gz
        dest: /opt/app/app-latest.tar.gz
```

Notice the `run_once: true` on the local action. Without it, Ansible would execute the local task once for every host in the `webservers` group, which is usually not what you want when writing a file locally.

## Using delegate_to: localhost

The `delegate_to` directive is more flexible than `local_action`. You can delegate to any host, not just localhost. When you set `delegate_to: localhost`, the task runs on the control node but still has access to the variables and facts of the original target host.

This is particularly useful when you need to do something locally that depends on per-host data:

```yaml
# playbook that registers each host's IP in a local inventory file
---
- name: Build local inventory from discovered hosts
  hosts: all
  gather_facts: true
  tasks:
    - name: Append host info to local CSV
      ansible.builtin.lineinfile:
        path: /tmp/host_inventory.csv
        line: "{{ inventory_hostname }},{{ ansible_default_ipv4.address }},{{ ansible_distribution }}"
        create: yes
      delegate_to: localhost

    - name: Add CSV header if missing
      ansible.builtin.lineinfile:
        path: /tmp/host_inventory.csv
        line: "hostname,ip,os"
        insertbefore: BOF
      delegate_to: localhost
      run_once: true
```

The key difference from `local_action` is that `delegate_to` keeps the host context. So `inventory_hostname` and `ansible_default_ipv4.address` still refer to the remote host being iterated over, even though the task runs locally.

## Using connection: local

If your entire playbook or play is meant to run on the control node, setting `connection: local` at the play level is cleaner than adding `delegate_to: localhost` to every task.

```yaml
# playbook that runs entirely on the control node
---
- name: Prepare local environment
  hosts: localhost
  connection: local
  gather_facts: true
  tasks:
    - name: Install required Python packages
      ansible.builtin.pip:
        name:
          - boto3
          - requests
        state: present

    - name: Create working directory
      ansible.builtin.file:
        path: /tmp/ansible_workspace
        state: directory
        mode: '0755'

    - name: Generate configuration from template
      ansible.builtin.template:
        src: templates/config.j2
        dest: /tmp/ansible_workspace/config.yaml
```

When you use `hosts: localhost` with `connection: local`, Ansible skips SSH entirely. It just runs the modules directly on the control node using the local Python interpreter.

## Comparing the Three Approaches

Here is a quick comparison to help you decide which approach to use:

| Approach | Scope | Host Context | Best For |
|---|---|---|---|
| `local_action` | Single task | Original host | Quick one-off local tasks |
| `delegate_to: localhost` | Single task | Original host | Per-host local operations |
| `connection: local` | Entire play | localhost | Plays that run fully on control node |

## Working with the command Module Locally

Sometimes you need to run raw shell commands on the control node. Here is how to do that with each approach:

```yaml
# running shell commands locally using different methods
---
- name: Local command examples
  hosts: webservers
  tasks:
    # Method 1: local_action with shell module
    - name: Check local disk space
      local_action:
        module: ansible.builtin.shell
        cmd: df -h /tmp
      register: disk_check
      run_once: true

    - name: Show disk space
      ansible.builtin.debug:
        var: disk_check.stdout_lines
      run_once: true

    # Method 2: delegate_to with command module
    - name: Get local hostname
      ansible.builtin.command:
        cmd: hostname -f
      delegate_to: localhost
      register: local_hostname
      run_once: true
```

## A Practical Example: Pre-flight Checks

Here is a real-world scenario. Before deploying to production, you want to run a series of checks on the control node to make sure the deployment artifacts exist and the required tools are installed:

```yaml
# pre-flight check playbook that validates the control node is ready
---
- name: Pre-flight checks on control node
  hosts: localhost
  connection: local
  gather_facts: false
  vars:
    required_files:
      - /opt/releases/app-v2.3.1.tar.gz
      - /opt/releases/app-v2.3.1.tar.gz.sha256
    required_commands:
      - rsync
      - jq
      - curl
  tasks:
    - name: Check that release artifacts exist
      ansible.builtin.stat:
        path: "{{ item }}"
      register: artifact_check
      loop: "{{ required_files }}"

    - name: Fail if any artifact is missing
      ansible.builtin.fail:
        msg: "Missing artifact: {{ item.item }}"
      when: not item.stat.exists
      loop: "{{ artifact_check.results }}"

    - name: Verify required tools are installed
      ansible.builtin.command:
        cmd: "which {{ item }}"
      register: tool_check
      loop: "{{ required_commands }}"
      changed_when: false

    - name: Verify SHA256 checksum
      ansible.builtin.shell:
        cmd: "cd /opt/releases && sha256sum -c app-v2.3.1.tar.gz.sha256"
      changed_when: false

    - name: All pre-flight checks passed
      ansible.builtin.debug:
        msg: "Control node is ready for deployment"
```

## Watch Out for become on Local Tasks

One gotcha that catches people is privilege escalation. If your play has `become: true` set at the play level, local tasks will also try to use sudo. This might prompt for a password or fail if your control node does not have the same sudo setup as your target hosts.

```yaml
# be explicit about become on local tasks
---
- name: Mixed local and remote tasks
  hosts: webservers
  become: true
  tasks:
    - name: Install package on remote host (uses sudo)
      ansible.builtin.apt:
        name: nginx
        state: present

    - name: Log to local file (no sudo needed)
      ansible.builtin.lineinfile:
        path: /tmp/deploy.log
        line: "Installed nginx on {{ inventory_hostname }}"
        create: yes
      delegate_to: localhost
      become: false  # override play-level become
```

## Performance Considerations

Running commands on the control node is fast because there is no SSH overhead. But if you are iterating over hundreds of hosts and delegating each iteration to localhost, you can create a bottleneck. The control node becomes the single point of execution for all those tasks.

For large inventories, consider using `run_once: true` where possible, or collecting data from remote hosts first and then processing it locally in a separate play.

## Summary

Running commands on the Ansible control node is straightforward once you know the three main patterns. Use `local_action` for quick single tasks, `delegate_to: localhost` when you need to retain the remote host context, and `connection: local` when an entire play should run locally. Keep an eye on `become` settings and be mindful of performance when delegating many iterations to localhost. These patterns will come up often in real deployments, especially for pre-flight checks, artifact preparation, and local logging.
