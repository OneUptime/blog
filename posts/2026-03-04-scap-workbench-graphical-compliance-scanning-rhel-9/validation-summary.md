# Validation Summary: How to Use SCAP Workbench for Graphical Compliance Scanning on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- SCAP Workbench
- OpenSCAP and `oscap`
- SCAP Security Guide
- XCCDF tailoring files
- SSH-based remote scanning

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- SCAP Workbench User Manual: https://static.open-scap.org/scap-workbench-1.2/
- OpenSCAP SCAP Workbench project page and README: https://github.com/OpenSCAP/scap-workbench
- OpenSCAP `oscap` command documentation/man page references: https://www.open-scap.org/getting-started/ and https://www.mankier.com/8/oscap

## Issues Found
- The post referred to File > Open for loading content. Red Hat documents the RHEL 9 workflow as Load Content, Open content from SCAP Security Guide, or File > Open Other Content, so the menu name was corrected.
- The profile list was described as all available profiles and labeled OSPP as NIST 800-53. The wording was changed to examples of available profiles, and OSPP was corrected to Protection Profile for General Purpose Operating Systems.
- The tailoring workflow said clicking OK saves tailoring. Red Hat documents OK as confirming changes, with permanent storage done through File > Save Customization Only or Save All, so the save instructions were corrected.
- The tailoring save section claimed SCAP Workbench saves tailoring files to the home directory by default. Documentation requires explicitly saving the customization, so the command comments were updated to create a destination and then save there from SCAP Workbench.
- The report-generation UI was corrected from Generate Report to the RHEL 9 documented Save Results combo box with HTML Report selected.
- The remediation UI label was corrected to Generate remediation role.
- The post stated that the profile ID in a tailoring file will have a `_customized` suffix. Red Hat documents that the user chooses a new profile ID, so the text now says SCAP Workbench commonly suggests that suffix and instructs readers to check the exact ID.
- The grep example for finding a tailored profile ID was made more robust for namespaced XML profile elements by matching `Profile.*id=`.

## Review Notes
SCAP Workbench is documented by Red Hat as having limited functionality compared with the `oscap` command-line utility. Red Hat also notes that SCAP Workbench does not support results-based remediations for tailored profiles, so exported remediations for tailored profiles should be used with `oscap`.
