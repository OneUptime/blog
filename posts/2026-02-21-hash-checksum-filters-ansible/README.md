# How to Use the hash and checksum Filters in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Filters, Security, Hashing

Description: Learn how to use the hash and checksum filters in Ansible to generate hashes and verify file integrity in your automation.

---

Hashing is a fundamental operation in infrastructure automation. You need it for verifying file integrity, generating unique identifiers, creating cache keys, validating downloads, and producing deterministic names from variable inputs. Ansible provides the `hash` filter for generating cryptographic hashes and the `checksum` filter as a convenient shortcut for SHA-1 hashing.

## The hash Filter

The `hash` filter computes a hash of a string using the specified algorithm:

```jinja2
{# Generate an MD5 hash #}
{{ "Hello, World!" | hash('md5') }}
{# Output: 65a8e27d8879283831b664bd8b7f0ad4 #}

{# Generate a SHA-1 hash #}
{{ "Hello, World!" | hash('sha1') }}
{# Output: 943a702d06f34599aee1f8da8ef9f7296031d699 #}

{# Generate a SHA-256 hash #}
{{ "Hello, World!" | hash('sha256') }}
{# Output: dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f #}

{# Generate a SHA-512 hash #}
{{ "Hello, World!" | hash('sha512') }}
```

## The checksum Filter

The `checksum` filter is a shortcut that produces a SHA-1 hash:

```jinja2
{# checksum is equivalent to hash('sha1') #}
{{ "Hello, World!" | checksum }}
{# Output: 943a702d06f34599aee1f8da8ef9f7296031d699 #}
```

## Practical Example: Generating Unique Resource Names

When deploying multiple environments or tenants, you often need unique but deterministic names. Hashing gives you that:

```yaml
# unique_names.yml - Generate unique resource names from inputs
- name: Deploy tenant infrastructure
  hosts: localhost
  vars:
    tenant_name: "acme-corp"
    environment: "production"
  tasks:
    - name: Generate unique identifiers
      ansible.builtin.set_fact:
        # Short hash for resource naming (first 8 chars of SHA-256)
        resource_suffix: "{{ (tenant_name ~ '-' ~ environment) | hash('sha256') | truncate(8, true, '') }}"
        # Full hash for tracking
        deployment_id: "{{ (tenant_name ~ '-' ~ environment ~ '-' ~ ansible_date_time.epoch) | hash('sha256') }}"

    - name: Display generated names
      ansible.builtin.debug:
        msg: |
          Resource suffix: {{ resource_suffix }}
          Deployment ID: {{ deployment_id }}
          Bucket name: {{ tenant_name }}-{{ resource_suffix }}
```

## Verifying File Downloads

After downloading a file, you should verify its integrity against a known checksum:

```yaml
# verify_download.yml - Download and verify file integrity
- name: Download and verify application binary
  hosts: app_servers
  vars:
    app_url: "https://releases.example.com/myapp/v2.1.0/myapp-linux-amd64.tar.gz"
    app_sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  tasks:
    - name: Download application binary
      ansible.builtin.get_url:
        url: "{{ app_url }}"
        dest: /tmp/myapp.tar.gz
        checksum: "sha256:{{ app_sha256 }}"
      # The get_url module has built-in checksum verification

    - name: Alternative manual verification
      ansible.builtin.stat:
        path: /tmp/myapp.tar.gz
        checksum_algorithm: sha256
      register: file_stat

    - name: Verify checksum matches
      ansible.builtin.assert:
        that:
          - file_stat.stat.checksum == app_sha256
        fail_msg: "Checksum mismatch! Expected {{ app_sha256 }}, got {{ file_stat.stat.checksum }}"
        success_msg: "Checksum verified successfully"
```

## Generating Cache Keys

Hashing is useful for creating cache keys from complex inputs:

```yaml
# cache_keys.yml - Generate deterministic cache keys
- name: Build and cache application
  hosts: build_servers
  vars:
    app_dependencies:
      - "express@4.18.0"
      - "pg@8.11.0"
      - "redis@4.6.0"
  tasks:
    - name: Generate cache key from dependencies
      ansible.builtin.set_fact:
        deps_cache_key: "deps-{{ app_dependencies | sort | join(',') | hash('sha256') | truncate(16, true, '') }}"

    - name: Check if cached dependencies exist
      ansible.builtin.stat:
        path: "/cache/{{ deps_cache_key }}.tar.gz"
      register: cache_check

    - name: Use cached dependencies if available
      ansible.builtin.unarchive:
        src: "/cache/{{ deps_cache_key }}.tar.gz"
        dest: /opt/myapp/node_modules
        remote_src: true
      when: cache_check.stat.exists
```

## Template Example: Configuration Change Detection

Use hashing to detect when configuration content changes:

