# How to Use Elasticsearch for Security Analytics (SIEM)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, SIEM, Security Analytics, Threat Detection, Log Analysis, Security Monitoring

Description: A comprehensive guide to using Elasticsearch for Security Information and Event Management (SIEM), covering security log ingestion, threat detection rules, correlation, and incident investigation.

---

Elasticsearch serves as the foundation for many SIEM (Security Information and Event Management) solutions, including Elastic Security. This guide covers building security analytics capabilities with Elasticsearch.

## Index Design for Security Events

### Security Events Mapping

```bash
curl -u elastic:password -X PUT "localhost:9200/security-events" -H 'Content-Type: application/json' -d'
{
  "settings": {
    "number_of_shards": 5,
    "number_of_replicas": 1,
    "index.mapping.total_fields.limit": 5000
  },
  "mappings": {
    "properties": {
      "@timestamp": {"type": "date"},
      "event": {
        "properties": {
          "kind": {"type": "keyword"},
          "category": {"type": "keyword"},
          "type": {"type": "keyword"},
          "action": {"type": "keyword"},
          "outcome": {"type": "keyword"},
          "severity": {"type": "integer"},
          "risk_score": {"type": "float"}
        }
      },
      "source": {
        "properties": {
          "ip": {"type": "ip"},
          "port": {"type": "integer"},
          "domain": {"type": "keyword"},
          "geo": {
            "properties": {
              "country_iso_code": {"type": "keyword"},
              "city_name": {"type": "keyword"},
              "location": {"type": "geo_point"}
            }
          }
        }
      },
      "destination": {
        "properties": {
          "ip": {"type": "ip"},
          "port": {"type": "integer"},
          "domain": {"type": "keyword"}
        }
      },
      "user": {
        "properties": {
          "name": {"type": "keyword"},
          "domain": {"type": "keyword"},
          "email": {"type": "keyword"},
          "roles": {"type": "keyword"}
        }
      },
      "host": {
        "properties": {
          "name": {"type": "keyword"},
          "ip": {"type": "ip"},
          "os": {
            "properties": {
              "name": {"type": "keyword"},
              "version": {"type": "keyword"}
            }
          }
        }
      },
      "process": {
        "properties": {
          "name": {"type": "keyword"},
          "pid": {"type": "integer"},
          "executable": {"type": "keyword"},
          "command_line": {"type": "text"},
          "parent": {
            "properties": {
              "name": {"type": "keyword"},
              "pid": {"type": "integer"}
            }
          }
        }
      },
      "file": {
        "properties": {
          "name": {"type": "keyword"},
          "path": {"type": "keyword"},
          "hash": {
            "properties": {
              "md5": {"type": "keyword"},
              "sha256": {"type": "keyword"}
            }
          }
        }
      },
      "network": {
        "properties": {
          "protocol": {"type": "keyword"},
          "direction": {"type": "keyword"},
          "bytes": {"type": "long"},
          "packets": {"type": "long"}
        }
      },
      "threat": {
        "properties": {
          "indicator": {
            "properties": {
              "type": {"type": "keyword"},
              "ip": {"type": "ip"},
              "domain": {"type": "keyword"},
              "file_hash": {"type": "keyword"}
            }
          },
          "tactic": {"type": "keyword"},
          "technique": {"type": "keyword"}
        }
      },
      "message": {"type": "text"},
      "tags": {"type": "keyword"}
    }
  }
}'
```

### Sample Security Events

