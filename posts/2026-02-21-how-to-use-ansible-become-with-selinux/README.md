# How to Use Ansible become with SELinux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SELinux, Security, Linux, Privilege Escalation

Description: A practical guide to using Ansible become for privilege escalation on SELinux-enforcing systems without breaking security policies.

---

SELinux and Ansible become are two things that individually make sense but together can cause some real headaches. SELinux restricts what processes can do based on their security context, while Ansible's become mechanism tries to switch users and escalate privileges. When those two collide, you get denied operations, failed playbooks, and a lot of time reading audit logs. This post covers how to make them work together properly.

## The Problem with become and SELinux

When Ansible connects to a remote host and uses `become: true`, it typically runs sudo to switch to another user (usually root). SELinux tracks security contexts for every process, file, and port on the system. The sudo transition must result in a valid security context, or SELinux will block the operation.

Common symptoms include tasks that work fine when you SSH in and run sudo manually, but fail when Ansible tries the same thing. The errors often look like permission denied messages that make no sense until you check the SELinux audit log.

## Checking SELinux Status

Before troubleshooting, verify whether SELinux is actually the problem. This playbook checks the SELinux status on your target hosts.

```yaml
---
# check-selinux.yml - Verify SELinux mode on target hosts
- name: Check SELinux status
  hosts: all
  become: true
  tasks:
    - name: Get SELinux status
      ansible.builtin.command: getenforce
      register: selinux_status
      changed_when: false

    - name: Display SELinux mode
      ansible.builtin.debug:
        msg: "SELinux is {{ selinux_status.stdout }} on {{ inventory_hostname }}"

    - name: Get detailed SELinux status
      ansible.builtin.command: sestatus
      register: sestatus_output
      changed_when: false

    - name: Show full SELinux details
      ansible.builtin.debug:
        msg: "{{ sestatus_output.stdout_lines }}"
```

## Installing Required SELinux Packages

Ansible needs certain Python libraries to manage SELinux contexts. Without them, modules like `file`, `copy`, and `template` will fail when trying to set the correct SELinux context on files.

Install the SELinux dependencies on your managed nodes:

```yaml
---
# install-selinux-deps.yml - Install SELinux Python bindings
- name: Install SELinux dependencies
  hosts: all
  become: true
  tasks:
    - name: Install SELinux Python bindings (RHEL/CentOS 8+)
      ansible.builtin.dnf:
        name:
          - python3-libselinux
          - python3-policycoreutils
          - policycoreutils-python-utils
        state: present
      when: ansible_os_family == "RedHat" and ansible_distribution_major_version | int >= 8

    - name: Install SELinux Python bindings (RHEL/CentOS 7)
      ansible.builtin.yum:
        name:
          - libselinux-python
          - policycoreutils-python
        state: present
      when: ansible_os_family == "RedHat" and ansible_distribution_major_version | int == 7
```

## Managing File Contexts with become

One of the most common issues is creating files with incorrect SELinux contexts. When Ansible creates or copies a file using become, the file needs to have the right context or services that depend on it will not be able to read it.

This playbook deploys an Nginx configuration file with the correct SELinux context:

```yaml
---
# deploy-nginx-config.yml - Deploy config with proper SELinux context
- name: Deploy Nginx with SELinux contexts
  hosts: webservers
  become: true
  tasks:
    - name: Install Nginx
      ansible.builtin.dnf:
        name: nginx
        state: present

    - name: Deploy custom Nginx config
      ansible.builtin.template:
        src: templates/nginx.conf.j2
        dest: /etc/nginx/nginx.conf
        owner: root
        group: root
        mode: '0644'
        setype: httpd_config_t
      notify: restart nginx

    - name: Deploy web content
      ansible.builtin.copy:
        src: files/index.html
        dest: /var/www/html/index.html
        owner: root
        group: root
        mode: '0644'
        setype: httpd_sys_content_t

    - name: Create a custom web directory
      ansible.builtin.file:
        path: /srv/webapp
        state: directory
        owner: nginx
        group: nginx
        mode: '0755'
        setype: httpd_sys_content_t

  handlers:
    - name: restart nginx
      ansible.builtin.systemd:
        name: nginx
        state: restarted
```

Notice the `setype` parameter on the file, copy, and template modules. This tells Ansible what SELinux type to apply to the file. Without it, the file might get a generic context that prevents the web server from reading it.

## Managing SELinux Booleans with become

SELinux booleans are toggles that enable or disable specific policy features. Modifying them requires root privileges, so you always need become.

Here is how to manage SELinux booleans for a typical web application stack:

```yaml
---
# configure-selinux-booleans.yml - Set SELinux booleans for web app
- name: Configure SELinux booleans
  hosts: webservers
  become: true
  tasks:
    - name: Allow HTTPD to connect to the network
      ansible.posix.seboolean:
        name: httpd_can_network_connect
        state: true
        persistent: true

    - name: Allow HTTPD to connect to databases
      ansible.posix.seboolean:
        name: httpd_can_network_connect_db
        state: true
        persistent: true

    - name: Allow HTTPD to send mail
      ansible.posix.seboolean:
        name: httpd_can_sendmail
        state: true
        persistent: true

    - name: Allow HTTPD to use NFS home directories
      ansible.posix.seboolean:
        name: httpd_use_nfs
        state: true
        persistent: true
```

