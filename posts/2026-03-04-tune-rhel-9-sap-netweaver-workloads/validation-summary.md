# Validation Summary: How to Tune RHEL for SAP NetWeaver Workloads

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9 for SAP Solutions
- SAP NetWeaver / SAP ABAP Platform
- RHEL System Roles for SAP
- Ansible Core
- tuned and tuned-profiles-sap
- Linux sysctl, PAM limits, swap, and Transparent Huge Pages

## Sources Consulted
- Red Hat Documentation: Red Hat Enterprise Linux System Roles for SAP, RHEL for SAP Solutions 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html-single/red_hat_enterprise_linux_system_roles_for_sap/red_hat_enterprise_linux_system_roles_for_sap
- Red Hat Documentation: Installing RHEL 9 for SAP Solutions, RHEL System Roles for SAP chapter: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/installing_rhel_9_for_sap_solutions/assembly_rhel-system-roles-for-sap_configuring-rhel-9-for-sap-hana2-installation
- Red Hat Documentation: Overview of Red Hat Enterprise Linux for SAP Solutions Subscription, SAP package and repository overview: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html-single/overview_of_red_hat_enterprise_linux_for_sap_solutions_subscription/index
- Red Hat Documentation: RHEL for SAP Solutions 9.x Release Notes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html-single/9.x_release_notes/9.x_release_notes
- SAP Help Portal: SAP NetWeaver Installation Guide, Linux Transparent Huge Pages requirement: https://help.sap.com/doc/6c445e63e92942e780035e7791aa521a/3.0/en-US/Installation_Guide_for_SAP_NetWeaverE.PDF
- SAP Help Portal: Swap Space Requirements: https://help.sap.com/doc/saphelp_nw73ehp1/7.31.19/en-US/49/325e42e93934ffe10000000a421937/content.htm

## Issues Found
- The repository enablement commands were hard-coded to RHEL 9 on x86_64. Updated them to use `$(rpm -E %rhel)` and `$(uname -m)`, matching Red Hat's documented repository-label pattern and making the commands accurate for supported RHEL 9 architectures.
- The package installation step omitted the documented `ansible-core` prerequisite and the base `rhel-system-roles` package. Added `ansible-core` and changed the role install command to install both `rhel-system-roles-sap` and `rhel-system-roles`.
- The local Ansible playbook did not explicitly set `connection: local`. Added it to align with Red Hat's local-system examples and avoid accidental SSH behavior if localhost inventory is customized.
- The swap sizing table was not aligned with Red Hat's documented SAP NetWeaver preconfigure role prerequisite. Replaced it with the verified minimum of 20480 MB and pointed readers to SAP Note 1597355 for current workload-specific sizing.

## Review Notes
The guide includes manual sysctl and limits examples after running RHEL System Roles for SAP. In production, administrators should prefer role-managed settings and validate any manual overrides against the current SAP Notes and the specific SAP product stack.
