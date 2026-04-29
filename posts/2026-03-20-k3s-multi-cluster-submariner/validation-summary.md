# Validation Summary: How to Set Up K3s Multi-Cluster with Submariner

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- Submariner
- Lighthouse service discovery
- CoreDNS
- IPsec
- Globalnet

## Sources Consulted
- Submariner Getting Started: https://submariner.io/getting-started/
- Submariner Deployment Guide: https://submariner.io/operations/deployment/
- `subctl` command reference: https://submariner.io/operations/deployment/subctl/
- Submariner User Guide: https://submariner.io/operations/usage/
- Submariner Service Discovery architecture: https://submariner.io/getting-started/architecture/service-discovery/
- Submariner Globalnet architecture: https://submariner.io/getting-started/architecture/globalnet/
- Submariner NAT Traversal: https://submariner.io/operations/nat-traversal/
- Submariner Monitoring: https://submariner.io/operations/monitoring/
- Submariner releases: https://submariner.io/community/releases/
- K3s installation configuration: https://docs.k3s.io/installation/configuration
- Submariner Operator source for metrics service ports: https://github.com/submariner-io/submariner-operator/blob/devel/internal/controllers/submariner/submariner_controller.go

## Issues Found
- The prerequisites were incomplete and slightly misleading. The original text only mentioned UDP 4500 and listed Helm as required, but the documented `subctl` workflow does not require Helm and Submariner also requires broker API reachability, UDP 4490 for NAT discovery, and UDP 4800 between cluster nodes and gateway nodes. I corrected the prerequisites accordingly.
- The manual `subctl` installation example was broken. It attempted to download a tarball to a file named `subctl` while piping that same download stream to `tar`, and it used the wrong archive format for current releases. I replaced it with the official `get.submariner.io` installer pattern and updated the pinned version example to `v0.23.1`.
- The `subctl join` examples disabled NAT traversal with `--natt=false`, which is not appropriate for a generic multi-cluster guide and conflicts with the documented default behavior. I removed that flag.
- The verification step used `kubectl get endpoints -A`, which refers to the core Kubernetes `Endpoints` resource rather than Submariner `Endpoint` CRs. I replaced that with `subctl show endpoints` and `subctl show gateways`.
- The cross-cluster service example mixed `nginx:alpine` with a Service targeting port 8080, even though that image listens on port 80 by default. I aligned the Service and Deployment to port 80.
- The service manifest included a `submariner.io/export` annotation, but current Submariner service discovery is based on `ServiceExport` resources created directly or via `subctl export service`. I removed the unsupported annotation and kept the `subctl export service` step.
- The Globalnet example assigned `242.0.0.0/8` to a single cluster via `--globalnet-cidr`, which would incorrectly consume the whole default broker allocation range. I changed the example to use a unique per-cluster CIDR and added a note to use different CIDRs per cluster or let Submariner auto-allocate them.
- The cluster-specific DNS format was wrong. The original post used `service.namespace.svc.cluster.id.clusterset.local`, but the documented format is `cluster-id.service.namespace.svc.clusterset.local`. I corrected the pattern.
- The CoreDNS instructions implied manual editing for K3s. On CoreDNS-based clusters, `subctl join` configures forwarding automatically. I changed that section to verify the generated CoreDNS block instead of instructing the reader to edit it manually.
- The metrics port-forward example used `9898:9898`, but the current operator exposes the `submariner-gateway-metrics` Service on port 8080. I corrected the command to port-forward local port 9898 to service port 8080.

## Review Notes
- Service discovery requires Kubernetes 1.21 or later. Current K3s releases satisfy this, but older K3s builds may not.
- The guide assumes the default CoreDNS-based K3s setup and the default `libreswan` cable driver. Alternative DNS setups or cable drivers may require different operational details.
