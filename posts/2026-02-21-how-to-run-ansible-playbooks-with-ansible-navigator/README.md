# How to Run Ansible Playbooks with ansible-navigator

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, ansible-navigator, Execution Environments, Automation

Description: Learn to run Ansible playbooks using ansible-navigator with execution environments, interactive mode, and stdout mode for CI/CD pipelines.

---

ansible-navigator is the modern replacement for running ansible-playbook. It runs your playbooks inside Execution Environments (containers), giving you a consistent runtime regardless of what is installed on your local machine. It also provides an interactive text-based UI that makes it much easier to inspect playbook output and debug problems. This post covers how to use it effectively for everyday playbook execution.

## Installing ansible-navigator

Install it from PyPI alongside ansible-builder:

```bash
# Install ansible-navigator
pip install ansible-navigator

# Verify the installation
ansible-navigator --version
```

You also need a container runtime. ansible-navigator supports Podman and Docker:

```bash
# Check that you have a container runtime available
podman --version || docker --version
```

## Running Your First Playbook

The basic command to run a playbook is straightforward:

```bash
# Run a playbook with ansible-navigator
ansible-navigator run site.yml
```

This opens the interactive text-based UI (TUI). If you prefer traditional stdout output (like ansible-playbook), use the `--mode stdout` flag:

```bash
# Run with stdout mode (like ansible-playbook)
ansible-navigator run site.yml --mode stdout
```

Create a test playbook to try it out:

```yaml
---
# test.yml - Simple test playbook
- name: Test ansible-navigator
  hosts: localhost
  connection: local
  gather_facts: true
  tasks:
    - name: Display OS information
      ansible.builtin.debug:
        msg: "Running on {{ ansible_distribution }} {{ ansible_distribution_version }}"

    - name: List installed collections
      ansible.builtin.command: ansible-galaxy collection list
      register: collections
      changed_when: false

    - name: Show collections
      ansible.builtin.debug:
        msg: "{{ collections.stdout_lines[:10] }}"
```

Run it:

```bash
# Run the test playbook
ansible-navigator run test.yml --mode stdout
```

## Specifying an Execution Environment

By default, ansible-navigator pulls and uses a community EE image. You can specify your own:

```bash
# Use a specific execution environment image
ansible-navigator run site.yml \
  --execution-environment-image my-custom-ee:1.0 \
  --mode stdout

# Use an EE from a private registry
ansible-navigator run site.yml \
  --execution-environment-image registry.example.com/ee/production:latest \
  --mode stdout
```

Control when images are pulled:

```bash
# Only pull if the image is not available locally
ansible-navigator run site.yml \
  --execution-environment-image my-ee:1.0 \
  --pull-policy missing \
  --mode stdout

# Always pull the latest image
ansible-navigator run site.yml \
  --execution-environment-image my-ee:latest \
  --pull-policy always \
  --mode stdout

# Never pull (only use local images)
ansible-navigator run site.yml \
  --execution-environment-image my-ee:1.0 \
  --pull-policy never \
  --mode stdout
```

## Passing Inventory and Variables

ansible-navigator accepts all the same options as ansible-playbook for specifying inventories, variables, and limits:

```bash
# Specify inventory
ansible-navigator run site.yml \
  -i inventory/production.yml \
  --mode stdout

# Pass extra variables
ansible-navigator run site.yml \
  -i inventory.yml \
  -e "deploy_version=2.1.0" \
  -e "environment=production" \
  --mode stdout

# Limit to specific hosts
ansible-navigator run site.yml \
  -i inventory.yml \
  --limit webservers \
  --mode stdout

# Use tags
ansible-navigator run site.yml \
  -i inventory.yml \
  --tags "deploy,configure" \
  --mode stdout
```

## Using the Interactive Mode

The interactive TUI mode is where ansible-navigator really shines. It gives you a structured view of playbook output that you can drill into.

```bash
# Run in interactive mode (the default)
ansible-navigator run site.yml -i inventory.yml
```

Once the playbook finishes (or while it is running), you can navigate the output:

- Press a number to drill into a specific play or task
- Press `0` to go to the first play
- Press `:back` or `Esc` to go back up
- Press `:stdout` to see the raw stdout
- Press `:help` for all available commands
- Press `:quit` or `q` to exit

The interactive mode is extremely useful for debugging because you can see the exact output of each task, including registered variables and module return values.

## Working with Vault-Encrypted Files

ansible-navigator supports Ansible Vault just like ansible-playbook:

```bash
# Prompt for vault password
ansible-navigator run site.yml \
  -i inventory.yml \
  --ask-vault-pass \
  --mode stdout

# Use a vault password file
ansible-navigator run site.yml \
  -i inventory.yml \
  --vault-password-file ~/.vault_pass \
  --mode stdout
```

For vault password files, you need to make sure the file is accessible inside the container. ansible-navigator handles this by mounting common paths, but you may need to specify additional volume mounts:

