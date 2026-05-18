# Validation Summary: How to Set Up Sieve Mail Filtering with Dovecot on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Dovecot (Pigeonhole) Sieve plugin (`dovecot-sieve`)
- ManageSieve protocol (`dovecot-managesieved`, RFC 5804)
- Sieve language (RFC 5228) and extensions: fileinto, mailbox, envelope, vacation, copy, reject, variables, imap4flags, etc.
- LDA / LMTP delivery
- `sievec` compiler and `sieve-test` tools
- ufw (firewall)
- systemd / journalctl
- Thunderbird Sieve add-on

## Sources Consulted
- Dovecot Pigeonhole Sieve configuration reference (`doc.dovecot.org/configuration_manual/sieve/configuration/`)
- Dovecot 2.4 Sieve settings reference (`doc.dovecot.org/2.4.0/core/config/sieve/`)
- `sieve-test(1)` man page (`doc.dovecot.org/main/core/man/sieve-test.1.html`)
- RFC 5228 (Sieve), RFC 5429 (reject/ereject), RFC 5230 (vacation), RFC 5804 (ManageSieve), RFC 3894 (:copy)
- Pigeonhole project (`pigeonhole.dovecot.org`)

## Issues Found
1. **Incorrect comment on `sieve_max_actions`** — The original config file commented `sieve_max_actions = 32` as "Maximum number of Sieve scripts per user." That is wrong: `sieve_max_actions` controls the maximum number of actions a single Sieve script execution may perform (the per-user script-count setting is `sieve_quota_max_scripts`). Updated the comment to accurately describe the setting.
2. **Invalid setting `sieve_execute_mail_log = yes`** — This setting does not exist in Pigeonhole. The documented mechanism for per-user Sieve execution logging is `sieve_user_log` (a path). Replaced with `sieve_user_log = ~/.dovecot.sieve.log` and updated the comment. Also updated the matching reference in the troubleshooting section so the post no longer points users at a non-existent option.
3. **Invalid `-v` flag for `sieve-test`** — `sieve-test` does not have a `-v` (verbose) option. Verbose / trace output is enabled with `-D` (debug) or `-t <file> -T level=actions`. Changed the example to use `-D`, which is the simplest documented equivalent.

## Review Notes
- All Sieve script examples (require statements, fileinto, vacation, redirect :copy, reject, variables with `:matches` capture groups) are syntactically valid against RFC 5228 and the relevant extension RFCs.
- The ManageSieve `protocol sieve { managesieve_sieve_capability = ... }` block lists capabilities that are valid extension names; ensure the listed extensions actually match those supplied/enabled by your installed Pigeonhole version (older 2.3 builds may not ship `extracttext` or `mime` support, in which case advertising them via capability is misleading). Not changed because the post is illustrative.
- Port 4190 for ManageSieve is the IANA-assigned port (RFC 5804) — correct.
- `sieve_max_script_size = 1M` and `sieve_max_actions = 32` both match Pigeonhole defaults; the example values are illustrative and have no functional effect unless changed.
- In Dovecot CE 2.4+, the setting is renamed `sieve_user_log_path`; the post targets Ubuntu (which generally ships 2.3.x), where `sieve_user_log` is correct. Readers on 2.4 should adapt.
- The vacation example uses an embedded newline inside a quoted string. This is permitted by RFC 5228, but the `text:` … `.` heredoc form is more idiomatic for multi-line bodies. Left as-is.
