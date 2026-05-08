# Validation Summary: Using calicoctl node run with Practical Examples

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- calicoctl
- calico/node
- Docker
- etcd datastore
- Kubernetes API datastore
- BGP
- VXLAN
- systemd

## Sources Consulted
- Calico `calicoctl node run` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/run
- Calico `calicoctl node` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico `calico/node` configuration reference: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico `calicoctl` configuration overview: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Calico etcd datastore configuration for `calicoctl`: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico `calicoctl patch` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch

## Issues Found
- The prerequisites said Docker or containerd could be used. `calicoctl node run` starts the Calico node as a Docker container, so this was changed to require Docker.
- The basic etcd example set only `ETCD_ENDPOINTS`. Calico documentation states the datastore type defaults to Kubernetes and `DATASTORE_TYPE=etcdv3` is required when configuring etcd through environment variables, so the command and bare-metal script now set it explicitly.
- The post implied the default `node run` example was Kubernetes-specific and that BGP/IP routing options always applied. Added a caveat that Kubernetes API datastore mode does not support BGP routing and ignores BGP/IP autodetection flags.
- The introduction omitted `confd` from the documented `calico/node` components. Updated the wording to describe Felix, BIRD, and confd.
- The VXLAN example described the command as starting a VXLAN backend, but the `calicoctl node run --backend` flag only supports `bird` and `none`. The comment now says the node is started first and VXLAN is enabled on the IP pool.
- The log level examples used unsupported or misleading environment-variable commands for `calicoctl node run`. Replaced them with documented `FelixConfiguration` and `BGPConfiguration` patch examples.
- The systemd environment file used `CALICO_NODENAME`, `CALICO_IP`, and `CALICO_IP_AUTODETECTION_METHOD`, which are not the documented `calico/node` environment names. Updated the service to pass `NODENAME`, `IP`, and `IP_AUTODETECTION_METHOD` through the documented `node run` flags.
- The systemd service used `calicoctl node stop`, but the documented `calicoctl node` subcommands do not include `stop`. Replaced it with `docker stop calico-node`.

## Review Notes
The guide is now accurate for the documented `calicoctl node run` behavior. Future revisions could mention that Calico recommends the operator or Kubernetes DaemonSet path for most Kubernetes deployments, with `calicoctl node run` mainly useful for direct host-level node management.
