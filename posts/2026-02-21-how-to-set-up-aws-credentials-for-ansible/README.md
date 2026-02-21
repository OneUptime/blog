# How to Set Up AWS Credentials for Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, AWS, Credentials, IAM, Security

Description: Configure AWS credentials for Ansible using environment variables, credential files, IAM roles, and AWS SSO for secure cloud automation.

---

Before Ansible can manage anything in AWS, it needs to authenticate. The `amazon.aws` collection supports several authentication methods, from simple access keys to IAM roles and SSO profiles. Picking the right method depends on where your playbooks run: locally on a developer laptop, in a CI/CD pipeline, on an EC2 instance, or inside AWX. This post covers every approach with working examples.

## Install the Required Collection

First, make sure you have the `amazon.aws` collection and the `boto3` Python library installed.

```bash
# Install the Amazon AWS collection
ansible-galaxy collection install amazon.aws

# Install boto3 (the AWS SDK for Python)
pip3 install boto3 botocore
```

Every AWS module in Ansible uses `boto3` under the hood. If `boto3` is not installed, modules will fail with an import error.

## Method 1: Environment Variables

The simplest method. Set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in your shell, and every AWS module will use them automatically.

```bash
# Export AWS credentials as environment variables
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
export AWS_DEFAULT_REGION="us-east-1"

# Run your playbook
ansible-playbook aws-setup.yml
```

This works for quick testing but is not great for production. The credentials are in your shell history and visible in process listings.

## Method 2: AWS Credentials File

The standard AWS credentials file at `~/.aws/credentials` is supported by both the AWS CLI and Ansible.

```ini
# ~/.aws/credentials
[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

[production]
aws_access_key_id = AKIAI44QH8DHBEXAMPLE
aws_secret_access_key = je7MtGbClwBF/2Zp9Utk/h3yCo8nvbEXAMPLEKEY

[staging]
aws_access_key_id = AKIAISTAGINGTEXAMPLE
aws_secret_access_key = stagingSecretKey/bPxRfiCYEXAMPLEKEY
```

To use a specific profile, set the `AWS_PROFILE` environment variable or use the `profile` parameter in your tasks.

```yaml
# Using a specific AWS profile in a playbook
---
- name: Manage production AWS resources
  hosts: localhost
  connection: local

  tasks:
    - name: List S3 buckets using production profile
      amazon.aws.s3_bucket_info:
        profile: production
      register: buckets

    - name: Show bucket names
      ansible.builtin.debug:
        msg: "{{ buckets.buckets | map(attribute='name') | list }}"
```

## Method 3: Inline Credentials in Tasks

You can pass credentials directly in each task. This is not recommended for production because it means credentials end up in playbook files, but it is useful for understanding how authentication works.

```yaml
# Inline credentials (avoid in production)
- name: Create an S3 bucket
  amazon.aws.s3_bucket:
    name: my-ansible-bucket
    region: us-east-1
    aws_access_key: "{{ aws_access_key }}"
    aws_secret_key: "{{ aws_secret_key }}"
    state: present
```

If you do use inline credentials, pull them from Ansible Vault or AWX credentials, not from plain text variables.

## Method 4: IAM Instance Roles (EC2)

When your playbooks run on an EC2 instance, the best approach is to use an IAM instance role. No credentials are stored anywhere. The EC2 metadata service provides temporary credentials automatically.

```bash
# Create an IAM role for Ansible (using AWS CLI)
aws iam create-role \
  --role-name AnsibleAutomation \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ec2.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach the required policies
aws iam attach-role-policy \
  --role-name AnsibleAutomation \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2FullAccess

aws iam attach-role-policy \
  --role-name AnsibleAutomation \
  --policy-arn arn:aws:iam::aws:policy/AmazonVPCFullAccess

# Create an instance profile and add the role
aws iam create-instance-profile \
  --instance-profile-name AnsibleAutomation

aws iam add-role-to-instance-profile \
  --instance-profile-name AnsibleAutomation \
  --role-name AnsibleAutomation
```

When you launch an EC2 instance with this profile attached, `boto3` picks up the credentials automatically. No configuration needed in your playbook.

```yaml
# Playbook that uses IAM role credentials (no explicit auth)
---
- name: Manage AWS resources via IAM role
  hosts: localhost
  connection: local

  tasks:
    - name: Get current EC2 instances
      amazon.aws.ec2_instance_info:
        region: us-east-1
        filters:
          instance-state-name: running
      register: instances

    - name: Show instance count
      ansible.builtin.debug:
        msg: "Running instances: {{ instances.instances | length }}"
```

