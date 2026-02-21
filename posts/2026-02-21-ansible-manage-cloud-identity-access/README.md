# How to Use Ansible to Manage Cloud Identity and Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Cloud, IAM, Security, Automation

Description: Learn how to use Ansible to manage cloud identity and access management across AWS, Azure, and GCP for consistent security policies.

---

Managing identity and access management (IAM) across cloud providers is one of those tasks that gets messy fast. You start with a few users and roles, and before you know it, you have hundreds of policies spread across three cloud providers with no clear audit trail. Ansible gives you a way to codify all of that into repeatable, version-controlled playbooks.

In this guide, I will walk through managing IAM resources across AWS, Azure, and GCP using Ansible modules.

## Why Automate IAM with Ansible?

Manual IAM management through cloud consoles is error-prone. Someone creates a role with overly broad permissions, another person forgets to remove access for a departed employee, and suddenly you have a security incident. With Ansible, every IAM change goes through code review, gets version controlled, and can be rolled back.

The big wins are:

- Consistent policies across environments (dev, staging, production)
- Audit trail through git history
- Ability to replicate IAM structures across accounts
- Drift detection by running playbooks in check mode

## Managing AWS IAM with Ansible

AWS IAM is probably the most common use case. Ansible's `amazon.aws` and `community.aws` collections provide modules for users, groups, roles, and policies.

First, install the required collection:

```bash
# Install the AWS collection for IAM modules
ansible-galaxy collection install amazon.aws community.aws
```

Here is a playbook that creates an IAM user with programmatic access and attaches a managed policy:

```yaml
# create-aws-iam-user.yml - Creates an IAM user with specific permissions
---
- name: Manage AWS IAM users
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    iam_users:
      - name: deploy-bot
        groups:
          - deployers
        managed_policies:
          - arn:aws:iam::aws:policy/AmazonEC2ReadOnlyAccess
      - name: monitoring-bot
        groups:
          - monitors
        managed_policies:
          - arn:aws:iam::aws:policy/CloudWatchReadOnlyAccess

  tasks:
    # Create IAM groups first
    - name: Create IAM groups
      amazon.aws.iam_group:
        name: "{{ item }}"
        state: present
      loop:
        - deployers
        - monitors

    # Create each IAM user
    - name: Create IAM users
      amazon.aws.iam_user:
        name: "{{ item.name }}"
        state: present
      loop: "{{ iam_users }}"

    # Add users to their groups
    - name: Add users to groups
      amazon.aws.iam_group:
        name: "{{ item.1 }}"
        users:
          - "{{ item.0.name }}"
        state: present
      loop: "{{ iam_users | subelements('groups') }}"

    # Attach managed policies to users
    - name: Attach managed policies
      amazon.aws.iam_user:
        name: "{{ item.0.name }}"
        managed_policies: "{{ item.0.managed_policies }}"
        state: present
      loop: "{{ iam_users }}"
```

For custom IAM policies, use the `iam_policy` module:

```yaml
# custom-iam-policy.yml - Creates a custom IAM policy with least privilege
- name: Create custom S3 read-only policy
  amazon.aws.iam_policy:
    iam_type: user
    iam_name: deploy-bot
    policy_name: custom-s3-readonly
    policy_json: |
      {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Action": [
              "s3:GetObject",
              "s3:ListBucket"
            ],
            "Resource": [
              "arn:aws:s3:::my-deploy-bucket",
              "arn:aws:s3:::my-deploy-bucket/*"
            ]
          }
        ]
      }
    state: present
```

## Managing Azure AD and RBAC

Azure uses a different model with Azure AD for identity and RBAC for resource access. Ansible has modules for both.

```bash
# Install Azure collection
ansible-galaxy collection install azure.azcollection
```

Here is how to create a service principal and assign it a role:

```yaml
# azure-rbac.yml - Manage Azure service principals and role assignments
---
- name: Manage Azure identity and access
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    # Create an Azure AD application
    - name: Create Azure AD application
      azure.azcollection.azure_rm_adapplication:
        display_name: ansible-deploy-app
        state: present
      register: app_result

    # Create a service principal for the application
    - name: Create service principal
      azure.azcollection.azure_rm_adserviceprincipal:
        app_id: "{{ app_result.app_id }}"
        state: present
      register: sp_result

    # Assign Contributor role on a resource group
    - name: Assign RBAC role
      azure.azcollection.azure_rm_roleassignment:
        scope: "/subscriptions/{{ lookup('env', 'AZURE_SUBSCRIPTION_ID') }}/resourceGroups/production"
        assignee_object_id: "{{ sp_result.object_id }}"
        role_definition_id: "b24988ac-6180-42a0-ab88-20f7382dd24c"  # Contributor role
        state: present
```

