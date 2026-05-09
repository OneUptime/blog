# Validation Summary: How to  Calico on OpenStack Upgrades - Troubleshoot

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico for OpenStack
- OpenStack Neutron
- Neutron ML2 mechanism drivers
- calico-felix
- etcd and etcdctl
- Kubernetes/OpenShift command-line tooling

## Sources Consulted
- Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico OpenStack configuration guide: https://docs.tigera.io/calico/latest/networking/openstack/configuration
- OpenStackClient `network agent list` documentation: https://docs.openstack.org/python-openstackclient/3.7.0/command-objects/network-agent.html
- OpenStack Neutron `ml2_conf.ini` configuration reference: https://docs.openstack.org/neutron/rocky/configuration/ml2-conf.html
- etcd `endpoint health` documentation: https://etcd.io/docs/v3.5/tutorials/how-to-check-cluster-status/

## Issues Found
- The post described etcd as "shared between Calico and OpenStack in some deployments." Calico documentation describes etcd as the datastore used by Calico's OpenStack components and accessed by compute hosts and Neutron servers. I changed the wording to "used by the Calico OpenStack components in etcd-backed deployments" to avoid implying that OpenStack generally shares etcd.
- The command `openstack network agent list --agent-type calico` used an undocumented agent-type filter value. OpenStackClient documents `--agent-type`, but the documented values do not include `calico`. I changed the command to `openstack network agent list | grep -i calico`, matching the earlier diagnostic pattern without relying on an unsupported filter value.
- The etcd health command used an HTTPS endpoint without noting that TLS-secured etcd clusters may require client certificate flags. I added a comment to use `--cacert`, `--cert`, and `--key` when client TLS is required.

## Review Notes
The guide is intentionally brief and remains version-agnostic. Calico's OpenStack documentation notes that Calico can run either as a Neutron core plugin or as an ML2 mechanism driver, with floating IP support limited to the core plugin mode; this is a useful future caveat if the post is expanded.
