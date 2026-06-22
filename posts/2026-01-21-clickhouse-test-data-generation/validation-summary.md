# Validation Summary: How to Generate Realistic Test Data for ClickHouse

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse SQL
- ClickHouse table functions: `generateRandom()` and `numbers()`
- ClickHouse dictionaries and `dictGet`
- ClickHouse random data functions
- Python
- Faker
- `clickhouse-connect`

## Sources Consulted
- ClickHouse `generateRandom` table function documentation: https://clickhouse.com/docs/sql-reference/table-functions/generate
- ClickHouse `numbers` table function documentation: https://clickhouse.com/docs/sql-reference/table-functions/numbers
- ClickHouse random functions documentation: https://clickhouse.com/docs/sql-reference/functions/random-functions
- ClickHouse `CREATE DICTIONARY` documentation: https://clickhouse.com/docs/sql-reference/statements/create/dictionary
- ClickHouse dictionary sources documentation: https://clickhouse.com/docs/sql-reference/statements/create/dictionary/sources
- ClickHouse dictionary functions documentation: https://clickhouse.com/docs/sql-reference/functions/ext-dict-functions
- ClickHouse interval conversion function documentation: https://clickhouse.com/docs/sql-reference/functions/type-conversion-functions
- ClickHouse Connect Python driver API documentation: https://clickhouse.com/docs/integrations/language-clients/python/driver-api
- Faker date/time provider documentation: https://faker.readthedocs.io/en/master/providers/faker.providers.date_time.html
- Local validation with official ClickHouse Docker image, `clickhouse-local` version 26.5.1.882

## Issues Found
- The log-generation query used `now() - INTERVAL number MILLISECOND * 10`, which ClickHouse parses as multiplying an `IntervalMillisecond` by an integer and rejects. Changed it to `now() - INTERVAL (number * 10) MILLISECOND`.
- The dictionary example generated separate random keys for `city` and `country`, so the country could belong to a different city. Changed the query to generate one `city_id` in a subquery and use it for both `dictGet` calls.
- The Python `clickhouse-connect` example built a list of dictionaries and passed it to `client.insert`, but the documented `insert` API expects a sequence of row sequences or column sequences. Changed the generator to return row lists and supplied explicit `column_names`.
- The benchmark comment said "Insert 1 billion rows in batches" while the query inserts `numbers(100000000)` in a single statement. Updated the comment to "Insert 100 million rows."

## Review Notes
The examples assume the destination tables already exist with compatible schemas. Several weighted-distribution examples use multiple independent `rand()` calls inside nested `if` expressions, so the exact probabilities are approximate, but the examples are technically valid for generating skewed synthetic data.
