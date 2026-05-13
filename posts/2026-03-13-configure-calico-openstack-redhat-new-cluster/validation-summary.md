# Validation Summary: How to Configure Calico on OpenStack Red Hat for a New Cluster

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Calico for OpenStack
- Calico Felix
- Calico IPPool and BGPConfiguration resources
- calicoctl
- Red Hat Enterprise Linux 8/9 networking
- nftables-backed iptables
- firewalld
- SELinux
- etcd
- BGP

## Sources Consulted
- Calico OpenStack system requirements: https://docs.tigera.io/calico/latest/getting-started/openstack/requirements
- Calico OpenStack configuration: https://docs.tigera.io/calico/latest/networking/openstack/configuration
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Red Hat Enterprise Linux 8 firewalld and iptables/nftables documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_networking/using-and-configuring-firewalld_configuring-and-managing-networking
- Red Hat Enterprise Linux 8 SELinux port labeling documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/using_selinux/index

## Issues Found
- The post presented switching RHEL 8/9 hosts to `iptables-legacy` with `alternatives --set` as a normal option. Red Hat documents RHEL 8 iptables as using the `nf_tables` backend rather than the legacy backend, and Calico Felix supports the `NFT` backend value. I replaced the legacy switch commands with backend verification commands and a Felix `IptablesBackend = NFT` example.
- The Felix backend value was shown as lowercase `nft`. Calico documents the FelixConfiguration value as `NFT`, so I changed the example to use the documented value.
- The post implied that firewalld should simply be configured on Calico OpenStack hosts. Calico's OpenStack requirements recommend disabling firewalld or other iptables managers where possible because they can interfere with Calico rules. I added that caveat and kept firewalld commands only for deployments that require it to remain enabled.
- The firewalld example opened the etcd client port on all compute nodes. Calico's OpenStack requirements describe etcd client access as incoming to etcd hosts, so I changed the instruction to apply the port opening on hosts running etcd or the zone protecting etcd access.

## Review Notes
The IPPool, BGPConfiguration, `calicoctl apply -f -`, `calicoctl get ippool -o wide`, and `calicoctl node status` examples match current Calico documentation. The SELinux `semanage port -a -t http_port_t -p tcp 9091` syntax is consistent with Red Hat's documented port-labeling pattern, though deployments should verify the appropriate SELinux type for the process exposing Felix metrics.
