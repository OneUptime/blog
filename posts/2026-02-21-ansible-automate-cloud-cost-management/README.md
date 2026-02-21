# How to Use Ansible to Automate Cloud Cost Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Cloud, Cost Management, FinOps, Automation

Description: Automate cloud cost management with Ansible playbooks that identify waste, enforce tagging policies, and shut down unused resources across providers.

---

Cloud bills have a way of sneaking up on teams. You spin up a few extra instances for testing, someone provisions an oversized database, and next month the finance team is asking questions. Ansible can help you get ahead of this by automating the boring parts of cloud cost management: finding unused resources, enforcing tagging policies, scheduling shutdowns, and generating reports.

This guide covers practical playbooks for keeping cloud costs under control without needing a dedicated FinOps platform.

## The Cost Management Problem

Most cloud waste falls into predictable categories:

- Idle or underutilized instances running 24/7
- Unattached storage volumes and old snapshots
- Resources missing cost allocation tags
- Development environments left running overnight and on weekends
- Oversized instances that could be downsized

Ansible can address all of these through scheduled playbooks.

## Enforcing Tagging Policies

Tags are the foundation of cost allocation. Without them, you cannot tell which team or project is responsible for what spend. Here is a playbook that finds untagged EC2 instances and either tags them or flags them for review:

```yaml
# enforce-tags.yml - Find and tag untagged EC2 instances
---
- name: Enforce AWS resource tagging
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    required_tags:
      - team
      - environment
      - project
    default_tags:
      managed_by: ansible
      compliance: needs_review

  tasks:
    # Gather all EC2 instances
    - name: Get all EC2 instances
      amazon.aws.ec2_instance_info:
        region: us-east-1
      register: all_instances

    # Identify instances missing required tags
    - name: Find instances missing required tags
      set_fact:
        untagged_instances: >-
          {{ all_instances.instances | selectattr('state.name', 'eq', 'running')
             | rejectattr('tags.' + item, 'defined')
             | list }}
      loop: "{{ required_tags }}"
      register: missing_tags_result

    # Apply default tags to untagged resources
    - name: Apply default compliance tags
      amazon.aws.ec2_tag:
        region: us-east-1
        resource: "{{ item.instance_id }}"
        tags: "{{ default_tags }}"
        state: present
      loop: "{{ all_instances.instances | selectattr('state.name', 'eq', 'running') | list }}"
      when: item.tags.team is not defined
```

## Scheduling Development Environment Shutdowns

One of the quickest wins is shutting down dev and staging environments outside business hours. This playbook stops instances tagged as non-production on evenings and weekends:

```yaml
# stop-dev-instances.yml - Stop non-production instances outside business hours
---
- name: Stop development instances for cost savings
  hosts: localhost
  connection: local
  gather_facts: true

  vars:
    business_hours_start: 8
    business_hours_end: 19
    aws_region: us-east-1

  tasks:
    # Check if we are outside business hours
    - name: Determine if outside business hours
      set_fact:
        outside_hours: >-
          {{ (ansible_date_time.hour | int < business_hours_start) or
             (ansible_date_time.hour | int >= business_hours_end) or
             (ansible_date_time.weekday in ['Saturday', 'Sunday']) }}

    # Find running dev instances
    - name: Get running dev instances
      amazon.aws.ec2_instance_info:
        region: "{{ aws_region }}"
        filters:
          "tag:environment": ["development", "staging"]
          instance-state-name: running
      register: dev_instances
      when: outside_hours

    # Stop the instances
    - name: Stop dev instances outside business hours
      amazon.aws.ec2_instance:
        region: "{{ aws_region }}"
        instance_ids: "{{ dev_instances.instances | map(attribute='instance_id') | list }}"
        state: stopped
      when:
        - outside_hours
        - dev_instances.instances | length > 0

    # Log what we stopped
    - name: Report stopped instances
      debug:
        msg: "Stopped {{ dev_instances.instances | length }} dev instances to save costs"
      when: outside_hours and dev_instances.instances | length > 0
```

Schedule this with a cron job or Ansible Tower/AWX schedule to run every evening at 7 PM and every Friday evening.

The companion playbook to start them back up in the morning:

```yaml
# start-dev-instances.yml - Start non-production instances during business hours
---
- name: Start development instances for business hours
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    # Find stopped dev instances
    - name: Get stopped dev instances
      amazon.aws.ec2_instance_info:
        region: us-east-1
        filters:
          "tag:environment": ["development", "staging"]
          "tag:auto_shutdown": "true"
          instance-state-name: stopped
      register: stopped_dev

    # Start them back up
    - name: Start dev instances for the workday
      amazon.aws.ec2_instance:
        region: us-east-1
        instance_ids: "{{ stopped_dev.instances | map(attribute='instance_id') | list }}"
        state: running
      when: stopped_dev.instances | length > 0
```

## Finding and Cleaning Unused Resources

Unattached EBS volumes and old snapshots are common sources of waste. This playbook identifies them:

