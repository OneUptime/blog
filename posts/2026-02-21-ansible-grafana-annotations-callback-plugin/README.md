# How to Use the Ansible grafana_annotations Callback Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, Grafana, Monitoring, Annotations

Description: Configure the Ansible grafana_annotations callback plugin to automatically add deployment markers to Grafana dashboards for change correlation.

---

The `grafana_annotations` callback plugin creates annotations on your Grafana dashboards whenever Ansible playbooks run. These annotations appear as vertical markers on your time-series graphs, showing exactly when deployments happened and whether they succeeded or failed. This makes it trivial to correlate infrastructure changes with performance metrics.

## Why Grafana Annotations Matter

When your error rate spikes at 2:15 PM, you want to know: did someone deploy something at 2:15 PM? Without annotations, you have to cross-reference deployment logs with monitoring dashboards manually. With the grafana_annotations callback, every Ansible run automatically adds a marker to your dashboards. You just look at the graph and see the annotation right next to the spike.

## Prerequisites

You need:

- A Grafana instance (version 5.0 or later)
- A Grafana API key with Editor or Admin role
- The `community.grafana` Ansible collection

```bash
# Install the Grafana collection
ansible-galaxy collection install community.grafana

# The collection includes the grafana_annotations callback
```

## Creating a Grafana API Key

In Grafana, go to Configuration > API Keys and create a key:

1. Click "Add API key"
2. Set a name like "ansible-annotations"
3. Set the role to "Editor" (minimum required)
4. Set an expiration if desired
5. Copy the key

## Enabling the Callback

```ini
# ansible.cfg - Enable Grafana annotations
[defaults]
callback_whitelist = community.grafana.grafana

[callback_grafana]
grafana_url = https://grafana.example.com
grafana_api_key = {{ lookup('env', 'GRAFANA_API_KEY') }}
```

Environment variables:

```bash
# Configure via environment
export ANSIBLE_CALLBACK_WHITELIST=community.grafana.grafana
export GRAFANA_URL=https://grafana.example.com
export GRAFANA_API_KEY=eyJrIjoiYWJjMTIz...
```

## Configuration Options

The full set of options:

```ini
# ansible.cfg - Full Grafana callback configuration
[defaults]
callback_whitelist = community.grafana.grafana

[callback_grafana]
# Required: Grafana server URL
grafana_url = https://grafana.example.com

# Required: API key for authentication
grafana_api_key = {{ lookup('env', 'GRAFANA_API_KEY') }}

# Optional: Dashboard ID to annotate (annotates all dashboards if not set)
grafana_dashboard_id = *

# Optional: Panel ID to annotate
grafana_panel_id = *

# Optional: Annotation tags
grafana_tags = ansible, deployment

# Optional: Verify SSL certificate
validate_grafana_certs = true

# Optional: HTTP timeout
http_timeout = 10
```

## What Annotations Look Like

When a playbook runs, the callback creates annotations with this information:

- **Start annotation**: Created when the playbook begins, tagged with the playbook name
- **End annotation**: Created when the playbook finishes, includes the result (success/failure)
- **Tags**: `ansible`, playbook name, and `success` or `failure`

On your Grafana dashboard, these appear as vertical dashed lines with hover text showing the playbook name and result.

## Targeting Specific Dashboards

By default, annotations are global and appear on all dashboards. To target a specific dashboard:

```ini
# ansible.cfg - Annotate a specific dashboard
[callback_grafana]
grafana_url = https://grafana.example.com
grafana_api_key = {{ lookup('env', 'GRAFANA_API_KEY') }}
# Get the dashboard ID from the URL: grafana.example.com/d/abc123
grafana_dashboard_id = abc123
```

For multiple dashboards, you cannot set multiple IDs directly. Instead, use annotation tags and configure your Grafana dashboard panels to filter by tag:

```ini
# ansible.cfg - Use tags for dashboard filtering
[callback_grafana]
grafana_url = https://grafana.example.com
grafana_api_key = {{ lookup('env', 'GRAFANA_API_KEY') }}
grafana_tags = ansible, production-deploy
```

In Grafana, configure your dashboard's annotation queries to filter by the `production-deploy` tag.

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

## Different Tags for Different Environments

Route annotations to different dashboards by environment:

```bash
#!/bin/bash
# deploy.sh - Set Grafana tags based on environment
ENV=$1

export ANSIBLE_CALLBACK_WHITELIST=community.grafana.grafana
export GRAFANA_URL=https://grafana.example.com
export GRAFANA_API_KEY=$GRAFANA_KEY

case $ENV in
    production)
        export GRAFANA_TAGS="ansible,production"
        ;;
    staging)
        export GRAFANA_TAGS="ansible,staging"
        ;;
esac

ansible-playbook -i "inventory/$ENV" deploy.yml
```

Then in Grafana, your production dashboard filters annotations by `production` tag, and your staging dashboard filters by `staging` tag.

## Annotation Content

The annotation body includes:

```
Playbook: deploy.yml
Hosts: web-01, web-02, web-03
Started: 2026-02-21 10:15:00
Finished: 2026-02-21 10:18:30
Duration: 3m 30s
Status: Success
Changed: 6
Failures: 0
```

For failures:

```
Playbook: deploy.yml
Status: FAILED
Failed hosts: web-03
Failed task: Deploy application
Error: Could not find release file
```

## Combining with Other Callbacks

The grafana_annotations callback is a notification type, so it works alongside everything else:

```ini
# ansible.cfg - Grafana with full callback stack
[defaults]
stdout_callback = yaml
callback_whitelist = community.grafana.grafana, timer, profile_tasks, junit

[callback_grafana]
grafana_url = https://grafana.example.com
grafana_api_key = {{ lookup('env', 'GRAFANA_API_KEY') }}
grafana_tags = ansible

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
- API key does not have Editor role
- Firewall blocking the Ansible control node from reaching Grafana
- SSL certificate issues (try `validate_grafana_certs = false` to test)
- Dashboard annotation query not configured to show the right tags

The grafana_annotations callback is a small integration with outsized value. It takes five minutes to set up and immediately gives you visual correlation between Ansible changes and system metrics. Every ops team using Grafana should have this enabled.
