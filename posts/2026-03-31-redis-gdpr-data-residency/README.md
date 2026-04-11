# How to Configure Redis for GDPR Data Residency Requirements

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, GDPR, Data Residency, Compliance, Privacy

Description: Learn how to configure Redis deployments to meet GDPR data residency requirements, keeping EU personal data within approved geographic boundaries.

---

GDPR requires that personal data of EU residents is stored and processed within the EU or in countries with an adequacy decision. When Redis holds session data, user preferences, or cached personal data, you must ensure it does not replicate to non-compliant regions.

## Data Residency vs. Data Sovereignty

- **Data Residency**: Personal data must be stored in a specific geographic region
- **Data Sovereignty**: Data is subject to the laws of the country where it resides

For GDPR, EU personal data must stay in the EU (or adequate countries) unless Standard Contractual Clauses (SCCs) are in place.

## Strategy 1: Deploy Redis in EU Regions Only

For AWS ElastiCache, restrict deployment to EU regions:

```hcl
# terraform/main.tf
provider "aws" {
  region = "eu-west-1"  # Ireland - EU region
}

resource "aws_elasticache_replication_group" "redis_eu" {
  replication_group_id = "eu-user-sessions"
  description          = "EU user session data - GDPR compliant"
  node_type            = "cache.t3.medium"
  num_cache_clusters   = 2
  # Explicitly document the compliance purpose
  tags = {
    DataResidency   = "EU"
    Compliance      = "GDPR"
    DataClassification = "Personal"
  }
}
```

## Strategy 2: Separate Redis Instances by Region

Route EU users to an EU Redis instance and non-EU users to a separate instance:

```python
import json
import redis
import os

class RegionalRedis:
    def __init__(self):
        self.eu_redis = redis.Redis(
            host=os.getenv("REDIS_EU_HOST"),
            port=6379,
            decode_responses=True
        )
        self.us_redis = redis.Redis(
            host=os.getenv("REDIS_US_HOST"),
            port=6379,
            decode_responses=True
        )

    def get_client(self, user_region: str) -> redis.Redis:
        eu_regions = {"EU", "EEA", "UK"}
        if user_region in eu_regions:
            return self.eu_redis
        return self.us_redis

regional_cache = RegionalRedis()

def store_session(session_id: str, user_data: dict, user_region: str):
    r = regional_cache.get_client(user_region)
    r.set(f"session:{session_id}", json.dumps(user_data), ex=3600)
```

## Strategy 3: Key Tagging for Residency Enforcement

Tag keys with residency requirements to enable auditing and policy enforcement:

```python
def store_gdpr_data(key: str, value: str, user_id: str, region: str, ttl: int = 3600):
    """Store data with GDPR residency metadata."""
    assert region in ("EU", "EEA", "UK", "non-EU"), f"Unknown region: {region}"

    pipe = r.pipeline()
    pipe.set(f"gdpr:{region}:{key}", value, ex=ttl)
    pipe.hset(f"gdpr:meta:{key}", mapping={
        "user_id": user_id,
        "region": region,
        "stored_at": "2026-03-31",
        "ttl_seconds": str(ttl),
    })
    pipe.expire(f"gdpr:meta:{key}", ttl)
    pipe.execute()
```

## Strategy 4: Kubernetes - Topology Constraints for EU Nodes

In Kubernetes, constrain Redis pods to EU-labeled nodes:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-eu
spec:
  template:
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: topology.kubernetes.io/region
                operator: In
                values:
                - eu-west-1
                - eu-central-1
                - eu-north-1
      containers:
      - name: redis
        image: redis:7.2-alpine
```

## Auditing Data Residency Compliance

Scan Redis to verify no EU-tagged keys exist in non-EU instances:

```bash
#!/bin/bash
# Run this against your non-EU Redis instance
echo "Checking for GDPR-tagged EU data in non-EU Redis..."

EU_KEYS=$(redis-cli -h $NON_EU_REDIS_HOST keys "gdpr:EU:*" | wc -l)
EEA_KEYS=$(redis-cli -h $NON_EU_REDIS_HOST keys "gdpr:EEA:*" | wc -l)

if [ "$EU_KEYS" -gt 0 ] || [ "$EEA_KEYS" -gt 0 ]; then
  echo "VIOLATION: $EU_KEYS EU keys and $EEA_KEYS EEA keys found in non-EU instance"
  exit 1
else
  echo "PASS: No EU personal data found in non-EU Redis instance"
fi
```

## Summary

GDPR data residency for Redis requires deploying EU personal data only to EU-region Redis instances, routing users by region to the appropriate instance, and tagging keys with residency metadata for auditability. For Kubernetes deployments, use node affinity to enforce geographic constraints at the scheduler level. Combine with short TTLs and encryption to minimize residency risk.
