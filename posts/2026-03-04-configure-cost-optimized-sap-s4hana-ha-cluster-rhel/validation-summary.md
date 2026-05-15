# Validation Summary: How to Configure a Cost-Optimized SAP S/4HANA HA Cluster on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux for SAP Solutions
- SAP S/4HANA
- SAP HANA System Replication
- Pacemaker and pcs
- SAPHana, SAPHanaTopology, and SAPInstance resource agents
- SAP HANA memory manager configuration

## Sources Consulted
- Red Hat Enterprise Linux for SAP Solutions 8, Configuring a Cost-Optimized SAP S/4HANA HA cluster: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/8/html/configuring_a_cost-optimized_sap_s4hana_ha_cluster_hana_system_replication_ensa2_using_the_rhel_ha_add-on/
- Red Hat Enterprise Linux for SAP Solutions 8, Automating SAP HANA Scale-Up System Replication using the RHEL HA Add-On: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/8/html-single/automating_sap_hana_scale-up_system_replication_using_the_rhel_ha_add-on/
- Red Hat Enterprise Linux for SAP Solutions 9, Deploying SAP HANA Scale-Up System Replication High Availability: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/deploying_sap_hana_scale-up_system_replication_high_availability/
- SAP HANA System Replication command line and hook documentation: https://help.sap.com/docs/SAP_HANA_PLATFORM/
- AWS SAP HANA System Replication cost optimized deployment guidance: https://docs.aws.amazon.com/sap/latest/sap-hana/hana-ops-ha-dr-hsr.html
- SUSE SAP HANA System Replication Scale-Up Cost Optimized Scenario guidance: https://documentation.suse.com/sbp/sap-12/html/SLES4SAP-hana-sr-guide-CostOpt-12/

## Issues Found

1. **Incorrect resource agent for the non-production HANA instance**: The post used the `SAPHana` resource agent for QAS. `SAPHana` is intended for the replicated production HANA system replication pair. Changed the QAS resource to use `SAPInstance`, matching the documented cost-optimized pattern for a non-replicated HANA database, and added the HDB start profile plus HANA-specific monitor services.

2. **Location constraint did not enforce secondary-only placement**: The original `prefers hana02=100` constraint was only a preference. Changed it to an infinite preference for `hana02` and an infinite avoid constraint for `hana01` so QAS does not start on the production primary node in the two-node example.

3. **Missing anti-colocation for takeover behavior**: Added an anti-colocation constraint between QAS and the promoted production HANA resource so Pacemaker stops QAS before promoting PRD on the secondary host.

4. **Unconfigured pre-takeover hook script**: The post created a shell script under `/usr/share/pacemaker/sap/`, but neither Pacemaker nor SAP HANA would execute it automatically. Replaced that section with guidance that the cluster constraints handle QAS shutdown and added verification commands for the HANA memory settings.

5. **Missing cost-optimized memory settings**: Added `global_allocation_limit` examples for both production secondary and QAS, and `preload_column_tables = false` for the production secondary, because cost-optimized shared-secondary deployments require reduced memory use and table preload disabled on the secondary.

## Review Notes
- The HANA System Replication commands shown (`hdbnsutil -sr_enable`, `hdbnsutil -sr_register`, `--replicationMode=sync`, and `--operationMode=logreplay`) are consistent with SAP HANA System Replication usage.
- RHEL 9 documentation increasingly uses the newer `SAPHanaController` resource agent in some deployment guides, while RHEL 8 scale-up examples still document the classic `SAPHana` resource agent. The post remains version-generic, so readers should align the production HANA resource name with their installed RHEL and resource-agent generation.
- Cost-optimized shared-secondary deployments trade lower hardware cost for longer takeover time because the non-production HANA instance must stop and the production secondary may need to load column tables.
