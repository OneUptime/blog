# Validation Summary: How to Troubleshoot Installation Issues with Calico on OpenStack Ubuntu

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico for OpenStack
- OpenStack Neutron
- Ubuntu systemd and service logs
- etcd and etcdctl
- calicoctl
- BGP routing with Calico/BIRD
- OpenStackClient

## Sources Consulted
- Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico OpenStack Ubuntu installation: https://docs.tigera.io/calico/latest/getting-started/openstack/installation/ubuntu
- Calico OpenStack configuration: https://docs.tigera.io/calico/latest/networking/openstack/configuration
- Calico `calicoctl node status` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico `calicoctl get` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico WorkloadEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- etcd cluster status guide: https://etcd.io/docs/v3.5/tutorials/how-to-check-cluster-status/
- etcdctl v3 command reference: https://pkg.go.dev/go.etcd.io/etcd/etcdctl/v3
- OpenStackClient `port list` reference: https://docs.openstack.org/python-openstackclient/2023.2/cli/command-objects/port.html

## Issues Found
- The etcd health check mixed etcd v3 and older v2 commands. Replaced `etcdctl cluster-health` with `ETCDCTL_API=3 etcdctl endpoint status --cluster --write-out=table`, and made the health command explicitly use etcd API v3 with `ETCDCTL_API=3 etcdctl endpoint health --cluster`.
- The compute-node etcd connectivity check used the v2-only `etcdctl ls /calico` command. Replaced it with `ETCDCTL_API=3 etcdctl --endpoints=http://<controller-ip>:2379 get --prefix /calico/ --keys-only`.
- The OpenStack port lookup used `openstack port list | grep <vm-id>`, which is less reliable because the server ID is not necessarily shown in the default table output. Replaced it with the documented `openstack port list --server <vm-id>` filter.
- The final diagnosis said missing Calico workload endpoints meant the Neutron-to-Calico synchronization "has a bug." Softened this to say the Neutron driver has not written the endpoint into Calico, because the cause could be configuration, etcd connectivity, authentication, or a software defect.

## Review Notes
The post is technically relevant and the overall troubleshooting sequence matches Calico's OpenStack architecture: Neutron driver, etcd datastore, Felix on compute nodes, and BIRD/BGP routing. Operators using TLS or authentication for etcd will need to add the appropriate etcdctl certificate or credential flags.
