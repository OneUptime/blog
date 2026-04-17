# How to Create a Function (UDF) in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, UDF, User-Defined Function, Lambda

Description: Learn how to create user-defined functions (UDFs) in ClickHouse using SQL lambda expressions and external executable scripts.

---

ClickHouse supports two types of user-defined functions: SQL-based UDFs that wrap lambda expressions, and executable UDFs that delegate computation to an external script or binary. Both types allow you to encapsulate reusable logic and reference it by name in queries.

## SQL Lambda-Based UDFs

SQL UDFs use the `CREATE FUNCTION` statement with a lambda expression. They are stored in ClickHouse and available across all databases.

### Basic Syntax

```sql
CREATE [OR REPLACE] FUNCTION name AS (parameter [,...]) -> expression
```

### Simple Examples

```sql
-- Convert Celsius to Fahrenheit
CREATE FUNCTION celsius_to_fahrenheit AS (c) -> (c * 9.0 / 5.0) + 32;

-- Use it in a query
SELECT celsius_to_fahrenheit(100);
-- Result: 212

-- Round to N decimal places
CREATE FUNCTION round_to AS (value, decimals) ->
    round(value, decimals);

SELECT round_to(3.14159, 2);
-- Result: 3.14
```

### String Manipulation UDFs

```sql
-- Mask the middle of an email address
CREATE FUNCTION mask_email AS (email) ->
    concat(
        substring(email, 1, 2),
        '***',
        substring(email, position(email, '@'))
    );

SELECT mask_email('john.doe@example.com');
-- Result: jo***@example.com

-- Extract domain from a URL
CREATE FUNCTION extract_domain AS (url) ->
    extract(url, 'https?://([^/]+)');

SELECT extract_domain('https://clickhouse.com/docs/en/sql-reference');
-- Result: clickhouse.com
```

### Multi-Argument and Conditional UDFs

```sql
-- Classify a value into buckets
CREATE FUNCTION classify_latency AS (ms) ->
    multiIf(
        ms < 100,  'fast',
        ms < 500,  'acceptable',
        ms < 2000, 'slow',
        'critical'
    );

SELECT classify_latency(350);
-- Result: acceptable

-- Safe division avoiding division by zero
CREATE FUNCTION safe_divide AS (numerator, denominator) ->
    if(denominator = 0, 0, numerator / denominator);

SELECT safe_divide(10, 0);
-- Result: 0
```

### Replacing Functions with OR REPLACE

```sql
-- Update an existing function definition
CREATE OR REPLACE FUNCTION celsius_to_fahrenheit AS (c) ->
    toFloat64((c * 9) / 5 + 32);
```

## Executable UDFs (External Scripts)

Executable UDFs delegate computation to an external process. ClickHouse spawns the script, pipes rows over stdin, and reads results from stdout.

### Configuration File

Executable UDFs are defined in an XML configuration file, not via SQL:

```xml
<!-- /etc/clickhouse-server/user_defined_functions/sentiment.xml -->
<functions>
    <function>
        <type>executable</type>
        <name>sentiment_score</name>
        <return_type>Float32</return_type>
        <argument>
            <type>String</type>
        </argument>
        <format>TabSeparated</format>
        <command>python3 /opt/udfs/sentiment.py</command>
    </function>
</functions>
```

### The External Script

```python
#!/usr/bin/env python3
# /opt/udfs/sentiment.py
import sys

for line in sys.stdin:
    text = line.rstrip('\n')
    # Simple placeholder scoring logic
    score = 0.5 + (text.count('good') - text.count('bad')) * 0.1
    score = max(0.0, min(1.0, score))
    print(score)
    sys.stdout.flush()
```

### Calling an Executable UDF

```sql
SELECT
    review_text,
    sentiment_score(review_text) AS sentiment
FROM product_reviews
ORDER BY sentiment DESC
LIMIT 10;
```

### Pool-Based Executable UDF

For higher throughput, use the `executable_pool` type which keeps a pool of persistent processes:

```xml
<functions>
    <function>
        <type>executable_pool</type>
        <name>tokenize</name>
        <return_type>Array(String)</return_type>
        <argument>
            <type>String</type>
        </argument>
        <format>TabSeparated</format>
        <command>python3 /opt/udfs/tokenize.py</command>
        <pool_size>4</pool_size>
        <max_command_execution_time>10</max_command_execution_time>
    </function>
</functions>
```

## Viewing and Dropping UDFs

```sql
-- List all SQL UDFs
SELECT name, create_query
FROM system.functions
WHERE origin = 'SQLUserDefined';

-- Show definition of a specific UDF
SELECT create_query
FROM system.functions
WHERE name = 'celsius_to_fahrenheit';

-- Drop a UDF
DROP FUNCTION IF EXISTS celsius_to_fahrenheit;
```

## Summary

ClickHouse SQL UDFs use lambda syntax and live entirely inside the database, making them simple to deploy for pure SQL transformations. Executable UDFs extend this to arbitrary external processes for more complex tasks like ML inference or specialized text processing. Both types are called identically in queries, providing a clean abstraction over the underlying implementation.
