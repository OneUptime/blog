# Validation Summary: How to Test Network Policies with Calico on OpenStack DevStack

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico
- OpenStack
- DevStack
- OpenStack security groups
- Felix
- CirrOS/BusyBox
- Linux systemd journal

## Sources Consulted
- OpenStackClient `security group rule` command reference: https://static.openstack.org/docs/python-openstackclient/latest/cli/command-objects/security-group-rule.html
- OpenStackClient `server create` command reference: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/server.html
- OpenStack Nova security groups documentation: https://docs.openstack.org/nova/2024.2/user/security-groups.html
- Calico OpenStack DevStack documentation: https://docs.tigera.io/calico/latest/getting-started/openstack/installation/devstack
- Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico `calicoctl patch` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico component logs documentation: https://docs.tigera.io/calico/latest/operations/troubleshoot/component-logs
- CirrOS project README: https://github.com/cirros-dev/cirros
- BusyBox command reference: https://busybox.net/downloads/BusyBox.html
- DevStack logging/systemd documentation: https://files.openstack.org/docs/devstack/2023.1/configuration.html

## Issues Found
- The original HTTP test used `curl` from a CirrOS VM and expected HTTP to succeed after adding a security group rule, but CirrOS is a minimal test image and does not guarantee `curl` or an HTTP service listening on port 80. I changed the test to start a BusyBox `httpd` listener on `restricted-vm` with `sudo`, use BusyBox-style `timeout` plus `wget` from `allowed-vm`, and repeat the same HTTP check after adding the rule.
- The ICMP comment said "ICMP should work from restricted-vm" even though the command is run from `allowed-vm` to `<restricted-vm-ip>`. I changed the wording to "to restricted-vm."

## Review Notes
- The OpenStack security group commands use currently documented options. Rules created without `--ingress` are ingress rules by default, which matches the post's test scenario.
- The Calico `calicoctl patch felixconfiguration default --patch ...` command and `logSeverityScreen` field are documented. In OpenStack deployments, Felix configuration file or environment values can override datastore FelixConfiguration values, so this command may not change effective logging if those higher-precedence sources set the same field.