## Managing GCP IAM

GCP IAM works with service accounts and IAM bindings. The `google.cloud` collection handles this:

```bash
# Install GCP collection
ansible-galaxy collection install google.cloud
```

```yaml
# gcp-iam.yml - Manage GCP service accounts and IAM bindings
---
- name: Manage GCP identity and access
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    gcp_project: my-project-id
    gcp_auth_kind: serviceaccount
    gcp_service_account_file: /path/to/service-account.json

  tasks:
    # Create a GCP service account
    - name: Create service account
      google.cloud.gcp_iam_service_account:
        name: ansible-deploy@{{ gcp_project }}.iam.gserviceaccount.com
        display_name: Ansible Deploy Service Account
        project: "{{ gcp_project }}"
        auth_kind: "{{ gcp_auth_kind }}"
        service_account_file: "{{ gcp_service_account_file }}"
        state: present

    # Bind IAM role to the service account
    - name: Add IAM policy binding
      command: >
        gcloud projects add-iam-policy-binding {{ gcp_project }}
        --member="serviceAccount:ansible-deploy@{{ gcp_project }}.iam.gserviceaccount.com"
        --role="roles/compute.viewer"
      changed_when: true
```

## Cross-Cloud IAM Governance Playbook

Here is a practical example that enforces a company-wide policy: no IAM user or service account should have admin-level access in production:

```yaml
# audit-iam.yml - Audit IAM policies across clouds for admin access
---
- name: Audit cloud IAM for overly broad permissions
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    forbidden_aws_policies:
      - arn:aws:iam::aws:policy/AdministratorAccess
      - arn:aws:iam::aws:policy/IAMFullAccess

  tasks:
    # List all AWS IAM users
    - name: Get all IAM users
      amazon.aws.iam_user_info:
      register: aws_users

    # Check each user for forbidden policies
    - name: Flag users with admin policies
      debug:
        msg: "WARNING: User {{ item.user_name }} has overly broad permissions"
      loop: "{{ aws_users.iam_users }}"
      when: item.attached_policies | map(attribute='policy_arn') | intersect(forbidden_aws_policies) | length > 0
```

## Organizing IAM Playbooks

For a real-world setup, structure your IAM automation like this:

```
iam/
  inventory/
    aws-accounts.yml
    azure-subscriptions.yml
    gcp-projects.yml
  roles/
    aws-iam/
      tasks/main.yml
      vars/main.yml
    azure-rbac/
      tasks/main.yml
      vars/main.yml
    gcp-iam/
      tasks/main.yml
      vars/main.yml
  playbooks/
    create-users.yml
    audit-permissions.yml
    rotate-keys.yml
  group_vars/
    all.yml
```

Keep your user definitions in variables files and your policy logic in roles. This way, adding a new user is just a YAML change that goes through your normal pull request process.

## Key Access Rotation

Do not forget about key rotation. Here is a task that rotates AWS access keys older than 90 days:

```yaml
# rotate-old-keys.yml - Rotate AWS access keys older than 90 days
- name: Get access key info
  amazon.aws.iam_access_key_info:
    user_name: "{{ item.user_name }}"
  loop: "{{ aws_users.iam_users }}"
  register: key_info

- name: Delete keys older than 90 days
  amazon.aws.iam_access_key:
    user_name: "{{ item.0.item.user_name }}"
    id: "{{ item.1.access_key_id }}"
    state: absent
  loop: "{{ key_info.results | subelements('access_keys') }}"
  when: >
    (now() - item.1.create_date | to_datetime).days > 90
```

## Wrapping Up

Ansible turns IAM management from a manual, error-prone process into something that lives in version control and goes through code review. The key is to start small: pick one cloud provider, automate the most common IAM tasks, and expand from there. Once you have the patterns in place, adding new users, rotating keys, and auditing permissions becomes a `ansible-playbook` command away rather than a click-through-the-console affair.
