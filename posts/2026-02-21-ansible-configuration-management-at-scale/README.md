# How to Use Ansible for Configuration Management at Scale

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Configuration Management, DevOps, Automation, Scale

Description: Practical strategies for using Ansible to manage configuration across hundreds or thousands of servers without losing your sanity.

---

Managing configuration on 5 servers is easy. Managing it on 5,000 is a different problem entirely. Ansible can handle large-scale configuration management, but you need to think about performance, organization, and execution strategy from the start.

I have been running Ansible against fleets of 2,000+ hosts, and in this post I will share the patterns and tricks that make it work.

## The Scale Challenge

When you go from dozens to thousands of hosts, three things break down: execution speed, inventory management, and variable organization. Ansible runs tasks sequentially on each host by default, which means a playbook that takes 5 minutes on one host would take over 6 days if you ran it on 2,000 hosts one at a time.

Fortunately, Ansible has several mechanisms to handle this.

## Tuning Ansible for Performance

Start with your `ansible.cfg` file. These settings make a massive difference at scale:

```ini
# ansible.cfg
# Performance-tuned configuration for large inventories
[defaults]
forks = 50
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_facts_cache
fact_caching_timeout = 86400
callback_whitelist = timer, profile_tasks
stdout_callback = yaml
strategy = free

[ssh_connection]
pipelining = True
ssh_args = -o ControlMaster=auto -o ControlPersist=60s -o PreferredAuthentications=publickey
control_path_dir = /tmp/ansible_cp
```

The key settings here are `forks` (how many hosts to configure in parallel), `pipelining` (reduces SSH operations), and `fact_caching` (avoids re-gathering facts on every run).

## Dynamic Inventory at Scale

Static inventory files do not work when you have thousands of hosts that come and go. Use dynamic inventory scripts or plugins that pull from your source of truth.

Here is an AWS dynamic inventory configuration:

```yaml
# inventories/aws_ec2.yml
# Dynamic inventory pulling from AWS EC2
plugin: amazon.aws.aws_ec2
regions:
  - us-east-1
  - us-west-2
  - eu-west-1

filters:
  tag:ManagedBy: ansible
  instance-state-name: running

keyed_groups:
  # Group by the 'Role' tag value
  - key: tags.Role
    prefix: role
    separator: "_"
  # Group by region
  - key: placement.region
    prefix: region
  # Group by instance type
  - key: instance_type
    prefix: type

hostnames:
  - tag:Name
  - private-ip-address

compose:
  ansible_host: private_ip_address
  ansible_user: "'ubuntu'"
```

This automatically groups your EC2 instances by role, region, and instance type. When you add a new server with the right tags, it shows up in the inventory automatically.

## Batched Execution with serial

Running against all hosts at once is risky. Use the `serial` keyword to roll out changes in batches:

```yaml
# playbooks/rolling-update.yml
# Apply configuration in controlled batches
---
- name: Rolling configuration update
  hosts: role_webserver
  become: true
  serial:
    - 1        # First, test on 1 host
    - 5        # Then try 5 hosts
    - "25%"    # Then do 25% at a time
  max_fail_percentage: 10

  pre_tasks:
    - name: Remove from load balancer
      ansible.builtin.uri:
        url: "http://{{ lb_api }}/backends/{{ inventory_hostname }}/disable"
        method: POST
      delegate_to: localhost

  roles:
    - common
    - nginx
    - app_config

  post_tasks:
    - name: Wait for health check
      ansible.builtin.uri:
        url: "http://{{ inventory_hostname }}:{{ http_port }}/health"
        status_code: 200
      retries: 30
      delay: 5
      register: health_result
      until: health_result.status == 200

    - name: Re-add to load balancer
      ansible.builtin.uri:
        url: "http://{{ lb_api }}/backends/{{ inventory_hostname }}/enable"
        method: POST
      delegate_to: localhost
```

This starts with 1 host, then 5, then 25% of the remaining hosts. If more than 10% of hosts fail, the entire run stops.

## Organizing Variables for Large Fleets

At scale, variable management becomes complex. Use a layered approach:

```yaml
# group_vars/all.yml
# Global defaults for every host
---
ntp_enabled: true
ntp_servers:
  - 0.pool.ntp.org
  - 1.pool.ntp.org
monitoring_agent: datadog
log_level: info
ssh_password_auth: false

# group_vars/region_us_east_1.yml
# Region-specific overrides
---
dns_servers:
  - 10.1.0.2
  - 10.1.0.3
ntp_servers:
  - 10.1.0.10

# group_vars/role_webserver.yml
# Role-specific configuration
---
nginx_worker_processes: auto
nginx_worker_connections: 4096
app_port: 8080
```

For host-specific overrides, use `host_vars`:

```yaml
# host_vars/web-special-01.yml
# This particular host needs different settings
---
nginx_worker_connections: 8192
app_port: 9090
```

## Using Ansible Pull for Very Large Fleets

When you have thousands of hosts, pushing configuration from a central point hits network and connection limits. Ansible Pull flips the model: each host pulls its own configuration.

```bash
# Set up a cron job on each host to pull configuration every 30 minutes
ansible-pull \
  -U https://git.example.com/infra/ansible-config.git \
  -i localhost, \
  -d /var/lib/ansible/local \
  --clean \
  -C production \
  playbooks/local.yml
```

You can bootstrap this with a simple playbook:

```yaml
# playbooks/setup-ansible-pull.yml
# Install ansible-pull as a cron job on target hosts
---
- name: Setup ansible-pull
  hosts: all
  become: true

  tasks:
    - name: Install Ansible on target
      ansible.builtin.pip:
        name: ansible
        state: present

    - name: Create ansible-pull cron job
      ansible.builtin.cron:
        name: "ansible-pull"
        minute: "*/30"
        job: >
          /usr/local/bin/ansible-pull
          -U https://git.example.com/infra/ansible-config.git
          -d /var/lib/ansible/local
          --clean
          -C production
          playbooks/local.yml
          >> /var/log/ansible-pull.log 2>&1
        user: root
```

## Limiting Scope with Tags and Limits

When you need to update just one thing across the fleet, tags let you skip everything else:

```yaml
# roles/common/tasks/main.yml
---
- name: Configure NTP
  ansible.builtin.template:
    src: ntp.conf.j2
    dest: /etc/ntp.conf
  notify: restart ntp
  tags: [ntp]

- name: Configure DNS
  ansible.builtin.template:
    src: resolv.conf.j2
    dest: /etc/resolv.conf
  tags: [dns]

- name: Configure sysctl
  ansible.posix.sysctl:
    name: "{{ item.key }}"
    value: "{{ item.value }}"
  loop: "{{ sysctl_params | dict2items }}"
  tags: [sysctl, kernel]
```

Then run only what you need:

```bash
# Only update NTP configuration across all hosts
ansible-playbook playbooks/site.yml -t ntp

# Only update web servers in us-east-1
ansible-playbook playbooks/site.yml \
  --limit "role_webserver:&region_us_east_1"
```

## Monitoring Configuration Runs

At scale, you need to know which hosts succeeded and which failed. Use the ARA callback plugin to record every run:

```ini
# ansible.cfg addition for ARA reporting
[defaults]
callback_plugins = /usr/lib/python3/dist-packages/ara/plugins/callback
```

This gives you a web dashboard where you can see the status of every host, every task, and every playbook run.

## Handling Failures Gracefully

Not every host will succeed, especially at scale. Use `ignore_unreachable` and retry files:

```yaml
# playbooks/site.yml
---
- name: Configure all servers
  hosts: all
  become: true
  ignore_unreachable: true

  tasks:
    - name: Apply configuration
      ansible.builtin.include_role:
        name: "{{ item }}"
      loop:
        - common
        - monitoring
        - security
```

After a run, Ansible creates a retry file listing failed hosts. Rerun against just those hosts:

```bash
# Retry only the hosts that failed
ansible-playbook playbooks/site.yml --limit @playbooks/site.retry
```

## Key Takeaways

Scaling Ansible to thousands of hosts requires tuning forks and SSH settings, using dynamic inventory, rolling out changes in batches with `serial`, and organizing variables in a layered structure. For very large fleets, consider ansible-pull to distribute the load. Always use tags to limit scope and monitoring tools like ARA to track results. The goal is not just to manage configuration at scale, but to do it safely and observably.
