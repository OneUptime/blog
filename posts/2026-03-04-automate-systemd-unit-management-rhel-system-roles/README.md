# How to Automate systemd Unit Management Using RHEL System Roles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Systemd, Ansible, System Roles, Automation, Linux

Description: Learn how to use RHEL System Roles to automate systemd service management across your fleet. This guide covers enabling, disabling, and deploying custom unit files with Ansible.

---

If you manage more than a handful of RHEL servers, you already know the pain of SSH-ing into each box to tweak services. RHEL System Roles give you a supported, Red Hat-maintained way to handle systemd units at scale using Ansible. No more one-off scripts or hoping that your colleague remembered to enable that service on the new node.

This guide walks through using the `redhat.rhel_system_roles.systemd` role (part of the broader RHEL System Roles collection) to manage services, deploy custom unit files, and keep your fleet consistent.

---

## What Are RHEL System Roles?

RHEL System Roles are a collection of Ansible roles that Red Hat ships and supports. They cover networking, storage, timesync, SELinux, firewall, and yes, systemd unit management. The big advantage over writing your own playbooks from scratch is that these roles are tested against RHEL releases and handle edge cases you might not think of.

Install the package on your Ansible control node:

```bash
# Install the RHEL System Roles package

sudo dnf install rhel-system-roles -y
```

After installation, the collection lives under `/usr/share/ansible/collections/ansible_collections/redhat/rhel_system_roles/`, and the roles can be referenced as `redhat.rhel_system_roles.<role_name>`. You can verify:

```bash
# List available RHEL system roles
ls /usr/share/ansible/collections/ansible_collections/redhat/rhel_system_roles/roles/
```

---

## Setting Up Your Ansible Inventory

Before running any playbooks, you need an inventory file that lists your target hosts. Here is a simple example:

```ini
# inventory.ini - list your RHEL hosts here
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

The most common task is making sure a service is running and enabled at boot. Here is a playbook that uses the `redhat.rhel_system_roles.systemd` role with role-based variable management.

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

    # Manage services with the RHEL systemd role
    - name: Enable, start, disable, and stop services
      ansible.builtin.include_role:
        name: redhat.rhel_system_roles.systemd
      vars:
        systemd_started_units:
          - httpd.service
          - firewalld.service
        systemd_enabled_units:
          - httpd.service
          - firewalld.service
        systemd_stopped_units:
          - cups.service
        systemd_disabled_units:
          - cups.service
```

Run the playbook:

```bash
# Apply the service management playbook
ansible-playbook -i inventory.ini manage-services.yml
```

If you are writing standalone Ansible tasks instead of using the RHEL systemd role, `ansible.builtin.systemd_service` is the current fully qualified module name for managing systemd units. The older `ansible.builtin.systemd` name is kept as a backward-compatible alias.

---

## Deploying Custom Unit Files with Ansible

Sometimes you need to push a custom systemd unit file to your servers. Maybe you have a homegrown monitoring agent or a backend app that needs its own service definition.

Here is the workflow: create the unit file as a template, then let the RHEL systemd role deploy it, reload systemd, enable the unit, and start the service.

First, create your unit file template:

```ini
# myapp.service.j2 - Jinja2 template for the custom service
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

    # Deploy the unit file, reload systemd, enable the service, and start it
    - name: Deploy and activate myapp
      ansible.builtin.include_role:
        name: redhat.rhel_system_roles.systemd
      vars:
        systemd_unit_file_templates:
          - myapp.service.j2
        systemd_enabled_units:
          - myapp.service
        systemd_started_units:
          - myapp.service
```

The role expects system unit templates to use the `<name>.<unit_type>.j2` naming convention, such as `myapp.service.j2`, and places the rendered unit under `/etc/systemd/system/`.

---

## Using the RHEL System Role for Timesync (Practical Example)

To show how RHEL System Roles work with their role-based variable approach, here is an example using the `redhat.rhel_system_roles.timesync` role. The pattern is the same for any RHEL System Role:

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
    - redhat.rhel_system_roles.timesync
```

On RHEL 8 and later, this installs and configures chrony, enables the service, and makes sure time sync is working. The role handles the systemd unit management internally.

---

## Managing Multiple Services with Lists

When you need to handle several services at once, lists keep your playbook clean:

```yaml
# bulk-service-management.yml - Manage multiple services in one pass
---
- name: Bulk service management
  hosts: all
  become: true
  vars:
    services_to_enable:
      - sshd.service
      - firewalld.service
      - chronyd.service
      - rsyslog.service
    services_to_disable:
      - cups.service
      - avahi-daemon.service
      - bluetooth.service

  tasks:
    # Manage all required and unnecessary services
    - name: Apply service policy
      ansible.builtin.include_role:
        name: redhat.rhel_system_roles.systemd
      vars:
        systemd_started_units: "{{ services_to_enable }}"
        systemd_enabled_units: "{{ services_to_enable }}"
        systemd_stopped_units: "{{ services_to_disable }}"
        systemd_disabled_units: "{{ services_to_disable }}"
```

When you use the role, keep your unit lists accurate for the target hosts. Do not include services that are not installed on a host unless you have accounted for that host difference elsewhere in your inventory or variables.

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
      failed_when: false

    # Print the results
    - name: Show service status
      ansible.builtin.debug:
        msg: "{{ item.item }}: {{ item.stdout }}"
      loop: "{{ service_check.results }}"
```

---

## Tips From the Field

**Keep your playbooks idempotent.** The RHEL systemd role and the `systemd_service` module are idempotent, meaning running them twice produces the same result. Do not add extra shell commands that break this property.

**Reload systemd when deploying unit files.** If you change a unit file but forget to reload systemd, the old version stays in memory. The RHEL systemd role handles this when it deploys unit file templates; if you write standalone tasks, use the `daemon_reload` parameter in `ansible.builtin.systemd_service`.

**Pin your collection versions.** If you are using RHEL System Roles from Ansible Galaxy or Automation Hub, pin the version in your `requirements.yml`:

```yaml
# requirements.yml - Pin role versions for reproducibility
collections:
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

RHEL System Roles give you a reliable, repeatable way to manage services across your entire fleet. Instead of writing fragile shell scripts or relying on tribal knowledge about which services should be running where, you codify it in playbooks that anyone on the team can read and run.

Start small. Pick one service management task you do regularly, automate it, and build from there. Once your team sees how much time it saves, the rest of your service management will follow.
