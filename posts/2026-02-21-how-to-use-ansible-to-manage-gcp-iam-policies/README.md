# How to Use Ansible to Manage GCP IAM Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, GCP, IAM, Security, Access Control

Description: Manage GCP IAM policies with Ansible to control access to cloud resources including role bindings, custom roles, and service accounts.

---

IAM in Google Cloud Platform controls who can do what on which resources. Getting IAM right is critical because misconfigured permissions are one of the most common causes of security incidents in the cloud. Managing IAM through the console is error-prone and leaves no audit trail of who changed what. Ansible lets you define your IAM policies as code, making every change reviewable, testable, and reversible.

## GCP IAM Concepts

Before writing playbooks, here is how GCP IAM fits together:

```mermaid
graph TD
    A[IAM Policy] --> B[Bindings]
    B --> C[Role]
    B --> D[Members]
    C --> E[Predefined Roles - roles/compute.admin]
    C --> F[Custom Roles - projects/x/roles/myRole]
    C --> G[Basic Roles - roles/editor]
    D --> H[user:name@example.com]
    D --> I[serviceAccount:sa@project.iam]
    D --> J[group:team@example.com]
```

A binding connects one or more members to a single role. An IAM policy is a collection of bindings attached to a resource (project, folder, or organization).

## Prerequisites

- Ansible 2.9+ with the `google.cloud` collection
- GCP service account with IAM Admin role (or at minimum, the specific permissions to manage IAM)
- Cloud Resource Manager API enabled

```bash
ansible-galaxy collection install google.cloud
pip install google-auth requests google-api-python-client
```

## Granting a Role to a User

The `google.cloud.gcp_resourcemanager_policy` module manages project-level IAM policies. However, for individual bindings, it is often simpler to use the `gcloud` command through Ansible:

```yaml
# grant-role.yml - Grant a specific IAM role to a user
---
- name: Grant IAM Role
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    gcp_project: "my-project-123"
    member: "user:developer@example.com"
    role: "roles/compute.viewer"

  tasks:
    - name: Add IAM policy binding
      ansible.builtin.command: >
        gcloud projects add-iam-policy-binding {{ gcp_project }}
        --member="{{ member }}"
        --role="{{ role }}"
        --condition=None
        --quiet
      register: binding_result
      changed_when: "'Updated IAM policy' in binding_result.stderr or binding_result.rc == 0"

    - name: Confirm binding
      ansible.builtin.debug:
        msg: "Granted {{ role }} to {{ member }} on project {{ gcp_project }}"
```

## Managing Multiple Role Bindings

For onboarding a new team member or setting up a team's access:

```yaml
# team-access.yml - Configure IAM access for a development team
---
- name: Configure Team IAM Access
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    gcp_project: "my-project-123"
    team_bindings:
      # Lead developer gets broader access
      - member: "user:lead@example.com"
        roles:
          - "roles/compute.admin"
          - "roles/storage.admin"
          - "roles/cloudsql.admin"
      # Regular developers get viewer access plus specific write permissions
      - member: "group:developers@example.com"
        roles:
          - "roles/compute.viewer"
          - "roles/storage.objectViewer"
          - "roles/logging.viewer"
          - "roles/monitoring.viewer"
      # CI/CD service account gets deployment permissions
      - member: "serviceAccount:cicd@{{ gcp_project }}.iam.gserviceaccount.com"
        roles:
          - "roles/compute.instanceAdmin.v1"
          - "roles/storage.objectAdmin"
          - "roles/run.admin"
          - "roles/iam.serviceAccountUser"

  tasks:
    - name: Apply IAM bindings for each member and role combination
      ansible.builtin.command: >
        gcloud projects add-iam-policy-binding {{ gcp_project }}
        --member="{{ item.0.member }}"
        --role="{{ item.1 }}"
        --quiet
      loop: "{{ team_bindings | subelements('roles') }}"
      register: binding_results
      changed_when: true

    - name: Summary
      ansible.builtin.debug:
        msg: "Applied {{ binding_results.results | length }} IAM bindings across {{ team_bindings | length }} members"
```

## Creating Custom Roles

When predefined roles are too broad or too narrow, create custom roles:

```yaml
# create-custom-role.yml - Create a custom IAM role with specific permissions
---
- name: Create Custom IAM Roles
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    gcp_project: "my-project-123"

  tasks:
    - name: Create a custom role for application deployment
      ansible.builtin.command: >
        gcloud iam roles create appDeployer
        --project={{ gcp_project }}
        --title="Application Deployer"
        --description="Custom role for deploying applications to Compute Engine and Cloud Run"
        --permissions=compute.instances.get,compute.instances.list,compute.instances.setMetadata,compute.instances.setTags,storage.objects.get,storage.objects.list,storage.objects.create,run.services.create,run.services.update,run.services.get,run.services.list
        --stage=GA
      register: role_result
      changed_when: "'Created role' in role_result.stderr"
      failed_when: "role_result.rc != 0 and 'already exists' not in role_result.stderr"

    - name: Create a custom read-only role for auditors
      ansible.builtin.command: >
        gcloud iam roles create auditorReadOnly
        --project={{ gcp_project }}
        --title="Auditor Read Only"
        --description="Read-only access for compliance auditors"
        --permissions=compute.instances.list,compute.instances.get,compute.networks.list,compute.firewalls.list,storage.buckets.list,storage.buckets.get,iam.serviceAccounts.list,logging.logEntries.list
        --stage=GA
      register: auditor_role
      changed_when: "'Created role' in auditor_role.stderr"
      failed_when: "auditor_role.rc != 0 and 'already exists' not in auditor_role.stderr"

    - name: Assign the custom role to the auditor group
      ansible.builtin.command: >
        gcloud projects add-iam-policy-binding {{ gcp_project }}
        --member="group:auditors@example.com"
        --role="projects/{{ gcp_project }}/roles/auditorReadOnly"
        --quiet
      changed_when: true
```

