# How to Use Ansible rpm_key Module to Manage GPG Keys

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, RPM, GPG Keys, Linux, Package Management

Description: Learn how to use the Ansible rpm_key module to import, verify, and manage GPG keys for RPM package repositories on RHEL, CentOS, and Fedora systems.

---

If you have ever tried installing packages from a third-party repository on a RHEL-based system, you have probably run into the dreaded "GPG key not found" error. GPG keys are what the RPM package manager uses to verify that packages have not been tampered with and actually come from the repository maintainer. Managing these keys manually across dozens or hundreds of servers is tedious and error-prone. That is where the Ansible `rpm_key` module comes in.

## What Are RPM GPG Keys?

RPG GPG keys are cryptographic keys used by the RPM package manager to verify the authenticity of packages. When you add a new repository (say, the Docker CE repo or the Elasticsearch repo), you also need to import the repository maintainer's public GPG key. Without the key, `yum` or `dnf` will refuse to install packages or will prompt you interactively, which breaks automation.

The keys get stored in the RPM database, and you can list them with `rpm -qa gpg-pubkey*`. Each key has a fingerprint that uniquely identifies it.

## The rpm_key Module Basics

The `rpm_key` module has a straightforward interface. You provide a key source and a desired state. Here is the simplest possible usage, importing a GPG key from a URL.

```yaml
# Import the EPEL GPG key from the Fedora project
- name: Import EPEL GPG key
  ansible.builtin.rpm_key:
    key: https://dl.fedoraproject.org/pub/epel/RPM-GPG-KEY-EPEL-8
    state: present
```

The `key` parameter accepts several formats: a URL, a local file path on the remote host, or a key ID (for removal). The `state` parameter is either `present` (import the key) or `absent` (remove it).

## Importing Keys from Different Sources

In practice, GPG keys come from various places. Let me walk through the common scenarios.

### Importing from a URL

This is the most common approach, especially for well-known repositories.

```yaml
# Import GPG keys for common third-party repositories
- name: Import Docker CE repository GPG key
  ansible.builtin.rpm_key:
    key: https://download.docker.com/linux/centos/gpg
    state: present

- name: Import Kubernetes repository GPG key
  ansible.builtin.rpm_key:
    key: https://pkgs.k8s.io/core:/stable:/v1.29/rpm/repodata/repomd.xml.key
    state: present

- name: Import Elasticsearch GPG key
  ansible.builtin.rpm_key:
    key: https://artifacts.elastic.co/GPG-KEY-elasticsearch
    state: present
```

### Importing from a Local File

Sometimes you want to ship the GPG key as part of your Ansible role or pull it from an internal artifact server. You can copy the key to the remote host first, then import it.

```yaml
# Copy the GPG key file to the remote host, then import it
- name: Copy custom repository GPG key
  ansible.builtin.copy:
    src: files/MY-CUSTOM-REPO-GPG-KEY
    dest: /tmp/MY-CUSTOM-REPO-GPG-KEY
    mode: '0644'

- name: Import custom repository GPG key from local file
  ansible.builtin.rpm_key:
    key: /tmp/MY-CUSTOM-REPO-GPG-KEY
    state: present
```

### Importing from a Keyserver

If you have the key ID and want to pull from a keyserver, you can construct the URL manually.

```yaml
# Import a key by fetching from a keyserver using its ID
- name: Import GPG key from keyserver
  ansible.builtin.rpm_key:
    key: https://keyserver.ubuntu.com/pks/lookup?op=get&search=0xABCDEF1234567890
    state: present
```

## Removing GPG Keys

There are times when you need to remove a GPG key, for example, when decommissioning a repository or rotating keys. You reference the key by its short ID.

```yaml
# Remove a GPG key by its ID (find the ID with: rpm -qa gpg-pubkey*)
- name: Remove old repository GPG key
  ansible.builtin.rpm_key:
    key: DB4639719867C58F
    state: absent
```

To find the key ID, you can run `rpm -qa gpg-pubkey --qf '%{NAME}-%{VERSION}-%{RELEASE}\t%{SUMMARY}\n'` on any host that has the key imported.

## A Complete Playbook: Adding a Third-Party Repository

Let me put this all together in a real-world example. This playbook adds the Grafana repository to a RHEL 8 system, starting with the GPG key.

