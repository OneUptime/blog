# How to Set Up GCP Credentials for Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, GCP, Authentication, Service Accounts, Cloud Automation

Description: Configure Google Cloud Platform credentials for Ansible including service accounts, environment variables, and workload identity federation.

---

Before you can manage any GCP resource with Ansible, you need authentication sorted out. Unlike AWS where you just export two environment variables and go, GCP has a few different credential mechanisms, and picking the right one depends on where your Ansible control machine runs. This guide walks through every authentication method, from the simplest local development setup to production-grade service account configuration.

## GCP Authentication Methods

Ansible supports several ways to authenticate with GCP:

```mermaid
graph TD
    A[GCP Authentication] --> B[Service Account JSON Key]
    A --> C[Application Default Credentials]
    A --> D[Environment Variables]
    A --> E[Workload Identity Federation]
    B --> F[Best for CI/CD and automation servers]
    C --> G[Best for local development]
    D --> H[Flexible for both scenarios]
    E --> I[Best for non-GCP environments without keys]
```

## Prerequisites

You need the following before getting started:

- Ansible 2.9+ with the `google.cloud` collection
- A GCP project with billing enabled
- The `gcloud` CLI installed (optional but helpful for setup)
- Python libraries: `google-auth` and `requests`

```bash
# Install the GCP collection
ansible-galaxy collection install google.cloud

# Install required Python libraries
pip install google-auth requests google-api-python-client
```

## Method 1: Service Account with JSON Key File

This is the most common method for automated workflows. You create a service account in GCP, download a JSON key file, and tell Ansible where to find it.

### Step 1: Create the service account

```bash
# Set your project ID
export GCP_PROJECT="my-project-123"

# Create the service account
gcloud iam service-accounts create ansible-automation \
  --display-name="Ansible Automation" \
  --description="Service account for Ansible infrastructure management" \
  --project="${GCP_PROJECT}"

# Grant roles to the service account (adjust based on what you need to manage)
gcloud projects add-iam-policy-binding "${GCP_PROJECT}" \
  --member="serviceAccount:ansible-automation@${GCP_PROJECT}.iam.gserviceaccount.com" \
  --role="roles/compute.admin"

gcloud projects add-iam-policy-binding "${GCP_PROJECT}" \
  --member="serviceAccount:ansible-automation@${GCP_PROJECT}.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding "${GCP_PROJECT}" \
  --member="serviceAccount:ansible-automation@${GCP_PROJECT}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

### Step 2: Download the JSON key

```bash
# Create and download the key file
gcloud iam service-accounts keys create /opt/ansible/gcp-credentials.json \
  --iam-account="ansible-automation@${GCP_PROJECT}.iam.gserviceaccount.com"

# Restrict file permissions
chmod 600 /opt/ansible/gcp-credentials.json
```

### Step 3: Use the key file in your playbook

```yaml
# test-gcp-auth.yml - Verify GCP authentication with a service account key
---
- name: Test GCP Authentication
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    gcp_project: "my-project-123"
    gcp_cred_kind: "serviceaccount"
    gcp_cred_file: "/opt/ansible/gcp-credentials.json"

  tasks:
    - name: List compute zones to verify authentication
      google.cloud.gcp_compute_zone_info:
        project: "{{ gcp_project }}"
        auth_kind: "{{ gcp_cred_kind }}"
        service_account_file: "{{ gcp_cred_file }}"
      register: zones

    - name: Show available zones
      ansible.builtin.debug:
        msg: "Authentication successful. Found {{ zones.resources | length }} zones."
```

## Method 2: Environment Variables

Instead of specifying credentials in every task, you can set environment variables:

```bash
# Set GCP credentials via environment variables
export GCP_AUTH_KIND="serviceaccount"
export GCP_SERVICE_ACCOUNT_FILE="/opt/ansible/gcp-credentials.json"
export GCP_PROJECT="my-project-123"
```

With these variables set, your playbooks become cleaner because you do not need to pass credential parameters to each module:

```yaml
# test-env-auth.yml - GCP authentication using environment variables
---
- name: Test GCP Auth via Environment Variables
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: List compute instances
      google.cloud.gcp_compute_instance_info:
        zone: us-central1-a
        project: "{{ lookup('env', 'GCP_PROJECT') }}"
        auth_kind: "{{ lookup('env', 'GCP_AUTH_KIND') }}"
        service_account_file: "{{ lookup('env', 'GCP_SERVICE_ACCOUNT_FILE') }}"
      register: instances

    - name: Show instance count
      ansible.builtin.debug:
        msg: "Found {{ instances.resources | length }} instances in us-central1-a"
```

## Method 3: Application Default Credentials (ADC)

For local development, you can use `gcloud` to set up Application Default Credentials:

```bash
# Log in and set up ADC
gcloud auth application-default login

# This creates a credential file at:
# Linux/Mac: ~/.config/gcloud/application_default_credentials.json
# Windows: %APPDATA%/gcloud/application_default_credentials.json
```

Then reference ADC in your playbook:

```yaml
# test-adc-auth.yml - GCP authentication using Application Default Credentials
---
- name: Test GCP Auth with ADC
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    gcp_project: "my-project-123"

  tasks:
    - name: List storage buckets using ADC
      google.cloud.gcp_storage_bucket_info:
        project: "{{ gcp_project }}"
        auth_kind: application
      register: buckets

    - name: Show bucket count
      ansible.builtin.debug:
        msg: "Found {{ buckets.resources | length }} buckets"
