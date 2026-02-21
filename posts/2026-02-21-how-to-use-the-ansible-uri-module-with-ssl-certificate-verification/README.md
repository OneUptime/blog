# How to Use the Ansible uri Module with SSL Certificate Verification

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SSL, TLS, Certificate Verification

Description: Learn how to configure SSL/TLS certificate verification in the Ansible uri module including custom CAs and client certificates.

---

SSL/TLS certificate verification protects your Ansible playbooks from man-in-the-middle attacks when making HTTP requests. By default, the `uri` module verifies SSL certificates, which is exactly what you want. But in real-world environments, you will run into self-signed certificates, internal certificate authorities, expired certificates, and mutual TLS requirements. Knowing how to handle these scenarios properly is the difference between a secure setup and one that silently trusts everything.

This post covers SSL verification options in the `uri` module, from basic configuration to advanced scenarios with custom CAs and client certificates.

## Default SSL Behavior

By default, Ansible's `uri` module validates SSL certificates against the system's trusted CA bundle:

```yaml
# default SSL verification (validates against system CA bundle)
---
- name: SSL verification examples
  hosts: localhost
  connection: local
  tasks:
    - name: Request to site with valid SSL cert
      ansible.builtin.uri:
        url: https://api.github.com
        method: GET
        return_content: true
      register: github_response
      # This works because github.com has a valid certificate
      # signed by a trusted CA

    - name: Show SSL was validated
      ansible.builtin.debug:
        msg: "Successfully connected with SSL verification: {{ github_response.status }}"
```

If the certificate is invalid, expired, or signed by an untrusted CA, the task fails with an SSL error. This is the correct behavior for production.

## Disabling SSL Verification (Use with Caution)

Sometimes you need to connect to services with self-signed certificates. You can disable verification with `validate_certs: false`:

```yaml
# disable SSL verification for self-signed certificates
- name: Connect to service with self-signed cert
  ansible.builtin.uri:
    url: https://internal-service.local:8443/health
    method: GET
    validate_certs: false
    return_content: true
  register: health_check
```

Do not use `validate_certs: false` in production against external services. It opens you up to MITM attacks. Only use it for development environments, internal services with self-signed certificates where you control the network, or as a temporary workaround while you set up proper certificates.

A better approach is to add the self-signed CA to your trusted store, which we cover next.

## Using a Custom CA Certificate

Instead of disabling verification, tell Ansible to trust your internal CA:

```yaml
# validate SSL against a custom CA certificate
---
- name: Connect with custom CA
  hosts: localhost
  connection: local
  tasks:
    - name: Request to internal service with custom CA
      ansible.builtin.uri:
        url: https://api.internal.company.com/status
        method: GET
        ca_path: /etc/ssl/certs/company-internal-ca.pem
        return_content: true
      register: internal_status

    - name: Show connection status
      ansible.builtin.debug:
        msg: "Internal API status: {{ internal_status.json.status }}"
```

The `ca_path` parameter can point to a single CA certificate file or a directory of CA certificates. This lets Ansible trust your internal CA while still rejecting certificates from unknown CAs.

## Installing Custom CA Certificates on Managed Hosts

If your managed hosts need to trust an internal CA for all connections (not just Ansible), deploy the CA certificate:

```yaml
# deploy and trust a custom CA certificate on managed hosts
---
- name: Deploy internal CA certificate
  hosts: all
  become: true
  tasks:
    # For Debian/Ubuntu systems
    - name: Copy CA certificate
      ansible.builtin.copy:
        src: certs/company-internal-ca.crt
        dest: /usr/local/share/ca-certificates/company-internal-ca.crt
        owner: root
        group: root
        mode: '0644'
      when: ansible_os_family == "Debian"

    - name: Update CA trust store (Debian)
      ansible.builtin.command:
        cmd: update-ca-certificates
      when: ansible_os_family == "Debian"

    # For RHEL/CentOS systems
    - name: Copy CA certificate (RHEL)
      ansible.builtin.copy:
        src: certs/company-internal-ca.crt
        dest: /etc/pki/ca-trust/source/anchors/company-internal-ca.crt
        owner: root
        group: root
        mode: '0644'
      when: ansible_os_family == "RedHat"

    - name: Update CA trust store (RHEL)
      ansible.builtin.command:
        cmd: update-ca-trust
      when: ansible_os_family == "RedHat"
```

Once the CA is trusted system-wide, you do not need `ca_path` in your `uri` tasks.

## Client Certificate Authentication (mTLS)

Mutual TLS requires both the server and client to present certificates. The `uri` module supports this with `client_cert` and `client_key`:

```yaml
# authenticate with client certificates for mutual TLS
---
- name: mTLS API access
  hosts: localhost
  connection: local
  tasks:
    - name: Connect with client certificate
      ansible.builtin.uri:
        url: https://secure-api.internal/data
        method: GET
        client_cert: /etc/ansible/certs/ansible-client.pem
        client_key: /etc/ansible/certs/ansible-client-key.pem
        ca_path: /etc/ansible/certs/internal-ca.pem
        return_content: true
      register: secure_data

    - name: Show secure data
      ansible.builtin.debug:
        var: secure_data.json
```

For combined cert and key files (PEM format with both in one file), just provide `client_cert` without `client_key`:

```yaml
# use a combined cert+key PEM file
- name: Connect with combined PEM file
  ansible.builtin.uri:
    url: https://secure-api.internal/data
    method: GET
    client_cert: /etc/ansible/certs/ansible-client-combined.pem
    return_content: true
  register: result
```

## Checking SSL Certificate Details

You can use Ansible to inspect SSL certificates on your infrastructure:

```yaml
# check SSL certificate details on remote hosts
---
- name: SSL certificate audit
  hosts: webservers
  tasks:
    - name: Check SSL certificate expiry
      ansible.builtin.shell:
        cmd: >
          echo | openssl s_client -connect {{ inventory_hostname }}:443 -servername {{ inventory_hostname }} 2>/dev/null |
          openssl x509 -noout -dates -subject
      delegate_to: localhost
      register: cert_info
      changed_when: false

    - name: Parse certificate expiry
      ansible.builtin.shell:
        cmd: >
          echo | openssl s_client -connect {{ inventory_hostname }}:443 -servername {{ inventory_hostname }} 2>/dev/null |
          openssl x509 -noout -enddate |
          cut -d= -f2
      delegate_to: localhost
      register: cert_expiry_raw
      changed_when: false

    - name: Show certificate info
      ansible.builtin.debug:
        msg:
          - "Host: {{ inventory_hostname }}"
          - "Certificate details: {{ cert_info.stdout_lines }}"
          - "Expires: {{ cert_expiry_raw.stdout }}"
```

## SSL Verification with get_url

The `get_url` module has the same SSL options:

```yaml
# SSL verification options for get_url downloads
---
- name: Secure downloads
  hosts: all
  tasks:
    # Download with default SSL verification
    - name: Download from trusted HTTPS source
      ansible.builtin.get_url:
        url: https://releases.example.com/myapp.tar.gz
        dest: /tmp/myapp.tar.gz
        mode: '0644'

    # Download from internal server with custom CA
    - name: Download from internal repository
      ansible.builtin.get_url:
        url: https://artifacts.internal/releases/myapp.tar.gz
        dest: /tmp/myapp.tar.gz
        ca_path: /etc/ssl/certs/internal-ca.pem
        mode: '0644'

    # Download with client cert authentication
    - name: Download from secure artifact store
      ansible.builtin.get_url:
        url: https://secure-artifacts.internal/myapp.tar.gz
        dest: /tmp/myapp.tar.gz
        client_cert: /etc/certs/client.pem
        client_key: /etc/certs/client-key.pem
        mode: '0644'
```

## Environment Variable for CA Bundle

You can set the CA bundle path via environment variable, affecting all Python-based HTTP requests:

```yaml
# set CA bundle via environment variable for all HTTP tasks
---
- name: Use custom CA bundle globally
  hosts: all
  environment:
    REQUESTS_CA_BUNDLE: /etc/ssl/certs/combined-ca-bundle.pem
    SSL_CERT_FILE: /etc/ssl/certs/combined-ca-bundle.pem
  tasks:
    - name: All uri requests in this play use the custom CA bundle
      ansible.builtin.uri:
        url: https://api.internal/health
        method: GET
      register: health

    - name: Downloads also use the custom CA bundle
      ansible.builtin.get_url:
        url: https://artifacts.internal/file.tar.gz
        dest: /tmp/file.tar.gz
        mode: '0644'
```

## Conditional SSL Based on Environment

Toggle SSL verification based on the target environment:

```yaml
# configure SSL verification based on environment
---
- name: Environment-aware SSL config
  hosts: all
  vars:
    is_production: "{{ env == 'production' }}"
    ssl_verify: "{{ is_production | bool }}"
    ca_cert: "{{ '/etc/ssl/certs/ca-certificates.crt' if is_production else '/etc/ssl/certs/internal-ca.pem' }}"
  tasks:
    - name: API health check with environment-appropriate SSL
      ansible.builtin.uri:
        url: "https://{{ api_host }}/health"
        method: GET
        validate_certs: "{{ ssl_verify }}"
        ca_path: "{{ ca_cert if ssl_verify else omit }}"
        return_content: true
      register: health

    - name: Warn if SSL verification is disabled
      ansible.builtin.debug:
        msg: "WARNING: SSL verification is disabled for {{ env }} environment"
      when: not ssl_verify
```

## Practical Example: Certificate Rotation Playbook

Here is a playbook that manages certificate rotation while maintaining SSL verification:

```yaml
# rotate SSL certificates with validation at each step
---
- name: Rotate SSL certificates
  hosts: webservers
  become: true
  vars:
    cert_dir: /etc/ssl/private
    new_cert_src: certs/new-wildcard.pem
    new_key_src: certs/new-wildcard-key.pem
  tasks:
    - name: Deploy new certificate
      ansible.builtin.copy:
        src: "{{ new_cert_src }}"
        dest: "{{ cert_dir }}/server.pem"
        owner: root
        group: ssl-cert
        mode: '0644'
      notify: Reload nginx

    - name: Deploy new private key
      ansible.builtin.copy:
        src: "{{ new_key_src }}"
        dest: "{{ cert_dir }}/server-key.pem"
        owner: root
        group: ssl-cert
        mode: '0640'
      notify: Reload nginx

    - name: Flush handlers to apply certificate
      ansible.builtin.meta: flush_handlers

    - name: Verify new certificate works
      ansible.builtin.uri:
        url: "https://{{ inventory_hostname }}/health"
        method: GET
        validate_certs: true
        status_code: 200
      delegate_to: localhost
      retries: 3
      delay: 5

  handlers:
    - name: Reload nginx
      ansible.builtin.systemd:
        name: nginx
        state: reloaded
```

## Summary

SSL certificate verification in Ansible is enabled by default and should stay enabled for production workloads. Use `ca_path` to trust internal CAs instead of disabling verification with `validate_certs: false`. For mutual TLS, provide client certificates with `client_cert` and `client_key`. Deploy internal CA certificates to managed hosts using `update-ca-certificates` (Debian) or `update-ca-trust` (RHEL) for system-wide trust. When you must disable verification for development environments, do it conditionally based on an environment variable so it cannot accidentally leak into production.
