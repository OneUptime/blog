# How to Configure MaxScale Filters for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, MaxScale, Filter, Audit, Query

Description: Configure MaxScale filters to log, rewrite, throttle, and audit MySQL queries passing through the proxy without changing application code.

---

## What Are MaxScale Filters

MaxScale filters are middleware components that sit in a service's filter chain. Each query passes through the chain in order before reaching the router, and each response passes back through in reverse. Filters can log queries, rewrite SQL, inject delays, block patterns, or mask sensitive data. Multiple filters can be stacked on a single service.

## Enabling the Query Log All (QLA) Filter

The `qlafilter` logs every query that passes through a service, useful for auditing and debugging.

```text
# /etc/maxscale.cnf
[qla-filter]
type=filter
module=qlafilter
filebase=/var/log/maxscale/qla
log_type=unified
flush=true
match=.*

[read-write-service]
type=service
router=readwritesplit
servers=primary,replica1,replica2
user=maxscale_user
password=secret
filters=qla-filter
```

Restart MaxScale after editing the configuration:

```bash
sudo systemctl restart maxscale
```

Log lines are written to `/var/log/maxscale/qla.unified` and include the timestamp, session ID, and full SQL text.

## Using the Regex Filter to Rewrite Queries

The `regexfilter` rewrites queries matching a regular expression before they reach the backend. This is useful for migrating legacy applications that send slightly wrong SQL.

```text
[regex-filter]
type=filter
module=regexfilter
match=SELECT \* FROM legacy_table
replace=SELECT id, name, email FROM legacy_table
```

Add it to the service filter chain:

```text
[read-write-service]
filters=regex-filter | qla-filter
```

## Throttle Filter for Rate Limiting

The `throttlefilter` limits how many queries per second a single user session can send, protecting the database from runaway application bugs.

```text
[throttle-filter]
type=filter
module=throttlefilter
max_qps=500
throttling_duration=2000ms
sampling_duration=250ms
continuous_duration=2000ms
```

## Masking Sensitive Data with the Masking Filter

The `masking` filter replaces column values in query results with masked output, so applications never see raw sensitive data like credit card numbers.

```text
[mask-filter]
type=filter
module=masking
rules=/etc/maxscale/masking_rules.json
```

```json
{
  "rules": [
    {
      "replace": {
        "column": "card_number"
      },
      "with": {
        "value": "XXXX-XXXX-XXXX-XXXX"
      }
    }
  ]
}
```

## Verifying Filters Are Active

Use the MaxScale CLI to confirm your filters are loaded:

```bash
maxctrl list filters
maxctrl show filter qla-filter
```

## Summary

MaxScale filters give you query-level control over MySQL traffic without modifying the application. The QLA filter provides full audit logging, the regex filter rewrites legacy SQL, the throttle filter protects backends from excessive query rates, and the masking filter prevents sensitive data from reaching the application tier. Stack multiple filters on a service to combine these capabilities, and use `maxctrl` to verify their configuration at runtime.