```yaml
# config_tracking.yml - Track configuration changes via hashes
- name: Track configuration state
  hosts: app_servers
  vars:
    app_config:
      port: 8080
      workers: 4
      log_level: "info"
  tasks:
    - name: Generate config hash
      ansible.builtin.set_fact:
        config_hash: "{{ app_config | to_json(sort_keys=true) | hash('sha256') }}"

    - name: Read previous config hash
      ansible.builtin.slurp:
        src: /etc/myapp/.config_hash
      register: prev_hash_raw
      failed_when: false

    - name: Check if config changed
      ansible.builtin.set_fact:
        config_changed: "{{ prev_hash_raw is failed or (prev_hash_raw.content | b64decode | trim) != config_hash }}"

    - name: Write new configuration
      ansible.builtin.copy:
        content: "{{ app_config | to_nice_yaml(indent=2) }}"
        dest: /etc/myapp/config.yml
      when: config_changed | bool

    - name: Update config hash
      ansible.builtin.copy:
        content: "{{ config_hash }}"
        dest: /etc/myapp/.config_hash
      when: config_changed | bool
```

## Generating ETags for Templates

Web servers use ETags for caching. You can generate them from file content:

```jinja2
{# nginx_etag.conf.j2 - Generate ETag from static content hash #}
{% set config_content = lookup('template', 'app_config.json.j2') %}
{% set etag = config_content | hash('md5') %}

location /config.json {
    add_header ETag "{{ etag }}";
    add_header Cache-Control "public, max-age=3600";
    root /var/www/static;
}
```

## Comparing Hashing Algorithms

Here is a quick reference of available algorithms and when to use them:

| Algorithm | Output Length | Speed | Use Case |
|-----------|-------------|-------|----------|
| md5 | 32 chars | Fast | Cache keys, non-security checksums |
| sha1 | 40 chars | Fast | File identification, git-like hashing |
| sha256 | 64 chars | Medium | File verification, security-sensitive hashing |
| sha512 | 128 chars | Slower | High-security applications |

In Ansible templates:

```jinja2
{# Different hash lengths for different purposes #}
MD5:    {{ data | hash('md5') }}
SHA1:   {{ data | hash('sha1') }}
SHA256: {{ data | hash('sha256') }}
SHA512: {{ data | hash('sha512') }}
```

## Using hash for Consistent Load Balancing

Generate consistent hashes for distributing work across servers:

```yaml
# consistent_hash.yml - Assign tasks based on hash
- name: Assign tenants to database shards
  hosts: localhost
  vars:
    db_shards: 4
    tenants:
      - "acme-corp"
      - "globex"
      - "initech"
      - "umbrella"
      - "wayne-ent"
  tasks:
    - name: Calculate shard assignment for each tenant
      ansible.builtin.debug:
        msg: "Tenant {{ item }} -> Shard {{ (item | hash('md5') | int(0, 16)) % db_shards }}"
      loop: "{{ tenants }}"
```

## File Integrity Monitoring

Build a simple file integrity monitoring system:

```yaml
# integrity_check.yml - Monitor file integrity
- name: Check file integrity
  hosts: all
  vars:
    monitored_files:
      - /etc/ssh/sshd_config
      - /etc/passwd
      - /etc/sudoers
      - /etc/hosts
  tasks:
    - name: Get current file checksums
      ansible.builtin.stat:
        path: "{{ item }}"
        checksum_algorithm: sha256
      loop: "{{ monitored_files }}"
      register: current_checksums

    - name: Read stored baselines
      ansible.builtin.slurp:
        src: /var/lib/integrity/baselines.yml
      register: baselines_raw
      failed_when: false

    - name: Parse baselines
      ansible.builtin.set_fact:
        baselines: "{{ (baselines_raw.content | b64decode | from_yaml) if baselines_raw is not failed else {} }}"

    - name: Check for modifications
      ansible.builtin.debug:
        msg: "ALERT: {{ item.item }} has been modified!"
      loop: "{{ current_checksums.results }}"
      when:
        - item.item in baselines
        - item.stat.checksum != baselines[item.item]

    - name: Store current baselines
      ansible.builtin.copy:
        content: |
          {{ dict(current_checksums.results | map(attribute='item') | zip(current_checksums.results | map(attribute='stat.checksum'))) | to_nice_yaml }}
        dest: /var/lib/integrity/baselines.yml
        mode: "0600"
```

## Hashing in Jinja2 Templates

Use hashing directly in templates for various purposes:

```jinja2
{# config_with_hashes.conf.j2 - Configuration file with hash-based values #}
# Application configuration
app_name = {{ app_name }}

# Session secret derived from a master key (deterministic per environment)
session_secret = {{ (master_secret ~ '-session-' ~ environment) | hash('sha256') }}

# CSRF token salt
csrf_salt = {{ (master_secret ~ '-csrf-' ~ environment) | hash('sha256') | truncate(32, true, '') }}

# Internal API key (derived from master secret)
internal_api_key = {{ (master_secret ~ '-api-' ~ environment) | hash('sha512') | truncate(64, true, '') }}
```

## Wrapping Up

The `hash` and `checksum` filters give you straightforward access to cryptographic hashing in Ansible. Use them for file integrity verification, unique identifier generation, cache key computation, deterministic resource naming, and configuration change detection. The `hash` filter supports multiple algorithms (md5, sha1, sha256, sha512), while `checksum` is a convenient shortcut for sha1. Choose the algorithm based on your security requirements and the desired hash length.
