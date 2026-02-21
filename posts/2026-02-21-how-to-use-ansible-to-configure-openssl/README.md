# How to Use Ansible to Configure OpenSSL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, OpenSSL, Security, TLS, Automation

Description: Learn how to automate OpenSSL configuration across your infrastructure using Ansible playbooks for consistent TLS and certificate management.

---

OpenSSL is one of those things that every server needs but nobody wants to configure by hand across dozens of machines. I have spent too many hours SSH-ing into servers one at a time to update cipher suites or regenerate certificates. Ansible makes this entire process repeatable and auditable, which is exactly what you want when dealing with cryptographic configurations.

In this post, I will walk through how to use Ansible to install, configure, and manage OpenSSL across your fleet. We will cover everything from basic installation to generating certificates, configuring cipher suites, and ensuring your OpenSSL configuration stays consistent.

## Why Automate OpenSSL Configuration?

Manual OpenSSL configuration is error-prone. A single typo in a cipher string can leave your server vulnerable, or worse, completely break TLS connections. When you manage tens or hundreds of servers, you need a way to push consistent configurations everywhere at once. Ansible gives you that, plus the ability to roll back if something goes wrong.

## Installing OpenSSL with Ansible

Let's start with a simple playbook that ensures OpenSSL is installed and up to date on your target hosts.

This playbook installs OpenSSL and the development libraries on both Debian and RedHat-based systems:

```yaml
# install_openssl.yml - Ensures OpenSSL is installed on all target hosts
---
- name: Install and configure OpenSSL
  hosts: all
  become: true

  tasks:
    - name: Install OpenSSL on Debian/Ubuntu
      ansible.builtin.apt:
        name:
          - openssl
          - libssl-dev
        state: latest
        update_cache: true
      when: ansible_os_family == "Debian"

    - name: Install OpenSSL on RHEL/CentOS
      ansible.builtin.yum:
        name:
          - openssl
          - openssl-devel
        state: latest
      when: ansible_os_family == "RedHat"

    - name: Verify OpenSSL version
      ansible.builtin.command: openssl version
      register: openssl_version
      changed_when: false

    - name: Display OpenSSL version
      ansible.builtin.debug:
        msg: "OpenSSL version: {{ openssl_version.stdout }}"
```

## Configuring the OpenSSL Configuration File

The main OpenSSL configuration file (`openssl.cnf`) controls default behaviors for certificate generation, cipher preferences, and more. Here is a playbook that deploys a hardened configuration.

This template sets strong defaults for certificate requests and restricts weak algorithms:

```yaml
# configure_openssl.yml - Deploy hardened openssl.cnf
---
- name: Configure OpenSSL settings
  hosts: all
  become: true

  vars:
    openssl_conf_path: /etc/ssl/openssl.cnf
    default_bits: 4096
    default_md: sha256
    min_protocol: TLSv1.2
    cipher_string: "HIGH:!aNULL:!MD5:!3DES:!RC4:!DES"

  tasks:
    - name: Backup existing OpenSSL config
      ansible.builtin.copy:
        src: "{{ openssl_conf_path }}"
        dest: "{{ openssl_conf_path }}.bak.{{ ansible_date_time.iso8601_basic_short }}"
        remote_src: true
        mode: '0644'

    - name: Deploy hardened OpenSSL configuration
      ansible.builtin.template:
        src: templates/openssl.cnf.j2
        dest: "{{ openssl_conf_path }}"
        owner: root
        group: root
        mode: '0644'
        backup: true
      notify: verify openssl config

  handlers:
    - name: verify openssl config
      ansible.builtin.command: openssl version -a
      changed_when: false
```

And the corresponding Jinja2 template for the configuration file:

```ini
# templates/openssl.cnf.j2 - Hardened OpenSSL configuration
# Managed by Ansible - do not edit manually

[default]
openssl_conf = default_conf

[default_conf]
ssl_conf = ssl_sect

[ssl_sect]
system_default = system_default_sect

[system_default_sect]
MinProtocol = {{ min_protocol }}
CipherString = {{ cipher_string }}

[req]
default_bits = {{ default_bits }}
default_md = {{ default_md }}
distinguished_name = req_distinguished_name
x509_extensions = v3_ca
string_mask = utf8only

[req_distinguished_name]
countryName = Country Name (2 letter code)
stateOrProvinceName = State or Province Name
localityName = Locality Name
organizationName = Organization Name
commonName = Common Name

[v3_ca]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
basicConstraints = critical, CA:true
keyUsage = critical, digitalSignature, cRLSign, keyCertSign
```

## Generating Self-Signed Certificates

For internal services, you often need self-signed certificates. This playbook generates them consistently across your infrastructure.

This task generates a private key and self-signed certificate with configurable parameters:

