# How to Anonymize Personal Data in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Privacy, GDPR, Security, Database

Description: Learn techniques to anonymize personal data in ClickHouse including pseudonymization, generalization, data swapping, and noise injection for privacy-compliant analytics.

## Introduction

Anonymization goes further than masking. While masking hides data from unauthorized viewers at query time, anonymization irreversibly transforms the data so that re-identification of the original individual is no longer reasonably possible. Properly anonymized data is outside the scope of GDPR and many other privacy regulations, making it valuable for sharing datasets with third parties, training machine learning models, or publishing analytics.

This guide covers five practical anonymization techniques available in ClickHouse: pseudonymization, generalization, data suppression, data swapping, and noise injection.

## Technique 1 - Pseudonymization

Pseudonymization replaces direct identifiers with consistent, irreversible tokens. Unlike encryption, pseudonymized values cannot be reversed without access to the mapping table.

```sql
-- One-way pseudonymization using a keyed hash
-- The salt must be kept secret and must never appear in the output dataset
SELECT
    hex(SHA256(concat('my-secret-salt-2024', user_id))) AS pseudo_id,
    toDate(event_time)  AS event_date,
    event_type,
    country_code
FROM user_events
LIMIT 10;
```

For consistent pseudonymization across tables that must be joined, use `sipHash64` which is faster and still one-way when the salt is secret:

```sql
SELECT
    sipHash64('secret-salt', user_id)  AS pseudo_user_id,
    sipHash64('secret-salt', session_id) AS pseudo_session_id,
    page_url,
    duration_ms,
    toDate(recorded_at) AS date
FROM page_views
LIMIT 10;
```

Because the same user always produces the same `pseudo_user_id`, you can still count unique users and track sessions without knowing who they are.

## Technique 2 - Generalization

Generalization replaces precise values with less specific ones. Ages become age ranges; exact timestamps become dates; full addresses become cities or postal code prefixes.

```sql
-- Generalize age to 10-year buckets
SELECT
    pseudo_id,
    floor(age / 10) * 10 AS age_bucket,  -- e.g. 34 becomes 30
    gender,
    toStartOfMonth(signup_date) AS signup_month,
    left(postal_code, 3)         AS postal_prefix  -- UK: SW1A -> SW1
FROM anonymized_users
LIMIT 10;
```

```sql
-- Generalize IP addresses to /24 subnet
SELECT
    IPv4NumToString(
        bitAnd(IPv4StringToNum(ip_address), 0xFFFFFF00)
    ) AS ip_prefix,
    count() AS visit_count,
    toDate(event_time) AS date
FROM web_visits
GROUP BY ip_prefix, date
ORDER BY visit_count DESC
LIMIT 20;
```

```sql
-- Generalize timestamps to hourly buckets for time-series analytics
SELECT
    toStartOfHour(event_time) AS hour,
    event_type,
    count()                   AS events
FROM raw_events
GROUP BY hour, event_type
ORDER BY hour, events DESC;
```

## Technique 3 - Data Suppression

Suppression removes records or fields where the group size is too small to protect individuals (the "small cell" problem). If only two people in a dataset have a given combination of attributes, publishing aggregated stats for that group could reveal personal information.

```sql
-- Suppress cells with fewer than 5 users (k-anonymity threshold)
SELECT
    country_code,
    age_bucket,
    gender,
    count() AS user_count
FROM anonymized_users
GROUP BY country_code, age_bucket, gender
HAVING user_count >= 5
ORDER BY user_count DESC;
```

For publishing summary tables, apply suppression at the materialization stage:

```sql
CREATE TABLE summary_safe AS
SELECT
    country_code,
    age_bucket,
    gender,
    count() AS user_count
FROM anonymized_users
GROUP BY country_code, age_bucket, gender
HAVING user_count >= 5;
```

## Technique 4 - Noise Injection

Noise injection adds random variation to numeric values, making it impossible to reverse-engineer exact original values while keeping statistical properties intact for aggregate analysis.

```sql
-- Add Laplace noise to purchase amounts for differential privacy
-- Sensitivity = 1, epsilon = 0.1 gives strong privacy but more noise
-- Adjust epsilon based on your privacy/utility trade-off
SELECT
    pseudo_user_id,
    toDate(purchase_date)                                              AS date,
    round(
        purchase_amount + (
            -- Laplace noise: scale = sensitivity / epsilon
            (1.0 / 0.1) * log(1.0 - rand() / 4294967295.0) * if(rand() % 2 = 0, 1, -1)
        ),
        2
    )                                                                  AS noisy_amount,
    product_category
FROM purchases
LIMIT 20;
```

For count data, add Gaussian noise:

```sql
-- Add Gaussian noise to page view counts
SELECT
    page_url,
    toDate(event_time)                               AS date,
    count() + round(randNormal(0, 5))                AS noisy_view_count
FROM page_views
GROUP BY page_url, date
ORDER BY date DESC, noisy_view_count DESC
LIMIT 20;
```

## Technique 5 - Data Swapping

Swapping shuffles values between rows so that the statistical distribution is preserved but individual records no longer reflect real people. ClickHouse does not have a built-in shuffle function, but you can implement swapping using row numbers and modular arithmetic.

```sql
-- Swap email domains between users while preserving domain distribution
WITH ranked AS (
    SELECT
        user_id,
        email,
        row_number() OVER (ORDER BY sipHash64('salt', user_id)) AS rn,
        count() OVER ()                                          AS total
    FROM users
)
SELECT
    a.user_id,
    concat(
        splitByChar('@', a.email)[1],
        '@',
        splitByChar('@', b.email)[2]
    ) AS swapped_email
FROM ranked a
JOIN ranked b ON b.rn = ((a.rn + 73) % a.total) + 1;
```

The offset `73` is a coprime number relative to typical dataset sizes, ensuring every row participates in a swap.

## Building an Anonymization Pipeline

Combine techniques in a single materialized view for a reusable anonymized dataset.

```sql
CREATE MATERIALIZED VIEW user_events_anon
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, pseudo_user_id)
AS
SELECT
    -- Pseudonymize identifiers
    sipHash64('prod-salt-2024', user_id)                             AS pseudo_user_id,
    -- Generalize time
    toStartOfHour(event_time)                                        AS event_hour,
    toDate(event_time)                                               AS event_date,
    -- Keep non-identifying attributes unchanged
    event_type,
    LowCardinality(country_code)                                     AS country_code,
    -- Generalize age
    floor(age / 10) * 10                                             AS age_bucket,
    -- Suppress rare values
    if(count() OVER (PARTITION BY country_code) < 5, 'XX', country_code) AS safe_country
FROM raw_user_events;
```

## Verifying Anonymization Quality

After applying anonymization, audit the output to confirm re-identification is not feasible.

```sql
-- Check for quasi-identifier uniqueness (k-anonymity check)
-- If min_group_size < 5, some records are at risk of re-identification
SELECT
    min(group_size) AS min_group_size,
    avg(group_size) AS avg_group_size,
    count()         AS distinct_combinations
FROM (
    SELECT
        country_code,
        age_bucket,
        gender,
        count() AS group_size
    FROM anonymized_dataset
    GROUP BY country_code, age_bucket, gender
);
```

If `min_group_size` is less than your k-anonymity threshold (commonly 5), apply additional generalization or suppression to those cells.

## Summary

Anonymization in ClickHouse combines SQL functions for pseudonymization and generalization, `HAVING` clauses for suppression, random noise functions for differential privacy, and window functions for data swapping. A materialized view encapsulates the anonymization logic so the output dataset is always fresh and never exposes raw PII to downstream consumers.
