# Validation Summary: How to Scan RHEL Systems Against the CIS Benchmark with OpenSCAP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- OpenSCAP
- SCAP Security Guide
- CIS Benchmark profiles
- XCCDF results and remediation generation
- Bash, cron, and command-line reporting

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- OpenSCAP User Manual: https://github.com/OpenSCAP/openscap/blob/main/docs/manual/manual.adoc
- OpenSCAP Security Guide CIS Level 1 Server profile for RHEL 9: https://static.open-scap.org/ssg-guides/ssg-rhel9-guide-cis_server_l1.html
- OpenSCAP oscap man page from the packaged scanner documentation: https://manpages.debian.org/testing/openscap-scanner/oscap.8.en.html

## Issues Found
- Corrected the introduction to avoid implying that OpenSCAP itself comes with SCAP Security Guide content. OpenSCAP is the scanner, while `scap-security-guide` provides the RHEL data stream and profiles.
- Added `openscap-utils` to the install command because the corrected tailoring example uses `autotailor`, which the OpenSCAP manual documents as part of that package.
- Replaced the profile-listing pipeline with plain `oscap info` because `grep -A1 "Profile"` does not reliably list all profile IDs from the data stream.
- Corrected the `oscap` exit-code explanation: return code `2` can indicate a failed or unknown rule result, not only a failed rule.
- Corrected the `notchecked` explanation. OpenSCAP defines it as a rule that was not evaluated by the checking engine; it may require manual review, but it is not always strictly a manual check.
- Fixed the "Extract Specific Failures" example. `oscap xccdf generate report` creates a full HTML report from results, not a failed-rule-only report, and the previous `grep -B1` pipeline did not reliably print failed rule titles.
- Replaced empty `--result-id ""` values in remediation generation with the expected TestResult ID pattern and added `oscap info` so readers can confirm the ID from their results file.
- Fixed the scheduled scan pass/fail counters. OpenSCAP XCCDF result files store rule outcomes as `<result>pass</result>` and `<result>fail</result>` elements, not as `result="pass"` attributes.
- Replaced the tailoring snippet with a valid `autotailor` example. The previous command only displayed profile information and did not generate a tailoring file.

## Review Notes
The post is technically relevant and valid after the corrections. The cron example still assumes a working local `mail` command and mail delivery configuration, which is environment-specific but reasonable for a short operational example.
