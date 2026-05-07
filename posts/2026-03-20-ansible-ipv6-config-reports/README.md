# How to Generate IPv6 Configuration Reports with Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, IPv6, Reporting, Audit, Documentation, Automation

Description: A guide to generating formatted IPv6 configuration audit reports from Ansible playbooks, using templates to produce HTML, CSV, and JSON outputs.

Ansible's template module, combined with fact gathering, makes it straightforward to collect IPv6 configuration data from all managed hosts and generate structured reports for auditing, documentation, and compliance.

## Step 1: Collect IPv6 Facts from All Hosts

```yaml
# collect-ipv6-facts.yml - Gather IPv6 configuration from all hosts

---
- name: Collect IPv6 configuration facts
  hosts: all
  become: true
  gather_facts: true

  tasks:
    - name: Get IPv6 routes
      ansible.builtin.command:
        cmd: ip -6 route show
      register: ipv6_routes
      changed_when: false

    - name: Get IPv6 sysctl settings
      ansible.builtin.command:
        cmd: "sysctl -n {{ item }}"
      register: sysctl_values
      loop:
        - net.ipv6.conf.all.forwarding
        - net.ipv6.conf.all.accept_ra
        - net.ipv6.conf.all.disable_ipv6
      changed_when: false

    - name: Build host IPv6 report data
      ansible.builtin.set_fact:
        ipv6_report:
          hostname: "{{ inventory_hostname }}"
          ipv6_addresses: "{{ ansible_all_ipv6_addresses }}"
          ipv6_routes: "{{ ipv6_routes.stdout_lines }}"
          forwarding: "{{ sysctl_values.results[0].stdout }}"
          accept_ra: "{{ sysctl_values.results[1].stdout }}"
          disabled: "{{ sysctl_values.results[2].stdout }}"
          os: "{{ ansible_distribution }} {{ ansible_distribution_version }}"
          kernel: "{{ ansible_kernel }}"
```

## Step 2: Generate a JSON Report

```yaml
# generate-json-report.yml - Aggregate all host data into a JSON report
---
- name: Generate IPv6 JSON report
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Write JSON report
      ansible.builtin.template:
        src: ipv6-report.json.j2
        dest: "/tmp/ipv6-config-report.json"

    - name: Display report
      ansible.builtin.debug:
        msg: "Report written to /tmp/ipv6-config-report.json"
```

Template:

```json
{# templates/ipv6-report.json.j2 #}
{{ hostvars | dict2items
   | selectattr('value.ipv6_report', 'defined')
   | map(attribute='value.ipv6_report')
   | list | to_nice_json }}
```

## Step 3: Generate an HTML Report

```yaml
# generate-html-report.yml - Create an HTML report from collected facts
---
- name: Generate HTML IPv6 report
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Write HTML report using template
      ansible.builtin.template:
        src: ipv6-report.html.j2
        dest: "/tmp/ipv6-config-report.html"
```

Template:

```html
<!-- templates/ipv6-report.html.j2 -->
<!DOCTYPE html>
<html>
<head>
  <title>IPv6 Configuration Report</title>
  <style>
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4472C4; color: white; }
    .ok { color: green; } .fail { color: red; }
  </style>
</head>
<body>
<h1>IPv6 Configuration Report</h1>
<p>Generated: {{ now(utc=true, fmt='%Y-%m-%dT%H:%M:%SZ') }}</p>
<table>
  <tr><th>Hostname</th><th>IPv6 Addresses</th><th>Forwarding</th><th>Accept RA</th><th>IPv6 Disabled</th></tr>
{% for host, vars in hostvars.items() if vars.ipv6_report is defined %}
  <tr>
    <td>{{ vars.ipv6_report.hostname }}</td>
    <td>{{ vars.ipv6_report.ipv6_addresses | join('<br>') }}</td>
    <td class="{{ 'ok' if vars.ipv6_report.forwarding == '1' else 'fail' }}">
      {{ vars.ipv6_report.forwarding }}
    </td>
    <td>{{ vars.ipv6_report.accept_ra }}</td>
    <td class="{{ 'fail' if vars.ipv6_report.disabled == '1' else 'ok' }}">
      {{ vars.ipv6_report.disabled }}
    </td>
  </tr>
{% endfor %}
</table>
</body>
</html>
```

## Step 4: Generate a CSV Report

```yaml
# generate-csv-report.yml
---
- name: Generate CSV IPv6 report
  hosts: localhost
  gather_facts: false

  tasks:
    - name: Write CSV report
      ansible.builtin.template:
        src: ipv6-report.csv.j2
        dest: "/tmp/ipv6-config-report.csv"
```

```text
# templates/ipv6-report.csv.j2
hostname,ipv6_addresses,forwarding,accept_ra,disabled,os
{% for host, vars in hostvars.items() if vars.ipv6_report is defined %}
{{ vars.ipv6_report.hostname }},{{ vars.ipv6_report.ipv6_addresses | join(' ') }},{{ vars.ipv6_report.forwarding }},{{ vars.ipv6_report.accept_ra }},{{ vars.ipv6_report.disabled }},{{ vars.ipv6_report.os }}
{% endfor %}
```

## Run the Reporting Playbook

```bash
# Collect facts and generate all report formats
ansible-playbook collect-ipv6-facts.yml generate-json-report.yml \
  generate-html-report.yml generate-csv-report.yml -i inventory.ini

# View the reports
cat /tmp/ipv6-config-report.json
open /tmp/ipv6-config-report.html   # macOS
xdg-open /tmp/ipv6-config-report.html  # Linux
```

Ansible-generated IPv6 reports provide a fleet-wide snapshot of IPv6 configuration that can be scheduled daily or triggered on demand, giving operations teams continuous visibility into their IPv6 deployment status.
