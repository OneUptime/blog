# How to Use the Ansible uri Module to Download Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, File Download, uri Module, Automation

Description: Learn how to download files from URLs using the Ansible uri module and get_url module with checksums and authentication.

---

Downloading files from the internet or internal servers is a common task in infrastructure automation. Whether you need to grab release binaries, configuration files, certificates, or data dumps, Ansible provides several ways to fetch files over HTTP. While the `get_url` module is purpose-built for downloads, the `uri` module also handles file downloads and gives you more control over the request.

This post covers both approaches, with examples for authenticated downloads, checksum verification, conditional downloads, and handling large files.

## Basic File Download with get_url

The `get_url` module is the standard way to download files in Ansible:

```yaml
# download a file using get_url module
---
- name: Basic download examples
  hosts: all
  become: true
  tasks:
    - name: Download Node.js binary
      ansible.builtin.get_url:
        url: https://nodejs.org/dist/v20.11.0/node-v20.11.0-linux-x64.tar.xz
        dest: /tmp/node-v20.11.0-linux-x64.tar.xz
        mode: '0644'

    - name: Download with checksum verification
      ansible.builtin.get_url:
        url: https://releases.example.com/myapp-2.3.1.tar.gz
        dest: /opt/releases/myapp-2.3.1.tar.gz
        checksum: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
        mode: '0644'
```

The `checksum` parameter verifies the downloaded file against a known hash. If the hash does not match, the task fails and the corrupted file is removed.

## Downloading with the uri Module

The `uri` module can also download files using the `dest` parameter:

```yaml
# download a file using the uri module
- name: Download file with uri module
  ansible.builtin.uri:
    url: https://releases.example.com/myapp-2.3.1.tar.gz
    dest: /opt/releases/myapp-2.3.1.tar.gz
    status_code: 200
  register: download_result

- name: Show download details
  ansible.builtin.debug:
    msg:
      - "Status: {{ download_result.status }}"
      - "Content-Length: {{ download_result.content_length | default('unknown') }}"
```

The `uri` module with `dest` downloads the response body to the specified file. It is particularly useful when you need custom headers, authentication, or want to inspect response headers before the download.

## Authenticated Downloads

Many file downloads require authentication:

```yaml
# download files with various authentication methods
---
- name: Authenticated downloads
  hosts: all
  become: true
  tasks:
    # Download with bearer token (e.g., GitHub release asset)
    - name: Download GitHub release asset
      ansible.builtin.uri:
        url: "https://api.github.com/repos/{{ github_org }}/{{ repo }}/releases/assets/{{ asset_id }}"
        dest: "/opt/releases/{{ filename }}"
        headers:
          Authorization: "token {{ github_token }}"
          Accept: application/octet-stream
        status_code: 200
      vars:
        github_org: example
        repo: myapp
        asset_id: "12345678"
        filename: myapp-linux-amd64

    # Download with basic auth
    - name: Download from private Nexus repository
      ansible.builtin.get_url:
        url: https://nexus.internal/repository/releases/com/example/myapp/2.3.1/myapp-2.3.1.jar
        dest: /opt/myapp/myapp-2.3.1.jar
        url_username: "{{ vault_nexus_user }}"
        url_password: "{{ vault_nexus_pass }}"
        force_basic_auth: true
        mode: '0644'

    # Download with API key header
    - name: Download from artifact store
      ansible.builtin.uri:
        url: https://artifacts.internal/files/config-bundle.tar.gz
        dest: /tmp/config-bundle.tar.gz
        headers:
          X-API-Key: "{{ vault_artifact_api_key }}"
        status_code: 200
```

## Checksum Verification

Always verify downloads in production. Several checksum methods are supported:

```yaml
# verify downloaded files with checksums
---
- name: Downloads with checksum verification
  hosts: all
  become: true
  tasks:
    # Inline checksum
    - name: Download with SHA256 checksum
      ansible.builtin.get_url:
        url: https://releases.example.com/myapp-2.3.1.tar.gz
        dest: /opt/releases/myapp-2.3.1.tar.gz
        checksum: "sha256:abc123def456..."
        mode: '0644'

    # Checksum from URL (download checksum file first)
    - name: Download with checksum from URL
      ansible.builtin.get_url:
        url: https://releases.example.com/myapp-2.3.1.tar.gz
        dest: /opt/releases/myapp-2.3.1.tar.gz
        checksum: "sha256:https://releases.example.com/myapp-2.3.1.tar.gz.sha256"
        mode: '0644'

    # Manual checksum verification after uri download
    - name: Download file
      ansible.builtin.uri:
        url: https://releases.example.com/myapp-2.3.1.tar.gz
        dest: /tmp/myapp-2.3.1.tar.gz
        status_code: 200

    - name: Verify checksum manually
      ansible.builtin.stat:
        path: /tmp/myapp-2.3.1.tar.gz
        checksum_algorithm: sha256
      register: file_stat

    - name: Fail if checksum does not match
      ansible.builtin.fail:
        msg: "Checksum mismatch: expected {{ expected_checksum }}, got {{ file_stat.stat.checksum }}"
      when: file_stat.stat.checksum != expected_checksum
      vars:
        expected_checksum: "abc123def456..."
```

## Conditional Downloads (Only If Changed)

Avoid re-downloading files that have not changed:

