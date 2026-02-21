# How to Use the Ansible yaml Callback Plugin for Readable Output

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, YAML, Output Formatting

Description: Learn how to use the Ansible yaml callback plugin to transform the default JSON output into human-readable YAML format for easier debugging.

---

Ansible's default output format dumps task results as single-line JSON. When a task returns a complex data structure with nested dictionaries and long strings, reading that JSON blob is a chore. The `yaml` callback plugin reformats all output as YAML with proper indentation and line breaks, making it dramatically easier to read. This post covers how to set it up, what it looks like, and why it should probably be your default.

## The Problem with Default Output

Here is what the default Ansible output looks like when gathering facts:

```
ok: [web-01] => {"ansible_facts": {"ansible_all_ipv4_addresses": ["10.0.1.50", "172.17.0.1"], "ansible_architecture": "x86_64", "ansible_bios_date": "12/01/2023", "ansible_bios_version": "1.15.0-1", "ansible_cmdline": {"BOOT_IMAGE": "/vmlinuz-5.15.0-91-generic", "ro": true, "root": "UUID=abc-123"}}, "changed": false}
```

Everything is on one line. Good luck finding a specific value in there.

## Enabling the yaml Callback

### Via ansible.cfg (recommended)

```ini
# ansible.cfg
[defaults]
stdout_callback = yaml
```

### Via Environment Variable

```bash
# For a single run
ANSIBLE_STDOUT_CALLBACK=yaml ansible-playbook deploy.yml

# For the session
export ANSIBLE_STDOUT_CALLBACK=yaml
```

## What YAML Output Looks Like

With the yaml callback enabled, the same fact-gathering output becomes:

```yaml
ok: [web-01] =>
  ansible_facts:
    ansible_all_ipv4_addresses:
      - 10.0.1.50
      - 172.17.0.1
    ansible_architecture: x86_64
    ansible_bios_date: 12/01/2023
    ansible_bios_version: 1.15.0-1
    ansible_cmdline:
      BOOT_IMAGE: /vmlinuz-5.15.0-91-generic
      ro: true
      root: UUID=abc-123
  changed: false
```

Every key is on its own line, lists are properly formatted with dashes, and nested structures are indented. You can scan this in seconds.

## Comparing Output for Common Tasks

### Template Task

Default:

```
changed: [web-01] => {"changed": true, "checksum": "abc123def456", "dest": "/etc/nginx/nginx.conf", "gid": 0, "group": "root", "md5sum": "789xyz", "mode": "0644", "owner": "root", "size": 2048, "src": "/home/deploy/.ansible/tmp/source", "state": "file", "uid": 0}
```

YAML callback:

```yaml
changed: [web-01] =>
  changed: true
  checksum: abc123def456
  dest: /etc/nginx/nginx.conf
  gid: 0
  group: root
  md5sum: 789xyz
  mode: '0644'
  owner: root
  size: 2048
  src: /home/deploy/.ansible/tmp/source
  state: file
  uid: 0
```

### Command Task with Multi-line Output

Default:

```
ok: [web-01] => {"changed": false, "cmd": ["df", "-h"], "delta": "0:00:00.003", "end": "2026-02-21 10:15:22", "rc": 0, "start": "2026-02-21 10:15:22", "stderr": "", "stdout": "Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        50G   12G   35G  26% /\ntmpfs           3.9G     0  3.9G   0% /dev/shm\n/dev/sdb1       100G   45G   50G  48% /data", "stdout_lines": ["Filesystem      Size  Used Avail Use% Mounted on", "/dev/sda1        50G   12G   35G  26% /", "tmpfs           3.9G     0  3.9G   0% /dev/shm", "/dev/sdb1       100G   45G   50G  48% /data"]}
```

YAML callback:

```yaml
ok: [web-01] =>
  changed: false
  cmd:
    - df
    - -h
  delta: '0:00:00.003'
  end: '2026-02-21 10:15:22'
  rc: 0
  start: '2026-02-21 10:15:22'
  stderr: ''
  stdout: |-
    Filesystem      Size  Used Avail Use% Mounted on
    /dev/sda1        50G   12G   35G  26% /
    tmpfs           3.9G     0  3.9G   0% /dev/shm
    /dev/sdb1       100G   45G   50G  48% /data
  stdout_lines:
    - Filesystem      Size  Used Avail Use% Mounted on
    - /dev/sda1        50G   12G   35G  26% /
    - tmpfs           3.9G     0  3.9G   0% /dev/shm
    - /dev/sdb1       100G   45G   50G  48% /data
```

The `stdout` field is rendered as a proper multi-line block with `|-` notation. This is where the yaml callback really stands out.

### Debug Module Output

Default:

```
ok: [web-01] => {"msg": "Server web-01 is running Ubuntu 22.04 with 8192MB RAM and 4 CPUs"}
```

YAML callback:

```yaml
ok: [web-01] =>
  msg: Server web-01 is running Ubuntu 22.04 with 8192MB RAM and 4 CPUs
```

### Failed Task Output

Default:

```
fatal: [web-01]: FAILED! => {"changed": false, "msg": "Unable to start service nginx: Job for nginx.service failed because the control process exited with error code.\nSee \"systemctl status nginx.service\" and \"journalctl -xe\" for details.\n", "name": "nginx", "state": "started"}
```

YAML callback:

```yaml
fatal: [web-01]: FAILED! =>
  changed: false
  msg: |-
    Unable to start service nginx: Job for nginx.service failed because the control process exited with error code.
    See "systemctl status nginx.service" and "journalctl -xe" for details.
  name: nginx
  state: started
```

