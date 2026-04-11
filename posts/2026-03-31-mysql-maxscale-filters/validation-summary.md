# Validation Summary: How to Configure MaxScale Filters for MySQL

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MariaDB MaxScale (proxy / filter framework)
- MySQL (backend database)
- QLA Filter (`qlafilter`) — query audit logging
- Regex Filter (`regexfilter`) — SQL rewriting
- Throttle Filter (`throttlefilter`) — rate limiting
- Masking Filter (`masking`) — sensitive data masking
- `maxctrl` CLI

## Sources Consulted
- MariaDB MaxScale QLA Filter documentation: https://mariadb.com/kb/en/mariadb-maxscale-6-qla-filter/
- MariaDB MaxScale Regex Filter documentation: https://mariadb.com/kb/en/mariadb-maxscale-6-regex-filter/
- MariaDB MaxScale Throttle Filter documentation: https://mariadb.com/kb/en/mariadb-maxscale-6-throttle-filter/
- MariaDB MaxScale Masking Filter documentation: https://mariadb.com/kb/en/mariadb-maxscale-6-masking/
- MariaDB MaxScale Configuration Guide: https://mariadb.com/kb/en/mariadb-maxscale-6-configuration-guide/
- MaxScale GitHub documentation repository

## Issues Found

1. **QLA log file extension was wrong** (line 44): The post stated the log file would be `qla.log`, but when using `log_type=unified`, the QLA filter appends `.unified` to the filebase. Changed to `qla.unified`.

2. **Filter separator in service config was wrong** (line 62): The post used commas to separate multiple filters (`filters=regex-filter,qla-filter`). MaxScale requires the pipe character (`|`) as the filter separator. Changed to `filters=regex-filter | qla-filter`.

3. **Throttle filter had a non-existent parameter** (lines 70-77): The `queue_size` parameter does not exist for the `throttlefilter` module. Replaced it with the actual optional parameters `sampling_duration` and `continuous_duration`. Also added the `ms` unit suffix to `throttling_duration` which was missing its duration unit.

4. **Masking filter JSON rules format was incorrect** (lines 90-103): The rules JSON had multiple errors:
   - A fabricated `function` field inside `replace` that does not exist in the masking rules schema.
   - The `value` field was placed inside `replace` instead of inside `with`.
   - The `with` object was empty `{}` when it should contain the replacement value.
   - Removed unnecessary empty `applies_to` and `exempted` arrays for clarity.
   Fixed to the correct structure with `column` in `replace` and `value` in `with`.

## Review Notes
- The description of filter chain behavior ("each response passes back through in reverse") is a reasonable conceptual model but is not explicitly documented in the MaxScale configuration guide. The official docs only describe the request path passing through filters left to right. This was left as-is since it is not technically wrong for filters that process responses (like the masking filter).
- Module names (`qlafilter`, `regexfilter`, `throttlefilter`, `masking`), `maxctrl` commands, `readwritesplit` router, and general service configuration syntax were all verified as correct.