```bash
# Authentication failure event
curl -u elastic:password -X POST "localhost:9200/security-events/_doc" -H 'Content-Type: application/json' -d'
{
  "@timestamp": "2024-01-21T10:30:00Z",
  "event": {
    "kind": "event",
    "category": ["authentication"],
    "type": ["start"],
    "action": "logon-failed",
    "outcome": "failure",
    "severity": 3
  },
  "source": {
    "ip": "203.0.113.50",
    "geo": {
      "country_iso_code": "CN",
      "city_name": "Beijing"
    }
  },
  "user": {
    "name": "admin",
    "domain": "CORP"
  },
  "host": {
    "name": "dc-server-01",
    "ip": "192.168.1.10"
  },
  "message": "Failed login attempt for user admin from 203.0.113.50",
  "tags": ["authentication", "brute-force-candidate"]
}'

# Malware detection event
curl -u elastic:password -X POST "localhost:9200/security-events/_doc" -H 'Content-Type: application/json' -d'
{
  "@timestamp": "2024-01-21T11:00:00Z",
  "event": {
    "kind": "alert",
    "category": ["malware"],
    "type": ["info"],
    "action": "malware-detected",
    "outcome": "success",
    "severity": 8,
    "risk_score": 85.0
  },
  "host": {
    "name": "workstation-42",
    "ip": "192.168.1.142",
    "os": {
      "name": "Windows",
      "version": "10"
    }
  },
  "user": {
    "name": "jsmith"
  },
  "process": {
    "name": "suspicious.exe",
    "pid": 4532,
    "executable": "C:\\Users\\jsmith\\Downloads\\suspicious.exe",
    "command_line": "suspicious.exe -hidden -connect 203.0.113.100",
    "parent": {
      "name": "explorer.exe",
      "pid": 1234
    }
  },
  "file": {
    "name": "suspicious.exe",
    "path": "C:\\Users\\jsmith\\Downloads\\suspicious.exe",
    "hash": {
      "sha256": "abc123def456..."
    }
  },
  "threat": {
    "tactic": "execution",
    "technique": "user-execution"
  },
  "message": "Malware detected: Trojan.GenericKD",
  "tags": ["malware", "high-priority"]
}'
```

## Threat Detection Queries

### Brute Force Detection

```bash
curl -u elastic:password -X GET "localhost:9200/security-events/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [
        {"range": {"@timestamp": {"gte": "now-15m"}}},
        {"term": {"event.action": "logon-failed"}}
      ]
    }
  },
  "aggs": {
    "by_source_ip": {
      "terms": {
        "field": "source.ip",
        "size": 100,
        "min_doc_count": 5
      },
      "aggs": {
        "by_user": {
          "terms": {
            "field": "user.name",
            "size": 10
          }
        },
        "by_destination": {
          "terms": {
            "field": "host.name",
            "size": 10
          }
        }
      }
    }
  }
}'
```

### Anomalous Login Times

```bash
curl -u elastic:password -X GET "localhost:9200/security-events/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "filter": [
        {"range": {"@timestamp": {"gte": "now-24h"}}},
        {"term": {"event.action": "logon"}},
        {"term": {"event.outcome": "success"}}
      ],
      "must": [
        {
          "script": {
            "script": {
              "source": "doc[\"@timestamp\"].value.getHour() < 6 || doc[\"@timestamp\"].value.getHour() > 22"
            }
          }
        }
      ]
    }
  },
  "aggs": {
    "by_user": {
      "terms": {"field": "user.name"},
      "aggs": {
        "login_hours": {
          "date_histogram": {
            "field": "@timestamp",
            "calendar_interval": "hour"
          }
        }
      }
    }
  }
}'
```

### Lateral Movement Detection

```bash
curl -u elastic:password -X GET "localhost:9200/security-events/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [
        {"range": {"@timestamp": {"gte": "now-1h"}}},
        {"terms": {"event.action": ["logon", "remote-access", "rdp-connection"]}}
      ]
    }
  },
  "aggs": {
    "by_user": {
      "terms": {
        "field": "user.name",
        "size": 100
      },
      "aggs": {
        "unique_destinations": {
          "cardinality": {
            "field": "destination.ip"
          }
        },
        "destinations": {
          "terms": {
            "field": "destination.ip",
            "size": 50
          }
        },
        "high_destination_count": {
          "bucket_selector": {
            "buckets_path": {
              "dest_count": "unique_destinations"
            },
            "script": "params.dest_count > 5"
          }
        }
      }
    }
  }
}'
```

### Data Exfiltration Detection

```bash
curl -u elastic:password -X GET "localhost:9200/security-events/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [
        {"range": {"@timestamp": {"gte": "now-1h"}}},
        {"term": {"network.direction": "outbound"}}
      ]
    }
  },
  "aggs": {
    "by_source": {
      "terms": {
        "field": "source.ip",
        "size": 100
      },
      "aggs": {
        "total_bytes": {
          "sum": {"field": "network.bytes"}
        },
        "by_destination": {
          "terms": {
            "field": "destination.ip",
            "size": 20
          },
          "aggs": {
            "bytes_sent": {"sum": {"field": "network.bytes"}}
          }
        },
        "high_volume": {
          "bucket_selector": {
            "buckets_path": {"bytes": "total_bytes"},
            "script": "params.bytes > 1073741824"
          }
        }
      }
    }
  }
}'
```

## Correlation Rules

### Multi-Stage Attack Detection

