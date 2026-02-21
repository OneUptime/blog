# How to Use Ansible to Manage AWS S3 Buckets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, AWS, S3, Storage, Infrastructure as Code

Description: Learn how to create, configure, and manage AWS S3 buckets with Ansible including versioning, encryption, lifecycle policies, and access controls.

---

S3 is one of the most widely used AWS services. Almost every application stores something in S3, whether it is static assets, backups, logs, or data lake files. Managing S3 buckets through the console is fine for one or two buckets, but when you have dozens across multiple accounts and environments, automation becomes essential.

This guide covers creating S3 buckets with Ansible, configuring security settings, enabling versioning, setting up lifecycle policies, and more.

## Prerequisites

You need:

- Ansible 2.14+
- The `amazon.aws` collection
- AWS credentials with S3 permissions
- Python boto3

```bash
# Install dependencies
ansible-galaxy collection install amazon.aws
pip install boto3 botocore
```

## Creating a Basic S3 Bucket

The `amazon.aws.s3_bucket` module handles bucket operations:

```yaml
# create-bucket.yml - Creates an S3 bucket with basic settings
---
- name: Create S3 Bucket
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    aws_region: us-east-1
    bucket_name: myapp-production-assets-2026

  tasks:
    # Create a bucket with versioning enabled from the start
    - name: Create S3 bucket
      amazon.aws.s3_bucket:
        name: "{{ bucket_name }}"
        region: "{{ aws_region }}"
        state: present
        versioning: true
        tags:
          Environment: production
          Application: myapp
          ManagedBy: ansible
      register: bucket_result

    - name: Show bucket info
      ansible.builtin.debug:
        msg: "Bucket created: {{ bucket_name }}"
```

S3 bucket names are globally unique across all AWS accounts. If someone else already has that name, creation will fail. A common pattern is to include your account ID or a unique prefix.

## Encryption at Rest

Every production bucket should have encryption enabled. Server-side encryption with S3-managed keys (SSE-S3) is the simplest option:

```yaml
# Create bucket with default encryption using AES-256
- name: Create encrypted S3 bucket
  amazon.aws.s3_bucket:
    name: "{{ bucket_name }}"
    region: "{{ aws_region }}"
    state: present
    encryption: AES256
    tags:
      Environment: production
```

For stricter compliance requirements, use a KMS key:

```yaml
# Create bucket with KMS encryption for compliance workloads
- name: Create KMS-encrypted S3 bucket
  amazon.aws.s3_bucket:
    name: "{{ bucket_name }}"
    region: "{{ aws_region }}"
    state: present
    encryption: aws:kms
    encryption_key_id: "arn:aws:kms:us-east-1:123456789012:key/abc-123-def-456"
    bucket_key_enabled: true
    tags:
      Environment: production
      Compliance: hipaa
```

The `bucket_key_enabled` option reduces KMS costs by using an S3-level key for encryption instead of making a KMS API call for every object.

## Blocking Public Access

AWS strongly recommends blocking public access on all buckets unless you specifically need it (like hosting a static website). Here is how:

```yaml
# Block all public access to the bucket
- name: Create bucket with public access blocked
  amazon.aws.s3_bucket:
    name: "{{ bucket_name }}"
    region: "{{ aws_region }}"
    state: present
    public_access:
      block_public_acls: true
      ignore_public_acls: true
      block_public_policy: true
      restrict_public_buckets: true
    tags:
      Environment: production
```

This is the secure default. Turning off any of these four settings opens specific types of public access.

## Bucket Policies

Bucket policies control access at the bucket level. Here is an example that allows read access from a specific IAM role:

```yaml
# Set a bucket policy that allows a specific role to read objects
- name: Create bucket with access policy
  amazon.aws.s3_bucket:
    name: "{{ bucket_name }}"
    region: "{{ aws_region }}"
    state: present
    policy: |
      {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Sid": "AllowReadFromAppRole",
            "Effect": "Allow",
            "Principal": {
              "AWS": "arn:aws:iam::123456789012:role/app-read-role"
            },
            "Action": [
              "s3:GetObject",
              "s3:ListBucket"
            ],
            "Resource": [
              "arn:aws:s3:::{{ bucket_name }}",
              "arn:aws:s3:::{{ bucket_name }}/*"
            ]
          }
        ]
      }
```

