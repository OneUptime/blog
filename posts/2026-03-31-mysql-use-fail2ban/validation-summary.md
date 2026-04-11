# Validation Summary: How to Use fail2ban with MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- fail2ban (intrusion prevention / log-parsing tool)
- MySQL 8.0 (error log format, `max_connect_errors`, `CONNECTION_CONTROL` plugin)
- iptables (firewall rules via `iptables-multiport` action)
- systemd (service management)
- sendmail (email alerting)

## Sources Consulted
- fail2ban official filter `mysqld-auth.conf` source (https://github.com/fail2ban/fail2ban/blob/master/config/filter.d/mysqld-auth.conf)
- fail2ban documentation on failregex and `<HOST>` requirement (https://www.fail2ban.org/wiki/index.php/MANUAL_0_8#Filters)
- fail2ban `jail.conf` configuration reference for `sender` vs `sendername` parameter
- MySQL 8.0 Reference Manual — error log format and Access Denied message structure (https://dev.mysql.com/doc/refman/8.0/en/error-log.html)
- fail2ban `iptables-multiport` action source for chain naming convention (`f2b-<name>`)

## Issues Found

### 1. First failregex line missing `<HOST>` (Critical)
- **What was wrong:** The first `failregex` pattern did not contain the `<HOST>` tag. fail2ban requires every failregex line to include `<HOST>` (or an equivalent failure-id group like `<ADDR>`) so it can extract the offending IP address. Without it, fail2ban raises a `RegexException` at startup and the filter fails to load.
- **What was changed:** Added `'<HOST>'` in the correct position (after `@` in the "Access denied for user" portion) so the IP is captured. Also changed `YES` to `\S+` to match both `YES` and `NO` password states.
- **Why:** The original regex would have caused fail2ban to fail at startup, making the entire tutorial non-functional.

### 2. Redundant `%(__prefix_line)s` before manual timestamp pattern (Minor)
- **What was wrong:** The first failregex used `%(__prefix_line)s` (a syslog-style prefix matcher) followed by an explicit MySQL timestamp pattern. While `__prefix_line` can match empty string, combining it with a MySQL-specific timestamp pattern is redundant and confusing.
- **What was changed:** Removed `%(__prefix_line)s` from the first pattern since the explicit timestamp regex already handles the MySQL 8.0 log format. Also made the timezone portion more flexible (`\S*` instead of just `Z`) to handle both `Z` and `+00:00` timezone suffixes.
- **Why:** Cleaner, more accurate regex that directly matches MySQL's native error log format.

### 3. `sendername` renamed to `sender` (Minor)
- **What was wrong:** The email alerting configuration used `sendername`, which is deprecated in current fail2ban versions.
- **What was changed:** Replaced `sendername` with `sender`.
- **Why:** Current fail2ban `jail.conf` uses `sender` as the parameter name.

## Review Notes
- The post correctly references MySQL's `CONNECTION_CONTROL` plugin and `max_connect_errors` as complementary protections — both are real MySQL features for connection throttling.
- The official fail2ban distribution ships a `mysqld-auth.conf` filter. Readers could use that directly instead of creating a custom filter, but the tutorial approach of building a custom filter is valid for educational purposes and allows customization.
- The iptables chain name `f2b-mysql` correctly corresponds to the `name=mysql` parameter in the jail's `iptables-multiport` action.
- All CLI commands (`fail2ban-client`, `fail2ban-regex`, `iptables`, `systemctl`) use correct syntax and flags.
