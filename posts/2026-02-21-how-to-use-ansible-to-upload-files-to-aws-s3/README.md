# How to Use Ansible to Upload Files to AWS S3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, AWS, S3, File Management, DevOps

Description: Practical guide to uploading files and directories to AWS S3 using Ansible with examples for single files, bulk uploads, and deployment artifacts.

---

Uploading files to S3 is one of the most common tasks in any AWS workflow. Whether you are deploying static website assets, storing configuration files, uploading build artifacts, or syncing log files, Ansible provides modules that make this process repeatable and scriptable.

This guide covers uploading single files, directories, setting permissions, and handling common upload patterns you will encounter in real projects.

## Prerequisites

You need:

- Ansible 2.14+
- The `amazon.aws` collection
- AWS credentials with S3 write permissions
- Python boto3

```bash
# Install the required collection and library
ansible-galaxy collection install amazon.aws
pip install boto3 botocore
```

## Uploading a Single File

The `amazon.aws.s3_object` module handles file operations on S3:

```yaml
# upload-file.yml - Upload a single file to S3
---
- name: Upload File to S3
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    # Upload a local file to a specific S3 path
    - name: Upload configuration file to S3
      amazon.aws.s3_object:
        bucket: myapp-config-bucket
        object: config/app-settings.json
        src: /opt/myapp/config/app-settings.json
        mode: put
        region: us-east-1
      register: upload_result

    - name: Confirm upload
      ansible.builtin.debug:
        msg: "File uploaded to s3://myapp-config-bucket/config/app-settings.json"
```

The `object` parameter is the S3 key (the path within the bucket). The `src` parameter is the local file path. The `mode: put` tells the module to upload.

## Uploading with Content Type and Metadata

When uploading web assets, setting the correct content type matters for browsers:

```yaml
# Upload an HTML file with the correct content type
- name: Upload index.html
  amazon.aws.s3_object:
    bucket: myapp-static-site
    object: index.html
    src: /opt/build/dist/index.html
    mode: put
    region: us-east-1
    metadata:
      Content-Type: text/html
      Cache-Control: "max-age=3600"

# Upload a CSS file with its content type
- name: Upload stylesheet
  amazon.aws.s3_object:
    bucket: myapp-static-site
    object: assets/style.css
    src: /opt/build/dist/assets/style.css
    mode: put
    region: us-east-1
    metadata:
      Content-Type: text/css
      Cache-Control: "max-age=86400"
```

## Uploading Content Directly from a Variable

You do not always need a file on disk. You can upload content directly from a string:

```yaml
# Upload content from a variable without needing a local file
- name: Upload generated config to S3
  amazon.aws.s3_object:
    bucket: myapp-config-bucket
    object: config/runtime.json
    content: |
      {
        "database_host": "db.internal.example.com",
        "cache_host": "cache.internal.example.com",
        "log_level": "info",
        "version": "{{ app_version }}"
      }
    mode: put
    region: us-east-1
```

This is useful for generating configuration files dynamically during deployment.

## Uploading an Entire Directory

For deploying static websites or uploading build artifacts, you often need to upload all files in a directory. Use a loop with `find`:

```yaml
# upload-directory.yml - Upload all files from a directory to S3
---
- name: Upload Directory to S3
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    local_dir: /opt/build/dist
    bucket_name: myapp-static-site
    s3_prefix: ""

  tasks:
    # First, find all files in the local directory
    - name: Find all files to upload
      ansible.builtin.find:
        paths: "{{ local_dir }}"
        recurse: true
        file_type: file
      register: files_to_upload

    # Upload each file, preserving the directory structure
    - name: Upload files to S3
      amazon.aws.s3_object:
        bucket: "{{ bucket_name }}"
        object: "{{ s3_prefix }}{{ item.path | replace(local_dir + '/', '') }}"
        src: "{{ item.path }}"
        mode: put
        region: us-east-1
      loop: "{{ files_to_upload.files }}"
      loop_control:
        label: "{{ item.path | basename }}"
```

The `loop_control` with `label` keeps the output clean by only showing the filename instead of the full file details.

## Using aws_s3_sync for Bulk Uploads

For large directories, the `community.aws.s3_sync` module is more efficient because it only uploads changed files:

```yaml
# Sync a local directory to S3 (only uploads changed files)
- name: Sync build output to S3
  community.aws.s3_sync:
    bucket: myapp-static-site
    file_root: /opt/build/dist/
    key_prefix: ""
    region: us-east-1
    permission: public-read
    delete: true
    cache_control: "max-age=3600"
```

The `delete: true` option removes S3 objects that no longer exist locally. This keeps your S3 bucket in sync with your build output.