```yaml
# skip download if file already exists and matches
---
- name: Conditional download
  hosts: all
  tasks:
    # get_url handles this automatically with force: false
    - name: Download only if file does not exist
      ansible.builtin.get_url:
        url: https://releases.example.com/myapp-2.3.1.tar.gz
        dest: /opt/releases/myapp-2.3.1.tar.gz
        force: false  # do not re-download if file exists
        mode: '0644'

    # Check headers before downloading with uri
    - name: Check file metadata first
      ansible.builtin.uri:
        url: https://releases.example.com/myapp-2.3.1.tar.gz
        method: HEAD
      register: file_info

    - name: Check if local file matches
      ansible.builtin.stat:
        path: /opt/releases/myapp-2.3.1.tar.gz
      register: local_file

    - name: Download only if size differs
      ansible.builtin.uri:
        url: https://releases.example.com/myapp-2.3.1.tar.gz
        dest: /opt/releases/myapp-2.3.1.tar.gz
        status_code: 200
      when: >
        not local_file.stat.exists or
        local_file.stat.size != (file_info.content_length | int)
```

## Downloading Multiple Files

Download a list of files using loops:

```yaml
# download multiple files in a loop
---
- name: Download multiple release artifacts
  hosts: all
  become: true
  vars:
    base_url: https://releases.example.com/v2.3.1
    artifacts:
      - name: myapp-linux-amd64
        checksum: "sha256:abc123..."
      - name: myapp-config-default.yaml
        checksum: "sha256:def456..."
      - name: myapp-migrations.sql
        checksum: "sha256:ghi789..."
  tasks:
    - name: Create release directory
      ansible.builtin.file:
        path: /opt/releases/v2.3.1
        state: directory
        mode: '0755'

    - name: Download all artifacts
      ansible.builtin.get_url:
        url: "{{ base_url }}/{{ item.name }}"
        dest: "/opt/releases/v2.3.1/{{ item.name }}"
        checksum: "{{ item.checksum }}"
        mode: '0644'
      loop: "{{ artifacts }}"
      register: downloads

    - name: Verify all downloads succeeded
      ansible.builtin.debug:
        msg: "Downloaded {{ item.item.name }}: {{ item.status_code | default('ok') }}"
      loop: "{{ downloads.results }}"
```

## Downloading and Extracting Archives

A common pattern is downloading an archive and extracting it:

```yaml
# download and extract an archive in one workflow
---
- name: Download and install application
  hosts: app_servers
  become: true
  vars:
    app_version: "2.3.1"
    download_url: "https://releases.example.com/myapp-{{ app_version }}.tar.gz"
    install_dir: /opt/myapp
  tasks:
    - name: Download release archive
      ansible.builtin.get_url:
        url: "{{ download_url }}"
        dest: "/tmp/myapp-{{ app_version }}.tar.gz"
        checksum: "sha256:{{ lookup('url', download_url + '.sha256') | split(' ') | first }}"
        mode: '0644'

    - name: Create install directory
      ansible.builtin.file:
        path: "{{ install_dir }}"
        state: directory
        mode: '0755'

    - name: Extract archive
      ansible.builtin.unarchive:
        src: "/tmp/myapp-{{ app_version }}.tar.gz"
        dest: "{{ install_dir }}"
        remote_src: true
        extra_opts:
          - "--strip-components=1"

    - name: Clean up downloaded archive
      ansible.builtin.file:
        path: "/tmp/myapp-{{ app_version }}.tar.gz"
        state: absent

    - name: Set permissions
      ansible.builtin.file:
        path: "{{ install_dir }}/bin/myapp"
        mode: '0755'
```

## Handling Download Failures

Add retry logic for unreliable connections:

```yaml
# retry downloads on failure
---
- name: Resilient download
  hosts: all
  tasks:
    - name: Download with retries
      ansible.builtin.get_url:
        url: https://releases.example.com/large-file.tar.gz
        dest: /tmp/large-file.tar.gz
        timeout: 120
        mode: '0644'
      retries: 3
      delay: 30
      register: download
      until: download is succeeded

    - name: Download from mirrors with fallback
      ansible.builtin.get_url:
        url: "{{ item }}"
        dest: /tmp/myapp.tar.gz
        mode: '0644'
      loop:
        - https://mirror1.example.com/myapp.tar.gz
        - https://mirror2.example.com/myapp.tar.gz
        - https://mirror3.example.com/myapp.tar.gz
      register: mirror_download
      until: mirror_download is succeeded
      retries: 1
      delay: 5
      # Stops on first successful download due to loop behavior
      ignore_errors: true
```

## Downloading to the Control Node

Sometimes you need to download a file locally before distributing it:

```yaml
# download to control node then distribute to managed hosts
---
- name: Download centrally and distribute
  hosts: all
  tasks:
    - name: Download artifact to control node
      ansible.builtin.get_url:
        url: https://releases.example.com/myapp-2.3.1.tar.gz
        dest: /tmp/myapp-2.3.1.tar.gz
        mode: '0644'
      delegate_to: localhost
      run_once: true

    - name: Distribute to all hosts
      ansible.builtin.copy:
        src: /tmp/myapp-2.3.1.tar.gz
        dest: /opt/releases/myapp-2.3.1.tar.gz
        mode: '0644'
```

This is more efficient than having every host download the same file from the internet.

## Summary

For file downloads in Ansible, `get_url` is the go-to module with built-in checksum verification and conditional download support. Use the `uri` module when you need custom headers, authentication patterns beyond basic auth, or want to inspect response headers before downloading. Always verify downloads with checksums in production. Use `force: false` to skip re-downloading unchanged files. For large files, add retry logic with `retries` and `until`. When distributing the same file to many hosts, download once to the control node and then use `copy` to push it out. This saves bandwidth and speeds up your playbook execution.
