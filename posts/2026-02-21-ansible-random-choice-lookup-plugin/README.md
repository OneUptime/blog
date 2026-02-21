# How to Use the Ansible random_choice Lookup Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Lookup Plugins, Randomization, Load Balancing

Description: Learn how to use the Ansible random_choice lookup plugin to randomly select items from a list for load distribution and randomized configurations.

---

Sometimes you need a bit of randomness in your automation. Maybe you want to distribute deployments across multiple artifact mirrors, select a random upstream DNS server for each host, or pick a random color for your deployment canary. The `random_choice` lookup plugin picks one item at random from a list you provide, giving you simple randomization without writing any custom logic.

## What random_choice Does

The `random_choice` lookup takes a list of items and returns exactly one, chosen at random. Every time the lookup is evaluated, it makes a fresh random selection. This makes it non-deterministic by design, which is the whole point.

## Basic Usage

The simplest form picks one item from a list.

This playbook randomly selects a greeting:

```yaml
# playbook.yml - Pick a random item from a list
---
- name: Random selection example
  hosts: localhost
  tasks:
    - name: Pick a random greeting
      ansible.builtin.debug:
        msg: "{{ lookup('random_choice', 'Hello', 'Hi', 'Hey', 'Greetings') }}"
```

Each run produces a different result (or occasionally the same one, that is how randomness works).

## Distributing Load Across Mirrors

The most practical use of `random_choice` is distributing traffic or downloads across multiple servers.

This playbook downloads packages from a randomly chosen mirror:

```yaml
# playbook.yml - Random mirror selection for package downloads
---
- name: Download from random mirror
  hosts: all
  vars:
    package_mirrors:
      - "https://mirror1.example.com/packages"
      - "https://mirror2.example.com/packages"
      - "https://mirror3.example.com/packages"
      - "https://mirror4.example.com/packages"
  tasks:
    - name: Select a random mirror for this host
      ansible.builtin.set_fact:
        selected_mirror: "{{ lookup('random_choice', *package_mirrors) }}"

    - name: Download application package
      ansible.builtin.get_url:
        url: "{{ selected_mirror }}/myapp-latest.tar.gz"
        dest: /tmp/myapp-latest.tar.gz
        mode: '0644'

    - name: Show which mirror was used
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }} downloaded from {{ selected_mirror }}"
```

Since each host evaluates the lookup independently, the downloads get spread across all mirrors naturally.

## Random DNS Server Assignment

When configuring resolver settings, you might want each host to use a different primary DNS server to spread the query load.

```yaml
# playbook.yml - Assign random primary DNS servers
---
- name: Configure DNS with random primary server
  hosts: all
  vars:
    dns_servers:
      - "10.0.1.10"
      - "10.0.1.11"
      - "10.0.1.12"
      - "10.0.2.10"
      - "10.0.2.11"
  tasks:
    - name: Select random primary DNS
      ansible.builtin.set_fact:
        primary_dns: "{{ lookup('random_choice', *dns_servers) }}"
        all_dns: "{{ dns_servers }}"

    - name: Configure resolv.conf with random primary
      ansible.builtin.template:
        src: resolv.conf.j2
        dest: /etc/resolv.conf
        mode: '0644'
```

The template would prioritize the randomly selected server:

```
# templates/resolv.conf.j2 - DNS configuration with random primary
nameserver {{ primary_dns }}
{% for server in all_dns %}
{% if server != primary_dns %}
nameserver {{ server }}
{% endif %}
{% endfor %}
```

## Random NTP Server Selection

Similar to DNS, NTP server assignment benefits from randomization to avoid all hosts hammering the same time server.

```yaml
# playbook.yml - Configure NTP with random server preference
---
- name: Configure NTP servers
  hosts: all
  vars:
    ntp_pools:
      - "0.pool.ntp.org"
      - "1.pool.ntp.org"
      - "2.pool.ntp.org"
      - "3.pool.ntp.org"
  tasks:
    - name: Select preferred NTP server
      ansible.builtin.set_fact:
        preferred_ntp: "{{ lookup('random_choice', *ntp_pools) }}"

    - name: Configure chrony with random preferred server
      ansible.builtin.copy:
        content: |
          # Preferred server (randomly assigned)
          server {{ preferred_ntp }} iburst prefer
          {% for pool in ntp_pools %}
          {% if pool != preferred_ntp %}
          server {{ pool }} iburst
          {% endif %}
          {% endfor %}
          driftfile /var/lib/chrony/drift
          makestep 1.0 3
          rtcsync
        dest: /etc/chrony.conf
        mode: '0644'
      notify: restart chronyd
```

## Randomized Deployment Scheduling

When deploying to a large fleet, you might want to add random delays to prevent all hosts from restarting simultaneously.

