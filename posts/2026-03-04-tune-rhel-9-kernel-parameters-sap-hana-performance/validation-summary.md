# Validation Summary: How to Tune RHEL 9 Kernel Parameters for SAP HANA Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9 for SAP Solutions
- SAP HANA
- Red Hat subscription-manager repositories
- DNF packages
- TuneD and the sap-hana profile
- Linux sysctl kernel parameters
- Pacemaker, pcs, and RHEL High Availability Add-On
- RHEL System Roles for SAP

## Sources Consulted
- Red Hat Documentation: RHEL for SAP Subscriptions and Repositories, RHEL 9, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html-single/rhel_for_sap_subscriptions_and_repositories/index
- Red Hat Documentation: Installing RHEL 9 for SAP Solutions, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html-single/installing_rhel_9_for_sap_solutions/installing_rhel_9_for_sap_solutions
- Red Hat Documentation: Overview of Red Hat Enterprise Linux for SAP Solutions Subscription, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/overview_of_red_hat_enterprise_linux_for_sap_solutions_subscription/assembly_sap-automation-and-performance_overview-of-rhel-for-sap-solutions-subscription-combined-9
- Red Hat Documentation: Red Hat Enterprise Linux System Roles for SAP, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/red_hat_enterprise_linux_system_roles_for_sap/con_rhel-system-roles-for-sap-overview_rhel-system-roles-for-sap-9
- Red Hat Documentation: Configuring and managing high availability clusters, RHEL 9, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters/index
- Red Hat Documentation: Monitoring and managing system status and performance, TuneD on RHEL 9, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/monitoring_and_managing_system_status_and_performance/index
- Red Hat Documentation: Automating SAP HANA Scale-Up System Replication using the RHEL HA Add-On, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html-single/automating_sap_hana_scale-up_system_replication_using_the_rhel_ha_add-on/index
- SAP Help Portal: SAP HANA Hardware and Cloud Measurement Tools, https://help.sap.com/docs/HANA_HW_CLOUD_TOOLS/02bb1e64c2ae4de7a11369f4e70a6394/7e878f6e16394f2990f126e639386333.html

## Issues Found
- The repository enablement commands used non-E4S SAP repository IDs and omitted BaseOS/AppStream. Red Hat's RHEL 9 SAP HANA guidance uses E4S repositories for supported SAP HANA systems and requires the corresponding BaseOS, AppStream, SAP Solutions, and typically SAP NetWeaver repositories. Updated the commands to set the RHEL release, note that the minor version must match the SAP-supported E4S release in use, and enable the E4S repositories using `$(uname -m)`.
- The HA repository was not enabled before installing HA packages. Added the High Availability E4S repository as an explicit HA-only repository command.
- The TuneD profile command assumed the `tuned` service was already running. Red Hat's TuneD documentation lists a running TuneD service as a prerequisite for applying profiles, so added `systemctl enable --now tuned`.
- The sysctl example pointed to `/etc/sysctl.conf` and used `sysctl -p`, which only applies the default sysctl file unless a file is specified. Updated the text to use `/etc/sysctl.d/99-sap-hana.conf` for local overrides and `sysctl --system` to apply sysctl configuration from the standard sysctl directories.
- The validation step referred to the older SAP HANA Hardware Configuration Check Tool name. SAP's current documentation for SAP HANA 2.0 and newer uses the SAP HANA hardware and cloud measurement tools, so the wording was updated.

## Review Notes
SAP Note 2772999 and SAP Note 3108302 are authoritative for SAP HANA hardware and OS settings but require SAP Support Portal access. The post now points readers toward Red Hat's supported automation and repository guidance rather than presenting repository or validation commands that conflict with public Red Hat and SAP documentation.
