# Validation Summary: Automating Typha Scaling in Calico the Hard Way

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- Typha
- Kubernetes Deployments
- Kubernetes CronJobs
- Kubernetes RBAC
- kubectl
- Prometheus / kube-state-metrics

## Sources Consulted
- Calico documentation, "Installing on on-premises deployments": https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico documentation, "Typha overview": https://docs.tigera.io/calico/latest/reference/typha/overview
- Kubernetes documentation, "kubectl patch": https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes documentation, "CronJob": https://v1-35.docs.kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes documentation, "Using RBAC Authorization": https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- kube-state-metrics CronJob metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/cronjob-metrics.md

## Issues Found
- The post stated a Calico-recommended minimum of 2 Typha replicas. Calico's current guidance recommends at least one Typha replica per 200 nodes, no more than 20 replicas, and a production minimum of 3 replicas. Updated the formula, script constant, and best-practice text to use `MIN_REPLICAS=3`.
- The plaintext formula omitted the configured maximum of 20 replicas. Updated it to `min(20, max(3, ceil(node_count / 200)))` so it matches the script and Calico guidance.
- The script counted only nodes whose tabular status matched `Ready`. Calico's Typha guidance is based on node count, and counting only Ready nodes can scale Typha down during temporary node health issues. Updated the script and RBAC comment to count registered nodes.
- The RBAC section claimed the CronJob only needed patch access to the Typha scale subresource, but the script used `kubectl scale`. Updated the script to use `kubectl patch deployment --subresource=scale --type=merge`, which matches the documented kubectl patch behavior and the granted `deployments/scale` `patch` permission.
- The Prometheus alert example used `kube_cronjob_status_active == 0`, which only indicates that no Job is currently running and is normal for a periodic CronJob. Replaced it with an alert based on `kube_cronjob_status_last_successful_time` to detect missing successful completions.

## Review Notes
- The Kubernetes manifests use current stable APIs: `rbac.authorization.k8s.io/v1` and `batch/v1`.
- Calico also notes that the Typha replica count should stay below the node count to avoid stalled rolling upgrades; the post targets large clusters, but very small clusters should tune `MIN_REPLICAS` accordingly.
- The post correctly recommends pinning the `bitnami/kubectl` image instead of using `latest`.
