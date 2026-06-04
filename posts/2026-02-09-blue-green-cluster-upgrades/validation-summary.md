# Validation Summary: How to Set Up Blue-Green Kubernetes Cluster Upgrades for Control Plane Changes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes control plane upgrades
- Blue-green cluster migration
- kubectl
- Kubernetes Services, Ingress, Deployments, StatefulSets, PVCs, ConfigMaps, and Secrets
- ExternalDNS
- AWS Route 53
- Terraform
- jq

## Sources Consulted
- Kubernetes Releases: https://kubernetes.io/releases/
- Kubernetes Patch Releases: https://kubernetes.io/releases/patch-releases/
- Kubernetes Version Skew Policy: https://kubernetes.io/releases/version-skew-policy/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Service ClusterIP allocation: https://kubernetes.io/docs/concepts/services-networking/cluster-ip-allocation/
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- kubectl top reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/
- ExternalDNS TTL annotation documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/advanced/ttl/
- AWS CLI Route 53 change-resource-record-sets reference: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html
- Amazon Route 53 alias vs non-alias records: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-choosing-alias-non-alias.html

## Issues Found
- The example Kubernetes versions used 1.28.5 and 1.29.2, which are end-of-life as of 2026-06-04. Updated the examples to supported versions 1.35.5 and 1.36.1 based on the official Kubernetes release page.
- The post described DNS/load balancer switching as atomic and rollback as instant. Updated wording to controlled cutover, fast rollback, and DNS propagation/client caching caveats.
- The workload synchronization script applied raw exported Kubernetes objects. Added jq-based cleanup for generated metadata and status, removed Service cluster IP fields that should be allocated by the target cluster, skipped the default kubernetes Service, and filtered service-account token Secrets.
- The synchronization script claimed to sync Secrets but only synced ConfigMaps. Added Secret synchronization with filtering for generated service-account token Secrets.
- The Ingress example used the older kubernetes.io/ingress.class annotation. Replaced it with spec.ingressClassName, which is the current Kubernetes Ingress field.
- The synthetic curl test only checked curl process success and would not fail on HTTP 4xx/5xx responses. Switched it to curl -fsS.
- The smoke-test wait command assumed the Job lived in the current namespace. Changed it to wait on the manifest file so namespace information in smoke-tests.yaml is honored.
- The traffic monitoring script treated kubectl top CPU/memory output as an error-rate signal. Replaced it with a public health endpoint check plus pod restart-count monitoring.
- The storage section implied both clusters could safely access the same PostgreSQL data at the same time. Clarified that shared storage can be attached from either cluster, but single-writer databases should only be mounted read-write by the active cluster, or handled with replication, snapshots, or managed databases.
- The decommissioning script only scaled Deployments. Added StatefulSets so stateful workloads are also scaled down before infrastructure destruction.

## Review Notes
The Terraform module is illustrative and depends on a local module contract that is not present in the post, so only HCL structure and surrounding AWS Route 53 concepts were reviewed. The ExternalDNS and manual Route 53 examples are valid patterns, but production setups should avoid competing DNS writers by configuring ownership, registry settings, or a single cutover controller.
