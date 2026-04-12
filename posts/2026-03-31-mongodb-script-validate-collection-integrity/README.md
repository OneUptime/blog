# How to Write a Script to Validate MongoDB Collection Integrity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Scripting, Validation, Data Quality, Operation

Description: Learn how to write a script to validate MongoDB collection integrity by checking document counts, schema consistency, required fields, and referential relationships.

---

## Overview

Collection integrity validation ensures your data matches expected schemas, required fields are present, and cross-collection references are consistent. Running this script after migrations, bulk imports, or deployments catches data quality issues before they affect the application.

## Types of Integrity Checks

```text
1. Document count vs. expected range
2. Required field presence
3. Field type consistency
4. Referential integrity (foreign key equivalents)
5. Duplicate detection on unique fields
6. Value range validation
```

## Python Integrity Validation Script

```python
#!/usr/bin/env python3
import os
from pymongo import MongoClient
from datetime import datetime

MONGO_URI = os.environ["MONGO_URI"]
client = MongoClient(MONGO_URI)
db = client["myapp"]

issues = []

def report_issue(collection, check, detail):
    issue = {"collection": collection, "check": check, "detail": detail}
    issues.append(issue)
    print(f"  FAIL [{collection}] {check}: {detail}")

def report_ok(collection, check):
    print(f"  OK   [{collection}] {check}")

# 1. Check required fields are present on all documents
def check_required_fields(collection_name, required_fields):
    collection = db[collection_name]
    for field in required_fields:
        missing_count = collection.count_documents({field: {"$exists": False}})
        if missing_count > 0:
            report_issue(collection_name, f"required_field:{field}",
                        f"{missing_count} documents missing field '{field}'")
        else:
            report_ok(collection_name, f"required_field:{field}")

# 2. Check for unexpected null values
def check_no_nulls(collection_name, fields):
    collection = db[collection_name]
    for field in fields:
        null_count = collection.count_documents({field: None})
        if null_count > 0:
            report_issue(collection_name, f"null_check:{field}",
                        f"{null_count} documents have null '{field}'")
        else:
            report_ok(collection_name, f"null_check:{field}")

# 3. Check field value ranges
def check_value_range(collection_name, field, min_val=None, max_val=None):
    collection = db[collection_name]
    conditions = []
    if min_val is not None:
        conditions.append({field: {"$lt": min_val}})
    if max_val is not None:
        conditions.append({field: {"$gt": max_val}})

    if conditions:
        query = {"$or": conditions} if len(conditions) > 1 else conditions[0]
        out_of_range = collection.count_documents(query)
        if out_of_range > 0:
            report_issue(collection_name, f"range_check:{field}",
                        f"{out_of_range} documents outside range [{min_val}, {max_val}]")
        else:
            report_ok(collection_name, f"range_check:{field}")

# 4. Check referential integrity
def check_referential_integrity(source_coll, ref_field, target_coll, target_field):
    source = db[source_coll]
    target = db[target_coll]

    ref_ids = source.distinct(ref_field)
    target_ids = set(str(i) for i in target.distinct(target_field))
    orphaned = [str(i) for i in ref_ids if str(i) not in target_ids]

    if orphaned:
        report_issue(source_coll, f"ref_integrity:{ref_field}->{target_coll}.{target_field}",
                    f"{len(orphaned)} orphaned references")
    else:
        report_ok(source_coll, f"ref_integrity:{ref_field}->{target_coll}.{target_field}")

# 5. Check for duplicates on unique fields
def check_no_duplicates(collection_name, field):
    collection = db[collection_name]
    pipeline = [
        {"$group": {"_id": f"${field}", "count": {"$sum": 1}}},
        {"$match": {"count": {"$gt": 1}}},
        {"$count": "duplicatePatterns"}
    ]
    result = list(collection.aggregate(pipeline))
    dup_count = result[0]["duplicatePatterns"] if result else 0
    if dup_count > 0:
        report_issue(collection_name, f"duplicate_check:{field}",
                    f"{dup_count} duplicate values found for '{field}'")
    else:
        report_ok(collection_name, f"duplicate_check:{field}")

# Run all checks
print(f"=== Collection Integrity Validation: {datetime.now(datetime.UTC).isoformat()} ===\n")

check_required_fields("users", ["email", "createdAt", "status"])
check_no_nulls("users", ["email", "status"])
check_no_duplicates("users", "email")

check_required_fields("orders", ["userId", "amount", "status", "createdAt"])
check_value_range("orders", "amount", min_val=0)
check_referential_integrity("orders", "userId", "users", "_id")

print(f"\n=== Results: {len(issues)} issue(s) found ===")
if issues:
    for issue in issues:
        print(f"  [{issue['collection']}] {issue['check']}: {issue['detail']}")
    exit(1)
else:
    print("All integrity checks passed.")
```

## Running MongoDB's Built-In validate Command

```javascript
// Check collection storage integrity (slow on large collections)
db.runCommand({ validate: "orders", full: false })
```

Output includes `valid: true/false` and details on any corruption.

## Scheduling

```bash
# Run integrity checks after every deployment
0 4 * * * /usr/local/bin/python3 /opt/scripts/validate_integrity.py >> /var/log/mongo-integrity.log 2>&1
```

## Best Practices

- Run referential integrity checks using `distinct` + set difference for efficiency - avoid `$lookup` on very large collections.
- Use `count_documents` with filters rather than `$aggregate` for simple field presence checks - it is faster for small counts.
- Fail your deployment pipeline (`exit(1)`) if integrity checks detect issues after a migration.
- Cache the results of `distinct()` calls for large collections to avoid repeated full scans within the same validation run.

## Summary

A MongoDB collection integrity script checks required fields, null values, value ranges, duplicate unique fields, and referential consistency. Run it after migrations and on a nightly schedule to catch data quality regressions early.
