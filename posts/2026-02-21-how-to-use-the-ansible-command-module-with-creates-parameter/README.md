# How to Use the Ansible command Module with creates Parameter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Command Module, Idempotency, Automation

Description: Learn how to use the creates parameter with Ansible command module to make your tasks idempotent by skipping execution when a file already exists.

---

Idempotency is the whole point of configuration management. You should be able to run your playbook ten times and get the same result as running it once. The `command` and `shell` modules are inherently not idempotent because they just execute whatever you tell them. But the `creates` parameter changes that by giving Ansible a way to check if the work has already been done.

## What the creates Parameter Does

The `creates` parameter tells Ansible: "Before running this command, check if this file or directory exists. If it does, skip the task entirely." The task will show as `ok` (green) instead of `changed` (yellow) when skipped.

This is perfect for commands that produce a file or directory as their output, like compilation, extraction, initialization scripts, or any one-time setup command.

## Basic Usage

Here is the simplest example. If the binary already exists, do not compile again.

```yaml
# basic_creates.yml - Skip command if output file exists
---
- name: Compile application only if binary is missing
  hosts: all
  become: yes

  tasks:
    - name: Compile the application
      ansible.builtin.command:
        cmd: make install
        chdir: /opt/myapp/src
        creates: /usr/local/bin/myapp
```

If `/usr/local/bin/myapp` exists, Ansible skips the `make install` entirely. This saves time and avoids unnecessary recompilation.

## Initialization Scripts

Many applications have one-time initialization scripts. The `creates` parameter is perfect for these.

```yaml
# init_scripts.yml - Run initialization only once
---
- name: One-time application initialization
  hosts: all
  become: yes

  tasks:
    - name: Initialize the database
      ansible.builtin.command:
        cmd: /opt/myapp/bin/init-db --setup
        creates: /var/lib/myapp/db/initialized.flag

    - name: Run database migrations
      ansible.builtin.command:
        cmd: /opt/myapp/bin/migrate --apply-all
        creates: /var/lib/myapp/db/migrations.done

    - name: Generate SSL certificates
      ansible.builtin.command:
        cmd: /opt/myapp/bin/generate-certs
        creates: /etc/myapp/ssl/server.crt
```

In these examples, the commands themselves create the files. The database initialization creates a flag file, and the cert generation creates the certificate file.

## Using creates with Archive Extraction

Extracting archives is a common use case where you only want to do it once.

```yaml
# extract_archives.yml - Extract only if destination does not exist
---
- name: Extract application archives
  hosts: all
  become: yes

  tasks:
    - name: Download application tarball
      ansible.builtin.get_url:
        url: "https://releases.example.com/myapp-{{ app_version }}.tar.gz"
        dest: "/tmp/myapp-{{ app_version }}.tar.gz"

    - name: Extract application
      ansible.builtin.command:
        cmd: "tar xzf /tmp/myapp-{{ app_version }}.tar.gz -C /opt/"
        creates: "/opt/myapp-{{ app_version }}"

    - name: Create version symlink
      ansible.builtin.file:
        src: "/opt/myapp-{{ app_version }}"
        dest: /opt/myapp
        state: link
```

The `creates` parameter points to the directory that the tarball creates when extracted. If it already exists, extraction is skipped.

## Using creates with Package Compilation

Building software from source is time-consuming. You definitely want to skip it if the output already exists.

```yaml
# compile_from_source.yml - Build only if binary is missing
---
- name: Build nginx from source with custom modules
  hosts: all
  become: yes

  vars:
    nginx_version: "1.24.0"

  tasks:
    - name: Install build dependencies
      ansible.builtin.apt:
        name:
          - build-essential
          - libpcre3-dev
          - zlib1g-dev
          - libssl-dev
        state: present

    - name: Download nginx source
      ansible.builtin.get_url:
        url: "https://nginx.org/download/nginx-{{ nginx_version }}.tar.gz"
        dest: "/tmp/nginx-{{ nginx_version }}.tar.gz"

    - name: Extract nginx source
      ansible.builtin.command:
        cmd: "tar xzf /tmp/nginx-{{ nginx_version }}.tar.gz -C /usr/local/src/"
        creates: "/usr/local/src/nginx-{{ nginx_version }}"

    - name: Configure nginx build
      ansible.builtin.command:
        cmd: "./configure --prefix=/opt/nginx --with-http_ssl_module --with-http_v2_module"
        chdir: "/usr/local/src/nginx-{{ nginx_version }}"
        creates: "/usr/local/src/nginx-{{ nginx_version }}/Makefile"

    - name: Compile nginx
      ansible.builtin.command:
        cmd: "make -j{{ ansible_processor_vcpus }}"
        chdir: "/usr/local/src/nginx-{{ nginx_version }}"
        creates: "/usr/local/src/nginx-{{ nginx_version }}/objs/nginx"

    - name: Install nginx
      ansible.builtin.command:
        cmd: make install
        chdir: "/usr/local/src/nginx-{{ nginx_version }}"
        creates: /opt/nginx/sbin/nginx
```

