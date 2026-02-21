# How to Configure Ansible to Use a Specific SSH Port

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SSH, Security, Configuration, DevOps

Description: Configure Ansible to connect on non-standard SSH ports at the host, group, inventory, and global level for hardened environments.

---

Changing the default SSH port from 22 to something else is a common security hardening practice. It does not protect against targeted attacks, but it drastically reduces noise from automated bots scanning for port 22. When your managed hosts use non-standard SSH ports, you need to tell Ansible which port to connect on. This guide covers every way to do that, from per-host settings to global defaults.

## The Default SSH Port

Ansible uses port 22 by default, which is the standard SSH port. If all your hosts use port 22, you do not need to configure anything. But if you have changed the SSH port on any hosts, Ansible needs to know about it.

## Method 1: Per Host in Inventory

The most granular approach is setting the port for each host individually:

```ini
# inventory.ini
[webservers]
web01 ansible_host=10.0.0.10 ansible_port=2222
web02 ansible_host=10.0.0.11 ansible_port=2222
web03 ansible_host=10.0.0.12 ansible_port=22

[databases]
db01 ansible_host=10.0.0.20 ansible_port=2222
```

This is useful when different hosts use different ports.

## Method 2: Per Group in Inventory

If all hosts in a group use the same non-standard port, set it at the group level:

```ini
# inventory.ini
[webservers]
web01 ansible_host=10.0.0.10
web02 ansible_host=10.0.0.11
web03 ansible_host=10.0.0.12

[webservers:vars]
ansible_port=2222

[databases]
db01 ansible_host=10.0.0.20

[databases:vars]
ansible_port=3322

[all:vars]
# Default port for all hosts unless overridden
ansible_port=2222
```

## Method 3: In Group Variables Files

For better organization, especially with many groups, use group_vars files:

```yaml
# group_vars/webservers.yml
---
ansible_port: 2222
ansible_user: deploy
```

```yaml
# group_vars/databases.yml
---
ansible_port: 3322
ansible_user: dbadmin
```

```yaml
# group_vars/all.yml
---
ansible_port: 2222
```

## Method 4: In ansible.cfg

Set a default SSH port for all connections in the Ansible configuration file:

```ini
# ansible.cfg
[defaults]
remote_port = 2222
```

This applies to every host unless overridden by inventory variables.

## Method 5: Via Environment Variable

Override the port for a single command:

```bash
# Set the default remote port via environment variable
export ANSIBLE_REMOTE_PORT=2222
ansible all -m ping
```

## Method 6: In the SSH Config File

You can also configure the port in your SSH config and let Ansible inherit it:

```
# ~/.ssh/config
Host web01
    HostName 10.0.0.10
    Port 2222
    User deploy

Host web02
    HostName 10.0.0.11
    Port 2222
    User deploy

Host db*
    Port 3322
    User dbadmin
```

For this to work, your inventory should reference hosts by their SSH config names:

```ini
# inventory.ini
[webservers]
web01
web02

[databases]
db01
```

And make sure Ansible does not override the SSH config settings. In ansible.cfg, avoid setting `ansible_port` or `remote_port` if you want SSH config to take precedence.

## Method 7: Command Line Override

You can pass the port directly on the command line for ad-hoc commands:

```bash
# Specify the port for an ad-hoc command
ansible all -m ping -e "ansible_port=2222"

# Or use the --extra-vars flag
ansible-playbook deploy.yml --extra-vars "ansible_port=2222"
```

## Practical Example: Mixed Port Environment

Here is a real-world scenario where different environments use different ports:

```ini
# inventory/production.ini
[webservers]
prod-web01 ansible_host=203.0.113.10
prod-web02 ansible_host=203.0.113.11

[webservers:vars]
ansible_port=2222

[bastion]
bastion01 ansible_host=203.0.113.5 ansible_port=22222

[databases]
prod-db01 ansible_host=10.0.0.20 ansible_port=5422
```

```yaml
# playbooks/deploy.yml
---
- name: Deploy through bastion
  hosts: webservers
  vars:
    ansible_ssh_common_args: '-o ProxyJump=bastion01'

  tasks:
    - name: Deploy application
      ansible.builtin.copy:
        src: app/
        dest: /opt/app/
```

## Changing the SSH Port with Ansible

If you want to use Ansible to change the SSH port on your managed hosts, you need to be careful. The playbook starts by connecting on the current port, changes the SSH configuration, and then subsequent connections need to use the new port.

```yaml
# change-ssh-port.yml
---
- name: Change SSH port on managed hosts
  hosts: all
  become: true
  vars:
    new_ssh_port: 2222

  tasks:
    - name: Update SSH configuration
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: '^#?Port '
        line: "Port {{ new_ssh_port }}"
        validate: '/usr/sbin/sshd -t -f %s'
      notify: restart sshd

    - name: Allow new SSH port in firewall (UFW)
      community.general.ufw:
        rule: allow
        port: "{{ new_ssh_port }}"
        proto: tcp
      when: ansible_os_family == "Debian"

    - name: Allow new SSH port in firewall (firewalld)
      ansible.posix.firewalld:
        port: "{{ new_ssh_port }}/tcp"
        permanent: true
        state: enabled
        immediate: true
      when: ansible_os_family == "RedHat"

    - name: Allow new port in SELinux
      community.general.seport:
        ports: "{{ new_ssh_port }}"
        proto: tcp
        setype: ssh_port_t
        state: present
      when:
        - ansible_os_family == "RedHat"
        - ansible_selinux.status == "enabled"

  handlers:
    - name: restart sshd
      ansible.builtin.service:
        name: sshd
        state: restarted
```

After running this playbook, update your inventory to reflect the new port:

```ini
[all:vars]
ansible_port=2222
```

Important: Do not remove the firewall rule for port 22 until you have confirmed that connections on the new port work. Otherwise, you could lock yourself out.

## Testing Port Configuration

Verify that Ansible can connect on the configured port:

```bash
# Test connectivity with verbose output to see the port being used
ansible all -m ping -vvv

# The output should include lines like:
# <10.0.0.10> SSH: EXEC ssh -o Port=2222 ...
```

If connections fail, test SSH directly:

```bash
# Test direct SSH connection on the non-standard port
ssh -p 2222 deploy@10.0.0.10
```

## Troubleshooting Port Issues

**"Connection refused" on the new port**

The SSH service might not be listening on the expected port. Check the SSH configuration on the remote host:

```bash
ssh -p 22 deploy@10.0.0.10 "grep '^Port' /etc/ssh/sshd_config"
```

**"Connection timed out"**

A firewall is probably blocking the port. Check firewall rules:

```bash
# Check UFW
ssh deploy@10.0.0.10 "sudo ufw status"

# Check firewalld
ssh deploy@10.0.0.10 "sudo firewall-cmd --list-ports"
```

**SELinux blocking the new port (RHEL/CentOS)**

SELinux has a policy for which ports SSH can use. If you changed to a non-standard port, you need to add it:

```bash
# Check allowed SSH ports
ssh deploy@10.0.0.10 "sudo semanage port -l | grep ssh"

# Add the new port
ssh deploy@10.0.0.10 "sudo semanage port -a -t ssh_port_t -p tcp 2222"
```

## Summary

Configuring Ansible to use a specific SSH port is straightforward. Set `ansible_port` in your inventory (per host, per group, or globally), or set `remote_port` in ansible.cfg for a default that applies everywhere. For mixed environments, group variables give you the most flexibility. If you are also using SSH config files, make sure there are no conflicts between Ansible's port settings and your SSH config. Always test connectivity after changing ports, and never remove the old port's firewall rule until the new one is confirmed working.
