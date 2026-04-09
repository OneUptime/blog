# How to Monitor Ceph from OpenStack Horizon Dashboard

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, OpenStack, Horizon, Monitoring, Dashboard, Observability

Description: Integrate Ceph monitoring into the OpenStack Horizon dashboard so operators can view pool usage, OSD status, and cluster health from a single pane.

---

OpenStack Horizon is the primary web interface for operators and tenants. Integrating Ceph monitoring into Horizon lets administrators see storage health alongside compute and network resources without switching between dashboards.

## Approach Options

There are two main approaches to viewing Ceph from Horizon:

1. **Horizon Storage Panel plugin** - embeds Ceph metrics directly in Horizon
2. **Grafana iframe integration** - embed a Ceph Grafana dashboard panel into Horizon via a custom panel

This guide covers the Ceph Dashboard integration using the Horizon plugin and embedding approach.

## Step 1: Enable the Ceph Dashboard Manager Module

The Ceph Dashboard provides a REST API and web UI that Horizon can link to:

```bash
# Enable the dashboard module
ceph mgr module enable dashboard

# Generate a self-signed certificate
ceph dashboard create-self-signed-cert

# Set admin credentials
echo -n "adminpassword" | ceph dashboard ac-user-create admin -i - administrator

# Get the dashboard URL
ceph mgr services | grep dashboard
# Output: "dashboard": "https://ceph-mgr.example.com:8443/"
```

## Step 2: Configure Horizon to Link to Ceph Dashboard

Horizon can be extended with a custom panel. Add a link panel to `local_settings.py`:

```python
# /etc/openstack-dashboard/local_settings.py

# Add Ceph as an external monitoring link
HORIZON_CONFIG["customization_module"] = "openstack_dashboard.overrides"

# Add external links to the admin sidebar
EXTERNAL_MONITORING_LINKS = [
    {
        "name": "Ceph Dashboard",
        "url": "https://ceph-mgr.example.com:8443/",
        "icon": "fa-database",
    },
    {
        "name": "Ceph Grafana",
        "url": "https://grafana.example.com/d/ceph-cluster",
        "icon": "fa-bar-chart",
    },
]
```

## Step 3: Use the Ceph REST API from Horizon

The Ceph Dashboard REST API can feed data to a custom Horizon panel. Example: fetching cluster health:

```bash
# Get an auth token from the Ceph Dashboard API
TOKEN=$(curl -sk -X POST \
  https://ceph-mgr.example.com:8443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Query cluster health
curl -sk \
  -H "Authorization: Bearer ${TOKEN}" \
  https://ceph-mgr.example.com:8443/api/health/full | python3 -m json.tool

# Query pool usage
curl -sk \
  -H "Authorization: Bearer ${TOKEN}" \
  https://ceph-mgr.example.com:8443/api/pool | python3 -m json.tool
```

## Step 4: Embed Grafana Panels in Horizon

Ceph's Grafana dashboards (included with Ceph Dashboard) can be embedded as iframes. Add to your custom Horizon panel template:

```html
<!-- ceph_monitoring.html -->
<div class="row">
  <div class="col-sm-12">
    <iframe
      src="https://grafana.example.com/d-solo/ceph-cluster/ceph-cluster-overview?orgId=1&panelId=1&theme=light"
      width="100%"
      height="400"
      frameborder="0">
    </iframe>
  </div>
</div>
```

## Step 5: Configure Ceph Dashboard Prometheus Metrics

For richer monitoring, enable the Ceph Prometheus module:

```bash
ceph mgr module enable prometheus

# Verify metrics endpoint
curl http://ceph-mgr.example.com:9283/metrics | grep ceph_health_status
```

Then configure Prometheus to scrape it and point Grafana at the Prometheus datasource to use the pre-built Ceph dashboards included with the Ceph package.

## Summary

Monitoring Ceph from OpenStack Horizon involves enabling the Ceph Dashboard manager module, optionally enabling Prometheus metrics, and integrating either via Horizon panel links or Grafana iframe embeds. The Ceph Dashboard REST API allows custom Horizon panels to display real-time pool usage, OSD health, and cluster status alongside standard OpenStack resources, giving operators a unified operations view.