```yaml
# find-waste.yml - Identify unused cloud resources
---
- name: Find wasted cloud resources
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    # Find unattached EBS volumes
    - name: Get unattached EBS volumes
      amazon.aws.ec2_vol_info:
        region: us-east-1
        filters:
          status: available
      register: unattached_volumes

    - name: Report unattached volumes
      debug:
        msg: >
          Found {{ unattached_volumes.volumes | length }} unattached volumes
          costing approximately ${{ (unattached_volumes.volumes
          | map(attribute='size') | sum) * 0.10 }}/month

    # Find old snapshots (older than 90 days)
    - name: Get all snapshots owned by this account
      amazon.aws.ec2_snapshot_info:
        region: us-east-1
        filters:
          owner-id: "{{ aws_account_id }}"
      register: all_snapshots

    - name: Identify old snapshots
      set_fact:
        old_snapshots: >-
          {{ all_snapshots.snapshots
             | selectattr('start_time', 'lt', (now() - timedelta(days=90)).isoformat())
             | list }}

    - name: Report old snapshots
      debug:
        msg: "Found {{ old_snapshots | length }} snapshots older than 90 days"

    # Find Elastic IPs not attached to instances
    - name: Get unassociated Elastic IPs
      amazon.aws.ec2_eip_info:
        region: us-east-1
      register: all_eips

    - name: Report unused EIPs
      debug:
        msg: "Found {{ all_eips.addresses | rejectattr('instance_id', 'defined') | list | length }} unused Elastic IPs ($3.65/month each)"
```

## Generating Cost Reports

You can use Ansible to pull cost data from the AWS Cost Explorer API and generate reports:

```yaml
# cost-report.yml - Generate a cost summary report
---
- name: Generate cloud cost report
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    # Query AWS Cost Explorer
    - name: Get monthly cost by service
      command: >
        aws ce get-cost-and-usage
        --time-period Start={{ lookup('pipe', 'date -d "first day of this month" +%Y-%m-%d') }},End={{ lookup('pipe', 'date +%Y-%m-%d') }}
        --granularity MONTHLY
        --metrics BlendedCost
        --group-by Type=DIMENSION,Key=SERVICE
        --output json
      register: cost_data
      changed_when: false

    # Parse and display the results
    - name: Display cost breakdown
      debug:
        msg: "{{ item.Keys[0] }}: ${{ item.Metrics.BlendedCost.Amount }}"
      loop: "{{ (cost_data.stdout | from_json).ResultsByTime[0].Groups }}"
      when: (item.Metrics.BlendedCost.Amount | float) > 1.0

    # Write report to file
    - name: Generate cost report file
      copy:
        content: |
          Cloud Cost Report - {{ ansible_date_time.date }}
          ================================================
          {% for item in (cost_data.stdout | from_json).ResultsByTime[0].Groups %}
          {% if (item.Metrics.BlendedCost.Amount | float) > 1.0 %}
          {{ item.Keys[0] }}: ${{ "%.2f" | format(item.Metrics.BlendedCost.Amount | float) }}
          {% endif %}
          {% endfor %}
        dest: /tmp/cost-report-{{ ansible_date_time.date }}.txt
```

## Azure Cost Management

The same patterns apply to Azure. Here is how to find and deallocate stopped VMs that are still incurring charges:

```yaml
# azure-cost-cleanup.yml - Deallocate stopped Azure VMs
---
- name: Deallocate stopped Azure VMs
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    # Get all VMs in a resource group
    - name: List all VMs
      azure.azcollection.azure_rm_virtualmachine_info:
        resource_group: production
      register: all_vms

    # Deallocate VMs that are stopped but not deallocated
    - name: Deallocate stopped VMs
      azure.azcollection.azure_rm_virtualmachine:
        resource_group: production
        name: "{{ item.name }}"
        allocated: false
      loop: "{{ all_vms.vms }}"
      when: item.power_state == 'VM stopped'
```

In Azure, a "stopped" VM still costs money. You need to "deallocate" it to stop charges. This is a common source of unexpected spend.

## Setting Up Scheduled Cost Automation

Tie everything together with AWX or a simple cron-based runner:

```yaml
# cost-automation-schedule.yml - Master playbook for cost management
---
- name: Run all cost management tasks
  hosts: localhost
  connection: local
  gather_facts: true

  tasks:
    - name: Include tagging enforcement
      include_tasks: enforce-tags.yml

    - name: Include waste detection
      include_tasks: find-waste.yml

    - name: Include dev shutdown (evenings only)
      include_tasks: stop-dev-instances.yml
      when: ansible_date_time.hour | int >= 19

    - name: Include cost reporting (first of month)
      include_tasks: cost-report.yml
      when: ansible_date_time.day == "01"
```

## Practical Tips

Start with visibility before enforcement. Run the audit playbooks in check mode for a week to understand what they would catch. Then gradually enable the enforcement actions.

Tag everything from day one. Retroactively tagging resources is painful but necessary. The tagging playbook above gives you a starting point.

Keep a whitelist of instances that should never be shut down, even in dev. Some resources like CI runners or shared databases need to stay up.

Cloud cost management is not a one-time project. Set up these playbooks as recurring jobs and review the reports weekly. The savings compound over time as you catch waste earlier and prevent it from happening in the first place.