Each step checks for its output file before running. This means if the playbook fails midway (say, during compilation), re-running it will skip the steps that already completed.

## Using creates with Directory Paths

The `creates` parameter works with both files and directories.

```yaml
# directory_creates.yml - Check for directory existence
---
- name: One-time directory setup
  hosts: all
  become: yes

  tasks:
    - name: Clone application repository
      ansible.builtin.command:
        cmd: "git clone https://github.com/example/myapp.git /opt/myapp"
        creates: /opt/myapp/.git

    - name: Initialize virtual environment
      ansible.builtin.command:
        cmd: "python3 -m venv /opt/myapp/venv"
        creates: /opt/myapp/venv/bin/activate

    - name: Install Python dependencies
      ansible.builtin.command:
        cmd: "/opt/myapp/venv/bin/pip install -r /opt/myapp/requirements.txt"
        creates: /opt/myapp/venv/lib/python3.11/site-packages/flask
```

## Creating Flag Files

Sometimes the command does not produce a specific file. In those cases, create a flag file yourself to track completion.

```yaml
# flag_files.yml - Use flag files for commands without file output
---
- name: Track completion with flag files
  hosts: all
  become: yes

  tasks:
    - name: Run complex initialization that has no file output
      ansible.builtin.shell: |
        set -e
        /opt/myapp/bin/setup-queues
        /opt/myapp/bin/setup-topics
        /opt/myapp/bin/setup-routing
        touch /var/lib/myapp/.messaging_initialized
      args:
        creates: /var/lib/myapp/.messaging_initialized

    - name: Seed the database
      ansible.builtin.shell: |
        set -e
        /opt/myapp/bin/seed-data --environment production
        touch /var/lib/myapp/.data_seeded
      args:
        creates: /var/lib/myapp/.data_seeded
```

The `touch` at the end of each script block creates the flag file after all commands succeed. If any command fails (thanks to `set -e`), the flag file is not created and the task will re-run next time.

## Version-Aware creates

You can include version numbers in the creates path to re-run commands when the version changes.

```yaml
# version_creates.yml - Re-run when version changes
---
- name: Version-aware creates parameter
  hosts: all
  become: yes

  vars:
    app_version: "2.5.1"

  tasks:
    - name: Install application binary
      ansible.builtin.command:
        cmd: "/tmp/myapp-{{ app_version }}-installer.sh --prefix=/opt/myapp"
        creates: "/opt/myapp/version-{{ app_version }}.installed"

    - name: Mark version as installed
      ansible.builtin.copy:
        content: "{{ app_version }} installed on {{ ansible_date_time.iso8601 }}"
        dest: "/opt/myapp/version-{{ app_version }}.installed"
```

When `app_version` changes to `2.6.0`, the creates path changes too, so the installer runs again.

## Combining creates with Other Parameters

The `creates` parameter works alongside `chdir`, `removes`, and other command module parameters.

```yaml
# combined_parameters.yml - creates with chdir and environment
---
- name: Combined parameter usage
  hosts: all
  become: yes

  tasks:
    - name: Build Go application
      ansible.builtin.command:
        cmd: go build -o /usr/local/bin/myservice ./cmd/myservice
        chdir: /opt/myservice/src
        creates: /usr/local/bin/myservice
      environment:
        GOPATH: /opt/go
        CGO_ENABLED: "0"

    - name: Generate configuration from template
      ansible.builtin.command:
        cmd: "confd -onetime -backend env"
        chdir: /opt/myservice
        creates: /etc/myservice/config.toml
      environment:
        DB_HOST: "{{ db_host }}"
        DB_PORT: "{{ db_port }}"
```

## When Not to Use creates

The `creates` parameter is not always the right choice. Do not use it when:

- The file might exist but be outdated (use `stat` module and conditional instead)
- The command should always run regardless of file existence (use `changed_when` instead)
- You need more complex conditions (use `when` with registered variables)

```yaml
# alternatives.yml - When creates is not enough
---
- name: Cases where creates is insufficient
  hosts: all
  become: yes

  tasks:
    - name: Check file age before deciding
      ansible.builtin.stat:
        path: /opt/myapp/data/cache.db
      register: cache_stat

    - name: Rebuild cache if older than 1 day
      ansible.builtin.command:
        cmd: /opt/myapp/bin/rebuild-cache
      when: not cache_stat.stat.exists or (ansible_date_time.epoch | int - cache_stat.stat.mtime) > 86400
```

## Summary

The `creates` parameter transforms the `command` and `shell` modules from fire-and-forget executors into idempotent tasks. Point it at the file or directory that the command produces, and Ansible will skip the task on subsequent runs. For commands that do not produce files, create flag files with `touch` at the end of your script. Include version numbers in the path when you need re-execution on version bumps. It is a simple parameter with a big impact on making your playbooks safe to run repeatedly.