```bash
# Mount a custom path into the EE container
ansible-navigator run site.yml \
  -i inventory.yml \
  --vault-password-file /opt/secrets/vault_pass \
  --execution-environment-volume-mounts "/opt/secrets:/opt/secrets:ro" \
  --mode stdout
```

## Passing SSH Keys and Credentials

The container needs access to your SSH keys to connect to remote hosts. ansible-navigator mounts your SSH agent socket by default, but you can also mount key files directly.

```bash
# ansible-navigator automatically forwards the SSH agent
# Just make sure ssh-agent is running with your keys loaded
eval $(ssh-agent)
ssh-add ~/.ssh/ansible_key

# Run the playbook (SSH agent is forwarded automatically)
ansible-navigator run site.yml \
  -i inventory.yml \
  --mode stdout
```

If SSH agent forwarding does not work, mount the key file directly:

```bash
# Mount SSH key into the container
ansible-navigator run site.yml \
  -i inventory.yml \
  --execution-environment-volume-mounts "$HOME/.ssh:/home/runner/.ssh:ro" \
  --mode stdout
```

## Running Without Execution Environments

You can use ansible-navigator without containers, running playbooks directly on your system. This is useful for quick tests or when you do not have a container runtime available.

```bash
# Disable execution environments
ansible-navigator run site.yml \
  -i inventory.yml \
  --execution-environment false \
  --mode stdout
```

In this mode, ansible-navigator uses whatever Ansible installation is on your system, just like ansible-playbook.

## Viewing Playbook Artifacts

ansible-navigator saves detailed artifacts from each playbook run. These are JSON files that contain the full output of every task.

```bash
# Artifacts are saved by default in the current directory
ls -la *-artifact-*.json

# Replay a previous run in the interactive TUI
ansible-navigator replay my-playbook-artifact-2024-01-15.json
```

The replay feature is incredibly useful for post-mortem analysis. You can share artifact files with teammates, and they can explore the full playbook output on their own machine without needing access to the original inventory or hosts.

Control artifact behavior:

```bash
# Disable artifact saving
ansible-navigator run site.yml \
  --mode stdout \
  --playbook-artifact-enable false

# Save artifacts to a specific directory
ansible-navigator run site.yml \
  --mode stdout \
  --playbook-artifact-save-as /var/log/ansible/artifacts/{playbook_name}-{time_stamp}.json
```

## Example: Full Production Deployment

Here is a realistic example putting it all together for a production deployment:

```bash
# Production deployment with all the bells and whistles
ansible-navigator run deploy.yml \
  --inventory inventory/production/ \
  --execution-environment-image registry.example.com/ee/prod:2.1 \
  --pull-policy missing \
  --vault-password-file ~/.vault_pass \
  --extra-vars "app_version=3.2.1 deploy_tag=$(git rev-parse --short HEAD)" \
  --limit "webservers:&us-east-1" \
  --forks 10 \
  --mode stdout \
  --playbook-artifact-save-as "/var/log/deploys/deploy-$(date +%Y%m%d-%H%M%S).json"
```

And the corresponding playbook:

```yaml
---
# deploy.yml - Production deployment playbook
- name: Deploy application
  hosts: webservers
  become: true
  serial: "25%"
  vars:
    app_version: "{{ app_version }}"
  tasks:
    - name: Pull the application image
      community.docker.docker_image:
        name: "registry.example.com/myapp:{{ app_version }}"
        source: pull

    - name: Stop the old container
      community.docker.docker_container:
        name: myapp
        state: stopped
      ignore_errors: true

    - name: Start the new container
      community.docker.docker_container:
        name: myapp
        image: "registry.example.com/myapp:{{ app_version }}"
        state: started
        restart_policy: unless-stopped
        ports:
          - "8080:8080"
        env:
          APP_ENV: production

    - name: Wait for health check
      ansible.builtin.uri:
        url: "http://localhost:8080/health"
        status_code: 200
      register: health_check
      until: health_check.status == 200
      retries: 30
      delay: 5
```

## Comparison with ansible-playbook

Here is a quick reference showing equivalent commands:

```bash
# ansible-playbook equivalent commands with ansible-navigator

# Basic run
# Old: ansible-playbook site.yml
# New:
ansible-navigator run site.yml --mode stdout

# With inventory
# Old: ansible-playbook -i prod site.yml
# New:
ansible-navigator run site.yml -i prod --mode stdout

# Check mode (dry run)
# Old: ansible-playbook site.yml --check --diff
# New:
ansible-navigator run site.yml --check --diff --mode stdout

# Syntax check
# Old: ansible-playbook site.yml --syntax-check
# New:
ansible-navigator run site.yml --syntax-check --mode stdout
```

## Wrapping Up

ansible-navigator is a significant upgrade over ansible-playbook. The interactive TUI makes debugging dramatically easier, the artifact replay feature enables team collaboration on troubleshooting, and the built-in EE support ensures consistent runtime environments. Start by adding `--mode stdout` to get familiar with the tool, then gradually adopt the interactive mode as you get comfortable navigating the TUI. Your future self will thank you the next time you need to figure out why task 47 out of 200 failed at 2 AM.