```yaml
# playbook.yml - Staggered deployment with random delays
---
- name: Staggered application deployment
  hosts: appservers
  serial: 5
  tasks:
    - name: Select random delay bucket
      ansible.builtin.set_fact:
        deploy_delay: "{{ lookup('random_choice', '0', '5', '10', '15', '20', '30') }}"

    - name: Wait for staggered deployment
      ansible.builtin.wait_for:
        timeout: "{{ deploy_delay | int }}"
      when: deploy_delay | int > 0

    - name: Deploy application
      ansible.builtin.copy:
        src: app.tar.gz
        dest: /opt/app/releases/
        mode: '0644'

    - name: Restart application
      ansible.builtin.systemd:
        name: myapp
        state: restarted

    - name: Report deployment
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }} deployed after {{ deploy_delay }}s delay"
```

## Canary Deployment Selection

Use `random_choice` to randomly select which deployment strategy to use for testing.

```yaml
# playbook.yml - Random canary deployment configuration
---
- name: Canary deployment configuration
  hosts: appservers
  vars:
    canary_percentage: 10
  tasks:
    - name: Determine if this host is a canary
      ansible.builtin.set_fact:
        is_canary: "{{ lookup('random_choice', *(['yes'] + ['no'] * 9)) }}"

    - name: Deploy canary version
      ansible.builtin.copy:
        src: "app-v2.0.tar.gz"
        dest: /opt/app/current.tar.gz
        mode: '0644'
      when: is_canary == 'yes'

    - name: Deploy stable version
      ansible.builtin.copy:
        src: "app-v1.9.tar.gz"
        dest: /opt/app/current.tar.gz
        mode: '0644'
      when: is_canary != 'yes'

    - name: Report deployment type
      ansible.builtin.debug:
        msg: "{{ inventory_hostname }}: {{ 'CANARY (v2.0)' if is_canary == 'yes' else 'STABLE (v1.9)' }}"
```

## Random Test Data Generation

For testing environments, random selection helps create diverse test scenarios.

```yaml
# playbook.yml - Generate diverse test data
---
- name: Create test environment with random data
  hosts: testservers
  tasks:
    - name: Create test users with random attributes
      ansible.builtin.user:
        name: "testuser{{ item }}"
        shell: "{{ lookup('random_choice', '/bin/bash', '/bin/zsh', '/bin/sh') }}"
        state: present
      loop: "{{ range(1, 11) | list }}"

    - name: Assign random regions to test instances
      ansible.builtin.copy:
        content: |
          REGION={{ lookup('random_choice', 'us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1') }}
          TIER={{ lookup('random_choice', 'free', 'basic', 'premium', 'enterprise') }}
          INSTANCE_TYPE={{ lookup('random_choice', 'small', 'medium', 'large', 'xlarge') }}
        dest: /etc/myapp/test_config.env
        mode: '0644'
```

## Important Caveats

There are a few things you should be aware of when using `random_choice`:

1. **Non-deterministic**: Every evaluation returns a potentially different result. If you reference the same lookup in multiple places, you might get different values each time. Always use `set_fact` to capture the result if you need consistency within a play.

2. **Not cryptographically secure**: This uses Python's standard random module, not a cryptographic PRNG. Do not use it for security-sensitive selections like key generation.

3. **Idempotency concerns**: Because the result changes between runs, tasks that depend on the random value might not be idempotent. The server could get a different mirror or DNS server on every run. If that is a problem, use the `password` lookup to generate a persistent random seed instead.

4. **Unweighted selection**: Every item has an equal probability of being selected. If you need weighted random selection, you need to repeat items in the list proportionally. For example, to make "option_a" twice as likely: `lookup('random_choice', 'option_a', 'option_a', 'option_b')`.

5. **Empty lists**: Passing an empty list will cause an error. Always ensure the list has at least one item.

```yaml
# playbook.yml - Demonstrating the consistency issue
---
- name: Show why set_fact matters
  hosts: localhost
  tasks:
    # BAD: different value each time it's evaluated
    - name: Inconsistent random values
      ansible.builtin.debug:
        msg: "First: {{ lookup('random_choice', 'a', 'b', 'c') }}, Second: {{ lookup('random_choice', 'a', 'b', 'c') }}"

    # GOOD: capture once, use everywhere
    - name: Capture random choice
      ansible.builtin.set_fact:
        my_choice: "{{ lookup('random_choice', 'a', 'b', 'c') }}"

    - name: Use consistently
      ansible.builtin.debug:
        msg: "First: {{ my_choice }}, Second: {{ my_choice }}"
```

The `random_choice` lookup is a simple tool with a narrow purpose, but it fills a gap that would otherwise require custom plugins or convoluted Jinja2 expressions. When you need lightweight randomization in your playbooks, this is the cleanest way to get it.
