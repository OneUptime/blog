# Validation Summary: How to Configure Cluster Discovery Service in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, `cluster.discovery`)
- Kubernetes
- talosctl CLI (`talosctl get members`, `talosctl get clusterid`, `talosctl get machineconfig`, `talosctl dmesg`)
- Sidero Labs Discovery Service (`ghcr.io/siderolabs/discovery-service`)
- Docker

## Sources Consulted
- Talos v1.6 Discovery Service guide: https://docs.siderolabs.com/talos/v1.6/configure-your-talos-cluster/system-configuration/discovery
- Talos v1.10 Discovery Service guide: https://docs.siderolabs.com/talos/v1.10/configure-your-talos-cluster/system-configuration/discovery
- Talos v1.6 configuration reference: https://docs.siderolabs.com/talos/v1.6/reference/configuration/v1alpha1/config/
- Sidero Labs discovery-service repository: https://github.com/siderolabs/discovery-service
- talosctl reference docs: https://docs.siderolabs.com/talos/v1.6/learn-more/talosctl

## Issues Found

1. **Incorrect claim about registry defaults.** The post originally stated "By default, both registries are enabled." Per the official Talos v1.6 discovery docs, the service registry is enabled by default but the Kubernetes registry is **disabled** by default. Fixed the YAML example to set `kubernetes.disabled: true` and rewrote the surrounding sentence to "By default, the service registry is enabled and the Kubernetes registry is disabled."

2. **Incorrect Docker port for self-hosted discovery service.** The `docker run` example exposed `-p 443:443`, but the upstream `ghcr.io/siderolabs/discovery-service` container listens on port **3000** (gRPC, which is what Talos nodes connect to) and port **3001** (HTTP/metrics). The container does not terminate TLS on 443. Updated the command to map `-p 3000:3000 -p 3001:3001` and added a comment noting that a TLS-terminating reverse proxy is needed in front of it to serve HTTPS on the endpoint URL.

## Review Notes
- The `endpoint` field under `cluster.discovery.registries.service` is correctly used; it must be an HTTPS URL with a certificate trusted by the nodes (handled by a reverse proxy when self-hosting).
- The `talosctl get members` output columns (NODE, NAMESPACE, TYPE, ID, VERSION, HOSTNAME, MACHINE TYPE, OS, ADDRESSES) match the actual command output.
- The `talosctl get clusterid` command is a valid Talos COSI resource query.
- The description of client-side encryption of membership data (so the discovery service cannot read it) is accurate.
- The statement that the Kubernetes registry "cannot be used for initial cluster formation" is accurate — it depends on the API server and etcd being up.
- Version caveat: in Kubernetes 1.32+, the Kubernetes registry has known compatibility issues, which is another reason it ships disabled. Worth flagging in a future revision if the post is updated for newer Kubernetes releases.