## Uploading with Server-Side Encryption

For sensitive files, enable encryption during upload:

```yaml
# Upload a file with SSE-S3 encryption
- name: Upload encrypted file
  amazon.aws.s3_object:
    bucket: myapp-secure-bucket
    object: secrets/database-backup.sql.gz
    src: /opt/backups/database-backup.sql.gz
    mode: put
    region: us-east-1
    encrypt: true
    encryption_mode: aws:kms
    encryption_kms_key_id: "arn:aws:kms:us-east-1:123456789012:key/abc-123"
```

If the bucket already has default encryption configured, S3 will encrypt objects automatically. But explicitly setting it in your playbook makes the intent clear and protects against misconfigured buckets.

## Deploying Static Website Assets

Here is a complete playbook for deploying a static website to S3:

```yaml
# deploy-static-site.yml - Full static site deployment pipeline
---
- name: Deploy Static Website to S3
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    bucket_name: myapp-static-site
    build_dir: /opt/build/dist
    aws_region: us-east-1
    cloudfront_distribution_id: E1234567890ABC

  tasks:
    # Upload HTML files with short cache time
    - name: Find HTML files
      ansible.builtin.find:
        paths: "{{ build_dir }}"
        patterns: "*.html"
        recurse: true
      register: html_files

    - name: Upload HTML files
      amazon.aws.s3_object:
        bucket: "{{ bucket_name }}"
        object: "{{ item.path | replace(build_dir + '/', '') }}"
        src: "{{ item.path }}"
        mode: put
        region: "{{ aws_region }}"
        metadata:
          Content-Type: text/html
          Cache-Control: "no-cache, no-store, must-revalidate"
      loop: "{{ html_files.files }}"
      loop_control:
        label: "{{ item.path | basename }}"

    # Upload static assets with long cache time
    - name: Find static assets
      ansible.builtin.find:
        paths: "{{ build_dir }}/assets"
        recurse: true
        file_type: file
      register: asset_files

    - name: Upload static assets
      amazon.aws.s3_object:
        bucket: "{{ bucket_name }}"
        object: "assets/{{ item.path | replace(build_dir + '/assets/', '') }}"
        src: "{{ item.path }}"
        mode: put
        region: "{{ aws_region }}"
        metadata:
          Cache-Control: "public, max-age=31536000, immutable"
      loop: "{{ asset_files.files }}"
      loop_control:
        label: "{{ item.path | basename }}"

    # Invalidate CloudFront cache so users see the new content
    - name: Invalidate CloudFront cache
      ansible.builtin.command:
        cmd: >
          aws cloudfront create-invalidation
          --distribution-id {{ cloudfront_distribution_id }}
          --paths "/*"
      register: invalidation
      changed_when: true
```

Notice the different caching strategies: HTML files get no caching (so users always see the latest version), while assets in the `/assets` directory get a one-year cache (since their filenames typically contain content hashes).

## Downloading Files from S3

You can also download files using the same module:

```yaml
# Download a file from S3 to the local filesystem
- name: Download configuration from S3
  amazon.aws.s3_object:
    bucket: myapp-config-bucket
    object: config/app-settings.json
    dest: /opt/myapp/config/app-settings.json
    mode: get
    region: us-east-1
```

## Generating Pre-Signed URLs

For temporary access to private S3 objects, generate pre-signed URLs:

```yaml
# Generate a pre-signed URL that expires in 1 hour
- name: Generate pre-signed download URL
  amazon.aws.s3_object:
    bucket: myapp-private-bucket
    object: reports/monthly-report.pdf
    mode: geturl
    expiry: 3600
    region: us-east-1
  register: presigned_url

- name: Show download link
  ansible.builtin.debug:
    msg: "Download URL (expires in 1 hour): {{ presigned_url.url }}"
```

## Error Handling for Uploads

Add retry logic for large file uploads that might fail due to network issues:

```yaml
# Upload with retry logic for unreliable connections
- name: Upload large artifact with retries
  amazon.aws.s3_object:
    bucket: myapp-artifacts
    object: "releases/{{ version }}/app.tar.gz"
    src: /opt/build/app.tar.gz
    mode: put
    region: us-east-1
  retries: 3
  delay: 10
  register: upload_result
  until: upload_result is not failed
```

## Wrapping Up

Uploading files to S3 with Ansible covers a wide range of use cases, from simple config file uploads to full static website deployments. The `s3_object` module handles single files and content strings, while `s3_sync` is better for directory-level synchronization. Combine these with proper encryption, caching headers, and error handling, and you have a solid file management workflow that is version controlled and repeatable.
