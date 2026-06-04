# Validation Summary: How to Configure CoreDNS Custom Forward Zones for Split-Horizon DNS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- CoreDNS
- CoreDNS Corefile configuration
- CoreDNS forward, kubernetes, cache, health, ready, reload, loop, loadbalance, prometheus, log, and errors plugins
- Kubernetes ConfigMaps and CronJobs
- kubectl
- DNS forwarding and split-horizon DNS patterns

## Sources Consulted
- CoreDNS forward plugin documentation: https://coredns.io/plugins/forward/
- CoreDNS Corefile manual: https://coredns.io/manual/toc/
- CoreDNS Corefile explained: https://coredns.io/2017/07/23/corefile-explained/
- CoreDNS health plugin documentation: https://coredns.io/plugins/health/
- Kubernetes Customizing DNS Service documentation: https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The post described the CoreDNS forwarding examples as "true split-horizon DNS" based on query origin. CoreDNS server blocks and the forward plugin select behavior by queried zone/name, not client source. I changed the wording to describe Kubernetes-side split-horizon behavior based on queried domains and noted that forwarding zones are part of a broader split-horizon pattern.
- The wildcard examples used `*.internal.company.com:53` and `*.svc.cluster.local:53` as CoreDNS server-block zones. CoreDNS server blocks match zones by suffix; a parent zone such as `internal.company.com` already matches subdomains, while a literal `*.` server-block zone is not the right way to express this. I replaced those examples with parent-zone configurations.
- The sequential policy explanation implied simple first-server failover and health marking. CoreDNS selects upstreams according to policy, retries on network errors or unhealthy upstreams, and `max_fails` controls failed health checks before marking an upstream down. I updated the wording.
- The troubleshooting section said more specific zones must be defined before general ones. CoreDNS chooses the most specific matching server block; order matters when multiple `forward` directives are in the same server block. I corrected that distinction.

## Review Notes
The Kubernetes commands and API versions shown are current and plausible for a standard CoreDNS deployment. Managed Kubernetes platforms may customize the CoreDNS ConfigMap workflow or labels, so operators should confirm cluster-specific conventions before applying these examples.
