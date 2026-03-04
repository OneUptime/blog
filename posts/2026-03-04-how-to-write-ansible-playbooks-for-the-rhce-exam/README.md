# How to Write Ansible Playbooks for the RHCE Exam

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Certification, Ansible

Description: Step-by-step guide on write ansible playbooks for the rhce exam with practical examples and commands.

---

The RHCE exam tests your ability to write Ansible playbooks. This guide covers key playbook patterns and techniques for the exam.

## Ansible Configuration

```ini
# ansible.cfg
[defaults]
inventory = ./inventory
remote_user = ansible
roles_path = ./roles

[privilege_escalation]
become = true
become_method = sudo
become_user = root
```

## Inventory Setup

```ini
# inventory/hosts
[webservers]
web1.example.com
web2.example.com

[dbservers]
db1.example.com

[all:vars]
ansible_python_interpreter=/usr/bin/python3
```

## Basic Playbook Structure

```yaml
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

    - name: Start and enable httpd
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
```

## Using Variables and Facts

```yaml
- name: Display system facts
  hosts: all
  tasks:
    - name: Show OS information
      ansible.builtin.debug:
        msg: "{{ ansible_distribution }} {{ ansible_distribution_version }}"

    - name: Use conditionals
      ansible.builtin.dnf:
        name: httpd
        state: present
      when: ansible_distribution == "RedHat"
```

## Handlers

```yaml
tasks:
  - name: Configure httpd
    ansible.builtin.template:
      src: httpd.conf.j2
      dest: /etc/httpd/conf/httpd.conf
    notify: restart httpd

handlers:
  - name: restart httpd
    ansible.builtin.service:
      name: httpd
      state: restarted
```

## Loops

```yaml
tasks:
  - name: Create multiple users
    ansible.builtin.user:
      name: "{{ item.name }}"
      groups: "{{ item.groups }}"
      state: present
    loop:
      - { name: user1, groups: wheel }
      - { name: user2, groups: developers }
      - { name: user3, groups: wheel }
```

## Using Roles

```bash
ansible-galaxy init roles/webserver
```

```yaml
# roles/webserver/tasks/main.yml
---
- name: Install web packages
  ansible.builtin.dnf:
    name:
      - httpd
      - mod_ssl
      - php
    state: present

- name: Deploy configuration
  ansible.builtin.template:
    src: httpd.conf.j2
    dest: /etc/httpd/conf/httpd.conf
  notify: restart httpd
```

## Error Handling

```yaml
tasks:
  - name: Attempt risky task
    block:
      - name: Install package
        ansible.builtin.dnf:
          name: somepackage
          state: present
    rescue:
      - name: Handle failure
        ansible.builtin.debug:
          msg: "Package installation failed, using alternative"
    always:
      - name: Always run this
        ansible.builtin.debug:
          msg: "Task block completed"
```

## Ansible Vault

```bash
# Create encrypted file
ansible-vault create secrets.yml

# Edit encrypted file
ansible-vault edit secrets.yml

# Run playbook with vault
ansible-playbook site.yml --ask-vault-pass
```

## Conclusion

The RHCE exam focuses on practical Ansible skills. Practice writing playbooks that install packages, configure services, manage users, and use roles until you can complete these tasks confidently under time pressure.

