# How to Use the Ansible pipe Lookup Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Lookup Plugins, Shell Commands, Automation

Description: Learn how to use the Ansible pipe lookup plugin to execute shell commands on the control node and capture their output for use in playbooks.

---

The `pipe` lookup plugin runs a shell command on the Ansible control node and returns its standard output. This gives you a way to dynamically generate values, query external systems, or run local tools and use their output in your playbooks. It is a powerful escape hatch for situations where built-in Ansible features do not quite cover your use case.

## How the pipe Lookup Works

The pipe lookup executes a command on the control node (where you run `ansible-playbook`), captures its stdout, and returns it as a string. It does NOT execute the command on remote hosts. For that, you would use the `command` or `shell` module.

Basic syntax:

```yaml
"{{ lookup('pipe', 'command here') }}"
```

The command runs through `/bin/sh`, so you can use shell features like pipes, redirects, and environment variables.

## Basic Usage

Here are some simple examples of using the pipe lookup:

```yaml
# basic_pipe.yml - Basic pipe lookup examples
---
- name: Demonstrate pipe lookup
  hosts: all
  gather_facts: false
  vars:
    current_date: "{{ lookup('pipe', 'date +%Y-%m-%d') }}"
    hostname: "{{ lookup('pipe', 'hostname') }}"
    whoami: "{{ lookup('pipe', 'whoami') }}"
    git_commit: "{{ lookup('pipe', 'git rev-parse --short HEAD') }}"
  tasks:
    - name: Show pipe lookup results
      ansible.builtin.debug:
        msg:
          - "Date: {{ current_date }}"
          - "Control node: {{ hostname }}"
          - "Running as: {{ whoami }}"
          - "Git commit: {{ git_commit }}"
```

## Generating Dynamic Values

The pipe lookup is great for generating values that need to be computed at runtime:

```yaml
# dynamic_values.yml - Generate dynamic values with pipe lookup
---
- name: Generate dynamic configuration values
  hosts: all
  become: true
  vars:
    # Generate a random password
    db_password: "{{ lookup('pipe', 'openssl rand -base64 24') }}"

    # Get the current timestamp
    deploy_timestamp: "{{ lookup('pipe', 'date +%s') }}"

    # Generate a UUID
    instance_id: "{{ lookup('pipe', 'uuidgen') }}"

    # Get current git branch
    git_branch: "{{ lookup('pipe', 'git rev-parse --abbrev-ref HEAD') }}"

    # Calculate a checksum
    config_checksum: "{{ lookup('pipe', 'sha256sum files/app.conf | cut -d\" \" -f1') }}"
  tasks:
    - name: Deploy configuration with dynamic values
      ansible.builtin.template:
        src: templates/deploy-info.j2
        dest: /etc/myapp/deploy-info.yml
        mode: '0644'

    - name: Show deployment metadata
      ansible.builtin.debug:
        msg:
          - "Instance ID: {{ instance_id }}"
          - "Deploy time: {{ deploy_timestamp }}"
          - "Branch: {{ git_branch }}"
          - "Config checksum: {{ config_checksum }}"
```

## Querying External APIs

You can use curl or other HTTP clients to query APIs:

```yaml
# api_query.yml - Query external APIs with pipe lookup
---
- name: Query external services
  hosts: all
  vars:
    # Get public IP of control node
    public_ip: "{{ lookup('pipe', 'curl -s https://ifconfig.me') }}"

    # Query a metadata service
    instance_type: "{{ lookup('pipe', 'curl -s http://169.254.169.254/latest/meta-data/instance-type 2>/dev/null || echo unknown') }}"

    # Get latest release version from GitHub
    latest_release: "{{ lookup('pipe', 'curl -s https://api.github.com/repos/prometheus/prometheus/releases/latest | python3 -c \"import sys,json; print(json.load(sys.stdin)[\\\"tag_name\\\"])\"') }}"
  tasks:
    - name: Show API query results
      ansible.builtin.debug:
        msg:
          - "Control node public IP: {{ public_ip }}"
          - "Latest Prometheus release: {{ latest_release }}"
```

## Working with Git

The pipe lookup is especially handy for Git-related information:

```yaml
# git_info.yml - Extract Git information with pipe lookup
---
- name: Gather Git deployment information
  hosts: all
  vars:
    git_commit_full: "{{ lookup('pipe', 'git rev-parse HEAD') }}"
    git_commit_short: "{{ lookup('pipe', 'git rev-parse --short HEAD') }}"
    git_branch: "{{ lookup('pipe', 'git rev-parse --abbrev-ref HEAD') }}"
    git_tag: "{{ lookup('pipe', 'git describe --tags --always 2>/dev/null || echo untagged') }}"
    git_author: "{{ lookup('pipe', 'git log -1 --format=%an') }}"
    git_message: "{{ lookup('pipe', 'git log -1 --format=%s') }}"
    git_dirty: "{{ lookup('pipe', 'git diff --quiet && echo clean || echo dirty') }}"
  tasks:
    - name: Deploy version file
      ansible.builtin.copy:
        content: |
          version:
            commit: {{ git_commit_full }}
            short: {{ git_commit_short }}
            branch: {{ git_branch }}
            tag: {{ git_tag }}
            author: {{ git_author }}
            message: {{ git_message }}
            tree_state: {{ git_dirty }}
            deployed_at: {{ lookup('pipe', 'date -u +%Y-%m-%dT%H:%M:%SZ') }}
        dest: /etc/myapp/version.yml
        mode: '0644'
```