```bash
curl -u elastic:password -X GET "localhost:9200/security-events/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [
        {"range": {"@timestamp": {"gte": "now-1h"}}}
      ]
    }
  },
  "aggs": {
    "by_host": {
      "terms": {
        "field": "host.name",
        "size": 100
      },
      "aggs": {
        "recon_phase": {
          "filter": {
            "terms": {"event.action": ["port-scan", "network-scan", "directory-enumeration"]}
          }
        },
        "initial_access": {
          "filter": {
            "terms": {"event.action": ["exploit-detected", "phishing-click", "drive-by-download"]}
          }
        },
        "persistence": {
          "filter": {
            "terms": {"event.action": ["registry-modification", "scheduled-task-created", "service-installed"]}
          }
        },
        "lateral_movement": {
          "filter": {
            "terms": {"event.action": ["remote-access", "rdp-connection", "psexec"]}
          }
        },
        "exfiltration": {
          "filter": {
            "bool": {
              "must": [
                {"term": {"network.direction": "outbound"}},
                {"range": {"network.bytes": {"gte": 104857600}}}
              ]
            }
          }
        },
        "attack_chain_score": {
          "bucket_script": {
            "buckets_path": {
              "recon": "recon_phase._count",
              "access": "initial_access._count",
              "persist": "persistence._count",
              "lateral": "lateral_movement._count",
              "exfil": "exfiltration._count"
            },
            "script": "(params.recon > 0 ? 1 : 0) + (params.access > 0 ? 2 : 0) + (params.persist > 0 ? 2 : 0) + (params.lateral > 0 ? 2 : 0) + (params.exfil > 0 ? 3 : 0)"
          }
        }
      }
    }
  }
}'
```

### Impossible Travel Detection

```bash
curl -u elastic:password -X GET "localhost:9200/security-events/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [
        {"range": {"@timestamp": {"gte": "now-24h"}}},
        {"term": {"event.action": "logon"}},
        {"term": {"event.outcome": "success"}},
        {"exists": {"field": "source.geo.location"}}
      ]
    }
  },
  "aggs": {
    "by_user": {
      "terms": {
        "field": "user.name",
        "size": 1000
      },
      "aggs": {
        "logins": {
          "top_hits": {
            "size": 10,
            "sort": [{"@timestamp": "asc"}],
            "_source": ["@timestamp", "source.ip", "source.geo.location", "source.geo.country_iso_code", "source.geo.city_name"]
          }
        },
        "countries": {
          "terms": {
            "field": "source.geo.country_iso_code",
            "size": 10
          }
        },
        "country_count": {
          "cardinality": {
            "field": "source.geo.country_iso_code"
          }
        }
      }
    }
  }
}'
```

## Threat Intelligence Integration

### IOC Matching

```bash
# Create threat intel index
curl -u elastic:password -X PUT "localhost:9200/threat-intel" -H 'Content-Type: application/json' -d'
{
  "mappings": {
    "properties": {
      "indicator": {"type": "keyword"},
      "type": {"type": "keyword"},
      "threat_type": {"type": "keyword"},
      "confidence": {"type": "float"},
      "source": {"type": "keyword"},
      "first_seen": {"type": "date"},
      "last_seen": {"type": "date"}
    }
  }
}'

# Enrich security events with threat intel using enrich policy
curl -u elastic:password -X PUT "localhost:9200/_enrich/policy/threat-intel-policy" -H 'Content-Type: application/json' -d'
{
  "match": {
    "indices": "threat-intel",
    "match_field": "indicator",
    "enrich_fields": ["type", "threat_type", "confidence", "source"]
  }
}'

# Execute the policy
curl -u elastic:password -X POST "localhost:9200/_enrich/policy/threat-intel-policy/_execute"

# Create ingest pipeline for IOC matching
curl -u elastic:password -X PUT "localhost:9200/_ingest/pipeline/threat-intel-enrich" -H 'Content-Type: application/json' -d'
{
  "processors": [
    {
      "enrich": {
        "policy_name": "threat-intel-policy",
        "field": "source.ip",
        "target_field": "threat.indicator",
        "max_matches": 1,
        "ignore_missing": true
      }
    },
    {
      "enrich": {
        "policy_name": "threat-intel-policy",
        "field": "destination.ip",
        "target_field": "threat.indicator",
        "max_matches": 1,
        "ignore_missing": true,
        "override": false
      }
    }
  ]
}'
```

### Query for IOC Matches

