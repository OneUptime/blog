# Validation Summary: How to Decide Between RHEL and SUSE Linux Enterprise for SAP Environments

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Red Hat Enterprise Linux for SAP Solutions
- SUSE Linux Enterprise Server for SAP Applications
- SAP HANA and SAP S/4HANA
- tuned and SAP tuned profiles
- saptune
- Pacemaker, pcs, and SAP HA resource agents
- AWS EC2 AMIs
- Azure Marketplace SAP images

## Sources Consulted
- Red Hat Documentation: Overview of Red Hat Enterprise Linux for SAP Solutions Subscription, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html-single/overview_of_red_hat_enterprise_linux_for_sap_solutions_subscription/index
- Red Hat Documentation: RHEL System Roles for SAP, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/8/html/red_hat_enterprise_linux_system_roles_for_sap/con_rhel-system-roles-for-sap-overview_rhel-system-roles-for-sap
- Red Hat Documentation: Automating SAP HANA Scale-Out System Replication using the RHEL HA Add-On, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/automating_sap_hana_scale-out_system_replication_using_the_rhel_ha_add-on/asmb_config_pacemaker_automating-sap-hana-scale-out-v9
- Red Hat Customer Portal: Red Hat Enterprise Linux Images (AMI) Available on Amazon Web Services, https://access.redhat.com/solutions/15356
- SUSE Documentation: How to Tune Systems with saptune, https://documentation.suse.com/sles-sap/16.0/html/SAP-saptune/index.html
- SUSE Documentation: SLES for SAP Applications included services and ESPOS, https://documentation.suse.com/sles-sap/15-SP4/html/SLES-SAP-installation/cha-about.html
- SUSE Documentation: Supported High Availability Solutions by SLES for SAP applications, https://documentation.suse.com/sles-sap/sap-ha-support/single-html/sap-ha-support/
- Microsoft Learn: High availability of SAP HANA on Azure VMs on Red Hat Enterprise Linux, https://learn.microsoft.com/en-us/azure/sap/workloads/sap-hana-high-availability-rhel
- SAP Help Portal: SAP HANA Hardware and Software Requirements, https://help.sap.com/docs/SAP_HANA_PLATFORM/eb3777d5495d46c5b2fa773206bbfb46/d3d1cf20bb5710149b57fd794c827a4e.html

## Issues Found
- The post stated that SAP requires cluster-based HA for production HANA systems. This was too absolute: vendor guidance documents cluster-based HA for automated failover, but production HANA deployments are not universally required to run a cluster. Changed the sentence to say production SAP HANA systems that need automated failover typically use cluster-based HA.
- The support lifecycle bullet grouped Red Hat and SUSE under "4+ years of Extended Update Support." This blurred different vendor terms and timeframes. Updated it to Red Hat E4S up to four years for specific minor releases and SUSE's one and a half years of general support plus three years of ESPOS for most service packs.
- The AWS AMI example used a broad `*RHEL-SAP*` filter and omitted region. Red Hat documents the owner ID `309956199498`, the `RHEL-SAP-9*` filter pattern, a region, and a sorted query including creation date. Updated the command to match that documented pattern.

## Review Notes
The RHEL package names, `tuned-adm` usage, SLES `saptune solution apply/verify HANA` commands, and Pacemaker/pcs HA tooling are consistent with current vendor documentation. The comparison remains high level; production cluster setup still requires vendor-specific guides, fencing, quorum, cloud-specific agents, and SAP-certified OS/instance combinations.
