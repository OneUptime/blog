# Validation Summary: How to Set Up Custom Discovery Registries in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux discovery service
- Talos machine configuration and `talosctl`
- Sidero Labs discovery-service
- Kubernetes Deployments, Services, Ingress, and probes
- Docker
- systemd
- NGINX reverse proxy
- Prometheus metrics and alerting
- TLS and custom certificate authorities

## Sources Consulted
- Talos / Sidero Labs Discovery Service documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/discovery
- Talos MachineConfig reference for discovery registries: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos configuration patching documentation: https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/patching
- Talos `talosctl` CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos custom certificate authorities documentation: https://docs.siderolabs.com/talos/v1.11/security/certificate-authorities
- TrustedRootsConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/security/trustedrootsconfig
- Sidero Labs discovery-service repository and source: https://github.com/siderolabs/discovery-service

## Issues Found
- The post described the discovery service as fully stateless and memory-only. Current official docs and service defaults show encrypted snapshots are written to disk for restart recovery, so the architecture description was corrected.
- The Kubernetes deployment used the nonexistent `--landing-page=false` flag. The discovery-service binary uses `--landing-addr`, so the example now disables the landing listener with `--landing-addr=`.
- The Kubernetes probes used `/healthz`, but the discovery service does not expose a health endpoint. The probes were changed to TCP socket probes against the service port.
- The Kubernetes Service and Ingress treated the main endpoint as plain HTTP. The service endpoint is used for gRPC discovery traffic, so the port name and NGINX Ingress backend protocol were corrected.
- The standalone NGINX reverse proxy example used `proxy_pass`, which would not correctly proxy gRPC discovery traffic. It now uses `listen ... http2` and `grpc_pass`.
- The Talos discovery patch enabled the Kubernetes registry. Current Talos documentation says the Kubernetes registry is disabled by default and deprecated for Kubernetes 1.32+, so the example keeps it disabled.
- The verification command used `talosctl get discoveredmembers`, which is not the current documented discovery resource. It was changed to `talosctl get members`, and an `affiliates --namespace=cluster-raw` check was added for registry-level inspection.
- The high availability section claimed independent replicas need no synchronization. Because discovery data is held per instance in memory/local snapshots, the guidance was corrected to mention backend pinning or a shared failover strategy.
- The internal CA example wrote a PEM file under `machine.files`, which does not add the CA to Talos' trusted root store. It was replaced with a `TrustedRootsConfig` document.

## Review Notes
The post is technically relevant and salvageable. The discovery service repository uses a Business Source License and current Talos docs mention self-hosting under a commercial license; future updates could call out licensing and image version pinning, but those are operational caveats rather than correctness blockers for this validation.
