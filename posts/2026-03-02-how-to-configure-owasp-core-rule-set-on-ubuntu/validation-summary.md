# Validation Summary: How to Configure OWASP Core Rule Set on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Apache HTTP Server
- ModSecurity v2 for Apache
- OWASP Core Rule Set
- Web Application Firewall configuration

## Sources Consulted
- OWASP CRS project page: https://owasp.org/www-project-modsecurity-core-rule-set/
- OWASP CRS official documentation, installation and configuration: https://coreruleset.org/docs/index.print
- OWASP CRS GitHub latest release API: https://api.github.com/repos/coreruleset/coreruleset/releases/latest
- OWASP CRS v4.26.0 release: https://github.com/coreruleset/coreruleset/releases/tag/v4.26.0
- OWASP CRS v4.26.0 `crs-setup.conf.example`: https://raw.githubusercontent.com/coreruleset/coreruleset/v4.26.0/crs-setup.conf.example
- OWASP CRS v4.26.0 exclusion rule templates: https://raw.githubusercontent.com/coreruleset/coreruleset/v4.26.0/rules/REQUEST-900-EXCLUSION-RULES-BEFORE-CRS.conf.example and https://raw.githubusercontent.com/coreruleset/coreruleset/v4.26.0/rules/RESPONSE-999-EXCLUSION-RULES-AFTER-CRS.conf.example
- ModSecurity reference manual for rule removal and target update directives: https://github.com/owasp-modsecurity/ModSecurity/wiki/Reference-Manual-%28v3.x%29
- Ubuntu Launchpad source package data for `modsecurity-crs`: https://api.launchpad.net/1.0/ubuntu/+archive/primary

## Issues Found
- The official repository installation used CRS 3.3.5 while describing it as the latest release. Updated the download, extraction, directory name, and CRS version tags to CRS 4.26.0, the latest upstream release as of 2026-05-19.
- The Apache include block listed individual CRS 3 rule files. Some of those files are absent or renamed in CRS 4, including the old Node.js-specific file. Replaced the long list with the CRS-documented wildcard include order for setup, plugins, and rules.
- The tutorial included `REQUEST-999-EXCLUSION-RULES-AFTER-CRS.conf`, which is not the CRS exclusion file name. Corrected this to `RESPONSE-999-EXCLUSION-RULES-AFTER-CRS.conf` and added commands to copy both exclusion template files from `.example` to `.conf` so the include pattern works.
- The paranoia-level example used the CRS 3 variable `tx.paranoia_level`. Updated it to the CRS 4 variable `tx.blocking_paranoia_level` and kept `tx.detection_paranoia_level` for higher-level detection without blocking.
- The false-positive tuning examples placed startup-time directives such as `SecRuleRemoveById` and `SecRuleUpdateTargetById` in the BEFORE file. Split the examples so `ctl:` runtime exclusions remain in `REQUEST-900-EXCLUSION-RULES-BEFORE-CRS.conf` and startup-time rule modifications go in `RESPONSE-999-EXCLUSION-RULES-AFTER-CRS.conf`.
- The application exclusion profile instructions described local CRS-shipped plugin files that do not match CRS 4's plugin model. Updated the snippet to point to the official CRS plugin registry and the `*-config.conf`, `*-before.conf`, and `*-after.conf` include pattern.
- The selective rule category example referenced the removed CRS 3 Node.js rule filename. Updated it to the CRS 4 generic application attack rule filename.

## Review Notes
The apt package path remains version- and distribution-dependent; the post now primarily uses the official upstream installation path for the detailed Apache configuration. Future updates should replace the hard-coded CRS release version with the newest release and re-check renamed rule files before publishing.
