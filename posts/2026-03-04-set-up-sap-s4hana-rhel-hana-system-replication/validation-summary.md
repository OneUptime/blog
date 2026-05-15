# Validation Summary: How to Set Up SAP S/4HANA on RHEL with HANA System Replication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux for SAP Solutions
- SAP HANA System Replication
- SAP S/4HANA database high availability
- Pacemaker and pcs
- SAP HANA resource agents
- IPaddr2 virtual IP resources

## Sources Consulted
- Red Hat Enterprise Linux for SAP Solutions 9: Deploying SAP HANA Scale-Up System Replication High Availability, Chapter 5, Configuring the Pacemaker cluster: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/deploying_sap_hana_scale-up_system_replication_high_availability/asmb_config_pacemaker_v9-deploying-scale-up-system-replication
- Red Hat Enterprise Linux for SAP Solutions 9: Deploying SAP HANA Scale-Up System Replication High Availability, Chapter 2, HA cluster requirements: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html-single/deploying_sap_hana_scale-up_system_replication_high_availability/index
- Red Hat Enterprise Linux for SAP Solutions 9: Automating SAP HANA Scale-Up System Replication using the RHEL HA Add-On, Chapter 3, Configuring the HA cluster: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/automating_sap_hana_scale-up_system_replication_using_the_rhel_ha_add-on/asmb_config_ha_cluster_v9-automating-sap-hana-scale-up-system-replication
- SAP Help Portal: Configure SAP HANA System Replication with hdbnsutil: https://help.sap.com/docs/SAP_HANA_PLATFORM/4e9b18c116aa42fc84c7dbfd02111aba/2dd26de6360046309e1579accbd9e527.html
- SAP Help Portal: Changing the Operation Mode: https://help.sap.com/docs/SAP_HANA_PLATFORM/4e9b18c116aa42fc84c7dbfd02111aba/8b536c0fa7ff4cb8b47ddd703b674fa1.html

## Issues Found
- The post did not mention required HA prerequisites for a supported cluster-managed HANA setup. Added prerequisites for fencing/STONITH, disabling SAP HANA automatic startup, and enabling the HANA HA/DR provider hook.
- The package list used `resource-agents-sap-hana`, which is the older resource-agent path. Updated the example to use `sap-hana-ha`, which Red Hat documents for RHEL 9.4 and newer.
- The cluster setup started the cluster separately after setup. Updated the command to use `pcs cluster setup ... --start`, matching the current Red Hat example.
- The cluster configuration omitted recommended resource defaults. Added `resource-stickiness=1000` and `migration-threshold=5000`.
- The SAP HANA resource example used the classic `SAPHana` agent and `Master`/`Slave` role names. Updated it to the current `SAPHanaController` example with `Promoted`/`Unpromoted` role names.
- The resource configuration did not define the required ordering constraint between `SAPHanaTopology` and the HANA controller resource. Added the order constraint.
- The setup claimed automated failover for clients but did not configure a virtual IP resource or colocation constraint. Added an `IPaddr2` VIP example and colocated it with the promoted HANA controller resource.
- The original example set `AUTOMATED_REGISTER=true` without caveat. Updated the command to `AUTOMATED_REGISTER=false`, matching Red Hat's safer default recommendation during setup because automatic registration can risk data loss if a takeover happens while the secondary is not fully in sync.

## Review Notes
The SAP HANA `hdbnsutil -sr_enable`, `hdbnsutil -sr_register`, `--replicationMode=sync`, and `--operationMode=logreplay` examples match SAP documentation. The post is still a condensed guide; production deployments should follow the full Red Hat workflow for firewalld, systemd integration, hook verification, fencing configuration, and failover testing.
