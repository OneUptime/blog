# Validation Summary: How to Transfer a DigitalOcean Load Balancer Without Changing Its IP

## Status

validated

## Post Type

Operational migration and rollback guide

## Technologies Covered

- DigitalOcean DOKS, CCM v0.1.69, VPCs and load balancer ownership
- Kubernetes Services, contexts, annotations and external traffic policy
- doctl and application cutover verification

## Sources Consulted

- [DigitalOcean load balancer migration workflow and same-VPC prerequisite](https://docs.digitalocean.com/products/kubernetes/how-to/migrate-load-balancers/)
- [DigitalOcean load balancer types, health checks and disown setting](https://docs.digitalocean.com/products/kubernetes/how-to/configure-load-balancers/)
- [DigitalOcean v0.1.69 disown guards and ID-based reconciliation](https://github.com/digitalocean/digitalocean-cloud-controller-manager/blob/v0.1.69/cloud-controller-manager/do/loadbalancers.go)
- [DigitalOcean v0.1.69 Service annotations](https://github.com/digitalocean/digitalocean-cloud-controller-manager/blob/v0.1.69/docs/controllers/services/annotations.md)
- [doctl load-balancer get](https://docs.digitalocean.com/reference/doctl/reference/compute/load-balancer/get/)
- [kubectl get output and resource syntax](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)

## Issues Found

- The minimal target omitted the existing resource type while assuming REGIONAL port forwarding. Added the explicit REGIONAL annotation, scoped the manifest to that resource type, and explained that migration must preserve the actual type despite newer defaults.
- The rollback paragraph assumed the original Service still existed after the preceding cleanup step. Added the required recreation of its prepared manifest with the preserved UUID if it has already been deleted, only after disowning the new owner.

## Review Notes

- Verified the same-VPC requirement, disown-before-adopt order, stable cloud-resource IP, and old-Service cleanup against the provider migration procedure.
- Confirmed disowned EnsureLoadBalancer, UpdateLoadBalancer, and EnsureLoadBalancerDeleted operations return without modifying the cloud load balancer. Retaining stale status during the handoff is correctly distinguished from active management.
- Inspected context-qualified commands, escaped annotation JSONPath, allocated Service fields, and Local-policy endpoint prerequisites. Connection continuity and application-data rollback are correctly treated as separate from preserving the public address.
- Reviewed on 2026-09-10. All 4 shell examples passed `bash -n`; all 1 YAML examples parsed with PyYAML. These are syntax checks plus documentation/source review, not execution against a live Kubernetes cluster or cloud account. Cloud resource state, permissions, API actions, traffic, DNS propagation and certificate issuance were not runtime-verified.
