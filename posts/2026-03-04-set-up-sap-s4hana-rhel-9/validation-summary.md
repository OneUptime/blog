# Validation Summary: How to Set Up SAP S/4HANA on RHEL

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHEL System Roles for SAP
- Ansible Core
- SAP S/4HANA
- SAP HANA
- SAP Software Provisioning Manager
- SAP Web Dispatcher
- firewalld
- LVM and XFS

## Sources Consulted
- Red Hat documentation: RHEL 9 System Roles for SAP, including `ansible-core`, `rhel-system-roles-sap`, `sap_general_preconfigure`, `sap_hana_preconfigure`, and `sap_netweaver_preconfigure`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/installing_rhel_9_for_sap_solutions/assembly_rhel-system-roles-for-sap_configuring-rhel-9-for-sap-hana2-installation
- Red Hat documentation: RHEL 9 System Roles for SAP support status and role descriptions: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html-single/red_hat_enterprise_linux_system_roles_for_sap/red_hat_enterprise_linux_system_roles_for_sap
- SAP Help Portal: Running Software Provisioning Manager and SL-UI URL format: https://help.sap.com/docs/SLTOOLSET/ea34afd8e8d34085ac6fbc581cd3b7f3/3bef20d729b84e31bbced506c5b287c0.html
- SAP Help Portal: Software Provisioning Manager prerequisites and `SAPINST_HTTPS_PORT`: https://help.sap.com/docs/SLTOOLSET/39c32e9783f6439e871410848f61544c/1d4bd354b65ced05e10000000a4450e5.html
- SAP Help Portal: SAP Web Dispatcher `wdisp/system_<xx>` profile parameter syntax: https://help.sap.com/docs/ABAP_PLATFORM_NEW/683d6a1797a34730a6e005d1e8de6f22/1bb0fd8a12344c4ca89b7a1c5d1d7310.html
- SAP Help Portal: SAP Web Dispatcher back-end system configuration examples: https://help.sap.com/docs/ABAP_PLATFORM_NEW/683d6a1797a34730a6e005d1e8de6f22/04c5c0060f54456585952fd41db449ac.html
- SAP Help Portal: `icm/HTTP/redirect_<xx>` redirect parameter syntax: https://help.sap.com/doc/saphelp_autoid2007/2007/en-US/00/040f3a39ce8704e10000000a114084/content.htm
- SAP Help Portal: `icm/server_port_<xx>` for SAP ICM and Web Dispatcher server ports: https://help.sap.com/docs/SAP_NETWEAVER_750/bd78479f4da741a59f5e2a418bd37908/483ae05299c172d0e10000000a42189c.html
- SAP Help Portal: SAP NetWeaver AS ABAP port conventions: https://help.sap.com/doc/saphelp_nw73ehp1/7.31.19/en-US/4e/c26cdc58e968b9e10000000a42189e/content.htm
- Red Hat Customer Portal: SAP S/4HANA on RHEL HA support context, supported S/4HANA releases, and SAP HANA database support: https://access.redhat.com/articles/4016901
- Red Hat documentation: RHEL 9 LVM concepts and `pvcreate` usage: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/managing-lvm-physical-volumes_configuring-and-managing-logical-volumes
- Red Hat documentation: RHEL 9 firewalld permanent port changes and reload: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters

## Issues Found
- The post used the literal user `sidadm` for post-installation checks. SAP systems use the lower-case SAP system ID followed by `adm`, such as `s4hadm`. I changed the example to set a lower-case `sid` variable and use `"${sid}adm"` for `sapcontrol` and `R3trans`.
- The Web Dispatcher redirect example used `TOPROT` and `TOPORT`, which are not the documented subparameters for `icm/HTTP/redirect_<xx>`. I changed the example to use `PROT=https`, `HOST=s4app`, and `PORT=44300`.
- The Web Dispatcher profile routed traffic to port `44300` but did not show an HTTPS listener for that port. I added `icm/server_port_0 = PROT=HTTPS, PORT=44300`, matching the documented profile parameter used for SAP ICM and Web Dispatcher server ports.
- The SWPM step described "Loading the initial data." I changed this to "Performing the database load," which better matches SAP provisioning terminology.

## Review Notes
- The examples assume instance number `00`. That is valid as an example, but real deployments must adjust ports and `sapcontrol -nr` values to match the selected SAP instance numbers.
- The storage commands are syntactically valid for a simple example, but production SAP S/4HANA landscapes often require shared storage design for `/sapmnt` and high-availability planning beyond this single-guide scope.