```bash
curl -u elastic:password -X GET "localhost:9200/security-events/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "filter": [
        {"range": {"@timestamp": {"gte": "now-24h"}}},
        {"exists": {"field": "threat.indicator"}}
      ]
    }
  },
  "aggs": {
    "by_threat_type": {
      "terms": {"field": "threat.indicator.threat_type"},
      "aggs": {
        "affected_hosts": {
          "terms": {"field": "host.name"}
        }
      }
    }
  },
  "sort": [{"threat.indicator.confidence": "desc"}]
}'
```

## Security Dashboard Queries

### Security Overview

```bash
curl -u elastic:password -X GET "localhost:9200/security-events/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "size": 0,
  "query": {
    "range": {"@timestamp": {"gte": "now-24h"}}
  },
  "aggs": {
    "total_events": {"value_count": {"field": "@timestamp"}},
    "by_severity": {
      "range": {
        "field": "event.severity",
        "ranges": [
          {"key": "low", "to": 4},
          {"key": "medium", "from": 4, "to": 7},
          {"key": "high", "from": 7, "to": 9},
          {"key": "critical", "from": 9}
        ]
      }
    },
    "by_category": {
      "terms": {"field": "event.category", "size": 20}
    },
    "top_sources": {
      "terms": {"field": "source.ip", "size": 10}
    },
    "top_affected_hosts": {
      "terms": {"field": "host.name", "size": 10}
    },
    "events_over_time": {
      "date_histogram": {
        "field": "@timestamp",
        "fixed_interval": "1h"
      },
      "aggs": {
        "by_severity": {
          "terms": {"field": "event.severity"}
        }
      }
    }
  }
}'
```

### Alert Investigation Query

```bash
curl -u elastic:password -X GET "localhost:9200/security-events/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "filter": [
        {"term": {"host.name": "workstation-42"}},
        {"range": {"@timestamp": {"gte": "2024-01-21T10:00:00Z", "lte": "2024-01-21T12:00:00Z"}}}
      ]
    }
  },
  "sort": [{"@timestamp": "asc"}],
  "aggs": {
    "event_timeline": {
      "date_histogram": {
        "field": "@timestamp",
        "fixed_interval": "5m"
      },
      "aggs": {
        "events": {
          "terms": {"field": "event.action"}
        }
      }
    },
    "processes": {
      "terms": {"field": "process.name", "size": 50}
    },
    "network_connections": {
      "filter": {"exists": {"field": "destination.ip"}},
      "aggs": {
        "destinations": {
          "terms": {"field": "destination.ip"}
        }
      }
    }
  }
}'
```

## Alerting with Elasticsearch Watcher

### High Severity Alert

```bash
curl -u elastic:password -X PUT "localhost:9200/_watcher/watch/high-severity-alert" -H 'Content-Type: application/json' -d'
{
  "trigger": {
    "schedule": {"interval": "1m"}
  },
  "input": {
    "search": {
      "request": {
        "indices": ["security-events"],
        "body": {
          "query": {
            "bool": {
              "filter": [
                {"range": {"@timestamp": {"gte": "now-5m"}}},
                {"range": {"event.severity": {"gte": 8}}}
              ]
            }
          },
          "aggs": {
            "by_host": {
              "terms": {"field": "host.name"}
            }
          }
        }
      }
    }
  },
  "condition": {
    "compare": {"ctx.payload.hits.total.value": {"gt": 0}}
  },
  "actions": {
    "send_alert": {
      "webhook": {
        "method": "POST",
        "url": "https://hooks.slack.com/services/xxx",
        "body": "{\"text\": \"High severity security event detected on hosts: {{#ctx.payload.aggregations.by_host.buckets}}{{key}} {{/ctx.payload.aggregations.by_host.buckets}}\"}"
      }
    }
  }
}'
```

## Python SIEM Implementation

