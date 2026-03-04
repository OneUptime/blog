# How to Automate Azure Key Vault Certificate Rotation with Ansible Playbooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Ansible, Key Vault, Certificates, Automation, Security, Infrastructure as Code

Description: Automate Azure Key Vault certificate rotation using Ansible playbooks to keep TLS certificates current and reduce manual security operations.

---

Certificate management is one of those critical tasks that everyone agrees is important and nobody wants to do manually. Expired certificates cause outages, security alerts, and panicked late-night calls. Azure Key Vault can issue and store certificates, but the rotation process - generating new certificates, deploying them to services, and verifying the swap - still needs orchestration. Ansible playbooks give you a repeatable, auditable way to handle the entire lifecycle.

This post covers using Ansible to automate certificate rotation in Azure Key Vault, including generating certificates, deploying them to Azure services, and cleaning up old versions.

## Prerequisites and Setup

You need the Azure Ansible collection and proper authentication configured.

```bash
# Install the Azure Ansible collection
ansible-galaxy collection install azure.azcollection

# Install Python dependencies
pip install -r ~/.ansible/collections/ansible_collections/azure/azcollection/requirements.txt

# Additional packages for certificate handling
pip install cryptography pyOpenSSL
```

For authentication, use a service principal with the right Key Vault permissions.

```bash
# Export credentials for Ansible to use
export AZURE_SUBSCRIPTION_ID="your-sub-id"
export AZURE_CLIENT_ID="your-client-id"
export AZURE_SECRET="your-client-secret"
export AZURE_TENANT="your-tenant-id"
```

## Certificate Rotation Playbook

Here is a comprehensive playbook that handles the full rotation cycle.

```yaml
# rotate-certificates.yml
# Rotates TLS certificates in Azure Key Vault and deploys them to services
---
- name: Rotate Azure Key Vault Certificates
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    resource_group: rg-security
    key_vault_name: kv-certs-prod
    # Certificate configurations to rotate
    certificates:
      - name: api-tls-cert
        subject: "CN=api.example.com"
        dns_names:
          - api.example.com
          - api-staging.example.com
        validity_months: 12
        deploy_to:
          - type: app_service
            name: app-api-prod
            resource_group: rg-api
      - name: web-tls-cert
        subject: "CN=www.example.com"
        dns_names:
          - www.example.com
          - example.com
        validity_months: 12
        deploy_to:
          - type: app_gateway
            name: agw-frontend
            resource_group: rg-frontend

    # Rotate certificates that expire within this many days
    rotation_threshold_days: 30

  tasks:
    # Step 1: Check current certificate status
    - name: Get current certificate details
      azure.azcollection.azure_rm_keyvaultcertificate_info:
        vault_uri: "https://{{ key_vault_name }}.vault.azure.net"
        name: "{{ item.name }}"
      register: cert_info
      loop: "{{ certificates }}"
      loop_control:
        label: "{{ item.name }}"

    # Step 2: Determine which certificates need rotation
    - name: Check certificate expiry dates
      set_fact:
        certs_to_rotate: >-
          {{ certs_to_rotate | default([]) + [item.item]
             if (item.certificates | length == 0) or
                ((item.certificates[0].attributes.expires | to_datetime('%Y-%m-%dT%H:%M:%S%z') - now(utc=true)).days < rotation_threshold_days)
             else certs_to_rotate | default([]) }}
      loop: "{{ cert_info.results }}"
      loop_control:
        label: "{{ item.item.name }}"

    - name: Display certificates needing rotation
      ansible.builtin.debug:
        msg: "Certificates to rotate: {{ certs_to_rotate | map(attribute='name') | list }}"

    # Step 3: Generate new certificates
    - name: Create new certificate versions
      azure.azcollection.azure_rm_keyvaultcertificate:
        certificate_name: "{{ item.name }}"
        vault_uri: "https://{{ key_vault_name }}.vault.azure.net"
        certificate_policy:
          issuer_parameters:
            name: "Self"  # Use "Self" for self-signed or CA name for CA-issued
          key_properties:
            exportable: true
            key_size: 4096
            key_type: "RSA"
            reuse_key: false
          secret_properties:
            content_type: "application/x-pem-certificate"
          x509_certificate_properties:
            subject: "{{ item.subject }}"
            subject_alternative_names:
              dns_names: "{{ item.dns_names }}"
            validity_in_months: "{{ item.validity_months }}"
            key_usage:
              - digitalSignature
              - keyEncipherment
        state: present
      register: new_certs
      loop: "{{ certs_to_rotate | default([]) }}"
      loop_control:
        label: "{{ item.name }}"
      when: certs_to_rotate is defined and certs_to_rotate | length > 0

    - name: Wait for certificate provisioning
      ansible.builtin.pause:
        seconds: 30
      when: new_certs.changed | default(false)
```

