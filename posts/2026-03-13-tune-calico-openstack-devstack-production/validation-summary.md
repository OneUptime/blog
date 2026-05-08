# Validation Summary: How to Tune Calico on OpenStack DevStack for Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Felix configuration
- Calico IPPool resources and calicoctl
- OpenStack DevStack and python-openstackclient
- Linux iptables
- etcd and etcdctl
- Prometheus metrics

## Sources Consulted
- Calico FelixConfiguration resource documentation: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix Prometheus metrics documentation: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico IPPool resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico calicoctl patch documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- OpenStackClient security group rule documentation: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/security-group-rule.html
- OpenStackClient server command documentation: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/server.html
- DevStack documentation examples for server and security group rule creation: https://docs.openstack.org/devstack/
- etcd performance documentation: https://etcd.io/docs/v3.5/op-guide/performance/
- etcdctl command reference package documentation: https://pkg.go.dev/go.etcd.io/etcd/etcdctl/v3

## Issues Found
- The IPPool example used `encapsulation: "None"`, which is an operator Installation API field, not a valid `IPPool` field. Changed the command to patch `ipipMode: "Never"` and added a note that VXLAN pools should patch `vxlanMode` instead.
- The IPPool example attempted to patch `blockSize`, but Calico documents `blockSize` as settable only when an IP pool is created. Removed the `blockSize` patch and added a short note explaining the immutability.
- The iptables polling command used `iptables -L` without `-n`, which may resolve ports to service names instead of showing `dpt:8080`. Changed it to `iptables -L -n`.
- The metrics check referenced `felix_exec_time_seconds`, which is not listed in the current Calico Felix metrics reference. Changed it to `felix_exec_time_micros` and `felix_int_dataplane_apply_time_seconds`.

## Review Notes
The OpenStack CLI examples use documented `openstack security group rule create` and `openstack server create` options. The `test-sg`, `devstack-net`, `cirros`, and `cirros256` names are environment-dependent and must exist in the reader's DevStack environment.
