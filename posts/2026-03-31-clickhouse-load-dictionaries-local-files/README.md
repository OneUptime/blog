# How to Load Dictionaries from Local Files in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Dictionary, Local File, CSV, Lookup

Description: Learn how to load ClickHouse dictionaries from local CSV, TSV, and other file formats for simple static lookups without an external database.

---

## File-Based Dictionaries

Local file sources are the simplest way to load static reference data into ClickHouse dictionaries. They are ideal for configuration tables, code mappings, and any data that changes infrequently.

## CSV File Dictionary

Prepare a CSV file on the ClickHouse server:

```text
/var/lib/clickhouse/user_files/country_codes.csv
```

```text
US,United States,North America,USD
GB,United Kingdom,Europe,GBP
JP,Japan,Asia,JPY
DE,Germany,Europe,EUR
FR,France,Europe,EUR
```

Create the dictionary:

```sql
CREATE DICTIONARY country_codes_file (
    code String,
    country_name String DEFAULT 'Unknown',
    continent String DEFAULT 'Unknown',
    currency String DEFAULT 'USD'
)
PRIMARY KEY code
SOURCE(FILE(
    path '/var/lib/clickhouse/user_files/country_codes.csv'
    format 'CSV'
))
LAYOUT(COMPLEX_KEY_HASHED())
LIFETIME(3600);
```

## CSV with Headers

If your CSV has a header row, use `CSVWithNames`:

```sql
SOURCE(FILE(
    path '/var/lib/clickhouse/user_files/status_codes.csv'
    format 'CSVWithNames'
))
```

## TSV File Dictionary

```text
/var/lib/clickhouse/user_files/error_codes.tsv
```

```text
1001	invalid_input	User provided invalid input
1002	auth_failed	Authentication failed
1003	not_found	Resource not found
1004	rate_limited	Too many requests
```

```sql
CREATE DICTIONARY error_codes_dict (
    code UInt64,
    name String DEFAULT 'unknown_error',
    description String DEFAULT ''
)
PRIMARY KEY code
SOURCE(FILE(
    path '/var/lib/clickhouse/user_files/error_codes.tsv'
    format 'TabSeparated'
))
LAYOUT(FLAT())
LIFETIME(7200);
```

## JSON Lines File

```text
{"id": 1, "label": "Electronics", "parent_id": 0}
{"id": 2, "label": "Laptops", "parent_id": 1}
{"id": 3, "label": "Phones", "parent_id": 1}
```

```sql
CREATE DICTIONARY categories_dict (
    id UInt64,
    label String DEFAULT '',
    parent_id UInt64 DEFAULT 0
)
PRIMARY KEY id
SOURCE(FILE(
    path '/var/lib/clickhouse/user_files/categories.jsonl'
    format 'JSONEachRow'
))
LAYOUT(HASHED())
LIFETIME(3600);
```

## Updating File Dictionaries

Replace the file and reload the dictionary:

```bash
cp new_country_codes.csv /var/lib/clickhouse/user_files/country_codes.csv
```

```sql
SYSTEM RELOAD DICTIONARY country_codes_file;
```

## Check Dictionary Status

```sql
SELECT
    name,
    status,
    element_count,
    last_successful_update_time,
    last_exception
FROM system.dictionaries
WHERE name = 'country_codes_file';
```

## Automate File Updates with a Script

```bash
#!/bin/bash
# Download updated reference data and reload dictionary
curl -s https://api.example.com/country-codes.csv \
    -o /var/lib/clickhouse/user_files/country_codes.csv

clickhouse-client --query "SYSTEM RELOAD DICTIONARY country_codes_file"
echo "Dictionary reloaded at $(date)"
```

## File Permissions

Ensure the ClickHouse process user has read access to the file:

```bash
chown clickhouse:clickhouse /var/lib/clickhouse/user_files/country_codes.csv
chmod 644 /var/lib/clickhouse/user_files/country_codes.csv
```

## Summary

Local file dictionaries in ClickHouse are simple, fast, and require no external database. Use them for static reference data like country codes, error messages, and category trees. Automate file replacement and dictionary reloads with a cron job for periodic updates.
