# Validation Summary: How to Set Up SAP HANA System Replication for Disaster Recovery on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- SAP HANA
- SAP HANA System Replication
- hdbnsutil
- hdbsql
- SAP HANA Cockpit / SAP HANA Studio

## Sources Consulted
- SAP Help Portal: General Prerequisites for Configuring SAP HANA System Replication, https://help.sap.com/docs/SAP_HANA_PLATFORM/6b94445c94ae495c83a19646e7c3fd56/86267e1ed56940bb8e4a45557cee0e43.html
- SAP Help Portal: Configure SAP HANA System Replication with hdbnsutil, https://help.sap.com/docs/SAP_HANA_PLATFORM/6b94445c94ae495c83a19646e7c3fd56/2dd26de6360046309e1579accbd9e527.html
- SAP Help Portal: Replication Modes for SAP HANA System Replication, https://help.sap.com/docs/SAP_HANA_PLATFORM/6b94445c94ae495c83a19646e7c3fd56/c039a1a5b8824ecfa754b55e0caffc01.html
- SAP Help Portal: Operation Modes for SAP HANA System Replication, https://help.sap.com/docs/SAP_HANA_PLATFORM/6b94445c94ae495c83a19646e7c3fd56/627bd11e86c84ec2b9fcdf585d24011c.html
- SAP Help Portal: Checking the Status with systemReplicationStatus.py, https://help.sap.com/docs/SAP_HANA_PLATFORM/4e9b18c116aa42fc84c7dbfd02111aba/f6b1bd1020984ee69e902b21b702c096.html
- SAP Help Portal: BACKUP DATA Statement, https://help.sap.com/docs/SAP_HANA_PLATFORM/4fe29514fd584807ac9f2a04f6754767/75a06c444e9a4b3287a46a6a40b4ee69.html
- Red Hat Documentation: Configuring SAP HANA Scale-Up Multitarget System Replication for disaster recovery, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/8/pdf/configuring_sap_hana_scale-up_multitarget_system_replication_for_disaster_recovery/Red_Hat_Enterprise_Linux_for_SAP_Solutions-8-Configuring_SAP_HANA_Scale-Up_Multitarget_System_Replication_for_disaster_recovery-en-US.pdf

## Issues Found
- The post described SYNC as "Zero data loss" without mentioning the full sync option. SAP documents SYNC as waiting for the secondary to receive and persist the redo log, but strict zero data loss during secondary unavailability requires the full sync option. Updated the wording to distinguish normal SYNC from SYNC with full sync.
- The backup section appeared after enabling system replication. SAP lists an initial data backup or storage snapshot as a prerequisite before configuring system replication, including backing up the system database and all tenants in MDC systems. Moved the backup step before enabling replication and clarified the MDC requirement.
- The monitoring example used a hard-coded `/usr/sap/HDB/HDB00/...` path. SAP documents the script under `$DIR_INSTANCE/exe/python_support/systemReplicationStatus.py`. Updated the command to use `$DIR_INSTANCE`.

## Review Notes
The hdbnsutil registration options, replication mode values, operation mode value `logreplay`, `hdbnsutil -sr_state`, `hdbnsutil -sr_takeover`, and the `BACKUP DATA USING FILE` SQL syntax are consistent with SAP documentation. For a production RHEL high-availability deployment, future revisions could add Red Hat Pacemaker resource-agent configuration and fencing guidance, but the current manual HSR commands are technically valid for the tutorial scope.
