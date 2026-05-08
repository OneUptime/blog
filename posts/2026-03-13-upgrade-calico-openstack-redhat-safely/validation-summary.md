# Validation Summary: How to Upgrade Calico on OpenStack Red Hat Safely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Calico for OpenStack
- Red Hat Enterprise Linux
- OpenStack Neutron
- RPM package management with dnf/yum
- SELinux audit and policy tooling

## Sources Consulted
- Project Calico documentation: Upgrade Calico on OpenStack, https://docs.tigera.io/calico/latest/operations/upgrading/openstack-upgrade
- Project Calico documentation: Red Hat Enterprise Linux OpenStack installation, https://docs.tigera.io/calico/latest/getting-started/openstack/installation/redhat
- Project Calico documentation: calicoctl get command reference, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Project Calico documentation: Configuring Felix, https://docs.tigera.io/calico/latest/reference/felix/configuration
- Project Calico documentation: WorkloadEndpoint resource, https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Red Hat Enterprise Linux documentation: Using SELinux, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/using_selinux/index

## Issues Found
- The post originally described upgrading the controller before compute nodes. Project Calico's OpenStack upgrade procedure for RPM-based deployments updates compute-node packages before control-node packages, so the step order was corrected.
- The controller package command used `python3-networking-calico` and restarted `openstack-neutron`. Calico's OpenStack docs identify the control-node packages as `calico-common`, `calico-control`, `networking-calico`, and `openstack-neutron`, and restart `neutron-server`, so the command was corrected.
- The compute-node upgrade only updated `calico-felix`. Calico's OpenStack upgrade docs list additional compute-node packages required for a targeted package upgrade, so the command was expanded to include the documented Calico, Neutron, Nova, dnsmasq, and DHCP agent packages.
- The post did not mention Calico's current caveat that the RHEL OpenStack installation path is no longer actively tested. A brief compatibility note was added to avoid overstating support.
- The final verification said the workload endpoint count should match the active VM count. Calico defines a WorkloadEndpoint as an interface connecting a VM or container to its host, so the note was corrected to compare against the expected VM interface count.

## Review Notes
The SELinux commands are consistent with Red Hat's documented `ausearch`, `audit2allow`, and `semodule` workflows. In a production procedure, generated SELinux policy should still be reviewed before installation because Red Hat notes that `audit2allow` suggestions can be too broad or inappropriate for some cases.
