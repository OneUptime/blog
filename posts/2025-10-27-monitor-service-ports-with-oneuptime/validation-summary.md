# Validation Summary: Keep Critical Ports Available with OneUptime: A Practical Guide

## Status
not-code-blog

## Post Type
Guide (product walkthrough / how-to for configuring port monitors in the OneUptime UI)

## Technologies Covered
- OneUptime port monitoring
- TCP port reachability checks
- OneUptime probes (cloud and self-hosted)
- General infrastructure monitoring concepts (databases, message brokers, SMTP, caches, queues)

## Sources Consulted
- General networking knowledge: TCP connection establishment and port reachability (no version-specific claims to verify)
- OneUptime product concepts referenced in the post (probes, monitors, incidents, maintenance windows, on-call policies)

## Issues Found
No technical issues found.

This post contains no code examples, terminal commands, or configuration snippets. It is a non-technical, UI-driven walkthrough describing how to set up a port monitor through the OneUptime product interface and lists best practices and troubleshooting tips. As such it is classified as "not-code-blog".

The conceptual claims it does make are accurate:
- Port monitors confirm a host/port responds to TCP connections and can measure response time — correct.
- Common ports referenced (22 SSH, 80 HTTP, 5432 Postgres, 25/587 SMTP) align with standard port assignments.
- External vs. self-hosted probe visibility and firewall-from-the-probe's-perspective troubleshooting advice are technically sound.

## Review Notes
None.