```yaml
---
# playbook: setup-grafana-repo.yml
# Adds the Grafana YUM repository with proper GPG key verification
- hosts: monitoring_servers
  become: true
  vars:
    grafana_gpg_key_url: "https://rpm.grafana.com/gpg.key"
    grafana_repo_url: "https://rpm.grafana.com"

  tasks:
    - name: Import Grafana GPG key
      ansible.builtin.rpm_key:
        key: "{{ grafana_gpg_key_url }}"
        state: present
        validate_certs: true

    - name: Add Grafana YUM repository
      ansible.builtin.yum_repository:
        name: grafana
        description: Grafana OSS Repository
        baseurl: "{{ grafana_repo_url }}"
        gpgcheck: true
        gpgkey: "{{ grafana_gpg_key_url }}"
        enabled: true

    - name: Install Grafana
      ansible.builtin.dnf:
        name: grafana
        state: present

    - name: Start and enable Grafana service
      ansible.builtin.systemd:
        name: grafana-server
        state: started
        enabled: true
```

## Validating Key Fingerprints

For security-sensitive environments, you might want to verify the key fingerprint after importing it. Here is a pattern that checks the fingerprint matches what you expect.

```yaml
# Verify that the imported GPG key matches the expected fingerprint
- name: Import the GPG key
  ansible.builtin.rpm_key:
    key: https://download.docker.com/linux/centos/gpg
    state: present

- name: Get list of imported GPG keys
  ansible.builtin.command:
    cmd: rpm -qa gpg-pubkey --qf '%{VERSION}-%{RELEASE}\t%{SUMMARY}\n'
  register: gpg_keys
  changed_when: false

- name: Verify Docker GPG key is present
  ansible.builtin.assert:
    that:
      - "'Docker' in gpg_keys.stdout"
    fail_msg: "Docker GPG key was not found in the RPM database"
    success_msg: "Docker GPG key verified successfully"
```

## Handling Certificate Validation

When pulling keys over HTTPS from internal servers with self-signed certificates, you might need to disable certificate validation. Use this sparingly and only in environments where you trust the network.

```yaml
# Import a key from an internal server with a self-signed certificate
- name: Import GPG key from internal repo (self-signed cert)
  ansible.builtin.rpm_key:
    key: https://internal-repo.company.local/gpg-key
    state: present
    validate_certs: false
```

## Idempotency Notes

The `rpm_key` module is idempotent, meaning running it multiple times will not cause errors or unnecessary changes. If the key is already imported, the module reports "ok" instead of "changed." This makes it safe to include in playbooks that run on a schedule.

One thing to watch out for: if you are importing a key from a URL, Ansible will download the key every time to compare it against what is already in the RPM database. If the remote server is slow or unreliable, this can add latency to your playbook runs. A workaround is to download the key once to a local file and reference that instead.

## Using rpm_key in Roles

When building reusable roles, it is a good practice to parameterize the GPG key URL and include the key import as one of the first tasks. Here is a snippet from a role that sets up a generic YUM repository.

```yaml
# roles/yum_repo/tasks/main.yml
# Generic role for adding a YUM repository with GPG key management
- name: Import repository GPG key
  ansible.builtin.rpm_key:
    key: "{{ repo_gpg_key }}"
    state: present
  when: repo_gpg_key is defined

- name: Add YUM repository
  ansible.builtin.yum_repository:
    name: "{{ repo_name }}"
    description: "{{ repo_description }}"
    baseurl: "{{ repo_baseurl }}"
    gpgcheck: "{{ repo_gpg_check | default(true) }}"
    gpgkey: "{{ repo_gpg_key | default(omit) }}"
    enabled: true
```

```yaml
# roles/yum_repo/defaults/main.yml
# Default values for the yum_repo role
repo_gpg_check: true
```

## Common Pitfalls

A few things I have run into over the years when managing GPG keys with Ansible:

1. **Key URL changes**: Repository maintainers sometimes move or update their GPG key URLs. Pin the URL in your variables and update it as part of your maintenance cycle.

2. **Expired keys**: GPG keys have expiration dates. When a key expires, package installations will fail. Monitor for this and update keys proactively.

3. **Firewall blocking**: If your servers cannot reach the key URL, the task will fail. Consider mirroring keys on an internal server.

4. **Key rotation**: When a repository rotates keys, you need to import the new key and optionally remove the old one. Build both operations into your playbook.

## Wrapping Up

The `rpm_key` module is a small but essential piece of any Ansible-based package management strategy for RHEL-based systems. It keeps your GPG key management automated, idempotent, and auditable. Combined with the `yum_repository` and `dnf` modules, you have a complete pipeline for managing third-party software repositories across your infrastructure. The key takeaway is to always import the GPG key before adding the repository, and to validate fingerprints in security-sensitive environments.
