# How to Use the amazon.aws Collection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, AWS, Cloud Automation, Infrastructure as Code

Description: A hands-on guide to managing AWS infrastructure with Ansible using the amazon.aws collection for EC2, S3, VPC, IAM, and more.

---

The `amazon.aws` collection is the official Ansible collection for managing AWS resources. If you have been using Ansible for configuration management and want to extend it to cloud provisioning without switching to a different tool, this collection lets you manage EC2 instances, S3 buckets, VPCs, IAM policies, RDS databases, and dozens of other AWS services directly from your playbooks.

## Installing the Collection

The collection needs `boto3` and `botocore`, the standard AWS Python SDKs.

```bash
# Install the collection
ansible-galaxy collection install amazon.aws

# Install Python dependencies
pip install boto3 botocore
```

For a locked-down setup, pin versions in your requirements.

```yaml
# requirements.yml - pin collection and dependencies
collections:
  - name: amazon.aws
    version: ">=7.0.0"
```

## Authentication Setup

The collection uses the same credential chain as the AWS CLI. You have several options for providing credentials.

```bash
# Option 1: Environment variables
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
export AWS_DEFAULT_REGION="us-east-1"

# Option 2: AWS credentials file (~/.aws/credentials)
# The collection picks this up automatically

# Option 3: IAM instance role (recommended for EC2-based automation)
# No configuration needed - boto3 detects it automatically
```

You can also pass credentials directly in your playbook, though this is not recommended for production.

```yaml
# playbook-with-explicit-creds.yml - not recommended but useful for testing
- hosts: localhost
  vars:
    aws_access_key: "{{ vault_aws_access_key }}"
    aws_secret_key: "{{ vault_aws_secret_key }}"
    aws_region: "us-east-1"
  tasks:
    - name: List EC2 instances
      amazon.aws.ec2_instance_info:
        aws_access_key: "{{ aws_access_key }}"
        aws_secret_key: "{{ aws_secret_key }}"
        region: "{{ aws_region }}"
      register: ec2_info
```

## Managing VPC Infrastructure

Let us start with networking since everything else depends on it.

```yaml
# playbook-vpc.yml - create a complete VPC setup
- hosts: localhost
  vars:
    aws_region: us-east-1
    vpc_cidr: "10.0.0.0/16"
    project_name: "myapp"
  tasks:
    - name: Create the VPC
      amazon.aws.ec2_vpc_net:
        name: "{{ project_name }}-vpc"
        cidr_block: "{{ vpc_cidr }}"
        region: "{{ aws_region }}"
        tags:
          Project: "{{ project_name }}"
          ManagedBy: ansible
        state: present
      register: vpc

    - name: Create public subnets
      amazon.aws.ec2_vpc_subnet:
        vpc_id: "{{ vpc.vpc.id }}"
        cidr: "{{ item.cidr }}"
        az: "{{ item.az }}"
        region: "{{ aws_region }}"
        map_public: true
        tags:
          Name: "{{ project_name }}-public-{{ item.az }}"
          Tier: public
        state: present
      loop:
        - { cidr: "10.0.1.0/24", az: "us-east-1a" }
        - { cidr: "10.0.2.0/24", az: "us-east-1b" }
      register: public_subnets

    - name: Create private subnets
      amazon.aws.ec2_vpc_subnet:
        vpc_id: "{{ vpc.vpc.id }}"
        cidr: "{{ item.cidr }}"
        az: "{{ item.az }}"
        region: "{{ aws_region }}"
        tags:
          Name: "{{ project_name }}-private-{{ item.az }}"
          Tier: private
        state: present
      loop:
        - { cidr: "10.0.10.0/24", az: "us-east-1a" }
        - { cidr: "10.0.11.0/24", az: "us-east-1b" }
      register: private_subnets

    - name: Create internet gateway
      amazon.aws.ec2_vpc_igw:
        vpc_id: "{{ vpc.vpc.id }}"
        region: "{{ aws_region }}"
        tags:
          Name: "{{ project_name }}-igw"
        state: present
      register: igw

    - name: Create public route table
      amazon.aws.ec2_vpc_route_table:
        vpc_id: "{{ vpc.vpc.id }}"
        region: "{{ aws_region }}"
        subnets: "{{ public_subnets.results | map(attribute='subnet.id') | list }}"
        routes:
          - dest: "0.0.0.0/0"
            gateway_id: "{{ igw.gateway_id }}"
        tags:
          Name: "{{ project_name }}-public-rt"
        state: present
```

## Managing Security Groups

Security groups control network access to your instances.

```yaml
# playbook-security-groups.yml - define security groups
- hosts: localhost
  vars:
    aws_region: us-east-1
    vpc_id: "vpc-abc123"
  tasks:
    - name: Create web server security group
      amazon.aws.ec2_security_group:
        name: "web-servers-sg"
        description: "Security group for web servers"
        vpc_id: "{{ vpc_id }}"
        region: "{{ aws_region }}"
        rules:
          - proto: tcp
            ports: 80
            cidr_ip: "0.0.0.0/0"
            rule_desc: "Allow HTTP"
          - proto: tcp
            ports: 443
            cidr_ip: "0.0.0.0/0"
            rule_desc: "Allow HTTPS"
          - proto: tcp
            ports: 22
            cidr_ip: "10.0.0.0/16"
            rule_desc: "Allow SSH from VPC only"
        rules_egress:
          - proto: all
            cidr_ip: "0.0.0.0/0"
            rule_desc: "Allow all outbound"
        tags:
          Name: "web-servers-sg"
          ManagedBy: ansible
        state: present
      register: web_sg
```

