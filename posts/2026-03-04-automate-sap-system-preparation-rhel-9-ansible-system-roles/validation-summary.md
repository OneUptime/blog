# Validation Summary: How to Automate SAP System Preparation on RHEL 9 with Ansible System Roles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9 for SAP Solutions
- SAP HANA and SAP NetWeaver system preparation
- Ansible Core
- RHEL System Roles for SAP
- tuned and SAP HANA tuned profiles
- RHEL High Availability Add-On, Pacemaker, pcs, and SAP HANA resource agents
- Linux sysctl configuration

## Sources Consulted
- Red Hat documentation: Installing RHEL 9 for SAP Solutions, RHEL System Roles for SAP. https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/installing_rhel_9_for_sap_solutions/assembly_rhel-system-roles-for-sap_configuring-rhel-9-for-sap-hana2-installation
- Red Hat documentation: RHEL for SAP Subscriptions and Repositories. https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html-single/rhel_for_sap_subscriptions_and_repositories/index
- Red Hat documentation: Red Hat Enterprise Linux System Roles for SAP. https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html-single/red_hat_enterprise_linux_system_roles_for_sap/red_hat_enterprise_linux_system_roles_for_sap
- Red Hat documentation: Upgrading SAP HANA HA setup to the new generation of resource agents. https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/upgrading_sap_hana_ha_setup_to_the_new_generation_of_resource_agents/asmb_overview_v9-upgrading-ha-resource-agent
- Red Hat documentation: Configuring HA clusters to manage SAP NetWeaver or SAP S/4HANA Application server instances using the RHEL HA Add-On. https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/configuring_ha_clusters_to_manage_sap_netweaver_or_sap_s4hana_application_server_instances_using_the_rhel_ha_add-on/asmb_overview_configuring-clusters-to-manage
- SAP Help Portal: SAP HANA Hardware and Cloud Measurement Tools. https://help.sap.com/docs/HANA_HW_CLOUD_TOOLS
- Red Hat Customer Portal: Red Hat Enterprise Linux Life Cycle and E4S information. https://access.redhat.com/support/policy/updates/errata

## Issues Found
- The repository commands enabled only SAP-specific normal repositories and omitted the required BaseOS and AppStream repositories. For SAP HANA on RHEL 9, Red Hat documents E4S repository usage with BaseOS, AppStream, SAP Solutions, and SAP NetWeaver repositories. Updated the commands accordingly and used the currently available RHEL 9.6 E4S release lock.
- The System Roles installation command installed only `rhel-system-roles-sap`. Red Hat documents installing both `rhel-system-roles-sap` and `rhel-system-roles`, with Ansible Core required unless Ansible Automation Platform or Ansible Core is already available. Updated the package commands to include `ansible-core` and `rhel-system-roles`.
- The package list installed `resource-agents-sap-hana` unconditionally. Current Red Hat documentation identifies `sap-hana-ha` as the new-generation SAP HANA HA resource-agent package. Moved HA resource-agent installation to the HA step and used `sap-hana-ha`.
- The sysctl section listed generic tuning values in `/etc/sysctl.conf` as critical SAP settings. Red Hat documentation identifies SAP-specific settings such as `vm.max_map_count` and `kernel.pid_max`, typically under `/etc/sysctl.d/sap.conf`, and notes that other SAP HANA settings are handled separately. Updated the snippet and changed the reload command from `sysctl -p` to `sysctl --system`.
- The HA setup omitted enabling the High Availability repository. Added the documented RHEL 9 E4S High Availability repository before installing HA packages.
- The validation section referenced HWCCT, which has been superseded by SAP HANA Hardware and Cloud Measurement Tools (HCMT). Updated the validation tool reference.

## Review Notes
The post remains a high-level guide rather than a full end-to-end Ansible playbook. In a future revision, it could include an example `sap.yml` playbook using `sap_general_preconfigure`, `sap_netweaver_preconfigure`, and `sap_hana_preconfigure`, but that was not added here because the requested review called for technical corrections without restructuring the article.
