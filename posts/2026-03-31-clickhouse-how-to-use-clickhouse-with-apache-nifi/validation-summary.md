# Validation Summary: How to Use ClickHouse with Apache NiFi

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Apache NiFi (InvokeHTTP, GenerateFlowFile, ExecuteScript, MergeContent processors)
- ClickHouse HTTP interface
- NiFi Expression Language
- Groovy (for ExecuteScript)
- JSONEachRow format

## Sources Consulted
- ClickHouse HTTP Interface documentation: https://clickhouse.com/docs/en/interfaces/http
- ClickHouse HTTP authentication (X-ClickHouse-User / X-ClickHouse-Key headers): https://clickhouse.com/docs/en/interfaces/http#default-database
- Apache NiFi InvokeHTTP processor documentation: https://nifi.apache.org/docs.html
- Apache NiFi Expression Language Guide: https://nifi.apache.org/docs/nifi-docs/html/expression-language-guide.html
- Apache NiFi GenerateFlowFile processor docs
- Apache NiFi MergeContent processor docs (Bin-Packing Algorithm, Delimiter Strategy)
- Apache NiFi ExecuteScript / Groovy scripting cookbook

## Issues Found
No technical issues found.

## Review Notes
- ClickHouse HTTP authentication headers `X-ClickHouse-User` and `X-ClickHouse-Key` are correct and documented.
- The JSONEachRow format with line-delimited JSON is the standard way to bulk-insert into ClickHouse via HTTP.
- NiFi Expression Language functions used (`${UUID()}`, `${random():mod(100)}`, `${now():format(...)}`) are valid.
- Groovy ExecuteScript pattern using `session.write(flowFile) { inputStream, outputStream -> ... }` closure is the canonical approach and matches NiFi's StreamCallback conventions.
- In NiFi 2.x, the InvokeHTTP property previously called "Remote URL" was renamed to "HTTP URL". The post uses "Remote URL" which is correct for NiFi 1.x; users on NiFi 2.x should look for "HTTP URL" instead. Not strictly an error since no version is specified.
- For production workloads, users should consider using the official clickhouse-jdbc driver via a JDBC-based NiFi processor (PutDatabaseRecord) for better type handling and connection pooling, but the HTTP approach shown is valid and widely used.