## Processing Data with Shell Tools

Combine pipe with standard Unix tools for data processing:

```yaml
# data_processing.yml - Process data with shell tools
---
- name: Process data using pipe lookup
  hosts: all
  vars:
    # Count lines in a file
    config_lines: "{{ lookup('pipe', 'wc -l < files/app.conf') | trim }}"

    # Extract specific field from a CSV
    db_host: "{{ lookup('pipe', 'awk -F, \"NR==2 {print $3}\" files/servers.csv') }}"

    # Sort and deduplicate a list
    unique_tags: "{{ lookup('pipe', 'cat files/tags.txt | sort -u | tr \"\\n\" \",\"') }}"

    # Get disk space on control node
    disk_free: "{{ lookup('pipe', 'df -h / | awk \"NR==2 {print $4}\"') }}"
  tasks:
    - name: Show processed data
      ansible.builtin.debug:
        msg:
          - "Config file has {{ config_lines }} lines"
          - "Database host: {{ db_host }}"
          - "Unique tags: {{ unique_tags }}"
          - "Control node free disk: {{ disk_free }}"
```

## Encryption and Decryption

Use pipe to interact with encryption tools:

```yaml
# encryption.yml - Encrypt and decrypt with pipe lookup
---
- name: Handle encryption with pipe lookup
  hosts: all
  become: true
  vars:
    # Encrypt a value with gpg
    encrypted_secret: "{{ lookup('pipe', 'echo \"mysecret\" | gpg --symmetric --batch --passphrase \"key123\" --armor 2>/dev/null') }}"

    # Generate SSH key fingerprint
    key_fingerprint: "{{ lookup('pipe', 'ssh-keygen -lf ~/.ssh/id_ed25519.pub 2>/dev/null | awk \"{print $2}\"') }}"

    # Hash a password for /etc/shadow format
    hashed_password: "{{ lookup('pipe', 'python3 -c \"import crypt; print(crypt.crypt(\\\"password123\\\", crypt.mksalt(crypt.METHOD_SHA512)))\"') }}"
  tasks:
    - name: Create user with hashed password
      ansible.builtin.user:
        name: testuser
        password: "{{ hashed_password }}"
        state: present
```

## Using pipe in Conditionals

Run a command and use its result to control task flow:

```yaml
# conditional_pipe.yml - Use pipe results in conditionals
---
- name: Conditional execution based on pipe output
  hosts: all
  vars:
    os_version: "{{ lookup('pipe', 'lsb_release -rs 2>/dev/null || echo unknown') }}"
    python_version: "{{ lookup('pipe', 'python3 --version 2>&1 | awk \"{print $2}\"') }}"
    docker_installed: "{{ lookup('pipe', 'which docker 2>/dev/null && echo yes || echo no') }}"
  tasks:
    - name: Show environment details
      ansible.builtin.debug:
        msg:
          - "OS version: {{ os_version }}"
          - "Python version: {{ python_version }}"
          - "Docker installed: {{ docker_installed }}"

    - name: Install Docker if not present
      ansible.builtin.debug:
        msg: "Docker needs to be installed"
      when: docker_installed == 'no'
```

## Error Handling

The pipe lookup will fail if the command returns a non-zero exit code. Handle this with shell logic:

```yaml
# error_handling.yml - Handle errors in pipe lookup
---
- name: Handle pipe lookup errors
  hosts: all
  vars:
    # Use || to provide fallback on error
    safe_result: "{{ lookup('pipe', 'some-command 2>/dev/null || echo default-value') }}"

    # Redirect stderr to suppress error messages
    quiet_result: "{{ lookup('pipe', 'risky-command 2>/dev/null || true') }}"

    # Check if a command exists before running it
    tool_version: "{{ lookup('pipe', 'command -v kubectl >/dev/null 2>&1 && kubectl version --client --short 2>/dev/null || echo not-installed') }}"
  tasks:
    - name: Show results
      ansible.builtin.debug:
        msg:
          - "Safe result: {{ safe_result }}"
          - "kubectl: {{ tool_version }}"
```

## Pipe Lookup Data Flow

```mermaid
graph LR
    A[Playbook] --> B[pipe Lookup]
    B --> C[/bin/sh on Control Node]
    C --> D[Execute Command]
    D --> E{Exit Code}
    E -->|0| F[Return stdout]
    E -->|Non-zero| G[Raise Error]
    F --> H[String Value in Playbook]
    G --> I[Playbook Fails]
    H --> J[Use in Tasks / Variables]
```

## Important Considerations

The pipe lookup always runs on the control node. Every time the lookup is evaluated, the command runs again, so avoid expensive commands in loops or when using `with_items`. If you need the same pipe result in multiple tasks, store it in a variable with `set_fact` first. The command runs through `/bin/sh`, so be mindful of shell injection if any part of the command comes from untrusted input. Also, the output is stripped of trailing newlines by default, which is usually what you want.

The pipe lookup is one of those tools that you should use sparingly but that can save you a lot of complexity when you need it. It bridges the gap between what Ansible provides natively and what you can do with shell commands, letting you integrate with virtually any tool that has a command-line interface.
