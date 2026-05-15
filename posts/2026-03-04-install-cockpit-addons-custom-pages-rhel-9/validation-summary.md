# Validation Summary: How to Install Cockpit Web Console Add-ons and Create Custom Pages on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Cockpit web console
- Cockpit add-on packages
- Cockpit package manifests
- Cockpit JavaScript APIs
- SELinux troubleshooting
- sos diagnostic reports
- DNF

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Installing web console add-ons and creating custom pages: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_systems_using_the_rhel_9_web_console/cockpit-add-ons-_system-management-using-the-rhel-9-web-console
- Red Hat Enterprise Linux 9 Package manifest: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/package_manifest/Red_Hat_Enterprise_Linux-9-Package_manifest-en-US.pdf
- Red Hat Enterprise Linux 9 documentation: Getting started using the RHEL web console: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_systems_using_the_rhel_9_web_console/getting-started-with-the-rhel-9-web-console_system-management-using-the-rhel-9-web-console
- Red Hat Enterprise Linux 9 documentation: Generating an sos report for technical support: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/getting_the_most_from_your_support_experience/generating-an-sos-report-for-technical-support_getting-the-most-from-your-support-experience
- Cockpit Project Developer Guide: Cockpit packages and manifest format: https://cockpit-project.org/guide/latest/packages.html
- Cockpit Project Developer Guide: cockpit.js base1 API, including `cockpit.spawn()` and `cockpit.file()`: https://cockpit-project.org/guide/latest/api-base1
- Cockpit Project feature documentation: SELinux Policy: https://cockpit-project.org/guide/latest/feature-selinux
- Cockpit Project tutorial: Creating Plugins for the Cockpit User Interface: https://cockpit-project.org/blog/creating-plugins-for-the-cockpit-user-interface.html

## Issues Found
- The add-on package table included RHEL-inaccurate package names such as `cockpit-networkmanager`, `cockpit-selinux`, `cockpit-kdump`, and `cockpit-sosreport`. Updated the list to match documented RHEL 9 add-on packages and the RHEL 9 package manifest.
- The installation examples attempted to install `cockpit-selinux` and `cockpit-sosreport`, which are not listed as RHEL 9 add-on packages in the official RHEL 9 add-on documentation/package manifest. Removed those from the install examples.
- The SELinux section described `cockpit-selinux` as the RHEL add-on package and implied Cockpit always suggests exact `setsebool` or `semanage` commands. Reworded it to describe Cockpit's SELinux integration through `setroubleshootd`, consistent with Cockpit documentation.
- The SELinux CLI example used `audit2why`; updated it to the documented `ausearch` message types and `sealert` workflow.
- The sos report section described `cockpit-sosreport` as the RHEL package. Reworded it as the Diagnostic reports page and kept `sudo sos report` as the correct CLI equivalent.

## Review Notes
The custom page example uses documented Cockpit package locations, a valid `manifest.json` with a `tools` entry, the documented `../base1/cockpit.js` include, and current Promise-based `cockpit.spawn()`/`cockpit.file()` APIs. The manifest's relaxed content security policy is needed because the example uses inline styles.
