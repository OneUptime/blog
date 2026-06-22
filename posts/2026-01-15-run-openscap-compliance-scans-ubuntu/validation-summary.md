# Validation Summary: How to Run OpenSCAP Compliance Scans on Ubuntu

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Ubuntu
- OpenSCAP `oscap` CLI
- SCAP Security Guide / ComplianceAsCode content
- XCCDF
- OVAL
- Canonical Ubuntu OVAL data
- SCAP Workbench
- cron and systemd timers
- GitLab CI, GitHub Actions, Jenkins, and Docker examples

## Sources Consulted
- OpenSCAP User Manual: https://static.open-scap.org/openscap-1.3/oscap_user_manual.html
- Ubuntu `oscap(8)` man page for OpenSCAP 1.3.9: https://manpages.ubuntu.com/manpages/noble/man8/oscap.8.html
- OpenSCAP download/package guidance: https://www.open-scap.org/download/
- Ubuntu OVAL documentation: https://ubuntu.com/security/oval
- Canonical OVAL metadata index: https://security-metadata.canonical.com/oval/
- Ubuntu package metadata for `openscap-scanner`, `openscap-utils`, `ssg-base`, and `ssg-debderived`
- Inspected Ubuntu `ssg-debderived` package contents for available Ubuntu data stream files and Ubuntu 22.04 profile IDs
- ComplianceAsCode profile index: https://complianceascode.github.io/content-pages/guides/index.html
- GitLab CI artifact report documentation: https://docs.gitlab.com/ci/yaml/artifacts_reports/

## Issues Found
- The install command used the obsolete/non-current `libopenscap8` package alongside `openscap-scanner`. I changed it to install `openscap-scanner` and `openscap-utils`; the scanner package brings in the correct OpenSCAP library dependency for current Ubuntu packages.
- The SCAP Security Guide install command used `scap-security-guide` as the package to install. I changed the Ubuntu content install example to `ssg-base ssg-debderived`, which provides the Ubuntu SCAP Security Guide content in current Ubuntu packaging.
- The post listed `ssg-ubuntu2404-ds.xml` as a common package-provided content file. The inspected `ssg-debderived` package contains Ubuntu 16.04, 18.04, 20.04, and 22.04 content but not Ubuntu 24.04 content, so I added a caveat that Ubuntu 24.04 content may require newer ComplianceAsCode or Ubuntu Security Guide packages.
- The Ubuntu 22.04 package content examples included `xccdf_org.ssgproject.content_profile_stig`, but the inspected Ubuntu 22.04 data stream from the packaged content includes CIS and Standard profiles, not STIG. I changed the Ubuntu package workflow examples from DISA STIG to the Standard profile and noted that STIG/PCI-DSS depend on installed content.
- The targeted remediation example used `oscap xccdf generate fix --rule-id`, but `generate fix` does not support `--rule-id`. I changed the example to evaluate a single rule with `oscap xccdf eval --rule`, then generate a fix from the resulting XCCDF results file.
- The cron verification command included `sudo crontab -l`, which does not verify a file installed under `/etc/cron.d/`. I removed it and left verification of `/etc/cron.d/openscap-scan`.
- The custom XCCDF remediation snippet restarted `sshd`; on Ubuntu the service name is `ssh`. I changed it to `systemctl restart ssh`.
- The GitLab CI example declared OpenSCAP XCCDF results as a JUnit report. XCCDF XML is not JUnit XML, so I removed the invalid `artifacts:reports:junit` entry and left the result/report files as normal artifacts.
- CI install snippets were updated from `scap-security-guide` to `ssg-base ssg-debderived` to match the corrected package guidance.
- The production script assumed `ssg-ubuntu2404-ds.xml` was available from the standard package set. I changed the Ubuntu 24.04 branch to fail with an explanatory message unless newer ComplianceAsCode or Ubuntu Security Guide content has been installed.

## Review Notes
- Most `oscap` command forms in the post matched the Ubuntu `oscap(8)` man page, including `xccdf eval`, `oval eval`, `--results`, `--results-arf`, `--report`, `--oval-results`, `--fetch-remote-resources`, `--progress`, `--remediate`, `--tailoring-file`, `generate report`, `generate guide`, `generate fix`, and `generate stats`.
- Canonical's Ubuntu OVAL URLs for Jammy are valid and present in the official metadata index.
- The CI/CD examples scan the CI runner/container environment, not an arbitrary deployed host. That is technically valid as an example pattern, but readers should adapt it when their real target is a VM, host, image, or fleet outside the CI job.
