# How to Automate systemd Unit Management Using RHEL System Roles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, systemd, Ansible, System Roles, Automation, Linux

Description: Learn how to use RHEL System Roles to automate systemd service management across your fleet. This guide covers enabling, disabling, and deploying custom unit files with Ansible.

---

If you manage more than a handful of RHEL servers, you already know the pain of SSH-ing into each box to tweak services. RHEL System Roles give you a supported, Red Hat-maintained way to handle systemd units at scale using Ansible. No more one-off scripts or hoping that your colleague remembered to enable that service on the new node.

This guide walks through using the `rhel-system-roles.systemd` role (part of the broader RHEL System Roles collection) to manage services, deploy custom unit files, and keep your fleet consistent.

---

## What Are RHEL System Roles?

RHEL System Roles are a collection of Ansible roles that Red Hat ships and supports. They cover networking, storage, timesync, SELinux, firewall, and yes, systemd unit management. The big advantage over writing your own playbooks from scratch is that these roles are tested against RHEL releases and handle edge cases you might not think of.

Install the package on your Ansible control node:

```bash
# Install the RHEL System Roles package
sudo dnf install rhel-system-roles -y
```

After installation, the roles live under `/usr/share/ansible/roles/`. You can verify:

```bash
# List available RHEL system roles
ls /usr/share/ansible/roles/ | grep rhel
```

---

## Setting Up Your Ansible Inventory

Before running any playbooks, you need an inventory file that lists your target hosts. Here is a simple example:

```ini
# inventory.ini - list your RHEL 9 hosts here
[webservers]
web01.example.com
web02.example.com

[dbservers]
db01.example.com
```

Make sure you have SSH key-based authentication configured for your managed nodes. Test connectivity first:

```bash
# Verify Ansible can reach all hosts
ansible all -i inventory.ini -m ping
```

---

## Enabling and Disabling Services via the systemd Role

The most common task is making sure a service is running and enabled at boot. Here is a playbook that uses the `rhel-system-roles.systemd` approach through Ansible's built-in modules, combined with role-based variable management.

Create a playbook file:

```yaml
# manage-services.yml - Enable and start services across the fleet
---
- name: Manage systemd services on webservers
  hosts: webservers
  become: true
  tasks:
    # Ensure httpd is installed before managing its service
    - name: Install httpd
      ansible.builtin.dnf:
        name: httpd
        state: present

    # Start and enable httpd so it survives reboots
    - name: Enable and start httpd
      ansible.builtin.systemd_service:
        name: httpd
        state: started
        enabled: true

    # Make sure the firewall allows HTTP traffic
    - name: Enable and start firewalld
      ansible.builtin.systemd_service:
        name: firewalld
        state: started
        enabled: true

    # Disable and stop a service you do not want running
    - name: Disable and stop cups (not needed on web servers)
      ansible.builtin.systemd_service:
        name: cups
        state: stopped
        enabled: false
```

Run the playbook:

```bash
# Apply the service management playbook
ansible-playbook -i inventory.ini manage-services.yml
```

The `systemd_service` module (available in Ansible 2.14+) is the preferred way to manage systemd units. It replaces the older `systemd` module name and works well on RHEL 9.

---

## Deploying Custom Unit Files with Ansible

Sometimes you need to push a custom systemd unit file to your servers. Maybe you have a homegrown monitoring agent or a backend app that needs its own service definition.

Here is the workflow: deploy the unit file as a template, reload systemd, then enable and start the service.

First, create your unit file template:

```ini
# templates/myapp.service.j2 - Jinja2 template for the custom service
[Unit]
Description=My Custom Application
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User={{ myapp_user }}
Group={{ myapp_group }}
ExecStart={{ myapp_install_dir }}/bin/myapp --config {{ myapp_config_path }}
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Now the playbook that deploys it:

```yaml
# deploy-custom-service.yml - Push and activate a custom unit file
---
- name: Deploy custom application service
  hosts: webservers
  become: true
  vars:
    myapp_user: myapp
    myapp_group: myapp
    myapp_install_dir: /opt/myapp
    myapp_config_path: /etc/myapp/config.yaml

  tasks:
    # Create the service user if it does not exist
    - name: Create application user
      ansible.builtin.user:
        name: "{{ myapp_user }}"
        system: true
        shell: /sbin/nologin

    # Deploy the unit file from template
    - name: Deploy systemd unit file
      ansible.builtin.template:
        src: templates/myapp.service.j2
        dest: /etc/systemd/system/myapp.service
        owner: root
        group: root
        mode: "0644"
      notify: Reload systemd and restart myapp

    # Enable the service so it starts at boot
    - name: Enable and start myapp
      ansible.builtin.systemd_service:
        name: myapp
        state: started
        enabled: true
        daemon_reload: true

  handlers:
    # Handler runs only when the unit file changes
    - name: Reload systemd and restart myapp
      ansible.builtin.systemd_service:
        name: myapp
        state: restarted
        daemon_reload: true
