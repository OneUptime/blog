# How to Use Ansible to Compare Data Between Hosts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Data Comparison, Configuration Drift, Multi-Host

Description: Learn how to use Ansible to compare data between hosts for drift detection, configuration auditing, and ensuring consistency across your infrastructure.

---

When managing multiple hosts, you often need to verify that configurations are consistent, detect drift, or find differences between environments. Ansible's ability to collect data from many hosts and then process it centrally makes it an excellent tool for cross-host comparisons.

## Basic Configuration Comparison

The pattern is: collect data from all hosts, then compare on localhost:

```yaml
# playbook-basic-compare.yml
# Collects kernel versions from all hosts and identifies inconsistencies
- name: Collect data from all hosts
  hosts: all
  gather_facts: true

- name: Compare configurations
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Compare kernel versions
      ansible.builtin.set_fact:
        kernel_versions: >-
          {% set result = {} %}
          {% for host in groups['all'] %}
          {% if hostvars[host].ansible_facts is defined %}
          {% set ver = hostvars[host].ansible_facts.kernel %}
          {% set _ = result.update({host: ver}) %}
          {% endif %}
          {% endfor %}
          {{ result }}

    - name: Show kernel versions
      ansible.builtin.debug:
        var: kernel_versions

    - name: Check if all kernels match
      ansible.builtin.debug:
        msg: >-
          {% set versions = kernel_versions.values() | unique | list %}
          {% if versions | length == 1 %}
          All hosts have the same kernel: {{ versions[0] }}
          {% else %}
          MISMATCH: Found {{ versions | length }} different kernel versions: {{ versions | join(', ') }}
          {% endif %}
```

## Comparing Package Versions

```yaml
# playbook-package-compare.yml
# Compares installed package versions across all web servers
- name: Collect package versions
  hosts: webservers
  gather_facts: false

  tasks:
    - name: Get nginx version
      ansible.builtin.shell: "nginx -v 2>&1 | awk -F/ '{print $2}'"
      register: nginx_version
      changed_when: false
      failed_when: false

    - name: Get Python version
      ansible.builtin.shell: "python3 --version | awk '{print $2}'"
      register: python_version
      changed_when: false
      failed_when: false

- name: Compare versions
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Build version matrix
      ansible.builtin.set_fact:
        version_matrix: >-
          {% set result = [] %}
          {% for host in groups['webservers'] %}
          {% set _ = result.append({
            'host': host,
            'nginx': hostvars[host].nginx_version.stdout | default('not installed'),
            'python': hostvars[host].python_version.stdout | default('not installed')
          }) %}
          {% endfor %}
          {{ result }}

    - name: Display version matrix
      ansible.builtin.debug:
        msg: |
          Package Version Comparison:
          {% for entry in version_matrix %}
          {{ "%-20s" | format(entry.host) }} nginx={{ entry.nginx }} python={{ entry.python }}
          {% endfor %}

    - name: Find version mismatches
      ansible.builtin.debug:
        msg: |
          {% for pkg in ['nginx', 'python'] %}
          {% set versions = version_matrix | map(attribute=pkg) | unique | list %}
          {{ pkg }}: {{ 'CONSISTENT (' ~ versions[0] ~ ')' if versions | length == 1 else 'MISMATCH: ' ~ versions | join(', ') }}
          {% endfor %}
```

## Comparing Configuration Files

```yaml
# playbook-config-compare.yml
# Compares configuration file checksums across hosts to detect drift
- name: Collect config file checksums
  hosts: webservers
  gather_facts: false

  tasks:
    - name: Get checksums of key config files
      ansible.builtin.stat:
        path: "{{ item }}"
        checksum_algorithm: sha256
      register: config_checksums
      loop:
        - /etc/nginx/nginx.conf
        - /etc/ssh/sshd_config
        - /etc/sysctl.conf

- name: Compare configurations
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Build checksum comparison
      ansible.builtin.set_fact:
        config_comparison: >-
          {% set result = {} %}
          {% for host in groups['webservers'] %}
          {% set checksums = {} %}
          {% for item in hostvars[host].config_checksums.results %}
          {% if item.stat.exists %}
          {% set _ = checksums.update({item.item: item.stat.checksum}) %}
          {% else %}
          {% set _ = checksums.update({item.item: 'FILE_MISSING'}) %}
          {% endif %}
          {% endfor %}
          {% set _ = result.update({host: checksums}) %}
          {% endfor %}
          {{ result }}

    - name: Report drift
      ansible.builtin.debug:
        msg: |
          Configuration Drift Report:
          {% for file in ['/etc/nginx/nginx.conf', '/etc/ssh/sshd_config', '/etc/sysctl.conf'] %}
          {{ file }}:
          {% set checksums = [] %}
          {% for host, files in config_comparison.items() %}
          {% set _ = checksums.append(files.get(file, 'N/A')) %}
            {{ host }}: {{ files.get(file, 'N/A')[:16] }}...
          {% endfor %}
          {% set unique_checksums = checksums | unique | list %}
            Status: {{ 'CONSISTENT' if unique_checksums | length == 1 else 'DRIFT DETECTED (' ~ unique_checksums | length ~ ' variants)' }}
          {% endfor %}
```

## Comparison Process Flow

```mermaid
graph TD
    A[Host A] -->|Collect data| D[Central Comparison]
    B[Host B] -->|Collect data| D
    C[Host C] -->|Collect data| D
    D --> E{All matching?}
    E -->|Yes| F[Report: Consistent]
    E -->|No| G[Report: Drift Detected]
    G --> H[Show differences]
    G --> I[Optional: Auto-remediate]
```