## Launching EC2 Instances

With networking in place, you can launch instances.

```yaml
# playbook-ec2.yml - launch EC2 instances
- hosts: localhost
  vars:
    aws_region: us-east-1
  tasks:
    - name: Launch web server instances
      amazon.aws.ec2_instance:
        name: "web-server-{{ item }}"
        instance_type: t3.medium
        image_id: ami-0c55b159cbfafe1f0
        key_name: my-keypair
        vpc_subnet_id: "subnet-abc123"
        security_groups:
          - "web-servers-sg"
        volumes:
          - device_name: /dev/xvda
            ebs:
              volume_size: 50
              volume_type: gp3
              encrypted: true
              delete_on_termination: true
        tags:
          Environment: production
          Role: webserver
          ManagedBy: ansible
        region: "{{ aws_region }}"
        state: running
        wait: true
      loop: "{{ range(1, 4) | list }}"
      register: ec2_instances

    - name: Wait for SSH to become available
      ansible.builtin.wait_for:
        host: "{{ item.instances[0].public_ip_address }}"
        port: 22
        delay: 10
        timeout: 300
      loop: "{{ ec2_instances.results }}"
      when: item.instances[0].public_ip_address is defined
```

## Managing S3 Buckets

S3 bucket management includes creation, policy configuration, and object operations.

```yaml
# playbook-s3.yml - create and configure S3 buckets
- hosts: localhost
  vars:
    aws_region: us-east-1
    bucket_name: "myapp-assets-production"
  tasks:
    - name: Create S3 bucket with versioning
      amazon.aws.s3_bucket:
        name: "{{ bucket_name }}"
        region: "{{ aws_region }}"
        versioning: true
        encryption: "AES256"
        public_access:
          block_public_acls: true
          ignore_public_acls: true
          block_public_policy: true
          restrict_public_buckets: true
        tags:
          Project: myapp
          Environment: production
        state: present

    - name: Upload application assets to S3
      amazon.aws.s3_object:
        bucket: "{{ bucket_name }}"
        object: "config/app-settings.json"
        src: "files/app-settings.json"
        mode: put
        encryption: "AES256"

    - name: Download a file from S3
      amazon.aws.s3_object:
        bucket: "{{ bucket_name }}"
        object: "backups/latest.sql.gz"
        dest: "/tmp/latest-backup.sql.gz"
        mode: get
```

## Managing IAM Resources

IAM policies, roles, and users are critical for AWS security.

```yaml
# playbook-iam.yml - manage IAM roles and policies
- hosts: localhost
  tasks:
    - name: Create IAM role for EC2 instances
      amazon.aws.iam_role:
        name: "ec2-app-role"
        assume_role_policy_document: |
          {
            "Version": "2012-10-17",
            "Statement": [
              {
                "Effect": "Allow",
                "Principal": {
                  "Service": "ec2.amazonaws.com"
                },
                "Action": "sts:AssumeRole"
              }
            ]
          }
        managed_policies:
          - "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
          - "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
        tags:
          ManagedBy: ansible
        state: present

    - name: Create custom IAM policy
      amazon.aws.iam_policy:
        iam_type: role
        iam_name: "ec2-app-role"
        policy_name: "s3-app-access"
        policy_json: |
          {
            "Version": "2012-10-17",
            "Statement": [
              {
                "Effect": "Allow",
                "Action": [
                  "s3:GetObject",
                  "s3:PutObject"
                ],
                "Resource": "arn:aws:s3:::myapp-assets-production/*"
              }
            ]
          }
        state: present
```

## Using the AWS EC2 Dynamic Inventory

The collection includes an inventory plugin that pulls your EC2 instances dynamically.

```yaml
# inventory/aws_ec2.yml - dynamic inventory configuration
plugin: amazon.aws.aws_ec2
regions:
  - us-east-1
  - us-west-2
keyed_groups:
  - key: tags.Environment
    prefix: env
  - key: tags.Role
    prefix: role
  - key: instance_type
    prefix: type
  - key: placement.availability_zone
    prefix: az
filters:
  instance-state-name: running
  "tag:ManagedBy": ansible
hostnames:
  - private-ip-address
compose:
  ansible_host: private_ip_address
```

Test the inventory with:

```bash
# Verify the dynamic inventory works
ansible-inventory -i inventory/aws_ec2.yml --graph
```

## Practical Advice

Some things I have picked up from using this collection extensively:

1. **Always use `state: present` explicitly.** Do not rely on defaults. Being explicit about state makes playbooks easier to read and audit.

2. **Tag everything.** Tags are how you find and manage resources later. At minimum, add `ManagedBy: ansible` and `Project` tags to every resource.

3. **Use the `_info` modules for lookups.** Modules like `ec2_instance_info`, `ec2_vpc_net_info`, and `ec2_security_group_info` let you query existing resources rather than hardcoding IDs.

4. **Prefer IAM roles over access keys.** If your Ansible controller runs on EC2, use an instance role. It eliminates credential management entirely.

5. **Check mode works well.** Most modules support `--check` mode, so you can preview changes before applying them.

The `amazon.aws` collection gives you a solid, well-maintained path to managing AWS infrastructure through Ansible. It is not a replacement for Terraform when you need full state management, but for operational tasks and configuration-heavy workflows, it fits naturally into an Ansible-based automation strategy.
