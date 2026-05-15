# Validation Summary: How to Configure RHEL High Availability for SAP HANA System Replication

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Red Hat Enterprise Linux 9 for SAP Solutions
- RHEL High Availability Add-On
- SAP HANA System Replication
- Pacemaker and Corosync
- pcs CLI
- SAP HANA HA resource agents
- IPaddr2 virtual IP resources
- STONITH/fencing

## Sources Consulted
- Red Hat Documentation: Deploying SAP HANA Scale-Up System Replication High Availability for RHEL 9, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html-single/deploying_sap_hana_scale-up_system_replication_high_availability/
- Red Hat Documentation: Automating SAP HANA Scale-Up System Replication using the RHEL HA Add-On for RHEL 9, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html-single/automating_sap_hana_scale-up_system_replication_using_the_rhel_ha_add-on/
- Red Hat Documentation: RHEL for SAP Subscriptions and Repositories for RHEL 9, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/rhel_for_sap_subscriptions_and_repositories/
- Red Hat Documentation: Configuring and managing high availability clusters for RHEL 9, https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters
- SAP Help Portal: SAP HANA System Replication Configuration, https://help.sap.com/docs/SAP_HANA_PLATFORM/4e9b18c116aa42fc84c7dbfd02111aba/8cb9d1c0ddde4e0d9eeec8b53d75d69c.html

## Issues Found
- The prerequisites only mentioned the generic RHEL HA Add-On subscription. Updated this to RHEL for SAP Solutions with the HA Add-On, which is the supported subscription path for SAP HANA HA on RHEL 9.
- The prerequisites omitted the SAP HANA `srConnectionChanged()` HA/DR provider hook. Added it because Red Hat documents this hook as mandatory before proceeding with the HA cluster setup when using supported SAP HANA and resource-agent versions.
- The repository enablement command only enabled the generic HA repository. Replaced it with the RHEL for SAP Solutions E4S repository set, including the High Availability repository.
- The package list used the older `resource-agents-sap-hana` pattern and included `sap-cluster-connector`. Updated the SAP HANA HA package to `sap-hana-ha`, which provides the current-generation SAP HANA HA resource agents for RHEL 9.4 and later.
- The setup did not open the High Availability firewalld service. Added the official `firewall-cmd` commands needed when firewalld is active.
- The SAP HANA resource configuration used the older `SAPHana` promotable resource with `Master` and `Slave` role names. Updated the resource to `SAPHanaController` with `Promoted` and `Unpromoted` role names, matching current Red Hat guidance.
- The resource clone syntax and metadata were updated to the current `pcs` examples that create named clone resources and then set clone meta attributes with `pcs resource update`.
- The VIP colocation constraint used `master` and a score of `4000`. Updated it to colocate with the promoted `SAPHanaController` clone using the documented score of `2000`.
- The order constraint was missing `symmetrical=false`. Added it so the constraint affects start order without imposing the reverse stop order.
- The HANA-specific verification command used generic `crm_mon -A1`. Replaced it with `SAPHanaSR-showAttr`, which Red Hat documents for checking SAP HANA SR cluster attributes with the current agents.
- The failover test used the old resource name, specified a target node, and told users to clear the move constraint. Updated it to move the current promotable clone resource and noted that RHEL 9 `pcs` removes the temporary move constraint after the move completes.

## Review Notes
- The command examples still use sample hostnames, SID `HDB`, instance number `00`, IP addresses, and RHEL minor release `9.4`; operators must replace these with values supported for their SAP HANA deployment and platform.
- Public cloud deployments often require provider-specific fencing and virtual IP resource agents instead of the on-premises IPMI and `IPaddr2` examples shown here.
