# How to Create UDFs in ClickHouse with Executable Scripts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, UDF, Executable Script, User-Defined Function, Extension

Description: Learn how to create ClickHouse UDFs using executable scripts to run external programs for complex transformations that SQL expressions cannot handle.

---

## What are Executable UDFs

Executable UDFs allow ClickHouse to call external programs (Python, Bash, Ruby, etc.) for each row or batch of rows. Data is piped to the script via stdin and results are read from stdout.

## How Executable UDFs Work

```text
ClickHouse -> stdin (rows as TabSeparated) -> Script -> stdout (results) -> ClickHouse
```

ClickHouse passes function arguments line by line, tab-separated. The script outputs one result per line.

## Create a Python UDF Script

Save a Python script to `/var/lib/clickhouse/user_scripts/`:

```bash
mkdir -p /var/lib/clickhouse/user_scripts
```

```python
#!/usr/bin/env python3
# /var/lib/clickhouse/user_scripts/sentiment.py
import sys

def classify_sentiment(text):
    text = text.lower()
    positive = ['good', 'great', 'excellent', 'happy', 'love']
    negative = ['bad', 'terrible', 'awful', 'hate', 'poor']
    if any(w in text for w in positive):
        return 'positive'
    if any(w in text for w in negative):
        return 'negative'
    return 'neutral'

for line in sys.stdin:
    text = line.strip()
    print(classify_sentiment(text))
    sys.stdout.flush()
```

```bash
chmod +x /var/lib/clickhouse/user_scripts/sentiment.py
```

## Register the UDF in ClickHouse

Create an XML config in `/etc/clickhouse-server/user_defined_functions.xml`:

```text
<functions>
    <function>
        <type>executable</type>
        <name>classify_sentiment</name>
        <return_type>String</return_type>
        <argument>
            <type>String</type>
            <name>text</name>
        </argument>
        <format>TabSeparated</format>
        <command>sentiment.py</command>
    </function>
</functions>
```

Note that executable UDFs can only be registered via XML (or YAML) configuration files. The `CREATE FUNCTION` SQL statement is for SQL/lambda UDFs only and cannot reference an external executable.

## Using the UDF

```sql
SELECT
    review_id,
    review_text,
    classify_sentiment(review_text) AS sentiment
FROM product_reviews
WHERE created_at >= today() - 7
LIMIT 100;
```

## Multi-Argument Executable UDF

Python script reading two tab-separated columns:

```python
#!/usr/bin/env python3
import sys

for line in sys.stdin:
    parts = line.strip().split('\t')
    if len(parts) == 2:
        price, discount = float(parts[0]), float(parts[1])
        final = price * (1 - discount / 100)
        print(f'{final:.2f}')
    sys.stdout.flush()
```

XML configuration:

```text
<function>
    <type>executable</type>
    <name>apply_discount</name>
    <return_type>Float64</return_type>
    <argument><type>Float64</type><name>price</name></argument>
    <argument><type>Float64</type><name>discount_pct</name></argument>
    <format>TabSeparated</format>
    <command>apply_discount.py</command>
</function>
```

## Pool Mode for Better Performance

Use `executable_pool` to keep the script process running:

```text
<type>executable_pool</type>
<pool_size>16</pool_size>
<command>sentiment.py</command>
```

This avoids spawning a new process for each function call.

## List Registered UDFs

```sql
SELECT name, origin FROM system.functions
WHERE origin IN ('ExecutableUserDefined', 'SQLUserDefined');
```

## Summary

Executable UDFs in ClickHouse extend query capabilities to any language or external tool. Use them for complex transformations like NLP, encoding, cryptography, or calling external APIs. Use pool mode for production workloads to avoid per-row process spawning overhead.
