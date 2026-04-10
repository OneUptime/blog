# How to Set Up Ceph Metrics in Zabbix

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Zabbix, Monitoring, Observability

Description: Learn how to monitor Ceph cluster health and performance metrics using Zabbix with the Prometheus HTTP agent and custom Ceph templates.

---

## Overview

Zabbix can collect Ceph metrics using its built-in HTTP agent to scrape the Ceph manager Prometheus endpoint, or by running external scripts on Ceph nodes. This guide covers both approaches and shows how to create Zabbix triggers for critical Ceph conditions.

## Step 1 - Enable the Ceph Prometheus Exporter

```bash
# Enable the Prometheus module on the Ceph manager
ceph mgr module enable prometheus

# Verify the endpoint is responding
curl http://localhost:9283/metrics | grep -c "^ceph_"

# For Rook-managed clusters, expose the service externally
# Note: the Rook operator may revert this patch during reconciliation.
# For production, create a separate NodePort service or use a ServiceMonitor.
kubectl -n rook-ceph patch svc rook-ceph-mgr \
  -p '{"spec":{"type":"NodePort"}}'
```

## Step 2 - Create a Zabbix HTTP Agent Item

In Zabbix, create an HTTP agent item to scrape the Prometheus endpoint:

```bash
# Zabbix API call to create an item for Ceph health status
curl -s -X POST "http://zabbix-server/zabbix/api_jsonrpc.php" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "item.create",
    "params": {
      "name": "Ceph Health Status",
      "key_": "ceph.health.status",
      "hostid": "<HOST_ID>",
      "type": 19,
      "url": "http://ceph-mgr-host:9283/metrics",
      "preprocessing": [{
        "type": 22,
        "params": "ceph_health_status\nvalue"
      }],
      "value_type": 3,
      "delay": "60s"
    },
    "auth": "<AUTH_TOKEN>",
    "id": 1
  }'
```

## Step 3 - Use External Scripts for Detailed Metrics

Create a Zabbix external script for richer Ceph data:

```bash
#!/bin/bash
# /usr/lib/zabbix/externalscripts/ceph_metrics.sh

METRIC=$1
VALUE=$(ceph status --format json | jq -r "
  if \"$METRIC\" == \"health\" then .health.status
  elif \"$METRIC\" == \"osd_up\" then .osdmap.num_up_osds
  elif \"$METRIC\" == \"osd_in\" then .osdmap.num_in_osds
  elif \"$METRIC\" == \"total_bytes\" then .pgmap.bytes_total
  elif \"$METRIC\" == \"used_bytes\" then .pgmap.bytes_used
  else \"unknown\"
  end
")
echo "$VALUE"
```

```bash
chmod +x /usr/lib/zabbix/externalscripts/ceph_metrics.sh
# Test it
/usr/lib/zabbix/externalscripts/ceph_metrics.sh health
```

## Step 4 - Define a Zabbix Template

Create a template in Zabbix for reusable Ceph monitoring:

```xml
<!-- zabbix-ceph-template.xml excerpt -->
<templates>
  <template>
    <name>Ceph Cluster</name>
    <items>
      <item>
        <name>Ceph health status</name>
        <type>EXTERNAL_CHECK</type>
        <key>ceph_metrics.sh[health]</key>
        <delay>60</delay>
        <value_type>CHAR</value_type>
      </item>
      <item>
        <name>Ceph OSDs up</name>
        <type>EXTERNAL_CHECK</type>
        <key>ceph_metrics.sh[osd_up]</key>
        <delay>60</delay>
        <value_type>UNSIGNED</value_type>
      </item>
    </items>
    <triggers>
      <trigger>
        <name>Ceph health is not OK</name>
        <expression>{Ceph Cluster:ceph_metrics.sh[health].str(HEALTH_OK)}=0</expression>
        <priority>HIGH</priority>
      </trigger>
    </triggers>
  </template>
</templates>
```

## Step 5 - Configure Prometheus HTTP Agent for Bulk Metrics

Zabbix 4.2+ supports Prometheus preprocessing (enhanced in 6.0):

```bash
# Create an HTTP agent item with Prometheus preprocessing
# In Zabbix UI: Configuration > Hosts > Items > Create Item
# Type: HTTP agent
# URL: http://ceph-mgr-host:9283/metrics
# Preprocessing: Prometheus pattern
# Pattern: ceph_pool_bytes_used{pool_name="<POOL>"}
```

## Step 6 - Create Zabbix Graphs and Screens

Use the Zabbix API to build dashboards:

```bash
curl -s -X POST "http://zabbix-server/zabbix/api_jsonrpc.php" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "graph.create",
    "params": {
      "name": "Ceph Pool Capacity",
      "width": 900,
      "height": 200,
      "gitems": [
        {"itemid": "<BYTES_USED_ITEM_ID>", "color": "FF0000"},
        {"itemid": "<MAX_AVAIL_ITEM_ID>", "color": "00FF00"}
      ]
    },
    "auth": "<AUTH_TOKEN>",
    "id": 1
  }'
```

## Summary

Zabbix monitors Ceph clusters through HTTP agent items that scrape the Prometheus endpoint, or via external scripts that call the Ceph CLI directly. Using a dedicated Zabbix template centralizes all Ceph items and triggers, enabling quick deployment across multiple Ceph clusters and consistent alerting on health status, OSD availability, and pool capacity.
