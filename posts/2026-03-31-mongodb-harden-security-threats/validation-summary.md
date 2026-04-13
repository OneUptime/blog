# Validation Summary: How to Harden MongoDB Against Common Security Threats

## Status
validated

## Post Type
Guide / Security Hardening Checklist

## Technologies Covered
- MongoDB (mongod configuration, authentication, TLS, auditing)
- Linux firewall tools (ufw, iptables)
- SCRAM-SHA-256 authentication
- AWS Secrets Manager (for secrets management example)

## Sources Consulted
- MongoDB official documentation: Security Checklist (https://www.mongodb.com/docs/manual/administration/security-checklist/)
- MongoDB official documentation: Enable Access Control (https://www.mongodb.com/docs/manual/tutorial/enable-authentication/)
- MongoDB official documentation: Configuration File Options — net.bindIp (https://www.mongodb.com/docs/manual/reference/configuration-options/#net-options)
- MongoDB official documentation: TLS/SSL Configuration (https://www.mongodb.com/docs/manual/reference/configuration-options/#net-tls-options)
- MongoDB official documentation: HTTP Status Interface removal in 3.6 (https://www.mongodb.com/docs/manual/release-notes/3.6-compatibility/#http-interface-and-rest-api)
- MongoDB official documentation: security.javascriptEnabled (https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-security.javascriptEnabled)
- MongoDB official documentation: Auditing (https://www.mongodb.com/docs/manual/core/auditing/)
- MongoDB official documentation: SCRAM authentication mechanisms (https://www.mongodb.com/docs/manual/core/security-scram/)

## Issues Found
1. **Section 5 — HTTP Interface and REST API history was inaccurate.**
   - **What was wrong:** The post stated the HTTP interface and REST API "are enabled by default" in older MongoDB versions. It also stated "In MongoDB 3.6+, these are disabled by default."
   - **What was changed:** Corrected to explain that the HTTP interface was enabled by default only in versions before 3.2; in MongoDB 3.2–3.4 it was deprecated and disabled by default. Clarified that in MongoDB 3.6+ the HTTP interface and REST API were completely removed (not merely disabled), and the `net.http` configuration options are no longer valid.
   - **Why:** Using the `net.http` config options on MongoDB 3.6+ would cause `mongod` to fail to start. Readers need to know these options only apply to 3.2–3.4 and are removed in later versions.

## Review Notes
- The post hardcodes example passwords in the `db.createUser()` examples (e.g., "VeryStrongRandomPass123!"). While this is fine for illustrative purposes, readers should be reminded to use `passwordPrompt()` (available in mongosh) for interactive password entry to avoid passwords appearing in shell history.
- Section 8 (Auditing) correctly notes the Enterprise-only restriction. Community Edition users should be aware this feature is unavailable to them.
- All other code examples, configuration snippets, CLI commands, and technical claims are accurate and current for modern MongoDB versions (5.x/6.x/7.x).