Multi-line error messages are formatted properly, making it much easier to read the actual error.

## Combining yaml with Other Callback Plugins

The yaml callback handles stdout formatting. You can enable additional non-stdout plugins alongside it:

```ini
# ansible.cfg
[defaults]
stdout_callback = yaml
callbacks_enabled = timer, profile_tasks
```

This gives you YAML-formatted output plus timing information at the end of the run:

```yaml
TASK [Install packages] *******************************************************
ok: [web-01] =>
  changed: false
  msg: All packages are already installed

Wednesday 21 February 2026  10:15:00 +0000 (0:00:45.234) 0:02:34.567 *********
===============================================================================
Install packages ------------------------------------------------------ 45.23s
Deploy configuration -------------------------------------------------- 12.34s
```

## Combining yaml with --diff

The yaml callback works well with `--diff` mode:

```bash
ansible-playbook configure.yml --diff
```

Output:

```yaml
TASK [Deploy nginx config] ****************************************************
--- before: /etc/nginx/nginx.conf
+++ after: /home/deploy/.ansible/tmp/source
@@ -10,7 +10,7 @@
     server {
         listen 80;
-        server_name old.example.com;
+        server_name new.example.com;
     }

changed: [web-01] =>
  changed: true
  dest: /etc/nginx/nginx.conf
```

The diff appears above the task result, both formatted clearly.

## Using yaml with Verbose Flags

The yaml callback also improves the readability of verbose output:

```bash
ansible-playbook deploy.yml -v
```

At verbosity level 1 with the yaml callback:

```yaml
TASK [Install nginx] **********************************************************
changed: [web-01] =>
  cache_update_time: 1708534200
  cache_updated: false
  changed: true
  stderr: ''
  stdout: |-
    Reading package lists...
    Building dependency tree...
    The following NEW packages will be installed:
      nginx nginx-common nginx-core
    0 upgraded, 3 newly installed, 0 to remove and 0 not upgraded.
```

Compare this to the default callback, which would cram all of that onto two or three lines of JSON.

## Practical Example: Debugging with yaml Callback

Here is a debugging playbook that produces significantly better output with the yaml callback:

```yaml
---
- name: System health check
  hosts: all
  gather_facts: true

  tasks:
    - name: Show system summary
      ansible.builtin.debug:
        msg:
          hostname: "{{ ansible_hostname }}"
          os: "{{ ansible_distribution }} {{ ansible_distribution_version }}"
          kernel: "{{ ansible_kernel }}"
          cpus: "{{ ansible_processor_vcpus }}"
          memory_mb: "{{ ansible_memtotal_mb }}"
          memory_free_mb: "{{ ansible_memfree_mb }}"
          default_ip: "{{ ansible_default_ipv4.address }}"

    - name: Check disk usage
      ansible.builtin.command:
        cmd: df -h --output=target,pcent,avail
      register: disk_info
      changed_when: false

    - name: Show disk info
      ansible.builtin.debug:
        var: disk_info.stdout_lines

    - name: Check running services
      ansible.builtin.command:
        cmd: systemctl list-units --type=service --state=running --no-pager --no-legend
      register: services
      changed_when: false

    - name: Count running services
      ansible.builtin.debug:
        msg: "{{ services.stdout_lines | length }} services running on {{ inventory_hostname }}"
```

With the yaml callback, the output is clean and scannable:

```yaml
TASK [Show system summary] ****************************************************
ok: [web-01] =>
  msg:
    cpus: '4'
    default_ip: 10.0.1.50
    hostname: web-01
    kernel: 5.15.0-91-generic
    memory_free_mb: '4521'
    memory_mb: '8192'
    os: Ubuntu 22.04

TASK [Show disk info] *********************************************************
ok: [web-01] =>
  disk_info.stdout_lines:
    - 'Mounted on  Use% Avail'
    - '/            26%   35G'
    - '/data         48%   50G'
    - '/boot         15%  700M'
```

## Performance Considerations

The yaml callback adds minimal overhead. It reformats data on the controller side after each task completes, which takes negligible time compared to actual task execution. Even on large playbook runs with hundreds of hosts, the formatting overhead is not measurable.

The only consideration is log file size. YAML output uses more lines than single-line JSON, so log files will be larger. If you are storing logs, this is worth keeping in mind, but for interactive use it is purely a benefit.

## Making yaml Your Default

I recommend making the yaml callback your default for interactive work. Add this to your global or project-level ansible.cfg:

```ini
# ansible.cfg
[defaults]
stdout_callback = yaml

# Additional recommended settings
callbacks_enabled = timer, profile_tasks
display_skipped_hosts = false
```

When you need compact output (large-scale operations), override with:

```bash
ANSIBLE_STDOUT_CALLBACK=dense ansible-playbook large-scale-patch.yml
```

When you need machine-readable output (CI/CD):

```bash
ANSIBLE_STDOUT_CALLBACK=json ansible-playbook deploy.yml > results.json
```

## Summary

The yaml callback plugin is the single most impactful change you can make to your Ansible workflow. It transforms unreadable single-line JSON into properly indented, multi-line YAML that you can actually read. Multi-line strings (stdout, error messages) are rendered as block scalars instead of escaped newlines. Lists are formatted with dashes. Nested structures are indented. Enable it in ansible.cfg, pair it with `timer` and `profile_tasks`, and never squint at a JSON blob again.
