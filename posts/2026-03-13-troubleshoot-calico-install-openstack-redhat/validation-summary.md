# Validation Summary: How to Troubleshoot Installation Issues with Calico on OpenStack Red Hat

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico for OpenStack
- Red Hat Enterprise Linux
- OpenStack Neutron
- SELinux and audit2allow
- firewalld
- iptables legacy and nft backends
- etcd and etcdctl

## Sources Consulted
- Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico OpenStack RHEL installation guide: https://docs.tigera.io/calico/latest/getting-started/openstack/installation/redhat
- Calico OpenStack system requirements: https://docs.tigera.io/calico/latest/getting-started/openstack/requirements
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Red Hat Developer iptables legacy/nft explanation: https://developers.redhat.com/blog/2020/08/18/iptables-the-two-variants-and-their-relationship-with-nftables
- Red Hat SELinux audit2allow guidance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/using_selinux/writing-a-custom-selinux-policy_using-selinux
- etcdctl v3 command documentation: https://pkg.go.dev/go.etcd.io/etcd/etcdctl/v3
- Red Hat OpenStack Neutron service references: https://docs.redhat.com/en/documentation/red_hat_openstack_platform/11/html-single/manual_installation_procedures/index

## Issues Found
- The post described SELinux denials as silent by default and as definitive root causes. I softened this to say denials can be easy to miss and may indicate the root cause, because audit denials require confirmation before generating a local allow policy.
- The post said `setenforce 0` sets Felix to permissive mode. I changed this to SELinux permissive mode, because `setenforce 0` changes the global SELinux enforcement state.
- The firewalld section implied opening ports is the primary Calico recommendation. I added Calico's documented recommendation to disable firewalld or other host firewall managers unless the deployment intentionally keeps them enabled.
- The firewalld checks omitted IP-in-IP traffic, which Calico OpenStack requirements list as needed when IP-in-IP is enabled. I added `ipencap` protocol checks and add commands with a conditional note.
- The etcd command used `etcdctl ls`, which is a v2-style command and is not valid for the etcd v3 API used by the example. I replaced it with `etcdctl get /calico --prefix --keys-only`.
- The Neutron log command used `openstack-neutron` as the systemd unit. Red Hat/OpenStack packaging documents the service as `neutron-server`, so I corrected the journalctl unit.
- The conclusion made an unsupported majority-cause claim about RHEL-specific security layers. I softened this to a technically supportable statement that SELinux and firewalld can cause platform-specific Calico failures.

## Review Notes
- Calico's current OpenStack RHEL installation path is documented as no longer actively tested and may not work. The post remains technically relevant as a troubleshooting guide, but future updates should call out the Calico version and Red Hat OpenStack deployment model being targeted.
- The iptables backend guidance is valid for Felix's `IptablesBackend` setting, whose accepted values are case-insensitive `auto`, `legacy`, and `nft`. Operators should still clean up orphaned rules when changing the backend on a running host, as Calico warns.
