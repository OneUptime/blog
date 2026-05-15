# Validation Summary: How to Generate CIS Compliance Reports for RHEL Using oscap

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- OpenSCAP `oscap`
- SCAP Security Guide
- CIS Benchmark profiles
- Bash scripting
- Cron
- Logrotate

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- OpenSCAP User Manual: https://static.open-scap.org/openscap-1.4.1/oscap_user_manual.html
- OpenSCAP upstream manual: https://github.com/OpenSCAP/openscap/blob/main/docs/manual/manual.adoc
- SCAP Security Guide RHEL 9 CIS profile guide: https://static.open-scap.org/ssg-guides/ssg-rhel9-guide-cis.html

## Issues Found
- The post counted scan results with patterns such as `result="pass"`, but OpenSCAP XCCDF result files use result elements such as `<result>pass</result>`. Updated the command-line summary, custom summary script, weekly email script, and trend comparison examples to match result elements.
- The custom summary script attempted to list failed rule titles by running `oscap xccdf eval --profile "" "$RESULTS_FILE"`, which treats a results file as evaluation input and does not correctly extract failures. Replaced it with an `awk` parser that reports failed rule IDs from `<rule-result>` entries.
- The compliance score calculation could divide by zero when a scan contained only non-pass/fail outcomes. Updated the guard to require at least one pass or fail result.
- The basic report example wrote to `/var/log/compliance` without ensuring the directory existed. Added `mkdir -p /var/log/compliance` to the prerequisites.
- The trend comparison loop did not handle the case where no matching XML files exist. Added an existence check before processing each glob result.

## Review Notes
The main `oscap xccdf eval`, `--results`, `--report`, `--results-arf`, and `oscap xccdf generate report --output` usage matches OpenSCAP and Red Hat documentation. The CIS profile IDs used for RHEL 9 Level 1 Server and Level 2 Server are documented by Red Hat for current RHEL 9 releases.
