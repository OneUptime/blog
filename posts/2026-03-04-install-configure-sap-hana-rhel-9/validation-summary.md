# Validation Summary: How to Install and Configure SAP HANA on RHEL

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Enterprise Linux for SAP Solutions
- SAP HANA
- SAP HANA Database Lifecycle Manager (HDBLCM)
- RHEL System Roles for SAP
- Ansible
- LVM and XFS
- firewalld

## Sources Consulted
- Red Hat documentation: RHEL for SAP Subscriptions and Repositories for RHEL 9, including required SAP HANA E4S repository labels: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/rhel_for_sap_subscriptions_and_repositories/asmb_enable_repo_rhel-for-sap-subscriptions-and-repositories-9
- Red Hat documentation: Installing RHEL 9 for SAP Solutions, RHEL System Roles for SAP workflow and playbook variables: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/installing_rhel_9_for_sap_solutions/assembly_rhel-system-roles-for-sap_configuring-rhel-9-for-sap-hana2-installation
- Red Hat documentation: Managing Transparent Huge Pages with grubby on RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/configuring-huge-pages_monitoring-and-managing-system-status-and-performance
- SAP Help Portal: SAP HANA Server Installation and Update Guide, HDBLCM installation parameters and batch mode: https://help.sap.com/docs/SAP_HANA_PLATFORM/6b94445c94ae495c83a19646e7c3fd56/1dbba6ac03054d7eb07c819aae47d095.html
- SAP Help Portal: SAP HANA HDBLCM automation examples using `--sid`, `--number`, `--datapath`, `--logpath`, and `--batch`: https://help.sap.com/docs/SAP_HANA_PLATFORM/2c1988d620e04368aa4103bf26f17727/299018ce519c453e90eff41af091e59d.html
- SAP Help Portal: SAP HANA client interface port conventions for SYSTEMDB and tenant SQL access: https://help.sap.com/docs/SAP_HANA_CLIENT/f1b440ded6144a54ada97ff95dac7adf/ae7efc3e5a584a79a3ca4df1bc4f199a.html
- SAP Help Portal: TCP/IP Ports of All SAP Products, including SAP HANA SQL and SAPControl port formulas: https://help.sap.com/docs/Security/575a9f0e56f34c6e8138439eefc32b16
- SAP Help Portal: M_DATABASE system view, including the VERSION column used by the verification query: https://help.sap.com/docs/hana-cloud-database/sap-hana-cloud-sap-hana-database-sql-reference-guide/m-database-system-view
- SAP Help Portal: Linux kernel parameters and SAP Host Agent handling of kernel tuning: https://help.sap.com/docs/SAP_HANA_PLATFORM/6b94445c94ae495c83a19646e7c3fd56/82e4575eec664846a9918e9ed1d90d41.html

## Issues Found
- The prerequisite said `RHEL.x`, which was too broad for a RHEL 9-specific guide. Changed it to RHEL 9 with a Red Hat Enterprise Linux for SAP Solutions subscription.
- The repository commands used normal RHEL 9 SAP repository IDs. Red Hat's RHEL 9 SAP HANA documentation specifies E4S repository variants for SAP HANA and requires setting a supported minor release. Updated the commands to set an E4S release and enable the documented E4S repo labels with `$(uname -m)`.
- The Ansible role installation omitted `ansible-core` and `rhel-system-roles`, and the local playbook omitted documented variables and the platform Python interpreter override. Updated the package list and playbook invocation to match Red Hat's RHEL 9 SAP role workflow.
- The kernel tuning section hard-coded shared memory and network sysctl values, including values tied to a 128 GB host. SAP and Red Hat guidance is version- and note-dependent, and the RHEL SAP roles/SAP Host Agent handle these settings. Replaced the hard-coded sysctl file with verification commands and a THP override example using `grubby`.
- The firewall section described 30017 as internal communication and 30040/30041 as HTTP/HTTPS access. SAP's port references define 30013 as SYSTEMDB SQL, 30015 as first tenant SQL for instance 00, and 50013/50014 as SAPControl. Updated the examples and comments to open only the common SQL and SAPControl ports.

## Review Notes
The HDBLCM command-line options, `hdbsql` version query, LVM/XFS commands, and basic firewalld syntax are technically plausible. In a production guide, the exact RHEL minor release, SAP HANA revision, SAP Notes, sizing, storage layout, and exposed ports should be confirmed for the target customer's certified support matrix before execution.
