# How to Create AWS EC2 Dynamic Inventory in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, AWS, EC2, Dynamic Inventory, Cloud Automation

Description: Step-by-step guide to setting up the AWS EC2 dynamic inventory plugin in Ansible to automatically discover and group your EC2 instances for automation.

---

Managing AWS EC2 instances with a static inventory file is a losing battle. Instances come and go through auto-scaling, deployments spin up new servers, and old ones get terminated. The AWS EC2 inventory plugin queries the EC2 API in real time, so your inventory always reflects the actual state of your infrastructure.

## Prerequisites

Before setting up the EC2 inventory plugin, you need the AWS collection and the boto3 Python library installed.

```bash
# Install the AWS Ansible collection
ansible-galaxy collection install amazon.aws

# Install the required Python library
pip install boto3 botocore
```

You also need AWS credentials configured. The plugin uses the same credential chain as the AWS CLI:

```bash
# Option 1: Environment variables
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"

# Option 2: AWS CLI profile (recommended)
aws configure --profile ansible
export AWS_PROFILE=ansible
```

## Basic EC2 Inventory Configuration

Create a file ending in `aws_ec2.yml` or `aws_ec2.yaml`. The filename suffix tells Ansible to use the EC2 inventory plugin.

```yaml
# inventory/aws_ec2.yml
# Basic AWS EC2 dynamic inventory configuration
plugin: amazon.aws.aws_ec2
regions:
  - us-east-1

# Only discover running instances
filters:
  instance-state-name: running
```

Test it immediately:

```bash
# List all discovered EC2 instances
ansible-inventory -i inventory/aws_ec2.yml --list

# Show the group hierarchy
ansible-inventory -i inventory/aws_ec2.yml --graph
```

## Filtering Instances

You almost never want every running instance in your inventory. Use filters to narrow the results.

```yaml
# inventory/aws_ec2.yml
# Filter to only managed instances
plugin: amazon.aws.aws_ec2
regions:
  - us-east-1
  - us-west-2

filters:
  # Only running instances
  instance-state-name: running
  # Only instances tagged as Ansible-managed
  tag:managed_by: ansible
  # Only specific instance types (optional)
  # instance-type:
  #   - t3.medium
  #   - t3.large
```

You can also use the `exclude_filters` option to remove specific instances:

```yaml
# inventory/aws_ec2.yml
plugin: amazon.aws.aws_ec2
regions:
  - us-east-1

filters:
  instance-state-name: running
  tag:managed_by: ansible

exclude_filters:
  - tag:skip_ansible: "true"
```

## Grouping Instances with keyed_groups

The `keyed_groups` option creates Ansible groups based on EC2 instance attributes and tags.

```yaml
# inventory/aws_ec2.yml
# Group instances by tags and attributes
plugin: amazon.aws.aws_ec2
regions:
  - us-east-1

filters:
  instance-state-name: running

keyed_groups:
  # Group by the "role" tag: creates groups like aws_role_web, aws_role_db
  - key: tags.role
    prefix: aws_role
    separator: "_"

  # Group by the "environment" tag: creates groups like aws_env_production
  - key: tags.environment
    prefix: aws_env
    separator: "_"

  # Group by instance type: creates groups like aws_type_t3_medium
  - key: instance_type
    prefix: aws_type
    separator: "_"

  # Group by availability zone: creates groups like aws_az_us_east_1a
  - key: placement.availability_zone
    prefix: aws_az
    separator: "_"

  # Group by VPC ID
  - key: vpc_id
    prefix: aws_vpc
    separator: "_"
```

With these settings, an EC2 instance tagged `role=web` and `environment=production` running as `t3.medium` in `us-east-1a` would appear in these groups:
- `aws_role_web`
- `aws_env_production`
- `aws_type_t3_medium`
- `aws_az_us_east_1a`
- `aws_vpc_vpc_0abc123`

## Setting Hostnames

By default, Ansible uses the instance ID as the hostname (something like `i-0abc123def456`). That is hard to read. Use the `hostnames` option to pick something better.

```yaml
# inventory/aws_ec2.yml
# Use meaningful hostnames
plugin: amazon.aws.aws_ec2
regions:
  - us-east-1

filters:
  instance-state-name: running

hostnames:
  # Try the Name tag first, fall back to private DNS, then instance ID
  - tag:Name
  - private-dns-name
  - instance-id

# Only use hostnames that match this pattern (optional)
# hostnames_filter:
#   - "^web-.*"
```

## Composing Variables

The `compose` option lets you create Ansible variables from EC2 instance attributes.

