# Validation Summary: How to Prepare RHEL for SAP HANA Installation Using RHEL System Roles

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux for SAP Solutions
- RHEL System Roles for SAP
- SAP HANA preconfiguration
- Ansible playbooks and inventory
- Linux kernel and TuneD configuration checks

## Sources Consulted
- Red Hat Enterprise Linux System Roles for SAP overview: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/red_hat_enterprise_linux_system_roles_for_sap/con_rhel-system-roles-for-sap-overview_rhel-system-roles-for-sap-9
- Red Hat RHEL System Roles for SAP quick start guide: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/red_hat_enterprise_linux_system_roles_for_sap/assembly_quick-start-guide-to-rhel-system-roles-for-sap_rhel-system-roles-for-sap-9
- Red Hat Installing RHEL 9 for SAP Solutions, RHEL System Roles for SAP chapter: https://docs.redhat.com/en-us/documentation/red_hat_enterprise_linux_for_sap_solutions/9/pdf/installing_rhel_9_for_sap_solutions/Red_Hat_Enterprise_Linux_for_SAP_Solutions-9-Installing__RHEL_9_for_SAP_Solutions-en-US.pdf
- Ansible check mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible ansible-playbook CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- SAP HANA Linux kernel parameters reference: https://help.sap.com/docs/SAP_HANA_PLATFORM/2c1988d620e04368aa4103bf26f17727/82e4575eec664846a9918e9ed1d90d41.html

## Issues Found
- The installation command only installed `rhel-system-roles-sap`. Red Hat documents installing `rhel-system-roles-sap` together with `rhel-system-roles`, and the control node also needs Ansible Core or Ansible Automation Platform. Updated the command to install `ansible-core rhel-system-roles-sap rhel-system-roles`.
- The preparation playbook set `sap_hana_preconfigure_assert: true`, which runs the role in assertion mode instead of configuration mode. Removed assertion variables from the preparation playbook and added documented configuration variables for reboot handling and `sap_hana_preconfigure_update`.
- The verification command only enabled assertion mode for `sap_hana_preconfigure`. Updated it to enable assertion mode for both `sap_general_preconfigure` and `sap_hana_preconfigure`, matching the two roles used by the playbook.

## Review Notes
The examples assume the managed hosts are registered to appropriate RHEL for SAP repositories and are running a SAP HANA-supported RHEL release. The post does not cover repository enablement or SAP support matrix checks, which are prerequisite operational steps but not errors in the shown role workflow.