Custom roles give you fine-grained control. Instead of granting `roles/compute.admin` (which includes permissions to delete instances), you can create a role that only includes the specific permissions your deployment pipeline needs.

## Managing Service Account IAM Bindings

Service accounts are both identities (they can authenticate) and resources (you can grant roles on them). You might want to allow a user to impersonate a service account:

```yaml
# service-account-iam.yml - Manage who can use specific service accounts
---
- name: Manage Service Account IAM
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    gcp_project: "my-project-123"
    gcp_cred_kind: "serviceaccount"
    gcp_cred_file: "/opt/ansible/gcp-credentials.json"

  tasks:
    - name: Create a deployment service account
      google.cloud.gcp_iam_service_account:
        name: "deployer@{{ gcp_project }}.iam.gserviceaccount.com"
        display_name: "Application Deployer"
        description: "Service account for CI/CD deployment pipelines"
        project: "{{ gcp_project }}"
        auth_kind: "{{ gcp_cred_kind }}"
        service_account_file: "{{ gcp_cred_file }}"
        state: present
      register: deployer_sa

    - name: Grant CI/CD users permission to impersonate this service account
      ansible.builtin.command: >
        gcloud iam service-accounts add-iam-policy-binding
        deployer@{{ gcp_project }}.iam.gserviceaccount.com
        --member="group:cicd-operators@example.com"
        --role="roles/iam.serviceAccountTokenCreator"
        --project={{ gcp_project }}
        --quiet
      changed_when: true

    - name: Grant the service account permissions on the project
      ansible.builtin.command: >
        gcloud projects add-iam-policy-binding {{ gcp_project }}
        --member="serviceAccount:deployer@{{ gcp_project }}.iam.gserviceaccount.com"
        --role="{{ item }}"
        --quiet
      loop:
        - "roles/run.admin"
        - "roles/storage.objectAdmin"
        - "roles/compute.instanceAdmin.v1"
      changed_when: true
```

## Revoking Access

Removing access is just as important as granting it:

```yaml
# revoke-access.yml - Remove IAM bindings when someone leaves or changes roles
---
- name: Revoke IAM Access
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    gcp_project: "my-project-123"
    departing_members:
      - member: "user:former-employee@example.com"
        roles:
          - "roles/compute.admin"
          - "roles/storage.admin"
          - "roles/cloudsql.admin"

  tasks:
    - name: Remove IAM bindings for departing members
      ansible.builtin.command: >
        gcloud projects remove-iam-policy-binding {{ gcp_project }}
        --member="{{ item.0.member }}"
        --role="{{ item.1 }}"
        --quiet
      loop: "{{ departing_members | subelements('roles') }}"
      register: revoke_results
      changed_when: true
      ignore_errors: true

    - name: Report revocations
      ansible.builtin.debug:
        msg: "Revoked {{ revoke_results.results | length }} bindings"
```

## Auditing Current IAM Policies

To see who has access to what:

```yaml
# audit-iam.yml - Audit current IAM policy for the project
---
- name: Audit IAM Policy
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    gcp_project: "my-project-123"

  tasks:
    - name: Get current IAM policy
      ansible.builtin.command: >
        gcloud projects get-iam-policy {{ gcp_project }}
        --format=json
      register: iam_policy
      changed_when: false

    - name: Parse the policy
      ansible.builtin.set_fact:
        policy: "{{ iam_policy.stdout | from_json }}"

    - name: List all bindings
      ansible.builtin.debug:
        msg: "{{ item.role }}: {{ item.members | join(', ') }}"
      loop: "{{ policy.bindings }}"

    - name: Check for overly broad basic roles
      ansible.builtin.debug:
        msg: "WARNING: Basic role {{ item.role }} is assigned to {{ item.members | join(', ') }}"
      loop: "{{ policy.bindings }}"
      when: item.role in ['roles/owner', 'roles/editor', 'roles/viewer']
```

Basic roles (`roles/owner`, `roles/editor`, `roles/viewer`) are overly broad for most use cases. The audit playbook flags these so you can migrate to more specific predefined or custom roles.

## Conditional Role Bindings

GCP supports conditions on IAM bindings, letting you restrict access based on resource attributes or time:

```yaml
# conditional-binding.yml - IAM binding with conditions
---
- name: Create Conditional IAM Binding
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    gcp_project: "my-project-123"

  tasks:
    - name: Grant compute access only for dev-prefixed instances
      ansible.builtin.command: >
        gcloud projects add-iam-policy-binding {{ gcp_project }}
        --member="group:developers@example.com"
        --role="roles/compute.instanceAdmin.v1"
        --condition='expression=resource.name.startsWith("projects/{{ gcp_project }}/zones/us-central1-a/instances/dev-"),title=dev-instances-only,description=Only manage instances with dev- prefix'
        --quiet
      changed_when: true
```

This binding only grants instance admin permissions on instances whose names start with `dev-`. Developers cannot touch production instances even though they have the `instanceAdmin` role.

## Summary

Managing GCP IAM with Ansible brings discipline to access control. The key principles are: use predefined roles whenever possible (they are designed with least privilege in mind), create custom roles when predefined ones are too broad, prefer group-based bindings over individual user bindings, audit regularly for overly broad basic roles, and revoke access promptly when people change roles or leave. By codifying your IAM policy in Ansible playbooks, every access change is tracked, reviewed, and reversible.
