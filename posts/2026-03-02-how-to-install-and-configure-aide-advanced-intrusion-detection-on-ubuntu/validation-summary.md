# Validation Summary: How to Install and Configure AIDE (Advanced Intrusion Detection) on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- AIDE / aide-common
- AIDE configuration rules and attributes
- Cron
- Linux mail command
- auditd, ausearch, and aureport

## Sources Consulted
- Ubuntu aide.conf(5) manpage: https://manpages.ubuntu.com/manpages/questing/man5/aide.conf.5.html
- Ubuntu aideinit(8) manpage: https://manpages.ubuntu.com/manpages/questing/man8/aideinit.8.html
- AIDE aide(1) manpage: https://www.mankier.com/1/aide
- Ubuntu FileIntegrityAIDE community documentation: https://help.ubuntu.com/community/FileIntegrityAIDE
- Ubuntu package metadata and extracted aide-common 0.18.6-2ubuntu0.1 package files from the Ubuntu Noble repository
- Ubuntu ausearch(8) and aureport(8) manpages: https://manpages.ubuntu.com/manpages/jammy/man8/ausearch.8.html and https://manpages.ubuntu.com/manpages/jammy/man8/aureport.8.html

## Issues Found
- The post claimed simplified exact definitions for AIDE's default `R` and `L` groups. Current AIDE documents these as default compound groups whose exact expressions should be checked with `aide --version`, and Ubuntu's packaged configuration uses its own named groups. Updated the text to describe common attributes and point readers to `aide --version` for exact group expressions.
- The initialization section said to move `/var/lib/aide/aide.db.new` after running `aideinit`. Current Ubuntu `aideinit` creates the new database and copies it to the active database location, prompting before overwriting an existing database unless `--force` is used. Updated the instructions to reflect that behavior.
- The check example used `aide --check --report=stdout`. The `--report` option was removed in AIDE 0.17; current AIDE uses `report_url` in configuration. Removed the invalid flag and noted that report detail/output are controlled by `report_level` and `report_url`.
- The cron script captured the pipeline status from `tee` rather than reliably preserving AIDE's non-zero status. Added `set -o pipefail`.
- The cron script documented AIDE exit code `3` as "changed files found" and `4+` as errors. AIDE uses bitwise/additive report codes: `1` new files, `2` removed files, `4` changed files, with combinations added together; generic errors start at `14`. Corrected the comments.
- The email command used `mail -a "From: ..."` which is not portable across common Ubuntu mail implementations because `-a` is not consistently a header option. Removed the non-essential header flag.
- The report parsing example used a grep pattern for `^[A-Z]:`, but current AIDE summarized change lines use file type and attribute-change characters rather than that colon format. Updated the grep pattern to match summarized change lines documented by aide.conf(5).

## Review Notes
The post is technically relevant and accurate after the fixes. Ubuntu's `aide-common` package already includes default configuration and scheduled checks; the custom cron example remains valid as an explicit alternative, but future revisions could mention the packaged daily check to avoid duplicate scheduling.
