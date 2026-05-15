# Validation Summary: How to Configure RHEL for SAP Business One Server

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHEL for SAP Solutions
- SAP HANA
- SAP Business One, version for SAP HANA
- Linux system tuning with sysctl, tuned, systemd, XFS, and limits.d

## Sources Consulted
- SAP Help Portal: SAP Business One Administrator's Guide, version for SAP HANA, Host Machine Prerequisites: https://help.sap.com/docs/SAP_BUSINESS_ONE_ADMIN_GUIDE_HANA/1a2fc202f7f64336abf9fbc957d9b9ba/13c43452877d4feaad4dbd661d15d9bb.html
- SAP Help Portal: SAP Business One Administrator's Guide, Installing SAP Business One, version for SAP HANA: https://help.sap.com/docs/SAP_BUSINESS_ONE_ADMIN_GUIDE_HANA/1a2fc202f7f64336abf9fbc957d9b9ba/db4068aed7f54fc790576c4c766d3b09.html
- Red Hat Documentation: Installing RHEL 9 for SAP Solutions, RHEL System Roles for SAP: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/installing_rhel_9_for_sap_solutions/assembly_rhel-system-roles-for-sap_configuring-rhel-9-for-sap-hana2-installation
- Red Hat Documentation: Upgrading SAP environments from RHEL 8 to RHEL 9, SAP HANA system settings: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/upgrading_sap_environments_from_rhel_8_to_rhel_9/asmb_upgrading-hana-system_asmb_planning-upgrade
- Red Hat Documentation: Overview of Red Hat Enterprise Linux for SAP Solutions subscription: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/pdf/overview_of_red_hat_enterprise_linux_for_sap_solutions_subscription/Red_Hat_Enterprise_Linux_for_SAP_Solutions-9-Overview_of_Red_Hat_Enterprise_Linux_for_SAP_Solutions_Subscription-en-US.pdf

## Issues Found
- The post stated that SAP Business One on HANA can run on RHEL and that RHEL 9.x is supported. Current SAP Business One 10.0 documentation lists SLES 15 as the supported Linux host OS for Business One server components, while RHEL support applies to SAP HANA under the SAP HANA support matrix and RHEL for SAP Solutions guidance. Updated the introduction and version-check wording to require validation against the SAP Business One Platform Support Matrix and the SAP HANA support matrix.
- The post listed fixed CPU, RAM, and disk minimums without tying them to SAP sizing guidance. Replaced those values with a note to size according to SAP Business One and SAP HANA sizing guidance.
- Several commands used `sudo cat > file` or unprivileged `cat >> /etc/fstab`; shell redirection would run as the current user and fail on protected paths. Replaced these with `sudo tee`.
- The package section omitted Red Hat's recommended RHEL System Roles for SAP packages. Added `rhel-system-roles-sap` and `rhel-system-roles`, and clarified that the required RHEL for SAP Solutions repositories should be enabled before updating and installing packages.

## Review Notes
The remaining commands are examples and still require adaptation to the target host, storage layout, enabled repositories, and the exact SAP-certified Business One/HANA release combination. Production deployments should use SAP's current Platform Support Matrix, SAP Notes, and certified hardware guidance before installing server components.
