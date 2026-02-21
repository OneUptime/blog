# How to Use Ansible Serial with Percentage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Serial, Percentage, Rolling Updates, Deployment

Description: Use Ansible serial with percentage values to create inventory-size-aware rolling updates that automatically scale batch sizes to your fleet.

---

Using percentage values with Ansible's `serial` keyword creates batch sizes that automatically scale with your inventory. Instead of hard-coding `serial: 5` (which might be too small for 200 hosts or too large for 8 hosts), `serial: "25%"` adapts to whatever inventory it runs against. This makes your playbooks portable across environments of different sizes.

## Basic Percentage Serial

```yaml
# deploy-percent.yml - Update 25% of hosts per batch
---
- name: Rolling deployment
  hosts: webservers
  serial: "25%"

  tasks:
    - name: Deploy application
      copy:
        src: "app-v{{ version }}.tar.gz"
        dest: /opt/app/

    - name: Restart service
      service:
        name: myapp
        state: restarted

    - name: Health check
      uri:
        url: "http://localhost:8080/health"
        status_code: 200
      retries: 5
      delay: 3
      register: health
      until: health.status == 200
```

How this scales across environments:

| Environment | Host Count | Batch Size (25%) | Batches |
|-------------|-----------|-------------------|---------|
| Development | 4         | 1                 | 4       |
| Staging     | 12        | 3                 | 4       |
| Production  | 100       | 25                | 4       |
| Large Prod  | 400       | 100               | 4       |

The same playbook works correctly in all environments without modification.

## Rounding Behavior

Ansible rounds percentage calculations. With odd numbers:

- 7 hosts at 25%: batch size = 1 (7 * 0.25 = 1.75, rounds to 1)
- 7 hosts at 30%: batch size = 2 (7 * 0.30 = 2.1, rounds to 2)
- 7 hosts at 50%: batch size = 3 (7 * 0.50 = 3.5, rounds to 3)

The minimum batch size is always 1, regardless of percentage.

## Progressive Percentages

Combine percentages in a progressive list:

```yaml
# progressive-percent.yml - Gradually increasing batch percentages
---
- name: Progressive percentage rollout
  hosts: webservers
  serial:
    - "1%"     # Start with ~1% of hosts
    - "5%"     # Then 5%
    - "10%"    # Then 10%
    - "25%"    # Then 25%
    - "100%"   # Then all remaining

  tasks:
    - name: Deploy and verify
      include_role:
        name: deploy
```

With 200 hosts:

```
Batch 1: 2 hosts (1%)   - canary
Batch 2: 10 hosts (5%)  - small group
Batch 3: 20 hosts (10%) - medium group
Batch 4: 50 hosts (25%) - large group
Batch 5: 118 hosts      - everything remaining
```

## Mixing Percentages with Fixed Numbers

Mix fixed numbers for the canary phase with percentages for the rollout:

```yaml
# mixed-serial.yml
---
- name: Mixed serial deployment
  hosts: webservers
  serial:
    - 1        # Exactly 1 canary host (fixed)
    - "10%"    # 10% of inventory
    - "50%"    # 50% of inventory
    - "100%"   # All remaining

  tasks:
    - name: Deploy
      include_role:
        name: deploy
```

The canary is always exactly 1 host, regardless of inventory size. The subsequent batches scale with the inventory.

## Common Percentage Patterns

### Conservative (Safety First)

```yaml
serial:
  - 1
  - "5%"
  - "10%"
  - "25%"
  - "100%"
max_fail_percentage: 10
```

Good for: Critical production services, databases, core infrastructure.

### Moderate (Balanced)

```yaml
serial: "20%"
max_fail_percentage: 20
```

Good for: Standard application deployments, configuration changes.

### Aggressive (Speed Priority)

```yaml
serial: "50%"
max_fail_percentage: 30
```

Good for: Non-critical services, development environments, security patches that need fast rollout.

## Using Percentage with max_fail_percentage

When both `serial` and `max_fail_percentage` use percentages, the math compounds:

```yaml
- name: Deploy
  hosts: webservers  # 100 hosts
  serial: "20%"      # 20 hosts per batch
  max_fail_percentage: 10  # Stop if >10% of BATCH fails
```

In each batch of 20 hosts, if more than 2 fail (10% of 20), the play stops. This limits the blast radius to at most 22 hosts (20 in the current batch + 2 failures).

## Calculating Capacity During Rollout

When planning your percentage, consider the capacity impact:

```yaml
# With serial: "25%" on 100 hosts
# At any time, 25 hosts may be updating (reduced capacity)
# Remaining capacity: 75 hosts (75%)
```

Your batch size should not exceed the amount of excess capacity you have:

```
If you need 60 hosts to handle peak traffic:
  100 hosts - 60 minimum = 40 hosts available for updating
  40 / 100 = 40% maximum batch size
  Use serial: "30%" for safety margin
```

```yaml
# capacity-aware-deploy.yml
---
- name: Capacity-aware deployment
  hosts: webservers  # 100 hosts, need 60 minimum
  serial: "30%"      # Update 30 at a time, keeping 70 serving

  pre_tasks:
    - name: Check current traffic
      uri:
        url: "http://lb.example.com/api/stats"
        return_content: true
      register: traffic_stats
      run_once: true
      delegate_to: localhost

    - name: Verify capacity is sufficient
      assert:
        that:
          - "(groups['webservers'] | length) - (ansible_play_hosts | length) >= 60"
        fail_msg: "Not enough capacity to proceed with this batch size"
      run_once: true

  tasks:
    - name: Deploy
      include_role:
        name: deploy
```

## Environment-Specific Percentages

Use variables to set different percentages per environment:

```yaml
# group_vars/production.yml
deploy_serial: "10%"
deploy_max_fail: 5

# group_vars/staging.yml
deploy_serial: "50%"
deploy_max_fail: 25

# group_vars/development.yml
deploy_serial: "100%"
deploy_max_fail: 50
```

```yaml
# deploy.yml - Uses environment-specific serial
---
- name: Deploy application
  hosts: webservers
  serial: "{{ deploy_serial }}"
  max_fail_percentage: "{{ deploy_max_fail }}"

  tasks:
    - name: Deploy and verify
      include_role:
        name: deploy
```

## Monitoring Percentage-Based Rollouts

Track rollout progress with batch information:

```yaml
- name: Deploy with progress tracking
  hosts: webservers
  serial: "20%"

  tasks:
    - name: Calculate progress
      set_fact:
        total_hosts: "{{ groups['webservers'] | length }}"
        batch_size: "{{ ansible_play_hosts | length }}"
        batch_number: "{{ ansible_play_batch }}"

    - name: Report progress
      debug:
        msg: >
          Batch {{ batch_number }}: Updating {{ batch_size }}/{{ total_hosts }} hosts
          ({{ ((batch_number | int) * (batch_size | int) * 100 / (total_hosts | int)) | round }}% complete)
      run_once: true

    - name: Deploy
      include_role:
        name: deploy
```

## Percentage Serial in CI/CD

In CI/CD pipelines, percentage-based serial works across environments without pipeline configuration changes:

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        type: choice
        options: ['staging', 'production']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        run: |
          ansible-playbook -i inventory/${{ inputs.environment }} deploy.yml
          # serial percentage is defined in group_vars per environment
```

Percentage-based serial values make your playbooks environment-agnostic. Define the percentage in environment-specific variables, and the same playbook works correctly whether you are deploying to 5 staging hosts or 500 production hosts.
