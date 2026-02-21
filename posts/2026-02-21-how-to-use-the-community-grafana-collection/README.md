# How to Use the community.grafana Collection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Grafana, Monitoring, Observability, Automation

Description: Automate Grafana dashboard provisioning, data source configuration, and user management with the community.grafana Ansible collection.

---

If you have ever spent an afternoon clicking through the Grafana UI to set up dashboards, data sources, and alert rules across multiple environments, you know how tedious it gets. The `community.grafana` collection lets you manage all of that through Ansible playbooks, making your monitoring setup as reproducible as the rest of your infrastructure.

## Installing the Collection

Getting started is straightforward.

```bash
# Install the collection
ansible-galaxy collection install community.grafana

# Install the Python dependency
pip install requests
```

Pin it in your requirements for consistency across team members.

```yaml
# requirements.yml - version-locked collection dependency
collections:
  - name: community.grafana
    version: ">=1.7.0"
```

## Collection Modules Overview

The collection gives you modules for the core Grafana objects:

- **grafana_dashboard** - import, export, and manage dashboards
- **grafana_datasource** - configure data sources (Prometheus, InfluxDB, Elasticsearch, etc.)
- **grafana_folder** - organize dashboards into folders
- **grafana_notification_channel** - set up alert notification channels
- **grafana_organization** - manage organizations
- **grafana_user** - manage user accounts
- **grafana_team** - manage teams and team members
- **grafana_plugin** - install and remove Grafana plugins

## Configuring Data Sources

Data sources are usually the first thing you set up. Here is how to configure the common ones.

```yaml
# playbook-datasources.yml - configure all monitoring data sources
- hosts: grafana_servers
  vars:
    grafana_url: "https://grafana.example.com"
    grafana_api_key: "{{ vault_grafana_api_key }}"
  tasks:
    - name: Add Prometheus as a data source
      community.grafana.grafana_datasource:
        grafana_url: "{{ grafana_url }}"
        grafana_api_key: "{{ grafana_api_key }}"
        name: "Prometheus"
        ds_type: "prometheus"
        ds_url: "http://prometheus.monitoring.svc:9090"
        is_default: true
        tls_skip_verify: false
        state: present

    - name: Add Loki for log aggregation
      community.grafana.grafana_datasource:
        grafana_url: "{{ grafana_url }}"
        grafana_api_key: "{{ grafana_api_key }}"
        name: "Loki"
        ds_type: "loki"
        ds_url: "http://loki.monitoring.svc:3100"
        state: present

    - name: Add InfluxDB for time-series metrics
      community.grafana.grafana_datasource:
        grafana_url: "{{ grafana_url }}"
        grafana_api_key: "{{ grafana_api_key }}"
        name: "InfluxDB-Prod"
        ds_type: "influxdb"
        ds_url: "http://influxdb.monitoring.svc:8086"
        database: "telegraf"
        user: "grafana_reader"
        additional_json_data:
          httpMode: "GET"
        additional_secure_json_data:
          password: "{{ vault_influxdb_password }}"
        state: present

    - name: Add Elasticsearch for application logs
      community.grafana.grafana_datasource:
        grafana_url: "{{ grafana_url }}"
        grafana_api_key: "{{ grafana_api_key }}"
        name: "Elasticsearch-Logs"
        ds_type: "elasticsearch"
        ds_url: "https://elasticsearch.example.com:9200"
        database: "app-logs-*"
        time_field: "@timestamp"
        additional_json_data:
          esVersion: "7.10.0"
          maxConcurrentShardRequests: 5
          interval: "Daily"
        state: present
```

## Managing Dashboard Folders

Organize dashboards into folders before importing them.

```yaml
# playbook-folders.yml - create a folder structure for dashboards
- hosts: grafana_servers
  vars:
    grafana_url: "https://grafana.example.com"
    grafana_api_key: "{{ vault_grafana_api_key }}"
  tasks:
    - name: Create dashboard folders for each team
      community.grafana.grafana_folder:
        grafana_url: "{{ grafana_url }}"
        grafana_api_key: "{{ grafana_api_key }}"
        name: "{{ item }}"
        state: present
      loop:
        - "Infrastructure"
        - "Application Performance"
        - "Business Metrics"
        - "SLO Tracking"
        - "On-Call Dashboards"
      register: folder_results
```

## Importing Dashboards

You can import dashboards from JSON files, which is perfect for version-controlling your dashboards in Git.

```yaml
# playbook-dashboards.yml - import dashboards from JSON files
- hosts: grafana_servers
  vars:
    grafana_url: "https://grafana.example.com"
    grafana_api_key: "{{ vault_grafana_api_key }}"
  tasks:
    - name: Import node exporter dashboard from file
      community.grafana.grafana_dashboard:
        grafana_url: "{{ grafana_url }}"
        grafana_api_key: "{{ grafana_api_key }}"
        state: present
        overwrite: true
        commit_message: "Updated by Ansible"
        folder: "Infrastructure"
        path: "files/dashboards/node-exporter.json"

    - name: Import dashboard from Grafana.com by ID
      community.grafana.grafana_dashboard:
        grafana_url: "{{ grafana_url }}"
        grafana_api_key: "{{ grafana_api_key }}"
        state: present
        overwrite: true
        folder: "Infrastructure"
        dashboard_id: "1860"
        dashboard_revision: "31"

    - name: Export existing dashboard to file for backup
      community.grafana.grafana_dashboard:
        grafana_url: "{{ grafana_url }}"
        grafana_api_key: "{{ grafana_api_key }}"
        state: export
        uid: "abc123def"
        path: "/tmp/exported-dashboard.json"
```

