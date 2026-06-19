# Validation Summary: How to Handle Penetration Testing

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Penetration testing planning and rules of engagement
- YAML configuration
- Bash scripting
- iptables
- curl
- Python dataclasses, logging, ipaddress, and requests
- JavaScript and Node.js CommonJS modules
- PostgreSQL schema and views
- sqlmap

## Sources Consulted
- NIST SP 800-115, Technical Guide to Information Security Testing and Assessment: https://csrc.nist.gov/pubs/sp/800/115/final
- OWASP Web Security Testing Guide: https://owasp.org/www-project-web-security-testing-guide/
- Python dataclasses documentation: https://docs.python.org/3/library/dataclasses.html
- Python ipaddress documentation: https://docs.python.org/3/library/ipaddress.html
- Node.js CommonJS modules documentation: https://nodejs.org/api/modules.html
- PostgreSQL CREATE TABLE documentation: https://www.postgresql.org/docs/current/sql-createtable.html
- PostgreSQL array documentation: https://www.postgresql.org/docs/current/arrays.html
- sqlmap usage documentation: https://github.com/sqlmapproject/sqlmap/wiki/usage
- iptables and iptables-restore manual pages: https://man7.org/linux/man-pages/man8/iptables.8.html and https://man7.org/linux/man-pages/man8/iptables-restore.8.html
- curl tool documentation: https://curl.se/docs/tooldocs.html

## Issues Found
- The environment preparation script wrote iptables-style logging rules to a file but did not apply them, so it would not actually set up network monitoring as described. Changed the snippet to apply the rules directly with `iptables -A INPUT` and `iptables -A OUTPUT`.
- The SQL injection remediation verification reused sqlmap's default session behavior, which can make a retest rely on stale cached target state. Added `--flush-session`, which sqlmap documents for clearing session files before a fresh run.
- The SQL injection remediation verification checked for one narrow sqlmap log phrase. Broadened the grep expression to match sqlmap's common "does not appear to be injectable" wording as well.
- The XSS verification snippet used `urlencode`, which is not a standard shell command and would fail on a typical system. Changed the request to use curl's `-G` with `--data-urlencode`.
- The XSS verification snippet used regular-expression grep against payload strings. Changed it to `grep -Fq --` so payloads are treated as fixed strings and payloads beginning with a dash cannot be parsed as options.

## Review Notes
The examples are illustrative and still assume environment-specific components such as `./scripts/create-user.sh`, `security-logging`, Slack-compatible webhooks, a configured JIRA workflow, and authorized test targets. Local syntax validation passed for the Bash, Python, JavaScript, and YAML snippets after the fixes.