## Deploying Certificates to Services

After generating new certificates, deploy them to the Azure services that use them.

```yaml
# deploy-certificates.yml
# Deploys rotated certificates to Azure services
---
- name: Deploy Certificates to Azure Services
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    key_vault_name: kv-certs-prod

  tasks:
    # Deploy to App Service
    - name: Get certificate from Key Vault for App Service
      azure.azcollection.azure_rm_keyvaultcertificate_info:
        vault_uri: "https://{{ key_vault_name }}.vault.azure.net"
        name: "api-tls-cert"
      register: api_cert

    - name: Import certificate to App Service
      azure.azcollection.azure_rm_appservicecertificate:
        name: "api-tls-cert"
        resource_group: "rg-api"
        location: "eastus"
        key_vault_id: "/subscriptions/{{ lookup('env', 'AZURE_SUBSCRIPTION_ID') }}/resourceGroups/rg-security/providers/Microsoft.KeyVault/vaults/{{ key_vault_name }}"
        key_vault_secret_name: "api-tls-cert"
      register: app_cert

    # Bind the certificate to the custom domain
    - name: Bind certificate to App Service custom domain
      azure.azcollection.azure_rm_webapp:
        resource_group: "rg-api"
        name: "app-api-prod"
        site_config:
          min_tls_version: "1.2"
      register: binding_result

    - name: Log deployment result
      ansible.builtin.debug:
        msg: "Certificate deployed to App Service: {{ binding_result.changed }}"
```

## Notification and Reporting

Add notification steps to keep teams informed about rotation status.

```yaml
# notify-rotation.yml
# Sends notifications about certificate rotation results
---
- name: Certificate Rotation Notifications
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    slack_webhook_url: "{{ lookup('env', 'SLACK_WEBHOOK_URL') }}"

  tasks:
    # Generate a rotation report
    - name: Build rotation report
      set_fact:
        rotation_report: |
          Certificate Rotation Report
          Date: {{ ansible_date_time.iso8601 | default(now(utc=true)) }}
          Certificates Checked: {{ certificates | length }}
          Certificates Rotated: {{ certs_to_rotate | default([]) | length }}

          {% for cert in certs_to_rotate | default([]) %}
          - {{ cert.name }}: Rotated successfully
          {% endfor %}

          {% if certs_to_rotate | default([]) | length == 0 %}
          No certificates needed rotation.
          {% endif %}

    # Send Slack notification
    - name: Notify Slack channel
      ansible.builtin.uri:
        url: "{{ slack_webhook_url }}"
        method: POST
        body_format: json
        body:
          text: "{{ rotation_report }}"
        status_code: 200
      when: slack_webhook_url is defined and slack_webhook_url != ""

    # Save report to file for auditing
    - name: Save rotation report
      ansible.builtin.copy:
        content: "{{ rotation_report }}"
        dest: "/var/log/cert-rotation/report-{{ ansible_date_time.date | default('unknown') }}.txt"
        mode: '0644'
      ignore_errors: true
```

## Monitoring Certificate Expiry

A separate playbook to run on a schedule that checks certificate expiry dates and alerts before rotation is needed.

