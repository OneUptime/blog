# How to Use the Ansible copy Module with Remote Source

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, File Management, Remote Operations, DevOps

Description: Learn how to use the Ansible copy module with remote_src to copy files between locations on the remote host without transferring from the control node.

---

By default, the Ansible `copy` module transfers files from the control node (where Ansible runs) to the remote host. But sometimes the file you need to copy is already on the remote host, and you just need to move or duplicate it within that same machine. That is where the `remote_src` parameter comes in.

Setting `remote_src: true` tells Ansible that the source file is on the remote host, not the control node. This is useful for creating backups, duplicating configurations, staging files for processing, and working with files that were downloaded or generated on the remote system.

## Basic Remote Copy

Here is a simple example of copying a file from one location to another on the same remote host:

```yaml
# Copy a file between two locations on the remote host
- name: Copy config to backup location
  ansible.builtin.copy:
    src: /etc/myapp/config.yml
    dest: /etc/myapp/config.yml.backup
    remote_src: true
```

Without `remote_src: true`, Ansible would look for `/etc/myapp/config.yml` on the control node. With it, Ansible looks for the file on the remote host.

## Creating Timestamped Backups

A common pattern is creating timestamped backup copies before making changes:

```yaml
# Create a timestamped backup of a configuration file
- name: Backup current Nginx config
  ansible.builtin.copy:
    src: /etc/nginx/nginx.conf
    dest: "/etc/nginx/nginx.conf.{{ ansible_date_time.iso8601_basic_short }}"
    remote_src: true
    owner: root
    group: root
    mode: "0644"

# Now safe to modify the original
- name: Deploy new Nginx configuration
  ansible.builtin.template:
    src: templates/nginx.conf.j2
    dest: /etc/nginx/nginx.conf
    owner: root
    group: root
    mode: "0644"
  notify: Reload Nginx
```

## Copying with Different Permissions

When copying a file on the remote host, you can change its permissions and ownership in the same operation:

```yaml
# Copy a file and change its permissions
- name: Copy script with execute permissions
  ansible.builtin.copy:
    src: /opt/myapp/scripts/deploy.sh.template
    dest: /opt/myapp/bin/deploy.sh
    remote_src: true
    owner: deploy
    group: deploy
    mode: "0755"
```

This is useful when a file is generated or downloaded with default permissions and you need to set the correct ones for its final destination.

## Copying Directories Remotely

You can copy entire directories on the remote host:

```yaml
# Copy a directory to a new location on the remote host
- name: Duplicate application directory for testing
  ansible.builtin.copy:
    src: /opt/myapp/releases/v2.0/
    dest: /opt/myapp/releases/v2.0-test/
    remote_src: true
    owner: myapp
    group: myapp
```

Like the standard `copy` module behavior, a trailing `/` on the source copies the contents, while no trailing slash copies the directory itself.

## Working with Downloaded Files

After downloading a file with `get_url` or `uri`, you might need to copy it to multiple locations:

```yaml
# Download a file and then distribute it to multiple locations
- name: Download the latest agent binary
  ansible.builtin.get_url:
    url: "https://releases.example.com/agent/v3.0/agent-linux-amd64"
    dest: /tmp/agent-binary
    mode: "0644"

- name: Install agent binary to the standard path
  ansible.builtin.copy:
    src: /tmp/agent-binary
    dest: /usr/local/bin/monitoring-agent
    remote_src: true
    owner: root
    group: root
    mode: "0755"

- name: Clean up downloaded file
  ansible.builtin.file:
    path: /tmp/agent-binary
    state: absent
```

## Extracting and Copying from Archives

After extracting an archive on the remote host, use `remote_src` to place specific files in their final locations:

```yaml
# Extract an archive and copy specific files to their destinations
- name: Extract application archive
  ansible.builtin.unarchive:
    src: /tmp/myapp-v2.0.tar.gz
    dest: /tmp/myapp-extract
    remote_src: true

- name: Copy binary to installation directory
  ansible.builtin.copy:
    src: /tmp/myapp-extract/myapp/bin/myapp
    dest: /usr/local/bin/myapp
    remote_src: true
    owner: root
    group: root
    mode: "0755"

- name: Copy default configuration
  ansible.builtin.copy:
    src: /tmp/myapp-extract/myapp/config/defaults.yml
    dest: /etc/myapp/defaults.yml
    remote_src: true
    owner: root
    group: myapp
    mode: "0640"

- name: Clean up extraction directory
  ansible.builtin.file:
    path: /tmp/myapp-extract
    state: absent
```

## Conditional Remote Copy

Copy a file only if certain conditions are met:

```yaml
# Copy a backup only if the source file has been modified recently
- name: Check if config was recently modified
  ansible.builtin.stat:
    path: /etc/myapp/config.yml
  register: config_stat

- name: Backup config if modified in the last hour
  ansible.builtin.copy:
    src: /etc/myapp/config.yml
    dest: /var/backups/myapp/config.yml.latest
    remote_src: true
  when: >
    config_stat.stat.exists and
    (ansible_date_time.epoch | int - config_stat.stat.mtime) < 3600
```