## Lifecycle Policies

Lifecycle policies move objects between storage classes or delete them after a certain period. This is critical for controlling costs:

```yaml
# create-bucket-lifecycle.yml - Bucket with lifecycle transitions
---
- name: Create S3 Bucket with Lifecycle Policies
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Create bucket
      amazon.aws.s3_bucket:
        name: myapp-logs-bucket
        region: us-east-1
        state: present
        versioning: true

    # Configure lifecycle rules to reduce storage costs over time
    - name: Set lifecycle policy
      community.aws.s3_lifecycle:
        name: myapp-logs-bucket
        region: us-east-1
        state: present
        rule_id: archive-old-logs
        prefix: logs/
        status: enabled
        transitions:
          # Move to Infrequent Access after 30 days
          - days: 30
            storage_class: STANDARD_IA
          # Move to Glacier after 90 days
          - days: 90
            storage_class: GLACIER
        # Delete objects after 365 days
        expiration_days: 365
```

This is a tiered storage pattern that works well for log data. Recent logs stay in Standard storage for fast access. Older logs move to cheaper tiers. Very old logs get deleted.

## CORS Configuration

If your S3 bucket serves content to web browsers (like a static website or API responses), you need CORS rules:

```yaml
# Configure CORS for a bucket that serves assets to web apps
- name: Set CORS configuration
  amazon.aws.s3_bucket:
    name: "{{ bucket_name }}"
    region: "{{ aws_region }}"
    state: present
    cors_rules:
      - allowed_origins:
          - "https://myapp.example.com"
          - "https://staging.example.com"
        allowed_methods:
          - GET
          - HEAD
        allowed_headers:
          - "*"
        max_age_seconds: 3600
```

## Static Website Hosting

S3 can host static websites directly. Here is the configuration:

```yaml
# Enable static website hosting on the bucket
- name: Configure static website
  community.aws.s3_website:
    name: myapp-static-site
    region: us-east-1
    state: present
    suffix: index.html
    error_key: error.html
```

You also need to add a bucket policy that allows public read access for the website to work. Combine this with CloudFront for HTTPS and caching.

## Multi-Environment Bucket Management

A pattern I use frequently is creating a set of buckets for each environment using variables:

```yaml
# multi-env-buckets.yml - Create standard bucket set for an environment
---
- name: Create Environment Buckets
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    aws_region: us-east-1
    env: staging
    project: myapp
    buckets:
      - name: "{{ project }}-{{ env }}-assets"
        versioning: true
        encryption: AES256
      - name: "{{ project }}-{{ env }}-logs"
        versioning: false
        encryption: AES256
      - name: "{{ project }}-{{ env }}-backups"
        versioning: true
        encryption: aws:kms

  tasks:
    # Create each bucket defined in the variables
    - name: Create buckets
      amazon.aws.s3_bucket:
        name: "{{ item.name }}"
        region: "{{ aws_region }}"
        state: present
        versioning: "{{ item.versioning }}"
        encryption: "{{ item.encryption }}"
        public_access:
          block_public_acls: true
          ignore_public_acls: true
          block_public_policy: true
          restrict_public_buckets: true
        tags:
          Environment: "{{ env }}"
          Project: "{{ project }}"
          ManagedBy: ansible
      loop: "{{ buckets }}"
```

Run it for different environments:

```bash
ansible-playbook multi-env-buckets.yml -e "env=production"
ansible-playbook multi-env-buckets.yml -e "env=staging"
```

## Deleting Buckets

To delete a bucket, it must be empty first. The module can force-delete by removing all objects:

```yaml
# Force delete a bucket and all its contents
- name: Delete S3 bucket
  amazon.aws.s3_bucket:
    name: myapp-staging-assets
    region: us-east-1
    state: absent
    force: true
```

Be very careful with `force: true`. It permanently deletes all objects in the bucket, including versioned objects. There is no undo.

## Wrapping Up

Managing S3 buckets with Ansible gives you consistency and repeatability. Define your bucket configurations in version-controlled playbooks, use variables for environment differences, and apply security settings like encryption and public access blocking by default. The time invested in setting up proper automation pays off quickly when you need to create the same bucket structure across multiple AWS accounts or regions.
