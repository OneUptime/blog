# Validation Summary: How to Mount ConfigMaps as Files in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- ConfigMaps
- Kubernetes volumes and `subPath`
- `kubectl`
- Nginx configuration

## Sources Consulted
- Portainer: Add a new application using a form — https://docs.portainer.io/sts/user/kubernetes/applications/add
- Portainer: Add a ConfigMap — https://docs.portainer.io/user/kubernetes/configurations/add
- Kubernetes: Configure a Pod to Use a ConfigMap — https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/
- Kubernetes: Volumes — https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes: Updating Configuration via a ConfigMap — https://kubernetes.io/docs/tutorials/configuration/updating-configuration-via-a-configmap/
- Kubernetes: Distribute Credentials Securely Using Secrets — https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure/
- Kubernetes: kubectl exec — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes: kubectl rollout restart — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/

## Issues Found
- The Portainer form workflow was inaccurate. The draft said to use the `Volumes` section and add a ConfigMap volume directly, but current Portainer documentation describes selecting the ConfigMap in the `ConfigMaps` section and using `Override` to switch keys from environment variables to filesystem mounts. I corrected Step 2 to match the documented UI flow.
- The initial ConfigMap example included both `nginx.conf` and `default.conf`, but the later mount examples targeted `/etc/nginx/conf.d`, where `default.conf` belongs and `nginx.conf` does not. I removed the `nginx.conf` entry so the example remains internally consistent with the mount path used in the tutorial.
- The dynamic update section overstated ConfigMap refresh behavior. Kubernetes documents that mounted ConfigMap updates can take up to the kubelet sync period plus the local TTL cache delay, and that `subPath` mounts do not receive live updates at all. I corrected Step 8 and the conclusion to reflect those semantics and added the `subPath` restart caveat in Step 5.

## Review Notes
- Kubernetes may refresh mounted ConfigMap content faster than two minutes in practice, but the official documentation describes the worst-case default delay as roughly one minute of kubelet sync time plus one minute of ConfigMap cache TTL.
- Portainer UI wording can vary by release line, but the current official application-form documentation uses the `ConfigMaps` section and `Override` behavior referenced in the revised post.
