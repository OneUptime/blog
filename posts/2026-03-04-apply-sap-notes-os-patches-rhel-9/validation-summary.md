# Validation Summary: How to Apply SAP Notes and OS Patches on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNF package management and security advisories
- LVM snapshots
- SAP Notes
- SAP HANA
- SAPControl
- SAP kernel updates and SAPCAR

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing and monitoring security updates - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_and_monitoring_security_updates/identifying-security-updates_managing-and-monitoring-security-updates
- Red Hat Enterprise Linux 9 documentation: Managing software with the DNF tool - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- Red Hat Enterprise Linux 9 documentation: Configuring and managing logical volumes - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/configuring_and_managing_logical_volumes
- Red Hat Enterprise Linux for SAP Solutions 9 documentation: Installing RHEL 9 for SAP Solutions - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html-single/installing_rhel_9_for_sap_solutions/installing_rhel_9_for_sap_solutions
- SAP Help Portal: Starting and Stopping SAP Systems Using SAPControl - https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/b1c78119f8634ae1b933b60f02975a05/471d6feeff6e0d46e10000000a155369.html
- SAP Help Portal: Starting and Stopping Systems with SAPControl for SAP HANA - https://help.sap.com/docs/SAP_HANA_PLATFORM/6b94445c94ae495c83a19646e7c3fd56/3005c2dc68194db187bc4c7788dfef03.html
- SAP Help Portal: SAP Kernel Update on Unix and Linux - https://help.sap.com/docs/SUPPORT_CONTENT/si/3362959438.html
- SAP Help Portal: Updating and Patching the Operating System - https://help.sap.com/docs/PRODUCT_ID/eb3777d5495d46c5b2fa773206bbfb46/e2d05644bb571014abbcc380bc5ff47a.html

## Issues Found
- Corrected the RHEL 9 SAP Note list. The post incorrectly described SAP Note 2772999 as the RHEL 9 installation and configuration note; Red Hat's RHEL for SAP Solutions 9 documentation identifies SAP Note 3108316 for RHEL 9, while 2772999 is associated with RHEL 8. I replaced the RHEL 8 note with SAP Note 2009879 for SAP HANA RHEL OS guidelines.
- Replaced deprecated `startsap` and `stopsap` examples with SAPControl commands. SAP documentation states that `startsap` and `stopsap` are deprecated and recommends SAPControl for starting and stopping SAP systems.
- Replaced local `HDB start` and `HDB stop` examples with SAPControl `StartSystem HDB` and `StopSystem HDB` commands for SAP HANA, matching SAP HANA administration documentation and avoiding the local-host limitation of the `HDB` program.
- Updated the SAP kernel update commands to follow SAP's documented SAPCAR extraction pattern, back up the platform-specific kernel directory, and include required ownership, permissions, and `saproot.sh` steps after copying kernel files.

## Review Notes
The DNF update and updateinfo commands, LVM snapshot syntax, SAP HANA supported OS note reference, and reboot-check workflow are consistent with the consulted documentation. In a real SAP production environment, exact SID, instance number, kernel path, subscribed repositories, and rollback procedure should be confirmed from the system landscape and SAP Notes available through SAP for Me.
