# Validation Summary: How to Test Network Policies with Calico on OpenStack Red Hat

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico for OpenStack
- OpenStack Neutron Security Groups
- OpenStackClient CLI
- Red Hat Enterprise Linux SELinux
- Linux audit/ausearch
- iptables legacy backend
- iptables nft backend
- nftables

## Sources Consulted
- Calico for OpenStack documentation: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico Felix configuration documentation: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico nftables dataplane documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/nftables
- OpenStackClient security group rule documentation: https://docs.openstack.org/python-openstackclient/3.9.0/command-objects/security-group-rule.html
- OpenStack Neutron documentation: https://docs.openstack.org/neutron/latest/doc-neutron.pdf
- Red Hat Enterprise Linux SELinux troubleshooting documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/using_selinux/using_selinux
- Local iptables help/man output for `iptables -L`, `-n`, and backend-specific commands.
- Local nft help output for `nft -n list ruleset`.

## Issues Found
- The SELinux audit command filtered only on `-x python3`, which could miss Felix-related denials and did not match Red Hat's recommended AVC troubleshooting query. Changed it to query SELinux-related audit message types with `ausearch -m AVC,USER_AVC,SELINUX_ERR,USER_SELINUX_ERR -ts recent -i`.
- The post described SELinux as silently blocking Security Group changes and called SELinux enforcement the most common discrepancy source. This was too absolute and not supported by the checked documentation. Reworded those claims to say SELinux can block Felix dataplane updates and is one possible source of discrepancies.
- The iptables inspection examples used generic `iptables -L` under an `iptables-legacy` label and `nft list ruleset` for the iptables-nft backend. Updated the examples to use `iptables-legacy -n -L` for legacy, `iptables-nft -n -L` for the iptables nft backend, and a separate `nft -n list ruleset` example for Calico's nftables dataplane.

## Review Notes
The OpenStack security group commands and rule flags are consistent with OpenStackClient documentation. Neutron security group behavior described in the post is consistent with the documented default-deny allow-rule model and stateful rules. The VM image, flavor, and network names remain placeholders that must match the reader's OpenStack environment.
