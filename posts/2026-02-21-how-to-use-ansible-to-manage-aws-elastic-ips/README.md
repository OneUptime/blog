# How to Use Ansible to Manage AWS Elastic IPs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, AWS, Elastic IP, Networking, Cloud Automation

Description: Learn how to allocate, associate, and release AWS Elastic IPs using Ansible playbooks for repeatable infrastructure management.

---

If you have ever manually clicked through the AWS console to allocate and associate Elastic IPs, you know it gets old fast. Once you are managing more than a handful of instances, keeping track of which EIP goes where becomes a real headache. Ansible gives you a clean, declarative way to handle Elastic IP lifecycle management so you can version control your networking decisions alongside the rest of your infrastructure.

## Prerequisites

Before you start writing playbooks, you need a few things in place:

- Ansible 2.9 or later installed on your control machine
- The `amazon.aws` collection installed
- AWS credentials configured (either environment variables, AWS CLI profile, or IAM role)
- An existing VPC with at least one running EC2 instance

Install the AWS collection if you have not already:

```bash
# Install the official AWS collection from Ansible Galaxy
ansible-galaxy collection install amazon.aws
```

Make sure your credentials are available. The simplest approach is exporting environment variables:

```bash
# Export AWS credentials for Ansible to use
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="us-east-1"
```

## Understanding Elastic IPs in AWS

Elastic IPs are static IPv4 addresses that you own until you explicitly release them. They are tied to your AWS account, not to any specific instance. This means you can move them between instances without changing DNS records or firewall rules. The catch is that AWS charges you for allocated EIPs that are not associated with a running instance, so keeping them managed properly matters for your bill.

Here is how the workflow looks:

```mermaid
graph LR
    A[Allocate EIP] --> B[Associate with Instance]
    B --> C[Instance Running with Static IP]
    C --> D[Disassociate if Needed]
    D --> E[Re-associate or Release]
    E --> F[EIP Released Back to Pool]
```

## Allocating an Elastic IP

The `amazon.aws.ec2_eip` module handles all Elastic IP operations. Let's start with a simple allocation:

```yaml
# allocate-eip.yml - Allocate a new Elastic IP in your account
---
- name: Allocate an Elastic IP
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Allocate a new Elastic IP
      amazon.aws.ec2_eip:
        region: us-east-1
        state: present
        in_vpc: true
        tag_name: Name
        tag_value: web-server-eip
      register: eip_result

    - name: Show the allocated EIP details
      ansible.builtin.debug:
        msg: "Allocated EIP: {{ eip_result.public_ip }} (Allocation ID: {{ eip_result.allocation_id }})"
```

Run this playbook and Ansible will allocate a fresh EIP in your account. The `in_vpc` parameter ensures the EIP is VPC-compatible, which is what you want for almost every modern use case. The `register` keyword captures the result so you can reference the IP address and allocation ID later.

## Associating an EIP with an EC2 Instance

Having an EIP sitting around unattached costs money and does nothing useful. Here is how to associate it with a running instance:

```yaml
# associate-eip.yml - Associate an Elastic IP with a specific EC2 instance
---
- name: Associate Elastic IP with EC2 Instance
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    target_instance_id: "i-0abc123def456789"
    eip_address: "52.10.20.30"

  tasks:
    - name: Associate EIP with the target instance
      amazon.aws.ec2_eip:
        region: us-east-1
        device_id: "{{ target_instance_id }}"
        public_ip: "{{ eip_address }}"
        state: present
        in_vpc: true
      register: association_result

    - name: Confirm the association
      ansible.builtin.debug:
        msg: "EIP {{ eip_address }} is now associated with {{ target_instance_id }}"
```

If the EIP was previously associated with another instance, Ansible will move it over. This is useful for failover scenarios where you want to point traffic at a standby instance.

## Allocating and Associating in One Step

Most of the time, you want to do both in a single task. The module supports this natively:

```yaml
# allocate-and-associate.yml - Allocate and associate in one shot
---
- name: Allocate and Associate EIP
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    instance_id: "i-0abc123def456789"

  tasks:
    - name: Allocate EIP and associate with instance
      amazon.aws.ec2_eip:
        region: us-east-1
        device_id: "{{ instance_id }}"
        state: present
        in_vpc: true
        tag_name: Name
        tag_value: "eip-{{ instance_id }}"
        reuse_existing_ip_allowed: true
      register: eip

    - name: Print the assigned public IP
      ansible.builtin.debug:
        msg: "Instance {{ instance_id }} now has public IP {{ eip.public_ip }}"
```

