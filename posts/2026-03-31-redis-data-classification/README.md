# How to Implement Redis Data Classification

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Data Classification, Compliance, Security, Key Design

Description: Learn how to implement data classification in Redis using key naming conventions, ACLs, and separate databases to segregate sensitive from non-sensitive data.

---

Data classification means labeling data by sensitivity level (public, internal, confidential, restricted) and applying appropriate controls to each level. In Redis, classification is implemented through key naming conventions, ACL key patterns, and database separation.

## Why Classify Data in Redis?

Redis often holds a mix of data types with different sensitivity levels:
- Session tokens (restricted)
- User preferences (internal)
- Public configuration (public)
- Payment session data (restricted)
- Rate limit counters (internal)

Without classification, all data is treated equally, making it hard to apply fine-grained security controls or meet compliance requirements.

## Key Naming Convention for Classification

Use a prefix hierarchy that encodes the classification level:

```text
pub:{service}:{resource}:{id}    - Public data
int:{service}:{resource}:{id}    - Internal data
conf:{service}:{resource}:{id}   - Confidential data
rest:{service}:{resource}:{id}   - Restricted data
```

Examples:

```bash
# Public: feature flags
redis-cli set pub:config:feature_flags '{"new_ui":true}'

# Internal: rate limit counters
redis-cli set int:ratelimit:user:123 "45"

# Confidential: user session data
redis-cli set conf:session:abc123 '{"user_id":456,"email":"user@example.com"}'

# Restricted: payment session tokens
redis-cli set rest:payment:session:xyz '{"card_token":"tok_xxx","amount":9999}'
```

## ACL-Based Access by Classification

Create Redis users that can only access keys matching their classification level:

```bash
# Public data service - read-only access to public keys
ACL SETUSER public_svc on >pubpass ~pub:* &* +@read

# Application service - can read/write internal and public keys
ACL SETUSER app_svc on >apppass ~pub:* ~int:* &* +@read +@write +DEL +EXPIRE

# Payment service - can access confidential and restricted keys
ACL SETUSER payment_svc on >paypass ~conf:payment:* ~rest:payment:* &* +@read +@write +DEL +EXPIRE

# Admin - all access (break-glass only)
ACL SETUSER admin on >adminpass ~* &* +@all
```

## Database-Level Separation

For stronger isolation, use separate Redis databases:

```python
import json
import redis

# db=0: Public and internal data
public_redis = redis.Redis(host='localhost', db=0, decode_responses=True)

# db=1: Confidential data
confidential_redis = redis.Redis(host='localhost', db=1, decode_responses=True)

# db=2: Restricted data (payment, PII)
restricted_redis = redis.Redis(host='localhost', db=2, decode_responses=True)

def store_session(session_id: str, session_data: dict, is_payment: bool = False):
    if is_payment:
        restricted_redis.set(
            f"rest:session:{session_id}",
            json.dumps(session_data),
            ex=1800
        )
    else:
        confidential_redis.set(
            f"conf:session:{session_id}",
            json.dumps(session_data),
            ex=3600
        )
```

## Tagging Keys with Classification Metadata

For audit and reporting, store classification metadata alongside keys:

```python
import json
import redis

r = redis.Redis(host='localhost', decode_responses=True)

def set_classified(key: str, value: str, classification: str, ttl: int = None):
    """Store a value with classification metadata."""
    pipe = r.pipeline()
    # Store the actual value
    if ttl:
        pipe.set(key, value, ex=ttl)
    else:
        pipe.set(key, value)
    # Store metadata in a hash
    pipe.hset(f"meta:{key}", mapping={
        "classification": classification,
        "created_at": "2026-03-31",
        "owner": "payment-service"
    })
    if ttl:
        pipe.expire(f"meta:{key}", ttl)
    pipe.execute()

# Usage
set_classified("rest:payment:tok:abc", "tok_visa_123", "restricted", ttl=1800)
```

## Auditing Classification Coverage

Check what percentage of keys follow the classification naming convention:

```bash
#!/bin/bash
TOTAL=$(redis-cli dbsize)
CLASSIFIED=$(redis-cli keys "pub:*" | wc -l)
CLASSIFIED=$((CLASSIFIED + $(redis-cli keys "int:*" | wc -l)))
CLASSIFIED=$((CLASSIFIED + $(redis-cli keys "conf:*" | wc -l)))
CLASSIFIED=$((CLASSIFIED + $(redis-cli keys "rest:*" | wc -l)))

echo "Total keys: $TOTAL"
echo "Classified keys: $CLASSIFIED"
echo "Unclassified keys: $((TOTAL - CLASSIFIED))"
```

## Summary

Redis data classification is implemented through three mechanisms: key naming conventions that encode sensitivity levels, ACL rules that restrict user access to key patterns matching their authorization level, and optional database-level isolation for the strictest requirements. Consistent naming also enables automated audits to identify unclassified data and enforce retention policies by classification tier.
