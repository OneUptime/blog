# Validation Summary: How to Configure RHEL for SAP BusinessObjects

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- SAP BusinessObjects Business Intelligence Platform
- SAP BusinessObjects Central Management Server
- SAP BusinessObjects Central Configuration Manager
- firewalld
- DNF
- Linux sysctl and user limits

## Sources Consulted
- SAP Help Portal, Business Intelligence Platform Installation Guide for Unix, "To run an interactive installation": https://help.sap.com/docs/SAP_BUSINESSOBJECTS_BUSINESS_INTELLIGENCE_PLATFORM/65018c09dbe04052b082e6fc4ab60030/46af52d56e041014910aba7db0e91070.html
- SAP Help Portal, Business Intelligence Platform Installation Guide for Unix, "System requirements": https://help.sap.com/docs/SAP_BUSINESSOBJECTS_BUSINESS_INTELLIGENCE_PLATFORM/65018c09dbe04052b082e6fc4ab60030/46b1264f6e041014910aba7db0e91070.html
- SAP Help Portal, Installation screen and property IDs: https://help.sap.com/docs/SAP_BUSINESSOBJECTS_BUSINESS_INTELLIGENCE_PLATFORM/9a232017979b4748a3e8db919a54991c/46dd79566e041014910aba7db0e91070.html
- SAP Help Portal, Business Intelligence Platform Administrator Guide, "ccm.sh": https://help.sap.com/docs/SAP_BUSINESSOBJECTS_BUSINESS_INTELLIGENCE_PLATFORM/2e167338c1b24da9b2a94e68efd79c42/46976f886e041014910aba7db0e91070.html
- SAP Help Portal, Business Intelligence Platform Administrator Guide, "startservers": https://help.sap.com/docs/SAP_BUSINESSOBJECTS_BUSINESS_INTELLIGENCE_PLATFORM/2e167338c1b24da9b2a94e68efd79c42/46975ae96e041014910aba7db0e91070.html
- SAP Help Portal, Port Requirements for BI platform applications: https://help.sap.com/docs/SAP_BUSINESSOBJECTS_BUSINESS_INTELLIGENCE_PLATFORM/2e167338c1b24da9b2a94e68efd79c42/468fe41a6e041014910aba7db0e91070.html
- Red Hat Documentation, RHEL 9 DNF package installation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_installing-rhel-9-content_managing-software-with-the-dnf-tool
- Red Hat Documentation, RHEL 9 firewalld configuration: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters

## Issues Found
- The post configured PostgreSQL as the CMS repository database and suggested SAP HANA as an alternative. SAP installer property documentation for BI 4.x lists the CMS repository database types separately and does not support the shown PostgreSQL installer flags. I replaced the PostgreSQL setup with guidance to use bundled SQL Anywhere for a basic install or a SAP PAM-supported external CMS database for the target BusinessObjects version.
- The installer command used undocumented flags such as `-CMSDatabaseType postgresql`, `-CMSDatabaseHost`, and `-CMSDatabasePassword`. I replaced it with the documented interactive installer invocation using `./setup.sh -InstallDir /opt/sap_bobj`.
- The firewall comment labeled port 6410 as CMS. SAP documentation identifies 6400 as the default CMS name server port and 6410 as the default SIA port, so I corrected the comment.
- The verification step used a `listprocesses` script that is not documented in the SAP Unix administration guide. I replaced it with `ccm.sh -display`, and changed service startup to the documented `ccm.sh -start all` path.
- The conclusion said the CMS database is configured before running the installer. I adjusted it to say the supported CMS database is selected during installation, which matches the corrected flow.

## Review Notes
- The package list and kernel/user-limit examples are plausible preparatory settings, but exact prerequisites vary by SAP BusinessObjects BI Platform support package and RHEL minor release. Production installs should be checked against the current SAP Product Availability Matrix and the specific installation guide for the exact release.
- `compat-openssl11` exists on RHEL 9 but is deprecated in current RHEL 9 release notes; keep it only where the specific SAP BusinessObjects release requires OpenSSL 1.1 compatibility.
