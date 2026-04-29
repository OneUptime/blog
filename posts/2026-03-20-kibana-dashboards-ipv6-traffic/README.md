# How to Create Kibana Dashboards for IPv6 Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Kibana, ELK Stack, Dashboard, Network Monitoring

Description: Build Kibana dashboards to visualize IPv6 traffic patterns, create CIDR-based filters, and monitor dual-stack application behavior using Kibana Lens and aggregations.

## Introduction

Kibana's Lens editor and aggregation-based visualizations support IPv6 traffic analysis out of the box when Elasticsearch indices use the `ip` field type. This guide walks through creating dashboards that show top IPv6 sources, traffic trends, and CIDR-based address breakdowns.

## Prerequisites

- Elasticsearch index with `ip` field type for source/destination fields
- Kibana 8.x connected to the Elasticsearch cluster
- Network log data indexed (see companion post on Elasticsearch IPv6 index configuration)

## Step 1: Create a Data View

In Kibana:
1. Navigate to **Stack Management > Data Views**
2. Create a new data view matching your index pattern: `network-logs-*`
3. Set `@timestamp` as the time field
4. Save and open in **Discover** to verify IPv6 addresses appear in the `client_ip` field

## Step 2: Top IPv6 Sources Visualization (Lens)

1. Open **Visualize Library > Create new visualization > Lens**
2. Select the `network-logs-*` data view
3. Set chart type to **Top values (Bar)**
4. Drag `client_ip` to the **Horizontal axis**
5. Set the metric to **Count of records**
6. In the **Top values** settings, set size to 20
7. Save as "Top IPv6 Source IPs"

## Step 3: IPv6 vs IPv4 Traffic Split (TSVB)

Use this KQL filter in the Kibana search bar to focus on IPv6 traffic:

```kql
client_ip: * AND NOT client_ip: "0.0.0.0/0"
```

Create a TSVB time series with two series:
- Series 1: Count with filter `client_ip: * AND NOT client_ip: "0.0.0.0/0"`
- Series 2: Count with filter `client_ip: "0.0.0.0/0"`

This gives a stacked area chart showing IPv6 vs IPv4 traffic over time.

## Step 4: CIDR Filter Panel

Create one Discover session for RFC 4193 ULA traffic:

```kql
client_ip: "fc00::/7"
```

Create another Discover session for global unicast traffic:

```kql
client_ip: "2000::/3"
```

Save each Discover session and add those sessions as dashboard panels to segment traffic by address category.

## Step 5: Geolocation for IPv6 (if enriched)

If log data includes GeoIP enrichment for IPv6 addresses (via the GeoIP processor):

```http
PUT _ingest/pipeline/geoip-ipv6
{
  "processors": [
    {
      "geoip": {
        "field": "client_ip",
        "target_field": "geoip",
        "database_file": "GeoLite2-City.mmdb"
      }
    }
  ]
}
```

After applying this pipeline and mapping `geoip.location` as a `geo_point`, add a **Maps** visualization using `geoip.location` to plot IPv6 source locations on a world map.

## Step 6: Dashboard Layout

Assemble the following panels into a single dashboard:

| Panel | Type | Purpose |
|-------|------|---------|
| IPv6 vs IPv4 traffic | TSVB time series | Traffic split over time |
| Top 20 IPv6 sources | Lens bar chart | Source IP ranking |
| Response codes by IP | Lens heatmap | Error distribution |
| Global unicast traffic | Discover session | 2000::/3 traffic |
| ULA traffic | Discover session | Internal address traffic |
| Geographic distribution | Maps | Source locations |
| Bytes by address category | Lens treemap | Bandwidth by ULA vs global unicast |

## Step 7: Alerting on IPv6 Anomalies

For example, an Elasticsearch query rule can alert when blocked IPv6 events appear in the last 5 minutes:

```http
POST kbn:/api/alerting/rule/blocked-ipv6-events
{
  "name": "Blocked IPv6 Events",
  "rule_type_id": ".es-query",
  "consumer": "alerts",
  "schedule": {"interval": "5m"},
  "params": {
    "searchType": "esqlQuery",
    "timeField": "@timestamp",
    "timeWindowSize": 5,
    "timeWindowUnit": "m",
    "size": 0,
    "esqlQuery": {
      "esql": "FROM network-logs-* | WHERE NOT CIDR_MATCH(client_ip, \"0.0.0.0/0\") AND action == \"BLOCK\" | STATS blocked_count = COUNT(*) | WHERE blocked_count > 0"
    },
    "thresholdComparator": ">",
    "threshold": [0]
  }
}
```

## Conclusion

Kibana dashboards for IPv6 traffic leverage Elasticsearch's native `ip` field type to enable CIDR filtering in KQL queries and Discover sessions. The combination of Lens visualizations for top sources, TSVB for traffic splits, and Maps for geolocation provides comprehensive visibility into IPv6 network activity. Apply GeoIP enrichment at ingest time and map `geoip.location` as a `geo_point` to enable geographic dashboards for IPv6 sources.
