# Validation Summary: How to Fix 'Privilege Escalation' Vulnerabilities

## Status
validated

## Post Type
Security hardening guide

## Technologies Covered
- Node.js / Express routing
- Python / Flask routing
- SQL injection prevention and parameterized queries
- Linux SUID/SGID permissions and file capabilities
- OpenSSH sshd_config
- sudoers configuration
- Dockerfile container users
- Kubernetes Pod securityContext
- MySQL user privileges and GRANT statements
- Semgrep static analysis rules
- Python logging decorators

## Sources Consulted
- Express routing documentation: https://expressjs.com/en/guide/routing/
- Flask quickstart and routing documentation: https://flask.palletsprojects.com/en/stable/quickstart/
- OWASP Authorization Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- OWASP SQL Injection Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Kubernetes security context documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- MySQL GRANT statement reference: https://dev.mysql.com/doc/refman/9.7/en/grant.html
- Semgrep rule syntax documentation: https://docs.semgrep.dev/writing-rules/rule-syntax
- Linux capabilities manual: https://man7.org/linux/man-pages/man7/capabilities.7.html
- OpenSSH sshd_config manual: https://man7.org/linux/man-pages/man5/sshd_config.5.html
- Local command help for GNU find, chmod, and setcap
- Local syntax checks with Python ast, Node.js, and YAML parsing

## Issues Found
- The secure Dockerfile attempted to `chown -R appuser:appgroup /app` without creating `/app`. Added `mkdir -p /app` before `chown` so the Dockerfile example is internally consistent.
- The secure Dockerfile comment said it dropped all capabilities by default, but Dockerfile `CMD` does not drop Linux capabilities. Changed the comment to state that the app runs as the non-root user.
- The SQL injection fixed example described parameterized queries as database-driver escaping. Reworded it to say the driver binds values separately, which more accurately reflects prepared statement behavior.
- The SSH hardening command only replaced an exact uncommented `PermitRootLogin yes` line. Updated the snippet to handle existing commented or uncommented `PermitRootLogin` settings and append `PermitRootLogin no` if absent.
- The sudoers example allowed `systemctl status` without `--no-pager` and used an implicit service name. Updated the commands to use `myapp.service` and `--no-pager` for the status command.
- The Semgrep rule mixed Python and JavaScript boolean/property syntax in one multi-language rule. Split it into separate Python and JavaScript/TypeScript rules with language-appropriate patterns.

## Review Notes
The examples remain illustrative and omit surrounding application setup such as imports, model definitions, authentication decorators, database connection setup, and service reload commands. The Kubernetes snippet is structurally valid for the documented securityContext fields, but real workloads may need additional writable mounts when `readOnlyRootFilesystem: true` is enabled.
