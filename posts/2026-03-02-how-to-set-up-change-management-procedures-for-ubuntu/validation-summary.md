# Validation Summary: How to Set Up Change Management Procedures for Ubuntu

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Ubuntu (server administration)
- Bash scripting
- systemd / systemctl
- dpkg / APT (package management, dpkg.log, apt-mark, dpkg --set-selections)
- journalctl
- cron / /etc/cron.d
- auditd / /var/log/audit/audit.log
- Jira Cloud REST API (ticketing integration example)
- Compliance frameworks mentioned: SOC 2, HIPAA, ISO 27001

## Sources Consulted
- Debian/Ubuntu dpkg.log format documentation (man dpkg, https://man7.org/linux/man-pages/man1/dpkg.1.html)
- systemd manual: `systemctl(1)` — `list-units`, `is-enabled`, `is-active` (https://www.freedesktop.org/software/systemd/man/systemctl.html)
- journalctl manual — `--since`, `-p`/`--priority` (https://www.freedesktop.org/software/systemd/man/journalctl.html)
- Atlassian Jira Cloud REST API v3 — Issues / Transitions (https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/)
- Atlassian Jira Cloud REST API v3 — Issue Comments (https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-comments/)
- Atlassian Jira Cloud REST API v2 vs v3 differences (https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/)
- Debian admin reference: holding packages with `dpkg --set-selections` and `apt-mark hold`
- cron(5) / /etc/cron.d format

## Issues Found
1. **Incorrect Jira API call (fixed).** The "Integrating with Ticketing Systems" section used `curl -X PATCH` against `https://yourorg.atlassian.net/rest/api/3/issue/$TICKET/transitions` with a body of `{"status": "...", "resolution": "..."}`. This is wrong on multiple counts:
   - The Jira Cloud transitions endpoint requires `POST`, not `PATCH`.
   - The body for the transitions endpoint must be `{"transition": {"id": "<id>"}}` — it does not accept arbitrary `status`/`resolution` fields.
   - As written, the request would fail with a 405 (method not allowed) or 400 (bad body).

   **Fix:** Replaced the example with a valid call that posts a comment recording the change on the ticket, using Jira REST API v2 (which still accepts a plain-string `body` for comments — v3 requires Atlassian Document Format, which would have made the example significantly more complex):
   ```bash
   curl -s -X POST \
       -H "Authorization: Bearer $JIRA_TOKEN" \
       -H "Content-Type: application/json" \
       -d "{\"body\": \"Change applied on $(hostname) at $(date) - Status: $STATUS\"}" \
       "https://yourorg.atlassian.net/rest/api/2/issue/$TICKET/comment"
   ```

## Review Notes
- The change-log script overwrites the bash built-in `USER` environment variable inside its own scope. This is harmless (the assignment isn't exported and the script ends after), but readers replicating the pattern in larger scripts should be aware.
- The `dpkg --set-selections` syntax shown for holding a package is valid but considered legacy. Modern Ubuntu (16.04+) generally recommends `sudo apt-mark hold packagename`. The current example still works on all supported Ubuntu releases, so no change made.
- The `config-backup` script calls `change-log` at the end. The `change-log` writes to `/var/log/change-management/`, which has `750` permissions (root-owned), so both scripts must be run as root (or via sudo) to function. The post implicitly assumes this via `sudo` usage elsewhere but does not state it explicitly.
- The grep patterns in the package-change-report script use redundant backslash-escaped spaces (`\ install\ `). These are harmless in basic regex (the backslash before a non-special character is ignored) but a plain space would be clearer. No change made.
- The cron line in `/etc/cron.d/package-change-report` uses `$(hostname)` which is expanded by the shell at `echo` time, not at cron execution. This is fine for a static hostname baked into the mail subject, but anyone using this on machines whose hostnames may change should regenerate the cron file or use a literal substitution at run time.
- The Jira v2 REST API endpoint used in the fix is still supported by Atlassian Cloud at the time of writing, but Atlassian has signalled long-term deprecation of v2 in favor of v3. Readers building production integrations should use v3 with ADF-formatted comment bodies.
