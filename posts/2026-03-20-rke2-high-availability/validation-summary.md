# Validation Summary: How to Set Up RKE2 High Availability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RKE2
- Kubernetes
- Embedded etcd
- HAProxy
- NGINX stream proxy
- Linux systemd services
- kubectl
- etcdctl

## Sources Consulted
- RKE2 High Availability: https://docs.rke2.io/install/ha
- RKE2 Requirements: https://docs.rke2.io/install/requirements
- RKE2 Quick Start: https://docs.rke2.io/install/quickstart
- RKE2 Configuration Options: https://docs.rke2.io/install/configuration
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Agent Configuration Reference: https://docs.rke2.io/reference/linux_agent_config
- RKE2 Cluster Access: https://docs.rke2.io/cluster_access
- RKE2 Token Management: https://docs.rke2.io/security/token
- RKE2 CIS self-assessment etcd certificate references: https://docs.rke2.io/security/cis_self_assessment19
- etcdctl command reference: https://pkg.go.dev/go.etcd.io/etcd/etcdctl/v3
- etcd cluster status documentation: https://etcd.io/docs/v3.6/tasks/operator/how-to-check-cluster-status/
- HAProxy configuration manual: https://docs.haproxy.org/2.4/configuration.html
- NGINX stream proxy module: https://nginx.org/en/docs/stream/ngx_stream_proxy_module.html
- NGINX stream upstream module: https://nginx.org/en/docs/stream/ngx_stream_upstream_module.html
- NGINX stream core module: https://nginx.org/en/docs/stream/ngx_stream_core_module.html

## Issues Found
- The architecture description said "3 or more" server nodes. Updated it to specify an odd number of server nodes, with 3 recommended, because RKE2 HA guidance requires an odd number for etcd quorum.
- The load balancer description and diagram only called out the Kubernetes API endpoint. Updated them to include both port 6443 and port 9345, because RKE2 uses 9345 for node registration and 6443 for the Kubernetes API.
- The prerequisites did not mention that the RKE2 services must already be installed or that node names must be unique. Added those prerequisites because the documented commands depend on existing `rke2-server`/`rke2-agent` services and RKE2 requires unique node names.
- The production HA wording implied that a single load balancer removes all single points of failure. Updated the wording and load balancer prerequisite to note that the control plane is made more resilient and that the load balancer should also be highly available in production.
- The config snippets wrote `/etc/rancher/rke2/config.yaml` without ensuring the parent directory exists. Added `sudo mkdir -p /etc/rancher/rke2` before each config write.
- The first server set `cluster-cidr` and `service-cidr`, but additional server nodes did not explicitly set matching values. Added matching values to the additional server config because these are critical server configuration values that must match across RKE2 servers.
- The guide used `kubectl` as though it were on `PATH`. Updated the commands to use RKE2's bundled `/var/lib/rancher/rke2/bin/kubectl`, which the official docs note is installed there by default.
- The verification comments conflated Kubernetes node registration with etcd membership and labeled `etcdctl member list` as a health check. Updated the comments to accurately describe the commands.
- The conclusion claimed the cluster could lose one control plane node without any service interruption. Narrowed the claim to maintaining etcd quorum and Kubernetes API availability through the load balancer.

## Review Notes
The installation and cluster commands were reviewed against official documentation rather than executed, because running them would install and modify RKE2, load balancer, and Kubernetes services on the review host. A future improvement would be to add the full firewall and CNI port matrix from the RKE2 requirements documentation.
