# How to Use JSONStringsEachRow Format in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, JSONStringsEachRow Format, JSON, String Encoding, Data Export

Description: Learn how to use JSONStringsEachRow and related formats in ClickHouse, where all column values are serialized as JSON strings for maximum compatibility.

---

JSONStringsEachRow is a variant of JSONEachRow where all field values are serialized as JSON strings, regardless of their native ClickHouse type. Dates become strings, numbers become strings, and arrays become string representations. This format is useful when downstream consumers expect everything as strings or when integrating with systems that do not support typed JSON.

## How It Differs from JSONEachRow

JSONEachRow (native types):
```text
{"id":1,"value":3.14,"ts":"2024-06-01 10:00:00","active":1}
```

JSONStringsEachRow (all strings):
```text
{"id":"1","value":"3.14","ts":"2024-06-01 10:00:00","active":"1"}
```

All values are wrapped in quotes, including numbers, booleans, and dates.

## Basic Usage

```sql
SELECT id, name, value, created_at
FROM users
LIMIT 5
FORMAT JSONStringsEachRow;
```

## JSONStrings Format

The full-document variant wraps results in a JSON object with metadata, similar to the JSON format but with string-encoded values:

```sql
SELECT id, name FROM users LIMIT 2 FORMAT JSONStrings;
```

Output:

```json
{
    "meta": [
        {"name": "id", "type": "UInt64"},
        {"name": "name", "type": "String"}
    ],
    "data": [
        {"id": "1", "name": "Alice"},
        {"id": "2", "name": "Bob"}
    ],
    "rows": 2
}
```

## JSONCompactStringsEachRowWithNames

Adds a column name header row (only the compact variant supports `WithNames`):

```text
["id", "name", "value"]
["1", "Alice", "3.14"]
["2", "Bob", "2.71"]
```

```sql
SELECT id, name, value FROM users FORMAT JSONCompactStringsEachRowWithNames;
```

## Importing with String Values

You can use JSONStringsEachRow for import when your source data has string-encoded numeric values:

```bash
clickhouse-client \
    --query "INSERT INTO metrics FORMAT JSONStringsEachRow" \
    << 'EOF'
{"ts":"2024-06-01 10:00:00","metric":"cpu","value":"72.5"}
{"ts":"2024-06-01 10:00:01","metric":"mem","value":"45.1"}
EOF
```

ClickHouse will automatically parse the string "72.5" into Float64 when inserting.

## Use Cases

JSONStringsEachRow is useful when:
- Integrating with legacy systems that output all JSON values as strings
- Working with JavaScript-based tools that serialize large integers as strings to avoid precision loss
- Ensuring maximum compatibility with consumers that do not support typed JSON
- Debugging: easier to see exact string representations

## Compact Variant

```sql
SELECT id, value FROM metrics
FORMAT JSONCompactStringsEachRow;
```

Output:

```text
["1","3.14"]
["2","2.71"]
```

Combines the space savings of JSONCompactEachRow with the string-only encoding of JSONStringsEachRow.

## Summary

JSONStringsEachRow and its variants provide string-encoded JSON output for maximum compatibility with consumers that expect all values as strings. While it sacrifices type fidelity, it is a practical choice when integrating with legacy APIs, JavaScript clients prone to integer overflow, or any pipeline that requires uniform string-typed JSON. ClickHouse correctly parses string-encoded values back into their native types during import.
