# How to Use Ansible with AWS SSM Session Manager (No SSH)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, AWS, SSM, DevOps, Cloud

Description: Run Ansible playbooks on EC2 instances using AWS Systems Manager Session Manager without opening SSH ports

---

Opening port 22 to the internet is something that keeps security teams up at night. AWS Systems Manager (SSM) Session Manager gives you a way to manage EC2 instances without SSH, without bastion hosts, and without opening any inbound ports. The good news is that Ansible has a connection plugin for SSM, so you can run your existing playbooks through the SSM channel instead of SSH.

This guide walks through the full setup, from IAM roles to running your first playbook over SSM.

## Prerequisites

Before you start, you need a few things in place:

- AWS CLI v2 installed and configured on your Ansible controller
- The Session Manager plugin for the AWS CLI installed
- EC2 instances with the SSM Agent running (Amazon Linux 2 and Ubuntu 20.04+ have it pre-installed)
- An IAM instance profile attached to your EC2 instances with the right permissions
- The `amazon.aws` Ansible collection installed

```bash
# Install the Session Manager plugin (macOS)
curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/mac/session-manager-plugin.pkg" -o "session-manager-plugin.pkg"
sudo installer -pkg session-manager-plugin.pkg -target /

# Install the Ansible AWS collection
ansible-galaxy collection install amazon.aws

# Verify the SSM plugin is working
session-manager-plugin --version
```

## IAM Instance Profile Setup

Your EC2 instances need an IAM role with the `AmazonSSMManagedInstanceCore` managed policy. Here is a CloudFormation snippet for that.

```yaml
# cloudformation/ssm-role.yml
# IAM role that allows EC2 instances to communicate with SSM
Resources:
  SSMInstanceRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: AnsibleSSMRole
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: ec2.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore

  SSMInstanceProfile:
    Type: AWS::IAM::InstanceProfile
    Properties:
      InstanceProfileName: AnsibleSSMProfile
      Roles:
        - !Ref SSMInstanceRole
```

## Verifying SSM Agent Status

Before trying Ansible, make sure your instances are registered with SSM.

```bash
# List all SSM-managed instances in your account
aws ssm describe-instance-information --query 'InstanceInformationList[*].[InstanceId,PingStatus,PlatformName]' --output table

# You should see output like:
# -------------------------------------------
# | i-0abc123def456  | Online | Amazon Linux |
# | i-0def789abc012  | Online | Ubuntu       |
# -------------------------------------------
```

If an instance shows as "ConnectionLost" or does not appear at all, check that the SSM Agent is running and that the instance has the correct IAM role attached.

## Inventory Configuration

With SSM, your inventory uses instance IDs instead of IP addresses. This is a fundamental difference from SSH-based inventory.

```ini
# inventory/ssm_hosts.ini
# Use instance IDs as hostnames and the aws_ssm connection plugin
[webservers]
i-0abc123def456789a
i-0def789abc0123456

[webservers:vars]
ansible_connection=aws_ssm
ansible_aws_ssm_region=us-east-1
ansible_aws_ssm_bucket_name=my-ansible-ssm-bucket
```

The `ansible_aws_ssm_bucket_name` is an S3 bucket that the SSM connection plugin uses to transfer files to and from the instance. You need to create this bucket beforehand.

```bash
# Create the S3 bucket for SSM file transfers
aws s3 mb s3://my-ansible-ssm-bucket --region us-east-1
```

## Running Your First Playbook Over SSM

Here is a simple playbook to verify everything works.

```yaml
# playbooks/ssm-test.yml
# Basic connectivity test using SSM instead of SSH
---
- name: Test SSM connectivity
  hosts: webservers
  gather_facts: true

  tasks:
    - name: Print OS information
      ansible.builtin.debug:
        msg: "Connected to {{ ansible_distribution }} {{ ansible_distribution_version }}"

    - name: Check effective user
      ansible.builtin.command: whoami
      register: user_info

    - name: Show user
      ansible.builtin.debug:
        msg: "Running as {{ user_info.stdout }}"
```

