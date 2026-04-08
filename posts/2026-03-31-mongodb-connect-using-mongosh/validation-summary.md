# Validation Summary: How to Connect to MongoDB Using mongosh

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB
- mongosh (MongoDB Shell)
- MongoDB Atlas
- TLS/SSL certificate authentication
- x.509 certificate authentication
- SCRAM-SHA-256 authentication

## Sources Consulted
- mongosh official documentation: https://www.mongodb.com/docs/mongodb-shell/
- mongosh connection options: https://www.mongodb.com/docs/mongodb-shell/connect/
- mongosh `--eval` flag documentation: https://www.mongodb.com/docs/mongodb-shell/reference/options/#--eval
- MongoDB connection string URI format: https://www.mongodb.com/docs/manual/reference/connection-string/
- MongoDB x.509 authentication: https://www.mongodb.com/docs/manual/core/security-x.509/

## Issues Found

1. **`--eval "use sales"` uses REPL-only syntax**: The `use <db>` syntax is REPL sugar that is not valid JavaScript. In `--eval` context, mongosh expects valid JavaScript. Changed `--eval "use sales"` to `--eval "use('sales')"`, which is the proper function call form supported in `--eval`.

2. **Output block incorrectly labeled as JSON**: The output `{ ok: 1 }` from `db.runCommand({ping:1})` was in a ` ```json ` fenced code block, but it is not valid JSON (the key `ok` is unquoted). Changed to a plain ` ``` ` code block since this is mongosh shell output format, not JSON.

## Review Notes
- `db.adminCommand("ismaster")` is deprecated since MongoDB 5.0 in favor of `db.adminCommand("hello")`. It still functions correctly as an alias, but future revisions of this post could update to use `hello` instead.
- All URI connection string formats, CLI flags, and authentication mechanisms are accurate and current for mongosh 2.x.
- The `--norc`, `--quiet`, and `--file` flags are all correctly documented.