The `reuse_existing_ip_allowed` flag is worth noting. When set to true, Ansible will check if there is an unassociated EIP available that matches your tag criteria before allocating a new one. This prevents you from accumulating unused EIPs across repeated playbook runs.

## Releasing an Elastic IP

When you no longer need an EIP, release it to avoid charges:

```yaml
# release-eip.yml - Release an Elastic IP back to the AWS pool
---
- name: Release an Elastic IP
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    eip_to_release: "52.10.20.30"

  tasks:
    - name: Disassociate and release the EIP
      amazon.aws.ec2_eip:
        region: us-east-1
        public_ip: "{{ eip_to_release }}"
        state: absent
      register: release_result

    - name: Confirm release
      ansible.builtin.debug:
        msg: "EIP {{ eip_to_release }} has been released"
```

Setting `state: absent` handles both disassociation and release in one step. If the EIP is currently attached to an instance, Ansible will detach it first and then release it.

## Managing Multiple EIPs with a Loop

In production, you often need to assign EIPs to several instances at once. Here is a pattern that scales:

```yaml
# bulk-eip-assignment.yml - Assign EIPs to multiple instances
---
- name: Bulk EIP Assignment
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    instance_eip_map:
      - instance_id: "i-0abc123def456789"
        name: "web-server-1"
      - instance_id: "i-0def456abc789012"
        name: "web-server-2"
      - instance_id: "i-0ghi789def012345"
        name: "api-server-1"

  tasks:
    - name: Allocate and associate EIP for each instance
      amazon.aws.ec2_eip:
        region: us-east-1
        device_id: "{{ item.instance_id }}"
        state: present
        in_vpc: true
        tag_name: Name
        tag_value: "eip-{{ item.name }}"
        reuse_existing_ip_allowed: true
      loop: "{{ instance_eip_map }}"
      register: eip_results

    - name: Display all EIP assignments
      ansible.builtin.debug:
        msg: "{{ item.item.name }}: {{ item.public_ip }}"
      loop: "{{ eip_results.results }}"
      when: item.public_ip is defined
```

## Idempotency Considerations

One thing I have learned from running these playbooks in CI/CD pipelines is that idempotency matters a lot with EIPs. If you run the association playbook twice with the same instance and EIP, it should not fail or create duplicates. The `amazon.aws.ec2_eip` module handles this well as long as you provide consistent identifiers.

However, watch out for this gotcha: if you specify `reuse_existing_ip_allowed: true` but your tag filters match multiple unassociated EIPs, the module will pick one and you might not get the same one on every run. To avoid surprises, use specific allocation IDs when you need deterministic behavior.

## Putting It All Together

A production-ready playbook typically combines allocation, association, and cleanup into a single role:

```yaml
# site.yml - Full EIP lifecycle management
---
- name: Manage Elastic IPs for Web Tier
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    aws_region: us-east-1
    active_instances:
      - id: "i-0abc123def456789"
        name: "web-1"
    decommissioned_eips:
      - "52.10.20.31"

  tasks:
    - name: Ensure EIPs for active instances
      amazon.aws.ec2_eip:
        region: "{{ aws_region }}"
        device_id: "{{ item.id }}"
        state: present
        in_vpc: true
        tag_name: Name
        tag_value: "eip-{{ item.name }}"
        reuse_existing_ip_allowed: true
      loop: "{{ active_instances }}"

    - name: Release decommissioned EIPs
      amazon.aws.ec2_eip:
        region: "{{ aws_region }}"
        public_ip: "{{ item }}"
        state: absent
      loop: "{{ decommissioned_eips }}"
      ignore_errors: true
```

The `ignore_errors: true` on the release task is deliberate. If an EIP was already released (maybe someone cleaned it up manually), you do not want the entire playbook to fail. In a perfect world nobody touches the console, but we all know better.

## Summary

Managing Elastic IPs with Ansible removes the manual overhead and gives you an auditable, version-controlled approach to static IP management. The key takeaways are: always use `in_vpc: true` for modern workloads, leverage `reuse_existing_ip_allowed` to avoid EIP sprawl, and make sure your tagging strategy is consistent so the module can find existing allocations reliably. Once you have this automated, EIP management becomes a non-issue in your day-to-day operations.
