# How to Use format() Function for String Formatting in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, String Function, Format, String Formatting, Template

Description: Learn how to use the format() function in ClickHouse for template-based string formatting with positional placeholders and mixed data types.

---

## What Is the format() Function

`format(template, arg1, arg2, ...)` in ClickHouse formats a string using a template with `{}` placeholders, similar to a simplified Python `str.format()`. Placeholders can be empty `{}` (auto-numbered) or numbered `{0}`, `{1}` for explicit positions. Format specifiers (e.g. `{:.2f}`) are NOT supported — only digits are allowed inside the braces. Use `{{` and `}}` to emit literal braces. The template must be a constant string.

```sql
-- Basic syntax
SELECT format('Hello, {}!', 'World');          -- 'Hello, World!'
SELECT format('{} + {} = {}', 1, 2, 3);         -- '1 + 2 = 3'
SELECT format('{1} {0} {1}', 'World', 'Hello'); -- 'Hello World Hello'
SELECT format('{{literal braces}}');            -- '{literal braces}'
```

## Basic Usage

```sql
-- Simple placeholder substitution
SELECT format('User {} logged in', 42);                        -- 'User 42 logged in'
SELECT format('{} of {} items processed', 750, 1000);          -- '750 of 1000 items processed'
SELECT format('Hello, {} {}!', 'John', 'Doe');                 -- 'Hello, John Doe!'

-- Numbers are automatically converted to strings
SELECT format('ID: {}, Score: {}', toUInt64(1001), 95.5);     -- 'ID: 1001, Score: 95.5'

-- Date formatting uses default string representation
SELECT format('Report date: {}', today());                     -- 'Report date: 2024-01-15'
```

## Practical Examples

```sql
CREATE TABLE orders (
    order_id UInt64,
    customer_name String,
    amount Float64,
    status LowCardinality(String),
    order_date Date
) ENGINE = MergeTree()
ORDER BY order_id;

-- Format order summaries
SELECT
    order_id,
    format('Order #{} for {} - ${} ({})',
        order_id,
        customer_name,
        round(amount, 2),
        status
    ) AS order_summary
FROM orders;

-- Build notification messages
SELECT
    order_id,
    format('Your order #{} placed on {} for ${} is now {}.',
        order_id,
        formatDateTime(toDateTime(order_date), '%B %d, %Y'),
        round(amount, 2),
        status
    ) AS notification
FROM orders
WHERE status IN ('shipped', 'delivered');
```

## format() vs concat()

```sql
-- concat() is simpler for direct joins
SELECT concat('Order #', toString(order_id)) AS label FROM orders;

-- format() is more readable for complex templates
SELECT format('Order #{} - {} - ${}',
    order_id, customer_name, round(amount, 2)
) AS label FROM orders;

-- format() avoids manual toString() calls
-- These are equivalent:
SELECT concat('ID: ', toString(user_id), ', Name: ', name) FROM users;
SELECT format('ID: {}, Name: {}', user_id, name) FROM users;
-- format() is cleaner
```

## Using format() for Log Entry Generation

```sql
CREATE TABLE application_logs (
    ts DateTime DEFAULT now(),
    level LowCardinality(String),
    service LowCardinality(String),
    user_id Nullable(UInt64),
    message String,
    duration_ms UInt32
) ENGINE = MergeTree()
ORDER BY ts;

-- Format structured log lines
SELECT
    format('[{}] [{}] [{}] {} ({}ms)',
        formatDateTime(ts, '%Y-%m-%d %H:%M:%S'),
        upper(level),
        service,
        message,
        duration_ms
    ) AS log_line
FROM application_logs
WHERE ts >= now() - INTERVAL 1 HOUR
ORDER BY ts DESC;

-- Format as JSON
SELECT
    format('{{ "ts": "{}", "level": "{}", "service": "{}", "msg": "{}" }}',
        formatDateTime(ts, '%Y-%m-%dT%H:%M:%SZ'),
        level,
        service,
        message
    ) AS json_log
FROM application_logs
LIMIT 10;
```

## Using format() for URL Building

```sql
-- Build API URLs
SELECT
    user_id,
    format('https://api.example.com/v1/users/{}/orders?status={}',
        user_id,
        'active'
    ) AS api_url
FROM users;

-- Build query strings for reports
SELECT
    report_date,
    format('/reports/daily?date={}&category={}&format=csv',
        toString(report_date),
        category
    ) AS download_url
FROM daily_reports;
```

## format() with Conditional Logic

```sql
-- Combine format() with CASE for conditional messages
SELECT
    order_id,
    amount,
    status,
    format('{}',
        CASE status
            WHEN 'delivered' THEN format('Delivered on {}', delivery_date)
            WHEN 'shipped'   THEN format('In transit - ETA: {} days', eta_days)
            WHEN 'cancelled' THEN 'Order cancelled'
            ELSE format('Status: {}', status)
        END
    ) AS status_message
FROM orders;
```

## Practical Example: Report Generation

ClickHouse's `format()` does not support width or precision specifiers, so use helpers like `round()` for numeric precision and `leftPad()` / `rightPad()` for column alignment.

```sql
-- Generate text-based report lines
SELECT
    category,
    total_revenue,
    order_count,
    avg_order_value,
    format('{} | {} | {} orders | {} avg',
        rightPad(category, 20, ' '),
        leftPad(concat('$', toString(round(total_revenue, 0))), 10, ' '),
        leftPad(toString(order_count), 8, ' '),
        leftPad(concat('$', toString(round(avg_order_value, 2))), 8, ' ')
    ) AS report_line
FROM (
    SELECT
        category,
        sum(amount) AS total_revenue,
        count() AS order_count,
        avg(amount) AS avg_order_value
    FROM orders
    GROUP BY category
    ORDER BY total_revenue DESC
);
```

## Summary

The `format()` function in ClickHouse provides template-based string formatting using `{}` placeholders, accepting any data type and automatically converting to string representation. It produces cleaner, more readable code than chains of `concat()` and `toString()` calls, especially for complex multi-argument templates. Use `format()` for building human-readable log entries, notification messages, report lines, and API URLs where template clarity matters more than raw performance.
