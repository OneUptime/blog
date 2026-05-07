# Validation Summary: How to Apply Resource Quotas in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- `ResourceQuota`
- `LimitRange`
- `kubectl`
- `jq`

## Sources Consulted
- Portainer Documentation, "Add a new namespace": https://docs.portainer.io/2.27/user/kubernetes/namespaces/add
- Portainer Documentation, "Manage a namespace": https://docs.portainer.io/sts/user/kubernetes/namespaces/manage
- Portainer Documentation, "Advanced container settings": https://docs.portainer.io/user/docker/containers/advanced
- Portainer Documentation, "Configure service options": https://docs.portainer.io/2.21/user/docker/services/configure
- Kubernetes Documentation, "Resource Quotas": https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Documentation, "Configure Memory and CPU Quotas for a Namespace": https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/quota-memory-cpu-namespace/
- Kubernetes Documentation, "Configure Quotas for API Objects": https://kubernetes.io/docs/tasks/administer-cluster/quota-api-object/
- Kubernetes Documentation, "Configure Default Memory Requests and Limits for a Namespace": https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/memory-default-namespace/
- Kubernetes Documentation, "Limit Ranges": https://kubernetes.io/docs/concepts/policy/limit-range/

## Issues Found
- The Docker standalone and Swarm section implied Portainer applies these limits through security policies. I updated it to clarify that Portainer uses per-container or per-service reservations and limits in its deployment and configuration forms, not Kubernetes-style namespace `ResourceQuota` objects.
- The namespace creation steps used inaccurate Portainer UI wording. I changed `Add namespace` to `Add with form` and separated `Load Balancer quota` from `Resource assignment`, because Portainer documents them as separate controls.
- The existing namespace update steps referenced `Edit` and `Save`, which do not match Portainer's documented namespace workflow. I updated the steps to use the namespace page and `Update namespace`.
- The `LimitRange` explanation implied every pod must explicitly declare resource requests. I corrected it to reflect Kubernetes behavior more accurately: `LimitRange` can apply default requests and limits when pod specs omit them.
- The `jq` example was labeled as returning percentages even though it returns raw `used` and `hard` values. I updated the comment to describe the actual output.

## Review Notes
- Portainer's `Load Balancer quota` control only appears when external load balancers are enabled in cluster setup.
- The Kubernetes `ResourceQuota` and `LimitRange` manifests in the post are syntactically valid and use current `apiVersion: v1` resources.
