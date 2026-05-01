# How to Create ELK Stack Dashboards for IPv4 Traffic Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ELK Stack, Elasticsearch, Kibana, Logstash, IPv4, Log Analysis, Visualization

Description: Build ELK Stack dashboards for IPv4 traffic analysis by ingesting Nginx access logs with Logstash, enriching data with GeoIP, and creating Kibana visualizations for top IPs, error rates, and...

## Introduction

The ELK Stack (Elasticsearch, Logstash, Kibana) transforms raw Nginx/Apache access logs into interactive dashboards. GeoIP enrichment maps IPv4 addresses to countries and cities for geographic traffic visualization.

## Logstash Pipeline for Nginx Logs

```ruby
# /etc/logstash/conf.d/nginx-access.conf

input {
  file {
    path  => "/var/log/nginx/access.log"
    start_position => "beginning"
    sincedb_path   => "/var/lib/logstash/nginx-sincedb"
    type           => "nginx-access"
  }
}

filter {
  grok {
    match => {
      "message" => '%{IPORHOST:client_ip} - %{DATA:user} \[%{HTTPDATE:timestamp}\] "%{WORD:method} %{DATA:request} HTTP/%{NUMBER:http_version}" %{NUMBER:status_code:int} %{NUMBER:bytes:int} "%{DATA:referrer}" "%{DATA:user_agent}"'
    }
  }

  date {
    match => ["timestamp", "dd/MMM/yyyy:HH:mm:ss Z"]
    target => "@timestamp"
  }

  # GeoIP enrichment
  geoip {
    source => "client_ip"
    ecs_compatibility => disabled
    target => "geoip"
    fields => ["city_name", "country_name", "country_code2", "location"]
  }

  # Categorize status codes
  if [status_code] >= 500 {
    mutate { add_field => { "status_category" => "5xx" } }
  } else if [status_code] >= 400 {
    mutate { add_field => { "status_category" => "4xx" } }
  } else if [status_code] >= 300 {
    mutate { add_field => { "status_category" => "3xx" } }
  } else {
    mutate { add_field => { "status_category" => "2xx" } }
  }
}

output {
  elasticsearch {
    hosts    => ["http://localhost:9200"]
    index    => "nginx-access-%{+YYYY.MM.dd}"
    user     => "elastic"
    password => "${ES_PASSWORD}"
  }
}
```

## Elasticsearch Index Template

```json
PUT _index_template/nginx-access
{
  "index_patterns": ["nginx-access-*"],
  "template": {
    "mappings": {
      "properties": {
        "client_ip":    { "type": "ip" },
        "status_code":  { "type": "integer" },
        "bytes":        { "type": "long" },
        "geoip.location": { "type": "geo_point" },
        "@timestamp":   { "type": "date" }
      }
    }
  }
}
```

## Kibana Queries

```text
# KQL - find all requests from a subnet

client_ip: "10.1.0.0/16"

# ES|QL - top error-generating IPs
FROM "nginx-access-*"
| WHERE status_code >= 400
| STATS error_count = COUNT(*) BY client_ip
| SORT error_count DESC
| LIMIT 20

# KQL - traffic from specific country
geoip.country_code2: "CN"

# KQL - requests in last 15 minutes
@timestamp >= now-15m and status_code: 200
```

## Kibana Dashboard Panels

Create these visualizations in **Visualize Library**:

1. **Data Table** - Top 20 client IPs by request count
   - Aggregation: Top values of `client_ip`
   - Metric: Count

2. **Area Chart** - Request rate over time by status category
   - X-axis: Date histogram on `@timestamp`
   - Split series: `status_category`

3. **Maps** - Geographic heatmap
   - Layer: Elasticsearch documents
   - Location: `geoip.location`
   - Color by: Count

4. **Gauge** - Error rate percentage
   - Metric: Formula `count(kql='status_code >= 400') / count()`
   - Value format: Percent

## Conclusion

ELK Stack Nginx log analysis starts with a Logstash grok pattern extracting `client_ip`, followed by GeoIP enrichment for geographic dashboards. Map `client_ip` as type `ip` in Elasticsearch for CIDR query support. Build Kibana dashboards with top-IP tables, time-series charts, and a geo_point map for the complete IPv4 traffic picture.
