# How to Use the Ansible grafana_annotations Callback Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, Grafana, Monitoring, Annotation

Description: Configure the Ansible grafana_annotations callback plugin to automatically add deployment markers to Grafana dashboards for change correlation.

---

The `grafana_annotations` callback plugin creates annotations on your Grafana dashboards whenever Ansible playbooks run. These annotations appear as vertical markers on your time-series graphs, showing exactly when deployments happened and whether they succeeded or failed. This makes it trivial to correlate infrastructure changes with performance metrics.

## Why Grafana Annotations Matter

When your error rate spikes at 2:15 PM, you want to know: did someone deploy something at 2:15 PM? Without annotations, you have to cross-reference deployment logs with monitoring dashboards manually. With the grafana_annotations callback, every Ansible run automatically adds a marker to your dashboards. You just look at the graph and see the annotation right next to the spike.

## Prerequisites

You need:

- A Grafana instance with the Annotations HTTP API enabled
- A Grafana service account token, or a legacy API key, with permission to create annotations
- The `community.grafana` Ansible collection

```bash
# Install the Grafana collection

ansible-galaxy collection install community.grafana

# The collection includes the grafana_annotations callback
```

## Creating a Grafana Service Account Token

In Grafana, create a service account token for Ansible:

1. Go to Administration > Users and access > Service accounts
2. Create a service account named "ansible-annotations"
3. Assign a role or RBAC permissions that can create annotations
4. Add a service account token
5. Copy the token

## Enabling the Callback

```ini
# ansible.cfg - Enable Grafana annotations
[defaults]
callbacks_enabled = community.grafana.grafana_annotations

[callback_grafana_annotations]
grafana_url = https://grafana.example.com/api/annotations
grafana_api_key = your-service-account-token
```

Environment variables:

```bash
# Configure via environment
export ANSIBLE_CALLBACKS_ENABLED=community.grafana.grafana_annotations
export GRAFANA_URL=https://grafana.example.com/api/annotations
export GRAFANA_API_KEY=eyJrIjoiYWJjMTIz...
```

## Configuration Options

The full set of options:

```ini
# ansible.cfg - Full Grafana callback configuration
[defaults]
callbacks_enabled = community.grafana.grafana_annotations

[callback_grafana_annotations]
# Required: Grafana annotations API URL
grafana_url = https://grafana.example.com/api/annotations

# Required unless using Basic auth: service account token or legacy API key
grafana_api_key = your-service-account-token

# Optional: Basic auth username and password, ignored when grafana_api_key is set
grafana_user = ansible
grafana_password = ansible

# Optional: Numeric dashboard ID to annotate for stats and failure annotations
grafana_dashboard_id = 12

# Optional: Panel IDs to annotate
grafana_panel_ids = 4, 8

# Optional: HTTP User-Agent
http_agent = Ansible (grafana_annotations callback)

# Optional: Verify SSL certificate
validate_grafana_certs = true
```

## What Annotations Look Like

When a playbook runs, the callback creates annotations with this information:

- **Start annotation**: Created when the playbook begins, tagged with the playbook name
- **Stats annotation**: Created when the playbook finishes, includes the result (`OK` or `FAILED`)
- **Failure annotation**: Created when a task fails
- **Tags**: `ansible`, an event tag such as `ansible_event_start`, `ansible_report`, or `ansible_event_failure`, the playbook name, and the Ansible control node hostname

On your Grafana dashboard, these appear as vertical dashed lines with hover text showing the playbook name and result.

## Targeting Specific Dashboards

By default, annotations are global and appear on all dashboards. To target a specific dashboard:

```ini
# ansible.cfg - Annotate a specific dashboard
[callback_grafana_annotations]
grafana_url = https://grafana.example.com/api/annotations
grafana_api_key = your-service-account-token
# Use the numeric dashboard ID, not the dashboard UID from /d/<uid>
grafana_dashboard_id = 12
```

For multiple panels on that dashboard, provide a comma-separated list of panel IDs:

```ini
# ansible.cfg - Annotate specific panels
[callback_grafana_annotations]
grafana_url = https://grafana.example.com/api/annotations
grafana_api_key = your-service-account-token
grafana_dashboard_id = 12
grafana_panel_ids = 4, 8
```

The callback does not provide an option for custom annotation tags. To route annotations by tag, create them directly with the Grafana HTTP API instead.

