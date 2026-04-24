# Validation Summary: How to Configure Per-Team Resource Quotas in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Kubernetes ResourceQuota
- Kubernetes LimitRange
- kubectl
- Docker Compose
- Docker Standalone

## Sources Consulted
- Portainer Docs, Manage a namespace: https://docs.portainer.io/user/kubernetes/namespaces/manage
- Portainer Docs, Add a new namespace: https://docs.portainer.io/user/kubernetes/namespaces/add
- Portainer Docs, Manage access to a namespace: https://docs.portainer.io/user/kubernetes/namespaces/access
- Portainer Docs, Access control: https://docs.portainer.io/advanced/access-control
- Portainer Docs, View container statistics: https://docs.portainer.io/user/docker/containers/stats
- Kubernetes Docs, Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Docs, Limit Ranges: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes Docs, Configure Memory and CPU Quotas for a Namespace: https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/quota-memory-cpu-namespace/
- Docker Docs, Define services in Docker Compose: https://docs.docker.com/reference/compose-file/services/

## Issues Found
- The post originally stated that Portainer Business Edition supports direct quotas for Docker environments and described an environment-level quota workflow under `Environments > [environment name] > Configuration`. I corrected this to the documented Kubernetes namespace quota workflow because current Portainer documentation places quota controls on namespaces, not on environment configuration pages.
- The Docker section implied aggregate per-team quotas and used `deploy.resources` as a generic Docker example. I updated it to documented Docker Compose service-level limits with `cpus`, `mem_limit`, and `mem_reservation`, which is the accurate guidance for Docker Standalone stacks.
- The Portainer navigation path for viewing quotas was adjusted to match the current namespace UI, where quotas are managed from the namespace's `Resource Quota` section.
- The comments on Kubernetes memory values were corrected from `GB` to `GiB` to match the actual Kubernetes resource quantities shown in the manifest.
- The Docker monitoring sentence was changed from unsupported aggregate team stats via the Portainer API or cAdvisor to the documented Portainer container statistics view.

## Review Notes
- Kubernetes per-team quotas in Portainer are implemented by assigning teams access to separate namespaces and applying ResourceQuota and LimitRange objects there.
- If this post is expanded later to cover Docker Swarm specifically, it should distinguish Swarm `deploy.resources` from Docker Standalone Compose service-level resource fields.