The `persistent: true` parameter ensures the boolean survives reboots. The `ansible.posix.seboolean` module requires the `ansible.posix` collection, which you should install if you have not already:

```bash
# Install the ansible.posix collection
ansible-galaxy collection install ansible.posix
```

## Managing SELinux Ports with become

If you run services on non-standard ports, you need to tell SELinux about it. For example, running a web server on port 8443 instead of 443 requires adding that port to the `http_port_t` type.

```yaml
---
# configure-selinux-ports.yml - Register custom ports with SELinux
- name: Configure SELinux port labels
  hosts: webservers
  become: true
  tasks:
    - name: Allow Nginx to listen on port 8443
      community.general.seport:
        ports: 8443
        proto: tcp
        setype: http_port_t
        state: present

    - name: Allow custom app on port 9090
      community.general.seport:
        ports: 9090
        proto: tcp
        setype: http_port_t
        state: present

    - name: Verify the port is registered
      ansible.builtin.command: semanage port -l
      register: port_list
      changed_when: false

    - name: Show HTTP ports
      ansible.builtin.debug:
        msg: "{{ port_list.stdout_lines | select('search', 'http_port_t') | list }}"
```

## Handling become with Custom SELinux Policies

Sometimes the built-in SELinux policy does not cover your use case, and you need to create a custom policy module. This typically happens when you deploy custom applications that SELinux has never seen before.

This playbook generates and installs a custom SELinux policy module:

```yaml
---
# custom-selinux-policy.yml - Build and install custom SELinux module
- name: Deploy custom SELinux policy
  hosts: app_servers
  become: true
  tasks:
    - name: Copy the custom policy type enforcement file
      ansible.builtin.copy:
        src: files/myapp.te
        dest: /tmp/myapp.te
        mode: '0644'

    - name: Compile the policy module
      ansible.builtin.command: checkmodule -M -m -o /tmp/myapp.mod /tmp/myapp.te
      changed_when: true

    - name: Package the policy module
      ansible.builtin.command: semodule_package -o /tmp/myapp.pp -m /tmp/myapp.mod
      changed_when: true

    - name: Install the policy module
      ansible.builtin.command: semodule -i /tmp/myapp.pp
      changed_when: true

    - name: Clean up temporary files
      ansible.builtin.file:
        path: "{{ item }}"
        state: absent
      loop:
        - /tmp/myapp.te
        - /tmp/myapp.mod
        - /tmp/myapp.pp
```

## Troubleshooting become Failures Caused by SELinux

When a task fails and you suspect SELinux, the audit log is your best friend. Here is a playbook that checks for recent SELinux denials:

```yaml
---
# check-selinux-denials.yml - Find SELinux audit denials
- name: Check for SELinux denials
  hosts: all
  become: true
  tasks:
    - name: Search audit log for recent AVC denials
      ansible.builtin.shell: |
        ausearch -m avc -ts recent 2>/dev/null || echo "No recent denials found"
      register: avc_denials
      changed_when: false

    - name: Display denials
      ansible.builtin.debug:
        msg: "{{ avc_denials.stdout_lines }}"

    - name: Generate a human-readable report of denials
      ansible.builtin.shell: |
        sealert -a /var/log/audit/audit.log 2>/dev/null | tail -50 || echo "sealert not available"
      register: sealert_output
      changed_when: false

    - name: Show the sealert report
      ansible.builtin.debug:
        msg: "{{ sealert_output.stdout_lines }}"
```

## Setting SELinux Mode with become

You can also use Ansible to manage the SELinux mode itself. This should be done carefully, and you should almost never disable SELinux entirely. Permissive mode is useful for debugging.

```yaml
---
# set-selinux-mode.yml - Manage SELinux enforcement mode
- name: Manage SELinux mode
  hosts: all
  become: true
  tasks:
    - name: Set SELinux to enforcing mode
      ansible.posix.selinux:
        policy: targeted
        state: enforcing
      register: selinux_result

    - name: Reboot if SELinux state changed and requires it
      ansible.builtin.reboot:
        msg: "Rebooting to apply SELinux changes"
        reboot_timeout: 300
      when: selinux_result.reboot_required | default(false)
```

## Restoring File Contexts After Bulk Operations

After deploying a lot of files, their SELinux contexts might not match what the policy expects. The `restorecon` command fixes this, and you can run it through Ansible with become.

```yaml
---
# restore-contexts.yml - Fix SELinux contexts after deployment
- name: Restore SELinux file contexts
  hosts: all
  become: true
  tasks:
    - name: Restore contexts on the web root
      ansible.builtin.command: restorecon -Rv /var/www/html
      register: restore_result
      changed_when: restore_result.stdout != ""

    - name: Show what was fixed
      ansible.builtin.debug:
        msg: "{{ restore_result.stdout_lines }}"
      when: restore_result.stdout != ""
```

## Summary

Running Ansible with become on SELinux-enforcing systems is absolutely doable once you understand the interaction between privilege escalation and security contexts. The key points to remember are: always install the SELinux Python bindings, use the `setype` parameter when creating files, manage booleans and ports through dedicated modules, and check the audit log when things go wrong. Do not reach for `setenforce 0` as a first resort. Instead, build proper policies and let SELinux do its job of protecting your systems.