```yaml
# inventory/aws_ec2.yml
# Map EC2 attributes to Ansible variables
plugin: amazon.aws.aws_ec2
regions:
  - us-east-1

filters:
  instance-state-name: running
  tag:managed_by: ansible

hostnames:
  - tag:Name

keyed_groups:
  - key: tags.role
    prefix: role
    separator: "_"
  - key: tags.environment
    prefix: env
    separator: "_"

compose:
  # Use private IP for SSH connections
  ansible_host: private_ip_address

  # Set SSH user based on AMI (Amazon Linux vs Ubuntu)
  ansible_user: >-
    'ubuntu' if image_id.startswith('ami-ubuntu')
    else 'ec2-user'

  # Map tags to variables
  environment: tags.environment | default('unknown')
  server_role: tags.role | default('unknown')
  instance_type: instance_type
  availability_zone: placement.availability_zone
  launch_time: launch_time
```

## Complete Production Configuration

Here is a full production-ready EC2 inventory configuration:

```yaml
# inventory/aws_ec2.yml
# Production AWS EC2 dynamic inventory
plugin: amazon.aws.aws_ec2

# Search multiple regions
regions:
  - us-east-1
  - us-west-2

# AWS credentials (use profiles for safety)
# aws_profile: ansible-production

# Performance: cache results for 5 minutes
cache: true
cache_plugin: jsonfile
cache_timeout: 300
cache_connection: /tmp/ansible_aws_ec2_cache

# Only managed, running instances
filters:
  instance-state-name: running
  tag:managed_by: ansible

# Skip instances tagged for exclusion
exclude_filters:
  - tag:ansible_skip: "true"

# Human-readable hostnames
hostnames:
  - tag:Name
  - private-dns-name

# Automatic grouping
keyed_groups:
  - key: tags.role
    prefix: role
    separator: "_"
    default_value: untagged
  - key: tags.environment
    prefix: env
    separator: "_"
    default_value: unknown
  - key: tags.team
    prefix: team
    separator: "_"
  - key: placement.region
    prefix: region
    separator: "_"
  - key: platform | default('linux')
    prefix: os
    separator: "_"

# Variable composition
compose:
  ansible_host: private_ip_address
  ansible_user: "'ubuntu'"
  ec2_instance_id: instance_id
  ec2_instance_type: instance_type
  ec2_region: placement.region
  ec2_az: placement.availability_zone
  ec2_vpc_id: vpc_id
  ec2_subnet_id: subnet_id
  ec2_private_ip: private_ip_address
  ec2_public_ip: public_ip_address | default('')
  ec2_launch_time: launch_time

# Create groups based on conditions
groups:
  # All instances with public IPs
  public_facing: public_ip_address is defined
  # Large instances that might need special attention
  large_instances: >-
    instance_type.startswith('m5.2x') or
    instance_type.startswith('c5.2x') or
    instance_type.startswith('r5.2x')
```

## Using the Dynamic Inventory in Playbooks

With the inventory configured, playbooks target the dynamically-created groups:

```yaml
# deploy-web.yml
# Deploy to all web servers discovered by EC2 plugin
- hosts: role_web
  become: true
  vars:
    app_version: "2.4.1"
  tasks:
    - name: Pull latest application code
      git:
        repo: "https://github.com/company/webapp.git"
        dest: /opt/webapp
        version: "v{{ app_version }}"

    - name: Restart application
      systemd:
        name: webapp
        state: restarted

# Run maintenance on production databases
- hosts: role_db:&env_production
  become: true
  serial: 1
  tasks:
    - name: Run database vacuum
      command: vacuumdb --all --analyze
      become_user: postgres
```

## Troubleshooting

Common issues and how to fix them:

```bash
# Debug: show raw EC2 API response
ansible-inventory -i inventory/aws_ec2.yml --list -vvv

# Check if credentials are working
aws sts get-caller-identity

# Test connectivity to discovered hosts
ansible all -i inventory/aws_ec2.yml -m ping --limit role_web
```

If no hosts appear:
- Check that your filters match actual instances
- Verify the AWS credentials have `ec2:DescribeInstances` permission
- Make sure the region is correct

If hostnames are wrong:
- Check the `hostnames` configuration
- Verify that the `Name` tag exists on your instances

## IAM Policy

The EC2 inventory plugin needs read-only access. Here is a minimal IAM policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeInstances",
                "ec2:DescribeRegions",
                "ec2:DescribeTags"
            ],
            "Resource": "*"
        }
    ]
}
```

Attach this policy to the IAM user or role that Ansible uses. No write permissions are needed for inventory discovery.

The EC2 dynamic inventory plugin is the foundation of AWS automation with Ansible. Set it up once, tag your instances consistently, and your playbooks will always target the right servers without any manual inventory updates.
