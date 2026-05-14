# Validation Summary: How to Use the sosreport Tool for Red Hat Support Cases on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- sos report
- sos collect
- sos clean
- sos upload
- Red Hat Customer Portal support cases

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Generating an sos report for technical support, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/getting_the_most_from_your_support_experience/generating-an-sos-report-for-technical-support_getting-the-most-from-your-support-experience
- sos-report(1) man page, https://www.mankier.com/1/sos-report
- sos-collect(1) man page, https://www.mankier.com/1/sos-collect
- Red Hat Customer Portal: How to provide files to Red Hat Support, https://access.redhat.com/solutions/2112
- sosreport project wiki, https://github.com/sosreport/sos/wiki

## Issues Found
- The post said both `sosreport` and `sos report` work on RHEL. Red Hat's RHEL 9 documentation states that `sosreport` no longer works and `sos report` must be used, so the wording was corrected for RHEL 9.
- The post used `--skip-plugins=passwords`, but `passwords` is not a documented sos plugin. The example was changed to a placeholder plugin name after reviewing the plugin list.
- The plugin-option examples used log-size and all-log forms where the documented top-level options are clearer and current. The examples now use `--plugin-option=logs.timeout=600` for a plugin option and `--log-size` for log size limits.
- The clean section listed domain-name replacement and MAC randomization. Red Hat documents obfuscation of user names, host names, IP addresses, MAC addresses, and user-specified data, so the description and diagram were corrected.
- The post recommended `redhat-support-tool addattachment`, but Red Hat documents `redhat-support-tool` as deprecated in RHEL 8 and not shipped in RHEL 9. The section now uses `sos upload`.
- The post used `sos report --upload <existing-file>`, but existing files should be uploaded with `sos upload <file_name>`. The command was corrected.
- The post described compression as setting an overall size limit. The text was corrected to say xz compression can keep the archive smaller.

## Review Notes
The post is technically relevant and useful for RHEL support workflows after the corrections above. Exact plugin availability can vary by installed sos version and packages on the host, so users should still verify plugin names with `sos report --list-plugins` on the target system.