```

The `auth_kind: application` tells Ansible to use ADC. This is convenient for development but not recommended for production because it uses your personal Google account credentials.

## Method 4: Running on GCE with Attached Service Account

If your Ansible control machine is a GCE instance, you can use the instance's attached service account:

```yaml
# test-machine-account-auth.yml - Authentication using the instance's service account
---
- name: Test GCP Auth with Machine Account
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    gcp_project: "my-project-123"

  tasks:
    - name: Get project info using the VM's service account
      google.cloud.gcp_compute_network_info:
        project: "{{ gcp_project }}"
        auth_kind: machineaccount
      register: networks

    - name: Show networks
      ansible.builtin.debug:
        msg: "Found {{ networks.resources | length }} VPC networks"
```

This is the most secure option when your Ansible runs from within GCE because no key file exists on disk.

## Centralizing Credentials with Group Variables

Rather than specifying credentials in every playbook, put them in group variables:

```yaml
# group_vars/all/gcp_auth.yml - Centralized GCP credentials
---
gcp_project: "my-project-123"
gcp_cred_kind: "serviceaccount"
gcp_cred_file: "/opt/ansible/gcp-credentials.json"
```

Then create a role that passes these variables to GCP modules:

```yaml
# roles/gcp-common/defaults/main.yml - Defaults for GCP modules
---
gcp_auth_params:
  project: "{{ gcp_project }}"
  auth_kind: "{{ gcp_cred_kind }}"
  service_account_file: "{{ gcp_cred_file }}"
```

Use these in your playbooks:

```yaml
# create-something.yml - Using centralized GCP credentials
---
- name: Create GCP Resources
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Create a compute instance
      google.cloud.gcp_compute_instance:
        name: test-instance
        machine_type: e2-micro
        zone: us-central1-a
        project: "{{ gcp_project }}"
        auth_kind: "{{ gcp_cred_kind }}"
        service_account_file: "{{ gcp_cred_file }}"
        disks:
          - auto_delete: true
            boot: true
            initialize_params:
              source_image: projects/debian-cloud/global/images/family/debian-11
        network_interfaces:
          - network:
              selfLink: "global/networks/default"
        state: present
```

## Encrypting Credentials with Ansible Vault

Never store your service account JSON key in plaintext in version control. Use Ansible Vault:

```bash
# Encrypt the credentials file
ansible-vault encrypt /opt/ansible/gcp-credentials.json

# Or encrypt just the variable containing the path
ansible-vault encrypt_string '/opt/ansible/gcp-credentials.json' --name 'gcp_cred_file'
```

For even better security, store the entire JSON content as an encrypted variable:

```yaml
# group_vars/all/vault.yml - Encrypted GCP credentials (encrypt this file)
---
vault_gcp_service_account_contents: |
  {
    "type": "service_account",
    "project_id": "my-project-123",
    "private_key_id": "abc123...",
    "private_key": "-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n",
    "client_email": "ansible-automation@my-project-123.iam.gserviceaccount.com",
    "client_id": "123456789",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token"
  }
```

Then reference the content directly instead of a file path:

```yaml
# Using inline service account contents from vault
- name: Create resource with vaulted credentials
  google.cloud.gcp_compute_network:
    name: my-vpc
    project: "{{ gcp_project }}"
    auth_kind: serviceaccount
    service_account_contents: "{{ vault_gcp_service_account_contents }}"
    state: present
```

## Verifying Your Setup

A quick verification playbook that tests authentication and shows your project details:

```yaml
# verify-gcp-setup.yml - Comprehensive GCP authentication check
---
- name: Verify GCP Setup
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: List available zones
      google.cloud.gcp_compute_zone_info:
        project: "{{ gcp_project }}"
        auth_kind: "{{ gcp_cred_kind }}"
        service_account_file: "{{ gcp_cred_file }}"
      register: zones

    - name: List VPC networks
      google.cloud.gcp_compute_network_info:
        project: "{{ gcp_project }}"
        auth_kind: "{{ gcp_cred_kind }}"
        service_account_file: "{{ gcp_cred_file }}"
      register: networks

    - name: List storage buckets
      google.cloud.gcp_storage_bucket_info:
        project: "{{ gcp_project }}"
        auth_kind: "{{ gcp_cred_kind }}"
        service_account_file: "{{ gcp_cred_file }}"
      register: buckets

    - name: Authentication summary
      ansible.builtin.debug:
        msg:
          - "GCP Authentication: SUCCESS"
          - "Project: {{ gcp_project }}"
          - "Available zones: {{ zones.resources | length }}"
          - "VPC networks: {{ networks.resources | length }}"
          - "Storage buckets: {{ buckets.resources | length }}"
```

## Summary

Getting GCP credentials right is the foundation for everything else you will do with Ansible on Google Cloud. For production environments, use service account JSON keys stored in Ansible Vault or, better yet, use machine-attached service accounts if your control node runs on GCE. For local development, Application Default Credentials are the quickest option. Whichever method you choose, centralize your credential configuration in group variables so you are not repeating the same auth parameters across every task in every playbook.
