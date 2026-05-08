# Validation Summary: How to Document OpenStack Connectivity with Calico for Operations Teams

## Status
validated

## Post Type
Operational documentation guide

## Technologies Covered
- OpenStack
- OpenStackClient
- OpenStack Nova and Neutron
- Calico for OpenStack
- Felix
- BIRD and BGP
- calicoctl
- Linux routing
- iptables
- eBPF dataplane

## Sources Consulted
- Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico OpenStack system requirements: https://docs.tigera.io/calico/latest/getting-started/openstack/requirements
- Calico OpenStack IP addressing and connectivity: https://docs.tigera.io/calico/latest/networking/openstack/connectivity
- Calico OpenStack system configuration: https://docs.tigera.io/calico/latest/networking/openstack/configuration
- Calico OpenStack Ubuntu installation: https://docs.tigera.io/calico/latest/getting-started/openstack/installation/ubuntu
- Calico OpenStack deployment verification: https://docs.tigera.io/calico/latest/getting-started/openstack/installation/verification
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico `calicoctl node status` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico `calicoctl get` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- OpenStackClient `compute service list` reference: https://docs.openstack.org/python-openstackclient/3.7.0/command-objects/compute-service.html
- OpenStack Compute API server attribute reference: https://docs.openstack.org/api-ref/compute/

## Issues Found
- The introduction and diagram described Felix specifically as using iptables rules, while current Calico documentation supports both the standard iptables dataplane and an optional eBPF dataplane. I changed the wording to "Felix policy enforcement" and qualified the dataplane statement.
- The VM-to-external flow said NAT is applied if configured in an IP pool. Calico's OpenStack connectivity documentation describes private IPv4 egress PNAT as a gateway or upstream router function, so I changed the flow to route to the external gateway first and then apply gateway/router PNAT where configured.
- The health-check runbook used `openstack compute service list` without filtering to `nova-compute`, which could include non-compute service hosts. I added `--service nova-compute`, which is documented by OpenStackClient.
- The BGP session total counted lines containing `BGP`, which counts status section headers rather than peer rows in `calicoctl node status` output. I changed it to count peer table rows and keep `Established` as the established-session count.
- The workload endpoint count used `wc -l`, which includes the table header in default `calicoctl get` output. I changed it to count rows after the header.
- The on-call file list included Kubernetes CNI paths, which are not the relevant configuration files for the Calico OpenStack Neutron integration. I replaced them with `/etc/neutron/neutron.conf` and the ML2 configuration path used when Calico is configured as an ML2 mechanism driver.

## Review Notes
The remaining commands and troubleshooting flow are consistent with official Calico and OpenStack documentation, but actual service names, log destinations, and file locations can still vary by distribution and installation method. The shell snippet was syntax-checked locally with `bash -n`; the OpenStack and Calico commands were not executed because this workspace is not connected to an OpenStack deployment and does not have the `openstack` or `calicoctl` binaries installed.
