# Validation Summary: How to Tune Calico on OpenStack Red Hat for Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico for OpenStack
- Calico Felix
- calicoctl
- BGP route reflection
- etcd
- Red Hat Enterprise Linux TuneD
- RHEL sysctl networking parameters
- SELinux

## Sources Consulted
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico BGP peering and route reflector documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico OpenStack upgrade guidance for felix.cfg and packages: https://docs.tigera.io/calico/latest/operations/upgrading/openstack-upgrade
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Red Hat RHEL 9 TuneD documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/getting-started-with-tuned_monitoring-and-managing-system-status-and-performance
- Red Hat RHEL 9 virtualization TuneD guidance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/optimizing-virtual-machine-performance-in-rhel_configuring-and-managing-virtualization
- Red Hat SELinux targeted policy documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/chap-security-enhanced_linux-targeted_policy
- Red Hat SELinux configuration documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-security-enhanced_linux-working_with_selinux-main_configuration_file
- etcd tuning documentation: https://etcd.io/docs/v3.4/tuning/
- etcd configuration reference: https://etcd.io/docs/v3.7/op-guide/configuration/
- Linux kernel conntrack sysctl documentation: https://docs.kernel.org/5.17/networking/nf_conntrack-sysctl.html

## Issues Found
- The route reflection example only labeled a reflector node and disabled the node-to-node mesh. Calico documentation requires assigning a routeReflectorClusterID and configuring replacement BGPPeer resources before disabling the full mesh, otherwise networking can break. Added the node patch and BGPPeer example before the mesh-disable command.
- The Felix refresh interval examples set RouteRefreshInterval and IptablesRefreshInterval lower than the current defaults, which increases reconciliation frequency rather than reducing Felix CPU work. Updated the values to less aggressive intervals.
- The sysctl example used shell redirection with no sudo, which fails for non-root users even though the rest of the post uses sudo. Changed it to sudo tee and sudo sysctl.
- The SELinux step was labeled as an optimization but only listed policy modules. Changed it to verify the loaded SELinux policy with sestatus and clarified that targeted is the default policy unless MLS is explicitly required.
- The introduction and conclusion described SELinux "performance optimization" too strongly. Updated the wording to policy verification, which is what the corrected command actually does.

## Review Notes
- The etcd timeout settings are syntactically valid and align with etcd's documented heartbeat/election timeout knobs, but production values should be based on measured latency and disk behavior.
- The TuneD profile guidance is broadly correct. Red Hat also documents virtual-host as the virtualization host profile, so OpenStack compute nodes should validate the selected profile against their workload and hardware.
- The MaxIpsetSize setting is a valid Felix option for iptables mode, but Calico documents it as not applicable to the native nftables backend.
