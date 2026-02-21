# How to Use Ansible become with SSH

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SSH, Privilege Escalation, DevOps, Linux

Description: Learn how to combine Ansible become directives with SSH connections for seamless privilege escalation on remote hosts

---

If you have ever needed to run tasks as root on a remote server through Ansible, you have probably stumbled into the intersection of SSH and privilege escalation. Ansible uses SSH as its default transport, and the `become` directive is the mechanism for elevating privileges once connected. Getting these two pieces working together smoothly is something every infrastructure engineer needs to nail down early.

This guide walks through exactly how `become` works over SSH, with real configurations and playbooks you can drop into your projects today.

## Understanding the Connection Flow

When Ansible runs a playbook against a remote host, the process follows a clear sequence. First, Ansible opens an SSH connection using the user specified in your inventory or configuration. Second, once logged in as that user, Ansible uses `become` to escalate privileges (typically via sudo) to execute the actual task. These are two separate steps, and understanding that distinction prevents a lot of confusion.

The SSH user does not need to be root. In fact, best practice is to connect as a regular user and then use `become` to escalate only when needed.

## Basic Configuration

Here is a minimal inventory file that sets up SSH connection details alongside become parameters.

```ini
# inventory/hosts.ini
# Define the target hosts with SSH and become settings
[webservers]
web1 ansible_host=192.168.1.10 ansible_user=deploy ansible_ssh_private_key_file=~/.ssh/deploy_key

[webservers:vars]
ansible_become=true
ansible_become_method=sudo
ansible_become_user=root
```

In this inventory, Ansible connects via SSH as the `deploy` user using a private key, then uses sudo to become root for task execution.

## Playbook with become Over SSH

Here is a playbook that demonstrates the typical pattern of connecting as a non-root user and escalating privileges.

```yaml
# playbooks/setup-nginx.yml
# Install and configure nginx using become for root access
---
- name: Setup nginx on web servers
  hosts: webservers
  become: true
  become_user: root
  become_method: sudo

  tasks:
    - name: Update apt cache
      ansible.builtin.apt:
        update_cache: true
        cache_valid_time: 3600

    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
        state: present

    - name: Start nginx service
      ansible.builtin.service:
        name: nginx
        state: started
        enabled: true

    - name: Deploy index page
      ansible.builtin.copy:
        content: "<h1>Server {{ inventory_hostname }} is live</h1>"
        dest: /var/www/html/index.html
        owner: www-data
        group: www-data
        mode: '0644'
```

Every task in this playbook runs as root because `become: true` is set at the play level. The SSH connection itself is made as the `deploy` user.

## ansible.cfg Configuration

You can centralize your SSH and become settings in ansible.cfg so you do not repeat them across inventories.

```ini
# ansible.cfg
[defaults]
inventory = inventory/hosts.ini
remote_user = deploy
private_key_file = ~/.ssh/deploy_key
host_key_checking = false

[privilege_escalation]
become = true
become_method = sudo
become_user = root
become_ask_pass = false

[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=60s -o StrictHostKeyChecking=no
pipelining = true
```

The `pipelining = true` setting is worth calling out. It reduces the number of SSH operations Ansible performs by executing multiple commands in a single SSH session, which speeds up playbook runs significantly.

## Handling sudo Passwords

Sometimes your remote user needs a password for sudo. You can handle this without hardcoding credentials.

```yaml
# playbooks/with-sudo-pass.yml
# Playbook that prompts for the sudo password at runtime
---
- name: Tasks requiring sudo password
  hosts: webservers
  become: true
  vars_prompt:
    - name: ansible_become_pass
      prompt: "Enter sudo password"
      private: true

  tasks:
    - name: Check current user
      ansible.builtin.command: whoami
      register: current_user

    - name: Display effective user
      ansible.builtin.debug:
        msg: "Running as: {{ current_user.stdout }}"
```

Alternatively, run the playbook with the `--ask-become-pass` flag (or its shorthand `-K`):

```bash
# Run the playbook and prompt for the sudo password
ansible-playbook playbooks/setup-nginx.yml -K
```

## Mixing Privileged and Unprivileged Tasks

Not every task needs root access. You can toggle `become` on and off at the task level while maintaining the same SSH connection.

```yaml
# playbooks/mixed-privileges.yml
# Some tasks run as root, others as the connecting user
---
- name: Mixed privilege tasks
  hosts: webservers

  tasks:
    - name: Check connectivity as deploy user
      ansible.builtin.ping:

    - name: Read deploy user home directory
      ansible.builtin.command: ls -la ~
      register: home_contents

    - name: Install system package (needs root)
      ansible.builtin.apt:
        name: htop
        state: present
      become: true

    - name: Create app directory as deploy user
      ansible.builtin.file:
        path: /home/deploy/myapp
        state: directory
        mode: '0755'

    - name: Restart a service (needs root)
      ansible.builtin.service:
        name: cron
        state: restarted
      become: true
```

This approach follows the principle of least privilege. Only the tasks that genuinely need root access get it.

## SSH Multiplexing with become

SSH multiplexing lets Ansible reuse a single SSH connection for multiple tasks, which pairs well with become since it reduces connection overhead.

```ini
# ansible.cfg - optimized SSH settings for become
[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=300s -o ServerAliveInterval=30
control_path = %(directory)s/%%h-%%r-%%p
pipelining = true
retries = 3
```

The `ControlPersist=300s` keeps the SSH connection open for 5 minutes after the last command, so subsequent tasks do not need to re-authenticate.

## Debugging SSH and become Issues

When things go wrong, increasing verbosity helps you see exactly what is happening at both the SSH and become layers.

```bash
# Run with maximum verbosity to see SSH and become details
ansible-playbook playbooks/setup-nginx.yml -vvvv

# Test SSH connectivity separately
ansible webservers -m ping -vvv

# Test become specifically
ansible webservers -m command -a "whoami" --become -vvv
```

Common issues include:

- The SSH user does not have sudo permissions on the remote host
- The sudo configuration requires a TTY (add `-o RequireTty` or set `pipelining = false`)
- SSH key authentication fails before become even gets a chance to run
- The become password is incorrect or not provided when required

## Using become with Different SSH Key Types

If your environment uses ed25519 or ecdsa keys instead of RSA, the become configuration stays the same. Only the SSH connection parameters change.

```ini
# inventory for ed25519 keys
[webservers]
web1 ansible_host=10.0.0.5 ansible_user=deploy ansible_ssh_private_key_file=~/.ssh/id_ed25519

[webservers:vars]
ansible_become=true
ansible_become_method=sudo
```

## Security Considerations

When combining SSH and become, keep these practices in mind:

1. Never connect as root via SSH. Connect as a regular user and escalate with become.
2. Use SSH keys instead of passwords for the initial connection.
3. Limit sudo access on target hosts to only the commands Ansible needs.
4. Store become passwords in Ansible Vault rather than in plaintext.
5. Enable SSH agent forwarding only when necessary, as it exposes your keys to the remote host.

```yaml
# Example: storing become password in vault
# First, create the vault file
# ansible-vault create group_vars/webservers/vault.yml

# group_vars/webservers/vault.yml (encrypted)
# ansible_become_pass: "your_sudo_password_here"
```

## Wrapping Up

The combination of SSH and become is the backbone of how Ansible manages remote servers. SSH handles getting you onto the box, and become handles what you can do once you are there. By keeping these concerns separate in your configuration and understanding how they interact, you can build playbooks that are both secure and efficient. The key takeaway is to always connect as a regular user over SSH and escalate only when a specific task demands it.
