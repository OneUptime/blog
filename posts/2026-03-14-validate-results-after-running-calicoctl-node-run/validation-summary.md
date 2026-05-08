# Validation Summary: Validating Results After Running calicoctl node run

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- calicoctl
- calico/node
- Felix
- BIRD and BGP
- Docker
- Linux routing and iptables
- Kubernetes

## Sources Consulted
- Calico `calicoctl node run` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/run
- Calico `calicoctl node status` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico Node resource reference: https://docs.tigera.io/calico/latest/reference/resources/node
- Calico `calicoctl get` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico `calicoctl ipam show` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico BGP peering documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Docker `container ls` reference: https://docs.docker.com/reference/cli/docker/container/ls/
- Docker `inspect` reference: https://docs.docker.com/reference/cli/docker/inspect/
- Docker `logs` reference: https://docs.docker.com/reference/cli/docker/container/logs/

## Issues Found
- The post said the Node resource `status` section should show the node as running. Calico's Node resource reference defines metadata and spec fields, but not a runtime `status` field for this purpose. I changed the validation guidance to check that the node name matches the hostname or the `--name` value passed to `calicoctl node run`.
- The post said `"Calico process is running"` confirms Felix and BIRD are active. The official `calicoctl node status` reference describes it as checking the Calico node instance and BGP peering status, so I narrowed the claim to the local `calico/node` instance and made BGP peer validation conditional on BGP deployments.
- The Felix readiness check used log grepping for "ready". Calico documents the `docker exec calico-node /bin/calico-node -felix-ready` readiness endpoint, so I replaced the log grep with that command.
- The post treated iptables `cali-` chains as universal evidence of Felix programming. That is accurate for the default Linux iptables data plane but not for eBPF or nftables deployments, so I added that caveat.
- The post said `calicoctl ipam show --ip=192.168.0.1` verifies the node can allocate IPs from the pool. Official docs state this command reports whether a specific IP is assigned or shows IPAM details, so I changed the wording to say it inspects whether a specific IP is assigned.
- The validation script failed healthy deployments with zero expected BGP peers, such as single-node, policy-only, or VXLAN-based setups. I added `EXPECTED_BGP_PEERS`, defaulting to `0`, and updated the verification command to pass `EXPECTED_BGP_PEERS=2` for the example topology.
- The troubleshooting section said mismatched IPIP or VXLAN encapsulation prevents route exchange. Calico's BGP documentation states VXLAN does not use BGP, so I changed the note to distinguish VXLAN from IPIP and non-overlay BGP deployments.

## Review Notes
The guide is now technically valid for `calicoctl node run` deployments using the default Docker-based `calico/node` workflow. Future improvements could add separate validation paths for Kubernetes DaemonSet installs, eBPF data plane, nftables data plane, and VXLAN-only deployments.
