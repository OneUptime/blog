# Validation Summary: How to Validate RHEL Configuration for SAP with sap_preconfigure Role

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux for SAP Solutions
- RHEL System Roles for SAP
- Ansible / ansible-playbook
- SAP HANA host preconfiguration
- Linux shell commands and system checks

## Sources Consulted
- Red Hat Documentation: RHEL System Roles for SAP overview, including supported roles, role directories, and assertion-mode guidance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/8/html/red_hat_enterprise_linux_system_roles_for_sap/con_rhel-system-roles-for-sap-overview_rhel-system-roles-for-sap
- Red Hat Documentation: Quick Start Guide to RHEL System Roles for SAP, including assert-mode examples and `sap_general_preconfigure_assert_ignore_errors`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/8/html/red_hat_enterprise_linux_system_roles_for_sap/assembly_quick-start-guide-to-rhel-system-roles-for-sap_rhel-system-roles-for-sap
- Red Hat Documentation: Installing RHEL System Roles for SAP, including the `dnf install rhel-system-roles-sap` package guidance and dependency notes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/10/html/installing_rhel_10_for_sap_solutions/assembly_rhel-system-roles-for-sap_installing-rhel-10
- Red Hat Documentation: RHEL 9 SAP-related packages and repositories, including `tuned-profiles-sap-hana`, `resource-agents-sap-hana`, and `rhel-system-roles-sap`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/overview_of_red_hat_enterprise_linux_for_sap_solutions_subscription/assembly_sap-automation-and-performance_overview-of-rhel-for-sap-solutions-subscription-combined-9
- Red Hat Documentation: Known issue noting `compat-openssl11` as an additional RHEL 9 package for SAP HANA in the RHEL System Roles for SAP documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/8/html/red_hat_enterprise_linux_system_roles_for_sap/known_issues
- Red Hat Blog: "Prep your RHEL systems for SAP installations using RHEL system roles", including explanation of `sap_general_preconfigure_assert` and `sap_general_preconfigure_assert_ignore_errors`: https://www.redhat.com/en/blog/prep-your-rhel-systems-sap-installations-using-rhel-system-roles

## Issues Found
No technical issues found.

## Review Notes
The post correctly uses assert mode rather than Ansible check mode for these roles. Red Hat documentation recommends using assertion mode first on existing or production systems because normal mode enforces SAP-recommended settings. The `rhel-system-roles-sap` package normally installs dependencies such as `ansible-core` and `rhel-system-roles`, so the explicit install command in the post is redundant but valid. `compat-openssl11` is deprecated in general RHEL 9 release notes, but Red Hat SAP documentation still identifies it as relevant for SAP HANA on RHEL 9, so the compliance-report package check is acceptable.
