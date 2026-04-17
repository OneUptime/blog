# Validation Summary: How to Use cutURLParameter() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (URL functions: `cutURLParameter`, `extractURLParameter`, `queryString`, `cutQueryString`)
- SQL

## Sources Consulted
- ClickHouse official URL functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/url-functions

## Issues Found
No technical issues found.

- The signature `cutURLParameter(url, name)` is correct.
- The characterization as the counterpart of `extractURLParameter()` is accurate.
- The claim that it removes all occurrences of the named parameter while preserving scheme, host, path, other parameters, and fragment matches the documented behavior.
- The related function reference to `cutQueryString()` for removing all parameters is accurate.
- All SQL examples are syntactically valid and use valid ClickHouse functions (`arrayJoin`, `uniq`, `count`, `groupArray`, `yesterday()`, `toDate`, `length`, `queryString`).
- The expected output in the Basic Usage section correctly reflects `cutURLParameter` behavior (removes the named parameter and its value; leaves URLs without that parameter unchanged).

## Review Notes
- Since ClickHouse 22.6+, `cutURLParameter` also accepts an array of parameter names as its second argument (e.g., `cutURLParameter(url, ['utm_source', 'utm_medium', 'utm_campaign'])`), which is more concise and efficient than the chained-call pattern shown in several examples. The chained-call approach used here still works correctly, so this is an enhancement suggestion rather than a technical error.
- The post uses British spelling ("canonicalisation", "sanitise") consistently — intentional stylistic choice, not a technical issue.