```yaml
# check-certificate-expiry.yml
# Checks all Key Vault certificates and reports those expiring soon
---
- name: Check Certificate Expiry
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    key_vault_name: kv-certs-prod
    warning_threshold_days: 60
    critical_threshold_days: 30

    # All certificates to monitor
    monitored_certificates:
      - api-tls-cert
      - web-tls-cert
      - internal-mtls-cert
      - signing-cert

  tasks:
    - name: Check each certificate
      azure.azcollection.azure_rm_keyvaultcertificate_info:
        vault_uri: "https://{{ key_vault_name }}.vault.azure.net"
        name: "{{ item }}"
      register: all_certs
      loop: "{{ monitored_certificates }}"

    - name: Evaluate certificate status
      set_fact:
        cert_status: >-
          {{ cert_status | default([]) + [{
            'name': item.item,
            'expires': item.certificates[0].attributes.expires | default('unknown'),
            'days_remaining': ((item.certificates[0].attributes.expires | to_datetime('%Y-%m-%dT%H:%M:%S%z')) - now(utc=true)).days | default(-1),
            'status': 'CRITICAL' if (((item.certificates[0].attributes.expires | to_datetime('%Y-%m-%dT%H:%M:%S%z')) - now(utc=true)).days | default(-1)) < critical_threshold_days
                      else 'WARNING' if (((item.certificates[0].attributes.expires | to_datetime('%Y-%m-%dT%H:%M:%S%z')) - now(utc=true)).days | default(-1)) < warning_threshold_days
                      else 'OK'
          }] }}
      loop: "{{ all_certs.results }}"
      when: item.certificates | length > 0

    - name: Display certificate status
      ansible.builtin.debug:
        msg: |
          Certificate Status Report:
          {% for cert in cert_status | default([]) %}
          [{{ cert.status }}] {{ cert.name }} - Expires: {{ cert.expires }} ({{ cert.days_remaining }} days remaining)
          {% endfor %}

    # Fail the playbook if any certificates are in critical status
    - name: Check for critical certificates
      ansible.builtin.fail:
        msg: "CRITICAL: Certificates expiring within {{ critical_threshold_days }} days found!"
      when: cert_status | default([]) | selectattr('status', 'equalto', 'CRITICAL') | list | length > 0
```

## Scheduling with Cron or Ansible Tower

Run the monitoring check daily and the rotation weekly.

```bash
# crontab entries for certificate management

# Check certificate expiry every day at 9 AM
0 9 * * * cd /opt/ansible && ansible-playbook check-certificate-expiry.yml >> /var/log/cert-check.log 2>&1

# Run certificate rotation every Sunday at 3 AM
0 3 * * 0 cd /opt/ansible && ansible-playbook rotate-certificates.yml >> /var/log/cert-rotation.log 2>&1
```

If you use Ansible Tower or AWX, create a job template for each playbook and attach schedules through the UI.

## Handling CA-Issued Certificates

For production certificates issued by a trusted CA (like DigiCert or GlobalSign), the process involves Key Vault generating a CSR and the CA issuing the certificate.

```yaml
# ca-certificate-rotation.yml
# Handles rotation for CA-issued certificates
- name: Rotate CA-Issued Certificate
  tasks:
    - name: Create certificate with CA issuer
      azure.azcollection.azure_rm_keyvaultcertificate:
        certificate_name: "production-tls"
        vault_uri: "https://{{ key_vault_name }}.vault.azure.net"
        certificate_policy:
          issuer_parameters:
            # Name of the CA configured as an issuer in Key Vault
            name: "DigiCertCA"
          key_properties:
            exportable: true
            key_size: 4096
            key_type: "RSA"
          x509_certificate_properties:
            subject: "CN=api.example.com,O=Example Corp,L=Seattle,ST=WA,C=US"
            subject_alternative_names:
              dns_names:
                - api.example.com
                - "*.api.example.com"
            validity_in_months: 12
        state: present
```

When a CA issuer is configured in Key Vault, the certificate creation process is automated end-to-end. Key Vault generates the key pair, creates the CSR, submits it to the CA, and imports the signed certificate when the CA responds.

## Summary

Automating certificate rotation with Ansible removes one of the most common causes of preventable outages. The playbooks handle the full lifecycle: monitoring expiry dates, generating new certificates, deploying them to Azure services, and notifying teams. Run the monitoring playbook daily and the rotation playbook weekly, and you will never be surprised by an expired certificate again. The combination of Azure Key Vault for certificate management and Ansible for orchestration gives you a robust, auditable process that scales across any number of certificates and services.