## Managing Users and Teams

For multi-tenant Grafana setups, user and team management through Ansible keeps things consistent.

```yaml
# playbook-users.yml - manage Grafana users and teams
- hosts: grafana_servers
  vars:
    grafana_url: "https://grafana.example.com"
    grafana_user: "admin"
    grafana_password: "{{ vault_grafana_admin_password }}"
  tasks:
    - name: Create team accounts
      community.grafana.grafana_team:
        grafana_url: "{{ grafana_url }}"
        url_username: "{{ grafana_user }}"
        url_password: "{{ grafana_password }}"
        name: "{{ item.name }}"
        email: "{{ item.email }}"
        state: present
      loop:
        - name: "Platform Engineering"
          email: "platform@example.com"
        - name: "Backend Team"
          email: "backend@example.com"
        - name: "SRE"
          email: "sre@example.com"

    - name: Create user accounts
      community.grafana.grafana_user:
        grafana_url: "{{ grafana_url }}"
        url_username: "{{ grafana_user }}"
        url_password: "{{ grafana_password }}"
        name: "{{ item.name }}"
        login: "{{ item.login }}"
        email: "{{ item.email }}"
        is_admin: "{{ item.is_admin | default(false) }}"
        state: present
      loop:
        - name: "Jane Smith"
          login: "jsmith"
          email: "jsmith@example.com"
          is_admin: false
        - name: "Bob Johnson"
          login: "bjohnson"
          email: "bjohnson@example.com"
          is_admin: true
      no_log: true
```

## Installing Plugins

Grafana plugins extend functionality with new panels, data sources, and apps.

```yaml
# playbook-plugins.yml - install Grafana plugins
- hosts: grafana_servers
  become: yes
  tasks:
    - name: Install useful Grafana plugins
      community.grafana.grafana_plugin:
        name: "{{ item }}"
        state: present
      loop:
        - grafana-piechart-panel
        - grafana-worldmap-panel
        - grafana-clock-panel
        - grafana-polystat-panel
        - alexanderzobnin-zabbix-app
        - camptocamp-prometheus-alertmanager-datasource
      notify: restart grafana

  handlers:
    - name: restart grafana
      ansible.builtin.service:
        name: grafana-server
        state: restarted
```

## Setting Up Notification Channels

Alert notification channels can be managed as code too.

```yaml
# playbook-notifications.yml - configure alert notification channels
- hosts: grafana_servers
  vars:
    grafana_url: "https://grafana.example.com"
    grafana_api_key: "{{ vault_grafana_api_key }}"
  tasks:
    - name: Create Slack notification channel
      community.grafana.grafana_notification_channel:
        grafana_url: "{{ grafana_url }}"
        grafana_api_key: "{{ grafana_api_key }}"
        name: "Slack - SRE Alerts"
        type: slack
        is_default: true
        slack_url: "{{ vault_slack_webhook_url }}"
        slack_channel: "#sre-alerts"
        state: present

    - name: Create PagerDuty notification channel
      community.grafana.grafana_notification_channel:
        grafana_url: "{{ grafana_url }}"
        grafana_api_key: "{{ grafana_api_key }}"
        name: "PagerDuty - Critical"
        type: pagerduty
        pagerduty_integration_key: "{{ vault_pagerduty_key }}"
        pagerduty_severity: critical
        state: present
```

## Full Environment Setup Role

Putting it all together into a role that bootstraps a complete Grafana environment:

```yaml
# roles/grafana_config/tasks/main.yml - full Grafana bootstrap
- name: Install required plugins
  ansible.builtin.include_tasks: plugins.yml

- name: Wait for Grafana API to be available
  ansible.builtin.uri:
    url: "{{ grafana_url }}/api/health"
    status_code: 200
  retries: 30
  delay: 5

- name: Configure data sources
  ansible.builtin.include_tasks: datasources.yml

- name: Create folder structure
  ansible.builtin.include_tasks: folders.yml

- name: Import dashboards
  ansible.builtin.include_tasks: dashboards.yml

- name: Configure notification channels
  ansible.builtin.include_tasks: notifications.yml

- name: Set up users and teams
  ansible.builtin.include_tasks: users.yml
```

## Practical Tips

Here are some lessons from managing Grafana with this collection in production:

1. **Export before you overwrite.** Always export existing dashboards before importing new versions. The module supports `state: export` for this purpose.

2. **Use API keys, not admin credentials.** Create a dedicated API key with Admin permissions for Ansible, and store it in Ansible Vault. This avoids spreading the admin password around.

3. **Version-control your dashboard JSON.** Store dashboard JSON files alongside your playbooks in Git. This gives you a full audit trail of dashboard changes.

4. **Template your dashboards.** Use Jinja2 templating on dashboard JSON files to inject environment-specific values like data source names and thresholds.

5. **Be careful with `overwrite: true`.** It will replace any manual changes made through the Grafana UI. Make sure your team knows that Ansible is the source of truth for dashboards.

The `community.grafana` collection makes it possible to treat your entire monitoring stack as code. Combined with Prometheus and Alertmanager automation, you get a fully reproducible observability platform.
