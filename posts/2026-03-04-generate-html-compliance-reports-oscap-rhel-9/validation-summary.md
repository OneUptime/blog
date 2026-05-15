# Validation Summary: How to Generate HTML Compliance Reports with oscap on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- OpenSCAP `oscap`
- SCAP Security Guide
- XCCDF compliance scans
- ARF result output
- Apache HTTP Server basic authentication
- Bash scripting and cron

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/scanning-the-system-for-configuration-compliance-and-vulnerabilities_security-hardening
- OpenSCAP User Manual: https://github.com/OpenSCAP/openscap/blob/main/docs/manual/manual.adoc
- OpenSCAP Getting Started documentation: https://www.open-scap.org/getting-started/
- NIST XCCDF 1.2 publication page: https://www.nist.gov/publications/specification-extensible-configuration-checklist-description-format-xccdf-version-12
- Apache HTTP Server `.htaccess` documentation: https://httpd.apache.org/docs/current/howto/htaccess.html
- Apache HTTP Server authentication documentation: https://httpd.apache.org/docs/2.4/howto/auth.html

## Issues Found
- The basic scan example wrote results and report files under `/var/log/compliance` without first creating that directory. Added `mkdir -p /var/log/compliance` before the first `oscap xccdf eval` command.
- The automation script counted `result="pass"` and `result="fail"` attributes in the XML results file, but XCCDF rule results are represented as result elements and OpenSCAP also emits documented `Result  pass` / `Result  fail` lines to stdout. Changed the script to save stdout to a scan log and count those result lines with `awk`.
- The Apache distribution example implied that creating `.htaccess` was enough to restrict access. Apache only honors `.htaccess` directives when overrides are enabled, and `htpasswd` is provided by `httpd-tools` on RHEL. Updated the comments to state those prerequisites.

## Review Notes
The `oscap xccdf eval` flags, `oscap xccdf generate report --output` usage, `--results-arf` usage, RHEL 9 SCAP content path, and listed RHEL 9 profile IDs are consistent with Red Hat and OpenSCAP documentation. The post intentionally uses `|| true` after scans; this is reasonable for report generation because `oscap` can return a non-zero status when rules fail while still producing results.