```

The handler pattern is important here. You only want to restart the service when the unit file actually changes. If the template is unchanged, Ansible skips the handler and your service keeps running without interruption.

---

## Using the RHEL System Role for Timesync (Practical Example)

To show how RHEL System Roles work with their role-based variable approach, here is an example using the `rhel-system-roles.timesync` role. The pattern is the same for any RHEL System Role:

```yaml
# timesync.yml - Configure NTP using the official RHEL System Role
---
- name: Configure time synchronization
  hosts: all
  become: true
  vars:
    timesync_ntp_servers:
      - hostname: ntp1.example.com
        iburst: true
      - hostname: ntp2.example.com
        iburst: true
  roles:
    - rhel-system-roles.timesync
```

This installs and configures chrony, enables the service, and makes sure time sync is working. The role handles the systemd unit management internally.

---

## Managing Multiple Services with Loops

When you need to handle several services at once, loops keep your playbook clean:

```yaml
# bulk-service-management.yml - Manage multiple services in one pass
---
- name: Bulk service management
  hosts: all
  become: true
  vars:
    services_to_enable:
      - sshd
      - firewalld
      - chronyd
      - rsyslog
    services_to_disable:
      - cups
      - avahi-daemon
      - bluetooth

  tasks:
    # Enable and start all required services
    - name: Enable required services
      ansible.builtin.systemd_service:
        name: "{{ item }}"
        state: started
        enabled: true
      loop: "{{ services_to_enable }}"

    # Stop and disable unnecessary services
    - name: Disable unnecessary services
      ansible.builtin.systemd_service:
        name: "{{ item }}"
        state: stopped
        enabled: false
      loop: "{{ services_to_disable }}"
      ignore_errors: true
```

The `ignore_errors: true` on the disable task is practical because some services might not be installed on every host. You do not want the playbook to fail just because bluetooth was never installed on a headless server.

---

## Verifying Service State After Deployment

After running your playbooks, you want confirmation that everything is correct. Add a verification task:

```yaml
    # Check that critical services are active
    - name: Verify services are running
      ansible.builtin.command:
        cmd: systemctl is-active {{ item }}
      loop: "{{ services_to_enable }}"
      register: service_check
      changed_when: false

    # Print the results
    - name: Show service status
      ansible.builtin.debug:
        msg: "{{ item.item }}: {{ item.stdout }}"
      loop: "{{ service_check.results }}"
```

---

## Tips From the Field

**Keep your playbooks idempotent.** The `systemd_service` module is already idempotent, meaning running it twice produces the same result. Do not add extra shell commands that break this property.

**Use `daemon_reload: true` when deploying unit files.** If you change a unit file but forget to reload systemd, the old version stays in memory. The `daemon_reload` parameter handles this automatically.

**Pin your role versions.** If you are using RHEL System Roles from Ansible Galaxy or Automation Hub, pin the version in your `requirements.yml`:

```yaml
# requirements.yml - Pin role versions for reproducibility
roles:
  - name: redhat.rhel_system_roles
    version: "1.23.0"
```

**Test with check mode first.** Before applying changes to production, run with `--check` to see what would change:

```bash
# Dry run to preview changes
ansible-playbook -i inventory.ini manage-services.yml --check --diff
```

---

## Wrapping Up

RHEL System Roles combined with Ansible's `systemd_service` module give you a reliable, repeatable way to manage services across your entire fleet. Instead of writing fragile shell scripts or relying on tribal knowledge about which services should be running where, you codify it in playbooks that anyone on the team can read and run.

Start small. Pick one service management task you do regularly, automate it, and build from there. Once your team sees how much time it saves, the rest of your service management will follow.
