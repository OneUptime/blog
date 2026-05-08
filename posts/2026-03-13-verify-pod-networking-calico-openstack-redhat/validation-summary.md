# Validation Summary: How to Verify Pod Networking with Calico on OpenStack Red Hat

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico for OpenStack
- OpenStack CLI
- RHEL
- SELinux
- iptables and nftables
- firewalld
- BGP and BIRD

## Sources Consulted
- Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico OpenStack system requirements: https://docs.tigera.io/calico/latest/getting-started/openstack/requirements
- Calico calicoctl node command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico WorkloadEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico troubleshooting and BGP status guidance: https://docs.tigera.io/calico/latest/operations/troubleshoot/troubleshooting
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico-cloud/reference/resources/felixconfig
- OpenStackClient server command reference: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/server.html
- Red Hat Enterprise Linux 8 Using SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/using_selinux/index
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The post title referred to pod networking, but the guide describes Calico networking for OpenStack virtual machines. Changed the H1 to "How to Verify VM Networking with Calico on OpenStack Red Hat".
- The introduction claimed firewalld rules were part of the checks, but the post did not verify firewalld and Calico OpenStack documentation recommends disabling firewalld or ensuring required traffic is allowed. Updated the wording to "host firewall checks" and added a TCP 179 firewalld query when firewalld is active.
- The SELinux section claimed SELinux is the most common source of silent failures, which was too broad for the cited documentation. Softened this to "can be a source of silent failures".
- The SELinux remediation generated a policy module from the entire audit log. Changed it to use a filtered `ausearch` pipeline for the Calico Felix process and install the module with an explicit priority, matching Red Hat's documented pattern.
- The iptables verification used `iptables -L | grep -c "calico"`, which can miss Calico's `cali-` chains. Changed it to inspect `iptables-save` output for `cali-` or `calico`.
- The nftables check only listed tables. Changed it to inspect the nftables ruleset so it verifies programmed Calico rules, not just table names.

## Review Notes
The commands are operational checks and still depend on deployment-specific names such as `openstack-redhat-net`, `rhel-minimal`, and `m1.tiny`. The BGP route check using `proto bird` is appropriate for deployments where BIRD installs routes into the kernel, while `calicoctl node status` remains the primary Calico-documented BGP peer status check.