## Setting Up Grafana Dashboard Annotations

In your Grafana dashboard:

1. Click the gear icon (Dashboard Settings)
2. Go to "Annotations"
3. Click "Add Annotation Query"
4. Configure:
   - Name: Ansible Deployments
   - Data source: -- Grafana --
   - Filter by Tags: ansible
   - Color: choose something visible (red for failures, green for success)

Now Ansible deployments appear on all panels in that dashboard.

## Different Dashboards for Different Environments

Route annotations to different dashboards by environment:

```bash
#!/bin/bash
# deploy.sh - Set Grafana dashboard based on environment
ENV=$1

export ANSIBLE_CALLBACKS_ENABLED=community.grafana.grafana_annotations
export GRAFANA_URL=https://grafana.example.com/api/annotations
export GRAFANA_API_KEY=$GRAFANA_KEY

case $ENV in
    production)
        export GRAFANA_DASHBOARD_ID=12
        ;;
    staging)
        export GRAFANA_DASHBOARD_ID=34
        ;;
esac

ansible-playbook -i "inventory/$ENV" deploy.yml
```

Then the callback creates stats and failure annotations on the numeric dashboard ID selected for the environment.

## Annotation Content

The annotation body includes:

```text
Playbook deploy.yml
Duration: 210.0
Status: OK

From 'ansible-control'
By user 'deploy'

Result:
{"web-01": {"ok": 12, "failures": 0, "changed": 2, "unreachable": 0, "skipped": 1, "rescued": 0, "ignored": 0}}
```

For failures:

```text
Playbook deploy.yml Failure !

From 'ansible-control'
By user 'deploy'

'Deploy application' failed on web-03

debug: {"msg": "Could not find release file"}
```

## Combining with Other Callbacks

The grafana_annotations callback is a notification type, so it works alongside everything else:

```ini
# ansible.cfg - Grafana with full callback stack
[defaults]
callbacks_enabled = community.grafana.grafana_annotations, ansible.posix.timer, ansible.posix.profile_tasks, ansible.builtin.junit

[callback_grafana_annotations]
grafana_url = https://grafana.example.com/api/annotations
grafana_api_key = your-service-account-token

[callback_junit]
output_dir = ./junit-results
```

## Creating Annotations Manually via API

If you need more control than the callback provides, use the Grafana API directly in your playbook:

```yaml
# annotate.yml - Create custom Grafana annotations
---
- name: Create deployment annotation
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    # Create annotation at deployment start
    - name: Mark deployment start
      uri:
        url: "{{ grafana_url }}/api/annotations"
        method: POST
        headers:
          Authorization: "Bearer {{ grafana_api_key }}"
          Content-Type: "application/json"
        body_format: json
        body:
          text: "Deploying v{{ app_version }} to production"
          tags:
            - ansible
            - deployment
            - "v{{ app_version }}"
        status_code: 200
      register: annotation

    # Your deployment tasks here
    - name: Deploy application
      include_role:
        name: deploy

    # Update annotation with result
    - name: Mark deployment complete
      uri:
        url: "{{ grafana_url }}/api/annotations/{{ annotation.json.id }}"
        method: PATCH
        headers:
          Authorization: "Bearer {{ grafana_api_key }}"
          Content-Type: "application/json"
        body_format: json
        body:
          text: "Deployed v{{ app_version }} to production - SUCCESS"
          tags:
            - ansible
            - deployment
            - success
        status_code: 200
```

## Troubleshooting

If annotations are not appearing:

```bash
# Test the Grafana API directly
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"text":"Test annotation","tags":["test"]}' \
     https://grafana.example.com/api/annotations

# Check for network connectivity from the Ansible control node
curl -s -o /dev/null -w "%{http_code}" \
     -H "Authorization: Bearer YOUR_API_KEY" \
     https://grafana.example.com/api/health
```

Common issues:
- The service account token does not have permission to create annotations
- Firewall blocking the Ansible control node from reaching Grafana
- SSL certificate issues (try `validate_grafana_certs = false` to test)
- Dashboard annotation query not configured to show the right tags

The grafana_annotations callback is a small integration with outsized value. It takes five minutes to set up and immediately gives you visual correlation between Ansible changes and system metrics. Every ops team using Grafana should have this enabled.
