# Validation Summary: How to Anonymize Personal Data in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse SQL
- Hash functions (`SHA256`, `sipHash64`)
- Window functions (`row_number`, `count() OVER`)
- IP address functions (`IPv4NumToString`, `IPv4StringToNum`, `bitAnd`)
- Random number functions (`rand`, `randNormal`)
- Materialized views with `MergeTree`
- Privacy concepts: pseudonymization, k-anonymity, generalization, differential privacy (Laplace/Gaussian noise), data swapping

## Sources Consulted
- ClickHouse SQL Reference — Hash functions: https://clickhouse.com/docs/en/sql-reference/functions/hash-functions
- ClickHouse SQL Reference — Random functions: https://clickhouse.com/docs/en/sql-reference/functions/random-functions
- ClickHouse SQL Reference — Window functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse SQL Reference — IP address functions: https://clickhouse.com/docs/en/sql-reference/functions/ip-address-functions
- ClickHouse SQL Reference — Encoding functions (`hex`): https://clickhouse.com/docs/en/sql-reference/functions/encoding-functions
- ClickHouse SQL Reference — Array functions (`splitByChar`, 1-indexed arrays)
- Inverse-CDF formulation of the Laplace distribution (standard reference for differential privacy)

## Issues Found
- **Data swapping JOIN condition was broken.** In the "Technique 5 - Data Swapping" section, the final JOIN read:
  ```
  JOIN ranked b ON a.rn = ((a.rn + 73) % a.total) + 1;
  ```
  This ON clause references only `a` on both sides, so it either evaluates to false (yielding zero rows) or degenerates to a cross product where `b` is unconstrained — the "swap" would not actually pair row `a` with the offset row it was supposed to. Changed to:
  ```
  JOIN ranked b ON b.rn = ((a.rn + 73) % a.total) + 1;
  ```
  This correctly binds each row `a` to the row `b` that is 73 positions ahead (modulo the total), matching the described intent.

## Review Notes
- `sipHash64('secret-salt', user_id)` uses the salt as just another hashed input, not as a cryptographic key. For true keyed hashing where the salt's secrecy is the sole protection, `sipHash64Keyed((k0, k1), message)` is the stricter primitive. The post's approach is functionally fine for pseudonymization as long as the salt stays secret, but readers with strong threat models should know the distinction.
- `randNormal(mean, variance)` is the function name in some ClickHouse docs, but the second parameter is the **standard deviation**, not variance. The post's usage `randNormal(0, 5)` is numerically sensible either way (noise with stddev=5 is reasonable), so no correction was needed.
- The materialized view in "Building an Anonymization Pipeline" uses a window function (`count() OVER (PARTITION BY country_code) < 5`). MVs process each insert block independently, so this suppression works per-block, not globally across the accumulated table. The SQL is syntactically valid; readers who need true global k-anonymity should apply the suppression as a batch step over the full anonymized dataset instead.
- Code relies on recent-ish ClickHouse versions (window functions GA since 21.x; `concat` with implicit non-string argument coercion is a 22.12+ convenience). These are standard on any supported version today.
- The Laplace-noise inverse-CDF formula is correct: with `U ~ Uniform(0,1)`, `log(1 - U)` has an Exponential(1) distribution up to sign, and multiplying by a random ±1 yields a symmetric Laplace(0, scale) distribution.
