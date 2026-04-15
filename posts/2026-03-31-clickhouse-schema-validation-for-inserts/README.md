# How to Implement Schema Validation for ClickHouse Inserts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Schema Validation, Insert, Data Quality, Constraint, Type Safety

Description: Implement schema validation for ClickHouse inserts using table constraints, input format settings, and application-layer validation to prevent bad data from landing.

---

## The Schema Validation Problem

ClickHouse is lenient by default. Unknown fields in JSONEachRow format are silently ignored. Type mismatches cause silent coercions. Without explicit validation, bad data enters the table unnoticed.

## Layer 1 - Table Constraints

Add CHECK constraints directly to the table:

```sql
CREATE TABLE transactions (
    txn_id     UUID,
    amount     Float64,
    currency   LowCardinality(String),
    status     LowCardinality(String),
    created_at DateTime,
    CONSTRAINT positive_amount  CHECK amount > 0,
    CONSTRAINT valid_currency   CHECK currency IN ('USD', 'EUR', 'GBP', 'JPY'),
    CONSTRAINT valid_status     CHECK status IN ('pending', 'completed', 'failed', 'refunded'),
    CONSTRAINT not_future       CHECK created_at <= now() + INTERVAL 1 HOUR
) ENGINE = MergeTree()
ORDER BY (created_at, txn_id);
```

Inserts violating any constraint return an error immediately.

## Layer 2 - Input Format Settings

Reject unknown fields instead of ignoring them:

```sql
SET input_format_skip_unknown_fields = 0;
```

Fail on JSON type mismatches (applies to JSON formats that include metadata such as JSON, JSONCompact, and JSONColumnsWithMetadata, not JSONEachRow):

```sql
SET input_format_json_validate_types_from_metadata = 1;
```

Reject null values where not expected:

```sql
SET input_format_null_as_default = 0;
```

## Layer 3 - Application Validation

Validate before sending to ClickHouse using a schema definition in your application:

```python
REQUIRED_FIELDS = {"txn_id", "amount", "currency", "status", "created_at"}
VALID_CURRENCIES = {"USD", "EUR", "GBP", "JPY"}

def validate_transaction(row: dict) -> bool:
    if not REQUIRED_FIELDS.issubset(row.keys()):
        return False
    if row["amount"] <= 0:
        return False
    if row["currency"] not in VALID_CURRENCIES:
        return False
    return True

rows = [r for r in raw_rows if validate_transaction(r)]
```

## Layer 4 - Dead Letter Queue

Route invalid rows to a rejection table for investigation:

```sql
CREATE TABLE rejected_transactions (
    raw_data   String,
    reason     String,
    received_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY received_at;
```

Insert rejected rows here instead of discarding them silently.

## Validating Schema on Table Creation

For evolving schemas, store a schema version field:

```sql
ALTER TABLE transactions ADD COLUMN schema_version UInt8 DEFAULT 1;
```

Query for rows on unexpected schema versions:

```sql
SELECT count(), schema_version
FROM transactions
WHERE created_at >= today()
GROUP BY schema_version;
```

## Monitoring Constraint Violations

Track how many inserts fail due to constraint violations over time by logging errors in your application before retrying or routing to the dead letter queue.

## Summary

Implement schema validation for ClickHouse inserts using table CHECK constraints for business rules, input format settings to reject unknown fields and type mismatches, application-layer validation before sending data, and a dead letter queue for rejected rows. Layer all four together for maximum protection against bad data entering your analytical store.