## Comparing Firewall Rules

```yaml
# playbook-firewall-compare.yml
# Compares open ports across hosts in the same group
- name: Collect firewall data
  hosts: webservers
  gather_facts: false

  tasks:
    - name: Get open ports
      ansible.builtin.shell: "ss -tlnp | awk 'NR>1 {print $4}' | grep -oP ':\\K[0-9]+' | sort -n | uniq"
      register: open_ports
      changed_when: false

- name: Compare firewall rules
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Build port comparison
      ansible.builtin.set_fact:
        port_map: >-
          {% set result = {} %}
          {% for host in groups['webservers'] %}
          {% set _ = result.update({host: hostvars[host].open_ports.stdout_lines | map('int') | list | sort}) %}
          {% endfor %}
          {{ result }}

    - name: Find ports unique to specific hosts
      ansible.builtin.debug:
        msg: |
          {% set all_ports = port_map.values() | map('list') | flatten | unique | sort %}
          Port comparison across webservers:
          {% for port in all_ports %}
          Port {{ port }}:
          {% for host, ports in port_map.items() %}
            {{ host }}: {{ 'OPEN' if port in ports else 'CLOSED' }}
          {% endfor %}
          {% endfor %}

    - name: Find common vs unique ports
      ansible.builtin.set_fact:
        port_analysis: >-
          {% set all_hosts_ports = port_map.values() | list %}
          {% set common = all_hosts_ports[0] %}
          {% for ports in all_hosts_ports[1:] %}
          {% set common = common | intersect(ports) %}
          {% endfor %}
          {% set all_ports = all_hosts_ports | flatten | unique | list %}
          {{ {'common': common | sort, 'all': all_ports | sort, 'inconsistent': all_ports | difference(common) | sort} }}

    - name: Show analysis
      ansible.builtin.debug:
        var: port_analysis
```

## Environment Comparison

Compare staging and production environments:

```yaml
# playbook-env-compare.yml
# Compares key metrics between staging and production environments
- name: Collect from both environments
  hosts: all
  gather_facts: true

- name: Compare environments
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Build environment comparison
      ansible.builtin.set_fact:
        env_comparison: >-
          {% set result = {} %}
          {% for env in ['staging', 'production'] %}
          {% set hosts = groups.get(env, []) %}
          {% set os_versions = [] %}
          {% for host in hosts %}
          {% if hostvars[host].ansible_facts is defined %}
          {% set _ = os_versions.append(hostvars[host].ansible_facts.distribution_version) %}
          {% endif %}
          {% endfor %}
          {% set _ = result.update({env: {
            'host_count': hosts | length,
            'os_versions': os_versions | unique | list,
            'os_consistent': os_versions | unique | list | length <= 1
          }}) %}
          {% endfor %}
          {{ result }}

    - name: Show environment comparison
      ansible.builtin.debug:
        msg: |
          Environment Comparison Report:
          {% for env, data in env_comparison.items() %}
          {{ env | upper }}:
            Hosts: {{ data.host_count }}
            OS Versions: {{ data.os_versions | join(', ') }}
            Consistent: {{ data.os_consistent }}
          {% endfor %}
```

## Practical Example: Compliance Drift Detection

```yaml
# playbook-compliance-drift.yml
# Compares current system state against a baseline to detect compliance drift
- name: Collect compliance data
  hosts: all
  become: true
  gather_facts: false

  tasks:
    - name: Collect sysctl settings
      ansible.builtin.shell: "sysctl net.ipv4.ip_forward net.ipv4.conf.all.send_redirects 2>/dev/null"
      register: sysctl_output
      changed_when: false

    - name: Parse sysctl values
      ansible.builtin.set_fact:
        sysctl_settings: >-
          {% set result = {} %}
          {% for line in sysctl_output.stdout_lines %}
          {% set parts = line.split(' = ') %}
          {% if parts | length == 2 %}
          {% set _ = result.update({parts[0]: parts[1]}) %}
          {% endif %}
          {% endfor %}
          {{ result }}

- name: Compare against baseline
  hosts: localhost
  gather_facts: false
  vars:
    baseline:
      net.ipv4.ip_forward: "0"
      net.ipv4.conf.all.send_redirects: "0"

  tasks:
    - name: Check compliance across all hosts
      ansible.builtin.debug:
        msg: |
          Compliance Drift Detection:
          {% for host in groups['all'] %}
          {% if hostvars[host].sysctl_settings is defined %}
          {{ host }}:
          {% for setting, expected in baseline.items() %}
          {% set actual = hostvars[host].sysctl_settings.get(setting, 'NOT SET') %}
            {{ setting }}: {{ 'PASS' if actual == expected else 'DRIFT (expected=' ~ expected ~ ', actual=' ~ actual ~ ')' }}
          {% endfor %}
          {% endif %}
          {% endfor %}
```

## Summary

Cross-host data comparison in Ansible follows a two-phase pattern: collect data from all target hosts, then aggregate and compare on localhost. Use `hostvars` to access data collected from other hosts. Compare package versions, config file checksums, firewall rules, sysctl settings, or any other measurable attribute. Use set operations (`intersect`, `difference`, `union`) for port and package comparisons. Use `unique` to quickly check if all values are the same. Generate reports that clearly highlight mismatches and drift. This pattern is the foundation for compliance auditing, drift detection, and pre-deployment environment validation.