```yaml
# generate_certs.yml - Generate self-signed certificates
---
- name: Generate self-signed TLS certificates
  hosts: webservers
  become: true

  vars:
    cert_dir: /etc/ssl/private
    cert_country: US
    cert_state: California
    cert_locality: San Francisco
    cert_org: MyCompany
    cert_cn: "{{ ansible_fqdn }}"
    cert_days: 365
    key_size: 4096

  tasks:
    - name: Create certificate directory
      ansible.builtin.file:
        path: "{{ cert_dir }}"
        state: directory
        owner: root
        group: root
        mode: '0700'

    - name: Generate private key
      community.crypto.openssl_privatekey:
        path: "{{ cert_dir }}/{{ ansible_hostname }}.key"
        size: "{{ key_size }}"
        type: RSA
        mode: '0600'

    - name: Generate CSR
      community.crypto.openssl_csr:
        path: "{{ cert_dir }}/{{ ansible_hostname }}.csr"
        privatekey_path: "{{ cert_dir }}/{{ ansible_hostname }}.key"
        country_name: "{{ cert_country }}"
        state_or_province_name: "{{ cert_state }}"
        locality_name: "{{ cert_locality }}"
        organization_name: "{{ cert_org }}"
        common_name: "{{ cert_cn }}"
        subject_alt_name:
          - "DNS:{{ ansible_fqdn }}"
          - "DNS:{{ ansible_hostname }}"
          - "IP:{{ ansible_default_ipv4.address }}"

    - name: Generate self-signed certificate
      community.crypto.x509_certificate:
        path: "{{ cert_dir }}/{{ ansible_hostname }}.crt"
        privatekey_path: "{{ cert_dir }}/{{ ansible_hostname }}.key"
        csr_path: "{{ cert_dir }}/{{ ansible_hostname }}.csr"
        provider: selfsigned
        selfsigned_not_after: "+{{ cert_days }}d"
        mode: '0644'
```

## Monitoring Certificate Expiration

One of the most common issues with TLS is forgetting to renew certificates. This playbook checks for upcoming expirations.

This task checks every certificate and flags any expiring within the defined threshold:

```yaml
# check_cert_expiry.yml - Monitor certificate expiration dates
---
- name: Check certificate expiration
  hosts: all
  become: true

  vars:
    cert_paths:
      - /etc/ssl/certs
      - /etc/ssl/private
    expiry_warning_days: 30

  tasks:
    - name: Find all certificate files
      ansible.builtin.find:
        paths: "{{ cert_paths }}"
        patterns: "*.crt,*.pem"
        recurse: true
      register: cert_files

    - name: Check each certificate expiration
      ansible.builtin.shell: |
        openssl x509 -in {{ item.path }} -noout -enddate 2>/dev/null | cut -d= -f2
      loop: "{{ cert_files.files }}"
      register: cert_dates
      changed_when: false
      failed_when: false

    - name: Check if certificates expire soon
      ansible.builtin.shell: |
        openssl x509 -in {{ item.item.path }} -noout -checkend {{ expiry_warning_days * 86400 }}
      loop: "{{ cert_dates.results }}"
      register: expiry_check
      changed_when: false
      failed_when: false

    - name: Report expiring certificates
      ansible.builtin.debug:
        msg: "WARNING: Certificate {{ item.item.item.path }} expires within {{ expiry_warning_days }} days"
      loop: "{{ expiry_check.results }}"
      when: item.rc != 0
```

## Creating an OpenSSL Role

For reusability, wrap everything into an Ansible role. Here is the directory structure:

```
roles/openssl/
  tasks/main.yml
  templates/openssl.cnf.j2
  defaults/main.yml
  handlers/main.yml
```

The defaults file sets sensible values that can be overridden per host or group:

```yaml
# roles/openssl/defaults/main.yml - Default variables for OpenSSL role
---
openssl_min_protocol: TLSv1.2
openssl_cipher_string: "HIGH:!aNULL:!MD5:!3DES:!RC4:!DES"
openssl_default_bits: 4096
openssl_default_md: sha256
openssl_generate_dhparams: true
openssl_dhparam_size: 2048
```

And the main tasks file ties it all together:

```yaml
# roles/openssl/tasks/main.yml - Main tasks for OpenSSL role
---
- name: Include OS-specific variables
  ansible.builtin.include_vars: "{{ ansible_os_family }}.yml"

- name: Install OpenSSL packages
  ansible.builtin.package:
    name: "{{ openssl_packages }}"
    state: latest

- name: Deploy OpenSSL configuration
  ansible.builtin.template:
    src: openssl.cnf.j2
    dest: /etc/ssl/openssl.cnf
    owner: root
    group: root
    mode: '0644'

- name: Generate DH parameters
  community.crypto.openssl_dhparam:
    path: /etc/ssl/dhparams.pem
    size: "{{ openssl_dhparam_size }}"
  when: openssl_generate_dhparams
```

## Tips from Production

A few things I have learned the hard way when managing OpenSSL with Ansible:

1. **Always back up before changes.** OpenSSL misconfigurations can lock you out of SSH if your SSH daemon uses the same libraries.
2. **Test cipher strings before deploying.** Use `openssl ciphers -v 'YOUR_CIPHER_STRING'` in a task to validate before applying.
3. **Use the community.crypto collection.** The built-in modules for key and certificate management are much more reliable than shelling out to the openssl command.
4. **Pin your OpenSSL version in production.** Using `state: latest` is fine for dev, but in production you want to know exactly which version you are running.

## Wrapping Up

Automating OpenSSL configuration with Ansible eliminates the inconsistency that comes with manual server management. Whether you are generating certificates, hardening cipher suites, or monitoring expiration dates, having these tasks codified in playbooks means they run the same way every time. Start with the basics, build up to a full role, and your TLS infrastructure will be in much better shape.
