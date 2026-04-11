# How to Implement Medication Interaction Cache with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Healthcare, Cache

Description: Cache drug interaction lookups with Redis to deliver instant safety alerts at point-of-care while reducing repeated calls to expensive drug interaction APIs.

---

Drug interaction checking is a critical patient safety feature. Every time a clinician prescribes a new medication, the system must check it against the patient's current medications. These lookups hit external drug databases (DrFirst, Surescripts, etc.) which are slow and expensive. Caching interaction data in Redis delivers instant results while keeping the underlying data reasonably fresh.

## Design Considerations

Drug interaction data changes infrequently (new interactions are discovered, severity ratings are updated). A TTL of 24 hours is appropriate for most scenarios. Interaction results are keyed on the canonical sorted pair of drug names so that querying "aspirin + warfarin" and "warfarin + aspirin" hit the same cache entry.

## Setup

```python
import redis
import json
import time
import hashlib

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

INTERACTION_PREFIX = "drug:interaction"
CACHE_TTL = 86400  # 24 hours
SEVERITY_LEVELS = {"contraindicated": 4, "major": 3, "moderate": 2, "minor": 1, "none": 0}
```

## Canonical Key Generation

Sort drug names alphabetically so both orderings hit the same cache entry:

```python
def interaction_cache_key(drug_a: str, drug_b: str) -> str:
    drugs = sorted([drug_a.lower().strip(), drug_b.lower().strip()])
    pair = f"{drugs[0]}:{drugs[1]}"
    return f"{INTERACTION_PREFIX}:{hashlib.md5(pair.encode()).hexdigest()}"

def interaction_lookup_key(drug_a: str, drug_b: str) -> str:
    # Human-readable key for debugging
    drugs = sorted([drug_a.lower().strip(), drug_b.lower().strip()])
    return f"{INTERACTION_PREFIX}:{drugs[0]}+{drugs[1]}"
```

## Fetching with Cache

```python
def get_interaction(drug_a: str, drug_b: str) -> dict:
    key = interaction_cache_key(drug_a, drug_b)
    cached = r.get(key)

    if cached:
        result = json.loads(cached)
        result["cache"] = "hit"
        return result

    # Fetch from external drug interaction API
    result = fetch_from_drug_api(drug_a, drug_b)
    r.setex(key, CACHE_TTL, json.dumps(result))
    result["cache"] = "miss"
    return result

def fetch_from_drug_api(drug_a: str, drug_b: str) -> dict:
    # Replace with actual API call (e.g., OpenFDA, DrFirst)
    return {
        "drug_a": drug_a,
        "drug_b": drug_b,
        "severity": "major",
        "description": "Increased risk of bleeding when combined with anticoagulants.",
        "management": "Monitor INR closely. Consider dose adjustment.",
        "source": "drug_db",
        "updated_at": int(time.time())
    }
```

## Checking Multiple Medications

For a patient on multiple medications, check all pairwise interactions:

```python
def check_all_interactions(current_medications: list[str], new_drug: str) -> list[dict]:
    keys = [interaction_cache_key(med, new_drug) for med in current_medications]
    cached_values = r.mget(keys)

    results = []
    miss_pairs = []

    for i, (med, cached) in enumerate(zip(current_medications, cached_values)):
        if cached:
            interaction = json.loads(cached)
            interaction["cache"] = "hit"
            results.append(interaction)
        else:
            results.append(None)
            miss_pairs.append((i, med))

    if miss_pairs:
        pipe = r.pipeline()
        for idx, med in miss_pairs:
            interaction = fetch_from_drug_api(med, new_drug)
            key = interaction_cache_key(med, new_drug)
            pipe.setex(key, CACHE_TTL, json.dumps(interaction))
            interaction["cache"] = "miss"
            results[idx] = interaction
        pipe.execute()

    # Filter to only interactions above "none"
    return [item for item in results if item and SEVERITY_LEVELS.get(item["severity"], 0) > 0]
```

## Severity Alerting

```python
def get_critical_interactions(patient_meds: list[str], new_drug: str) -> list[dict]:
    interactions = check_all_interactions(patient_meds, new_drug)
    critical = [i for i in interactions if SEVERITY_LEVELS.get(i["severity"], 0) >= 3]
    critical.sort(key=lambda x: SEVERITY_LEVELS.get(x["severity"], 0), reverse=True)
    return critical
```

## Cache Invalidation on Drug Update

```python
def invalidate_drug_interactions(drug_name: str):
    pattern = f"{INTERACTION_PREFIX}:*"
    cursor = 0
    invalidated = 0
    while True:
        cursor, keys = r.scan(cursor, match=pattern, count=100)
        for key in keys:
            entry_raw = r.get(key)
            if entry_raw:
                entry = json.loads(entry_raw)
                if drug_name.lower() in [entry.get("drug_a", "").lower(), entry.get("drug_b", "").lower()]:
                    r.delete(key)
                    invalidated += 1
        if cursor == 0:
            break
    return invalidated
```

## Summary

A Redis medication interaction cache reduces latency for drug safety checks from seconds to milliseconds by caching pairwise interaction results keyed on canonical sorted drug pairs. Bulk lookups using `mget` minimize round trips when checking a patient's full medication list, and a 24-hour TTL keeps the data reasonably current without overwhelming the source drug database.