## Remote Copy with Validation

The `validate` parameter works with `remote_src` too:

```yaml
# Copy a sudoers file with validation on the remote host
- name: Copy sudoers override from staging area
  ansible.builtin.copy:
    src: /opt/staging/sudoers.d/myapp
    dest: /etc/sudoers.d/myapp
    remote_src: true
    owner: root
    group: root
    mode: "0440"
    validate: /usr/sbin/visudo -csf %s
```

## Duplicating Configuration for Multiple Instances

When running multiple instances of the same application, you can copy and adjust configurations:

```yaml
# Create configuration for multiple application instances
- name: Copy base config for each app instance
  ansible.builtin.copy:
    src: /etc/myapp/base.conf
    dest: "/etc/myapp/instance-{{ item }}.conf"
    remote_src: true
    owner: myapp
    group: myapp
    mode: "0644"
  loop:
    - "1"
    - "2"
    - "3"

# Then customize each instance config
- name: Set port for each instance
  ansible.builtin.lineinfile:
    path: "/etc/myapp/instance-{{ item.id }}.conf"
    regexp: "^PORT="
    line: "PORT={{ item.port }}"
  loop:
    - { id: "1", port: "8081" }
    - { id: "2", port: "8082" }
    - { id: "3", port: "8083" }
```

## Handling Large Files

For large files, `remote_src` is significantly faster than the default behavior because the file does not need to be transferred over the network. The copy happens entirely on the remote host:

```yaml
# Copy a large database dump locally on the remote host
- name: Duplicate database backup for archiving
  ansible.builtin.copy:
    src: /var/backups/postgresql/daily.sql.gz
    dest: /mnt/archive/postgresql/daily-{{ ansible_date_time.date }}.sql.gz
    remote_src: true
    owner: postgres
    group: postgres
    mode: "0640"
```

## Remote Copy vs Other Modules

There are some important limitations to know about:

The `copy` module with `remote_src` does not support the `content` parameter (that would not make sense since the content is already on the remote host). If you need to copy between different remote hosts, `copy` with `remote_src` will not work because it only operates within a single host. For cross-host copies, look at the `synchronize` module or `fetch` + `copy`.

```yaml
# This does NOT copy between two remote hosts - it only works within one host
# For cross-host operations, use fetch + copy or synchronize

# Fetch from remote host A
- name: Fetch file from web server
  ansible.builtin.fetch:
    src: /etc/myapp/config.yml
    dest: /tmp/fetched/
  delegate_to: webserver1

# Copy to remote host B
- name: Copy fetched file to database server
  ansible.builtin.copy:
    src: /tmp/fetched/webserver1/etc/myapp/config.yml
    dest: /etc/myapp/config.yml
  delegate_to: dbserver1
```

## Complete Example: Staging and Deploying Updates

Here is a practical workflow that downloads, stages, validates, and deploys an application update:

```yaml
# update-app.yml - staged deployment with remote copy
---
- name: Update application binary
  hosts: app_servers
  become: true

  tasks:
    - name: Download new binary to staging area
      ansible.builtin.get_url:
        url: "https://releases.example.com/myapp/{{ new_version }}/myapp-linux-amd64"
        dest: /opt/staging/myapp-new
        checksum: "sha256:{{ binary_checksum }}"
        mode: "0644"

    - name: Backup current binary
      ansible.builtin.copy:
        src: /usr/local/bin/myapp
        dest: "/usr/local/bin/myapp.{{ ansible_date_time.date }}.bak"
        remote_src: true
        owner: root
        group: root
        mode: "0755"
      ignore_errors: true  # OK if no current binary exists

    - name: Deploy new binary from staging
      ansible.builtin.copy:
        src: /opt/staging/myapp-new
        dest: /usr/local/bin/myapp
        remote_src: true
        owner: root
        group: root
        mode: "0755"
      notify: Restart myapp

    - name: Verify new binary works
      ansible.builtin.command:
        cmd: /usr/local/bin/myapp --version
      register: version_check
      changed_when: false

    - name: Show deployed version
      ansible.builtin.debug:
        msg: "Deployed version: {{ version_check.stdout }}"

    - name: Clean up staging area
      ansible.builtin.file:
        path: /opt/staging/myapp-new
        state: absent

  handlers:
    - name: Restart myapp
      ansible.builtin.systemd:
        name: myapp
        state: restarted
```

## Summary

The `remote_src` parameter transforms the `copy` module from a file transfer tool into a local file management tool on the remote host. It is essential for creating backups, duplicating configurations, distributing downloaded files, and staging deployments. The key things to remember are: always set `remote_src: true` when the source is on the remote host, the trailing slash behavior for directories still applies, permissions and ownership can be changed during the copy, and for cross-host file operations you need to use `fetch` + `copy` or the `synchronize` module instead.