Run it with:

```bash
# Execute the playbook using SSM transport
ansible-playbook -i inventory/ssm_hosts.ini playbooks/ssm-test.yml -v
```

Note that SSM sessions typically connect as `ssm-user` or root depending on the OS and SSM Agent configuration. On Amazon Linux 2, you will likely connect as `ssm-user`.

## Dynamic Inventory with SSM

Hardcoding instance IDs is not practical. Use the AWS EC2 dynamic inventory plugin to discover instances automatically.

```yaml
# inventory/aws_ec2.yml
# Dynamic inventory that discovers EC2 instances by tag
plugin: amazon.aws.aws_ec2
regions:
  - us-east-1
filters:
  tag:Environment: production
  tag:ManagedBy: ansible
  instance-state-name: running
keyed_groups:
  - key: tags.Role
    prefix: role
hostnames:
  - instance-id
compose:
  ansible_connection: "'aws_ssm'"
  ansible_aws_ssm_region: "'us-east-1'"
  ansible_aws_ssm_bucket_name: "'my-ansible-ssm-bucket'"
```

This discovers all running instances tagged with `Environment=production` and `ManagedBy=ansible`, then configures them to use the SSM connection automatically.

```bash
# Test the dynamic inventory
ansible-inventory -i inventory/aws_ec2.yml --list

# Run a playbook using dynamic inventory
ansible-playbook -i inventory/aws_ec2.yml playbooks/deploy.yml
```

## Handling File Transfers

The SSM connection plugin uses S3 as an intermediary for file transfers. When you use modules like `copy` or `template`, Ansible uploads the file to S3, then downloads it on the instance. This means your S3 bucket needs proper permissions.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::my-ansible-ssm-bucket/*"
        },
        {
            "Effect": "Allow",
            "Action": "s3:ListBucket",
            "Resource": "arn:aws:s3:::my-ansible-ssm-bucket"
        }
    ]
}
```

Both the Ansible controller (via your AWS credentials) and the EC2 instance (via its instance profile) need this S3 access.

## Performance Tuning

SSM connections are slower than direct SSH because of the additional hops through the AWS API. Here are some ways to improve performance.

```ini
# ansible.cfg optimized for SSM
[defaults]
forks = 10
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_facts_cache
fact_caching_timeout = 3600

[connection]
pipelining = false
```

Pipelining does not work with the SSM connection plugin, so leave it disabled. Fact caching helps because gathering facts over SSM is noticeably slower than over SSH.

## Mixing SSM and SSH Connections

In some environments, you might have instances accessible over SSH and others only through SSM. Ansible handles this through per-host or per-group connection settings.

```ini
# inventory/mixed.ini
# Some hosts use SSH, others use SSM
[ssh_hosts]
bastion ansible_host=54.123.45.67 ansible_connection=ssh ansible_user=ec2-user

[ssm_hosts]
i-0abc123def456789a ansible_connection=aws_ssm ansible_aws_ssm_region=us-east-1

[all:vars]
ansible_aws_ssm_bucket_name=my-ansible-ssm-bucket
```

## Security Benefits

Using SSM instead of SSH gives you several security advantages:

1. No inbound ports need to be open on your instances. Zero. None.
2. All session activity is logged in CloudTrail, giving you a full audit trail.
3. You can use IAM policies to control who can start sessions with which instances.
4. Session data can be encrypted with a KMS key.
5. No SSH keys to manage, rotate, or worry about being compromised.

## Limitations to Be Aware Of

SSM is not a perfect drop-in replacement for SSH:

- File transfers are slower because they go through S3
- The SSM Agent must be running on the target instance
- Some Ansible modules that rely on SSH-specific features may not work
- Connection setup takes longer than a direct SSH connection
- You cannot use SSM for instances that do not have internet access or a VPC endpoint for SSM

For most Ansible workloads, these limitations are minor compared to the security benefits of not having SSH exposed at all.