## Method 5: Assuming a Role with STS

For cross-account access or when you need to escalate privileges, assume an IAM role using STS.

```yaml
# Assume a role before running tasks
---
- name: Cross-account management
  hosts: localhost
  connection: local

  tasks:
    - name: Assume the deployment role
      amazon.aws.sts_assume_role:
        role_arn: "arn:aws:iam::123456789012:role/DeploymentRole"
        role_session_name: "AnsibleDeployment"
        duration_seconds: 3600
        region: us-east-1
      register: assumed_role

    - name: Use assumed role credentials to manage resources
      amazon.aws.ec2_instance_info:
        region: us-east-1
        aws_access_key: "{{ assumed_role.sts_creds.access_key }}"
        aws_secret_key: "{{ assumed_role.sts_creds.secret_key }}"
        security_token: "{{ assumed_role.sts_creds.session_token }}"
      register: instances
```

## Method 6: AWS SSO Profiles

If your organization uses AWS SSO (IAM Identity Center), you can use SSO profiles with Ansible.

```bash
# Configure SSO profile
aws configure sso
# Follow the prompts to set up your SSO profile

# Log in to SSO
aws sso login --profile my-sso-profile
```

```yaml
# Use the SSO profile in your playbook
- name: Tasks using SSO authentication
  hosts: localhost
  connection: local
  environment:
    AWS_PROFILE: my-sso-profile

  tasks:
    - name: List EC2 instances
      amazon.aws.ec2_instance_info:
        region: us-east-1
      register: instances
```

## Credential Precedence

When multiple credential sources are available, `boto3` checks them in this order:

```mermaid
flowchart TD
    A[Task Parameters] --> B{Found?}
    B -->|Yes| Z[Use These]
    B -->|No| C[Environment Variables]
    C --> D{Found?}
    D -->|Yes| Z
    D -->|No| E[AWS Credentials File]
    E --> F{Found?}
    F -->|Yes| Z
    F -->|No| G[AWS Config File / SSO]
    G --> H{Found?}
    H -->|Yes| Z
    H -->|No| I[IAM Instance Role]
    I --> J{Found?}
    J -->|Yes| Z
    J -->|No| K[Error: No credentials]
```

## Setting Up AWS Credentials in AWX

In AWX, create an Amazon Web Services credential.

```bash
# Create an AWS credential in AWX
curl -s -X POST \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -H "Content-Type: application/json" \
  https://awx.example.com/api/v2/credentials/ \
  -d '{
    "name": "AWS Production",
    "organization": 1,
    "credential_type": 6,
    "inputs": {
      "username": "AKIAIOSFODNN7EXAMPLE",
      "password": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
    }
  }'
```

AWX injects these as environment variables (`AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`) when the job runs. Your playbook does not need any explicit credential configuration.

For STS role assumption through AWX, use the `sts_token` input.

```bash
# Create an AWS credential with role assumption
curl -s -X POST \
  -H "Authorization: Bearer ${AWX_TOKEN}" \
  -H "Content-Type: application/json" \
  https://awx.example.com/api/v2/credentials/ \
  -d '{
    "name": "AWS Production - Cross Account",
    "organization": 1,
    "credential_type": 6,
    "inputs": {
      "username": "AKIAIOSFODNN7EXAMPLE",
      "password": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      "security_token": ""
    }
  }'
```

## Security Best Practices

1. **Never commit credentials to Git.** Use Ansible Vault, AWX credentials, or environment variables.
2. **Use IAM roles when running on EC2.** No static credentials to manage or rotate.
3. **Use least-privilege IAM policies.** Do not use `AdministratorAccess` for Ansible. Create policies that grant only the permissions your playbooks need.
4. **Rotate access keys regularly.** Set up a reminder to rotate keys every 90 days.
5. **Use STS for cross-account access.** Temporary credentials are always safer than long-lived keys.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ec2:Describe*",
                "ec2:RunInstances",
                "ec2:TerminateInstances",
                "ec2:CreateTags",
                "ec2:CreateSecurityGroup",
                "ec2:AuthorizeSecurityGroupIngress",
                "ec2:RevokeSecurityGroupIngress"
            ],
            "Resource": "*"
        }
    ]
}
```

## Wrapping Up

AWS credential setup for Ansible boils down to choosing the right method for your environment. Use environment variables or credential files for local development, IAM roles for EC2-based execution, STS for cross-account work, and AWX credentials for centralized automation. Whatever method you pick, avoid hardcoding credentials in playbooks and follow the principle of least privilege for IAM policies.
