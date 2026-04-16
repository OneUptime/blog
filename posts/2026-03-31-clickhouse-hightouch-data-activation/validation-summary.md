# Validation Summary: How to Use ClickHouse with Hightouch for Data Activation

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- ClickHouse (SQL, user/role management, date/aggregate functions)
- Hightouch (reverse ETL, SQL models, incremental syncs)
- Braze (destination for user attributes)
- Google Ads (Customer Match destination)

## Sources Consulted
- ClickHouse CREATE USER docs: https://clickhouse.com/docs/en/sql-reference/statements/create/user
- ClickHouse CREATE ROLE docs: https://clickhouse.com/docs/en/sql-reference/statements/create/role
- ClickHouse GRANT docs: https://clickhouse.com/docs/en/sql-reference/statements/grant
- ClickHouse date functions (toMonday, today): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse conditional aggregate functions (countIf): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- Hightouch ClickHouse source docs: https://hightouch.com/docs/sources/clickhouse
- Hightouch SQL models docs: https://hightouch.com/docs/models/sql
- Hightouch incremental sync docs: https://hightouch.com/docs/syncs/overview
- Hightouch Braze destination docs: https://hightouch.com/docs/destinations/braze
- Hightouch Google Ads Customer Match destination docs: https://hightouch.com/docs/destinations/google-ads

## Issues Found
No technical issues found.

- The ClickHouse `CREATE USER ... IDENTIFIED WITH sha256_password BY '...' HOST IP '...'` syntax is valid.
- The role creation and grant statements follow the correct ClickHouse RBAC syntax.
- `toMonday(today())`, `countIf(...)`, and `count(DISTINCT ...)` are valid ClickHouse functions.
- Hightouch does support ClickHouse as a source and uses SQL models, incremental syncs with cursor columns, and has Braze + Google Ads Customer Match destinations.
- The claim of "200+ destinations" for Hightouch is accurate as of the post date.

## Review Notes
- The `HOST IP '34.0.0.0/8'` in the CREATE USER example is illustrative - readers should pull the current Hightouch egress IP allowlist from Hightouch's documentation rather than hardcoding this block.
- The post assumes tables like `analytics.user_profiles_current`, `analytics.users`, `analytics.usage_weekly`, and `analytics.activation_experiments` exist; these are illustrative schema names, which is reasonable for a tutorial.
- For Google Ads Customer Match, the email is typically required to be SHA-256 hashed before upload - Hightouch handles this automatically, but readers building custom pipelines should be aware.