```python
from elasticsearch import Elasticsearch
from datetime import datetime, timedelta
from typing import Dict, List, Optional

class SecurityAnalytics:
    def __init__(self, hosts: List[str], auth: tuple):
        self.es = Elasticsearch(hosts, basic_auth=auth)
        self.index = "security-events"

    def detect_brute_force(self, threshold: int = 5, window_minutes: int = 15) -> Dict:
        query = {
            "size": 0,
            "query": {
                "bool": {
                    "filter": [
                        {"range": {"@timestamp": {"gte": f"now-{window_minutes}m"}}},
                        {"term": {"event.action": "logon-failed"}}
                    ]
                }
            },
            "aggs": {
                "by_source": {
                    "terms": {"field": "source.ip", "size": 100, "min_doc_count": threshold},
                    "aggs": {
                        "targeted_users": {"terms": {"field": "user.name", "size": 10}},
                        "targeted_hosts": {"terms": {"field": "host.name", "size": 10}}
                    }
                }
            }
        }

        result = self.es.search(index=self.index, body=query)
        return result["aggregations"]["by_source"]["buckets"]

    def detect_lateral_movement(self, threshold: int = 5) -> Dict:
        query = {
            "size": 0,
            "query": {
                "bool": {
                    "filter": [
                        {"range": {"@timestamp": {"gte": "now-1h"}}},
                        {"terms": {"event.action": ["logon", "remote-access", "rdp-connection"]}}
                    ]
                }
            },
            "aggs": {
                "by_user": {
                    "terms": {"field": "user.name", "size": 100},
                    "aggs": {
                        "unique_destinations": {"cardinality": {"field": "destination.ip"}},
                        "destinations": {"terms": {"field": "destination.ip", "size": 50}}
                    }
                }
            }
        }

        result = self.es.search(index=self.index, body=query)
        alerts = []
        for bucket in result["aggregations"]["by_user"]["buckets"]:
            if bucket["unique_destinations"]["value"] > threshold:
                alerts.append({
                    "user": bucket["key"],
                    "destination_count": bucket["unique_destinations"]["value"],
                    "destinations": [d["key"] for d in bucket["destinations"]["buckets"]]
                })
        return alerts

    def investigate_host(self, hostname: str, hours: int = 24) -> Dict:
        query = {
            "size": 1000,
            "query": {
                "bool": {
                    "filter": [
                        {"term": {"host.name": hostname}},
                        {"range": {"@timestamp": {"gte": f"now-{hours}h"}}}
                    ]
                }
            },
            "sort": [{"@timestamp": "asc"}],
            "aggs": {
                "event_types": {"terms": {"field": "event.action", "size": 50}},
                "processes": {"terms": {"field": "process.name", "size": 50}},
                "network_destinations": {
                    "filter": {"exists": {"field": "destination.ip"}},
                    "aggs": {"ips": {"terms": {"field": "destination.ip", "size": 50}}}
                },
                "users": {"terms": {"field": "user.name", "size": 20}},
                "severity_distribution": {"terms": {"field": "event.severity"}}
            }
        }

        result = self.es.search(index=self.index, body=query)
        return {
            "events": [hit["_source"] for hit in result["hits"]["hits"]],
            "summary": {
                "event_types": result["aggregations"]["event_types"]["buckets"],
                "processes": result["aggregations"]["processes"]["buckets"],
                "network_destinations": result["aggregations"]["network_destinations"]["ips"]["buckets"],
                "users": result["aggregations"]["users"]["buckets"],
                "severity": result["aggregations"]["severity_distribution"]["buckets"]
            }
        }

    def get_security_dashboard(self) -> Dict:
        query = {
            "size": 0,
            "query": {"range": {"@timestamp": {"gte": "now-24h"}}},
            "aggs": {
                "total_events": {"value_count": {"field": "@timestamp"}},
                "high_severity": {
                    "filter": {"range": {"event.severity": {"gte": 7}}}
                },
                "by_category": {"terms": {"field": "event.category", "size": 20}},
                "events_over_time": {
                    "date_histogram": {"field": "@timestamp", "fixed_interval": "1h"}
                },
                "top_sources": {"terms": {"field": "source.ip", "size": 10}},
                "top_affected_hosts": {"terms": {"field": "host.name", "size": 10}}
            }
        }

        result = self.es.search(index=self.index, body=query)
        return result["aggregations"]

# Usage
siem = SecurityAnalytics(["http://localhost:9200"], ("elastic", "password"))

# Detect threats
brute_force = siem.detect_brute_force(threshold=10)
lateral = siem.detect_lateral_movement(threshold=5)

# Investigate host
investigation = siem.investigate_host("workstation-42", hours=4)

# Dashboard data
dashboard = siem.get_security_dashboard()
```

## Summary

Using Elasticsearch for SIEM involves:

1. **Index design** - ECS-compliant mappings for security events
2. **Data ingestion** - Collecting logs from various security sources
3. **Threat detection** - Queries for brute force, lateral movement, exfiltration
4. **Correlation rules** - Multi-stage attack and impossible travel detection
5. **Threat intelligence** - IOC matching with enrich policies
6. **Dashboards** - Security overview and investigation queries
7. **Alerting** - Watcher for real-time threat notifications

With proper configuration, Elasticsearch provides a powerful foundation for security analytics and threat detection.
