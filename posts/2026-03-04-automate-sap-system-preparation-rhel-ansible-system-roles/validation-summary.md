# Validation Summary: How to Automate SAP System Preparation on RHEL with Ansible System Roles

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- RHEL System Roles for SAP
- Ansible and Ansible playbooks
- SAP HANA
- SAP NetWeaver
- Linux system configuration

## Sources Consulted
- Red Hat Enterprise Linux System Roles for SAP documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/8/html-single/red_hat_enterprise_linux_system_roles_for_sap/red_hat_enterprise_linux_system_roles_for_sap
- Red Hat Installing RHEL 9 for SAP Solutions, RHEL System Roles for SAP examples: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/installing_rhel_9_for_sap_solutions/assembly_rhel-system-roles-for-sap_configuring-rhel-9-for-sap-hana2-installation
- Red Hat Upgrading SAP environments from RHEL 8 to RHEL 9, SAP HANA settings verification: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/upgrading_sap_environments_from_rhel_8_to_rhel_9/asmb_upgrading-hana-system_asmb_planning-upgrade
- SAP Knowledge Base Article preview 3702213, SAP HANA swap guidance: https://userapps.support.sap.com/sap/support/knowledge/en/3702213

## Issues Found
- The assert-mode command only set `sap_hana_preconfigure_assert=true` while the playbook still runs `sap_general_preconfigure`. Updated the command to set both `sap_general_preconfigure_assert=true` and `sap_hana_preconfigure_assert=true`, matching Red Hat's documented pattern for validating both roles without normal configuration mode.
- The verification section said swap is disabled for HANA and that `swapon --show` should be empty. SAP guidance expects swap to be configured for SAP HANA hosts, so this was changed to a neutral verification of the expected swap configuration.

## Review Notes
The role names, RPM package name, installation path, Ansible playbook structure, inventory syntax, `ansible-playbook` flags, and documented SAP HANA `vm.max_map_count` value are consistent with Red Hat documentation. The examples assume the managed nodes are subscribed to the required RHEL for SAP repositories and that the control node has Ansible Core available.
