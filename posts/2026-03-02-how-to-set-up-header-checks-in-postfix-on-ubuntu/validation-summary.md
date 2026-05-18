# Validation Summary: How to Set Up Header Checks in Postfix on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Postfix MTA (`header_checks`, `body_checks`, `mime_header_checks`, `smtp_header_checks`)
- Postfix lookup tables: `regexp:` and `pcre:` (postfix-pcre)
- Postfix daemons: `smtpd(8)`, `cleanup(8)`, `smtp(8)`
- `postmap` utility
- `swaks` SMTP testing tool
- Ubuntu / systemd (`systemctl reload postfix`)
- Mail log inspection (`/var/log/mail.log`)

## Sources Consulted
- Postfix `header_checks(5)` man page — https://www.postfix.org/header_checks.5.html
- Postfix `access(5)` man page — https://www.postfix.org/access.5.html
- Postfix `regexp_table(5)` — https://www.postfix.org/regexp_table.5.html
- Postfix `pcre_table(5)` — https://www.postfix.org/pcre_table.5.html
- Postfix `cleanup(8)` — https://www.postfix.org/cleanup.8.html
- Postfix DEBUG_README — https://www.postfix.org/DEBUG_README.html
- Postfix `postmap(1)` — https://www.postfix.org/postmap.1.html

## Issues Found

1. **Incorrect description of when header_checks runs.** The intro stated header_checks runs "during the SMTP transaction before the message is fully accepted, allowing rejection without storing the message." Per `header_checks(5)`, the check is run by `cleanup(8)` after `DATA` is received; the REJECT is returned to the client at the end-of-DATA response, after the message body has been transmitted. Rewrote the sentence to reflect the actual flow.

2. **`DEFER_IF_REJECT` is not a valid header_checks action.** It is documented only in `access(5)` for SMTP access lists, not in `header_checks(5)`. Removed the row from the actions table.

3. **Comment on `postmap -q` for `regexp:` tables is wrong.** The post said "regexp: tables are not postmap-queryable directly." `regexp_table(5)` and `pcre_table(5)` both document `postmap -q "string" regexp:/path` as the standard way to test lookups. Removed the incorrect note; the command itself was correct.

4. **Bogus "D flag" debug section.** No `D` flag exists for header_checks. Replaced the section with the actual documented debugging mechanism: append `-v` to the `cleanup` entry in `master.cf` (per `DEBUG_README`), or rely on `WARN`/`INFO` actions.

5. **Header-injection regex patterns with `\n` would never fire.** The cleanup daemon presents each logical header line to header_checks with the trailing newline already stripped, so patterns like `/^(To|CC|From|Reply-To):.*\n/` cannot match. Rewrote that section to explain where header injection actually needs to be prevented (the submitting application) and replaced the broken examples with a working `WARN` rule that flags base64-encoded recipient headers.

6. **`/^Subject:.*$/ WARN` was commented as "Block messages with no Subject header."** The regex matches every Subject header that is present; header_checks has no mechanism to detect missing headers. Updated the comment to describe what the rule actually does and to note the limitation.

7. **`/^Received:.*\(.*\).*$/ IGNORE` was commented as "Strip client IP from Received headers for privacy."** `IGNORE` removes the entire header line, not just the IP substring. Simplified the example to `/^Received:/ IGNORE` and updated the comment to reflect the real behaviour.

8. **`smtp_header_checks` was described as "messages submitted by your users."** `smtp_header_checks` applies to outbound mail delivered by the Postfix `smtp(8)` client to remote servers, not to user submissions. Updated the comment.

9. **PCRE `/i` claim was misleading.** Both `regexp:` and `pcre:` tables are case-insensitive by default in Postfix; the `/i` flag toggles that behaviour (the case-sensitive form is `/.../I`). Rewrote the sentence to clarify this and to list the features PCRE genuinely adds (lookaheads, lookbehinds, non-greedy quantifiers).

## Review Notes

- The dollar-substitution example `REJECT Blocked attachment type: $0` works in Postfix because `$0` expands to the matched text; future readers may want to note that named groups (`$1`, `$2`, …) are also available.
- The `/^Subject:/ PREPEND X-Header-Checked: yes` rule will fire on every message with a Subject header (which is essentially all of them). That is what the post says it does, but it is worth being aware that PREPEND inserts the header *before* the matched header line in the message stream.
- The body-checks regex examples (SSN / credit-card patterns) are illustrative; in practice they will produce false positives. The post correctly flags this with `WARN` rather than `REJECT`.
- The post recommends installing `postfix-pcre` for PCRE support, which is correct for Ubuntu's packaging.
- The `cleanup` service line shown for verbose debugging matches Ubuntu's default `master.cf` (column order and flags); operators should diff against their own file rather than copy-pasting verbatim.
