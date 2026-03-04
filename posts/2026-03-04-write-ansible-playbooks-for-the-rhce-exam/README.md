# How to Write Ansible Playbooks for the RHCE Exam

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, RHCE, Ansible, Automation, Certification

Description: Learn to write Ansible playbooks for the RHCE exam, including inventory setup, variable usage, handlers, templates, and roles.

---

The RHCE exam is based on Ansible. You need to write playbooks from scratch under time pressure. This guide covers the core patterns you should master.

## Inventory Setup

```ini
# inventory
[webservers]
web1.example.com
web2.example.com

[dbservers]
db1.example.com

[all:vars]
ansible_user=admin
ansible_become=true
```

## Basic Playbook Structure

```yaml
# site.yml - Install and configure Apache on web servers
---
- name: Configure web servers
  hosts: webservers
  become: true
  vars:
    http_port: 80
    doc_root: /var/www/html

  tasks:
    - name: Install httpd
      ansible.builtin.dnf:
        name: httpd
        state: present

    - name: Deploy configuration from template
      ansible.builtin.template:
        src: templates/httpd.conf.j2
        dest: /etc/httpd/conf/httpd.conf
        owner: root
        group: root
        mode: '0644'
      notify: Restart httpd

    - name: Ensure httpd is started and enabled
      ansible.builtin.service:
        name: httpd
        state: started
        enabled: true

    - name: Open firewall port
      ansible.posix.firewalld:
        port: "{{ http_port }}/tcp"
        permanent: true
        state: enabled
        immediate: true

  handlers:
    - name: Restart httpd
      ansible.builtin.service:
        name: httpd
        state: restarted
```

## Using Conditionals and Loops

```yaml
    # Install multiple packages using a loop
    - name: Install required packages
      ansible.builtin.dnf:
        name: "{{ item }}"
        state: present
      loop:
        - httpd
        - mod_ssl
        - php

    # Conditional task based on OS version
    - name: Apply RHEL 9 specific config
      ansible.builtin.copy:
        src: rhel9-config.conf
        dest: /etc/myapp/config.conf
      when: ansible_distribution_major_version == "9"
```

## Using Roles

```bash
# Create a role skeleton
ansible-galaxy role init roles/webserver
```

```yaml
# roles/webserver/tasks/main.yml
---
- name: Install httpd
  ansible.builtin.dnf:
    name: httpd
    state: present

- name: Start httpd
  ansible.builtin.service:
    name: httpd
    state: started
    enabled: true
```

```yaml
# site.yml using roles
---
- name: Configure web servers
  hosts: webservers
  become: true
  roles:
    - webserver
```

## Running the Playbook

```bash
# Syntax check
ansible-playbook --syntax-check -i inventory site.yml

# Dry run
ansible-playbook --check -i inventory site.yml

# Execute
ansible-playbook -i inventory site.yml
```

Practice writing playbooks from memory. On the exam, you will not have internet access but you can use `ansible-doc` for module documentation.
