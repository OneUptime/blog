# Validation Summary: How to Restore Kubernetes State After Talos Cluster Recovery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes (kubectl)
- etcd (snapshot recovery)
- CoreDNS
- CNI plugins (Cilium, Calico)
- Ingress-nginx
- Persistent Volumes (cloud-backed, local, NFS, Ceph)
- CSI drivers
- RBAC and Secrets
- Helm
- Prometheus / Grafana / Fluent Bit / Alertmanager (observability)

## Sources Consulted
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes DNS Debugging Resolution: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes Network Policy Provider (Cilium): https://kubernetes.io/docs/tasks/administer-cluster/network-policy-provider/cilium-network-policy/
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Change PV Reclaim Policy: https://kubernetes.io/docs/tasks/administer-cluster/change-pv-reclaim-policy/
- Helm list documentation: https://helm.sh/docs/helm/helm_list/
- Prometheus Community Helm Charts: https://github.com/prometheus-community/helm-charts
- Talos Linux disaster recovery docs: https://www.talos.dev/latest/advanced/disaster-recovery/

## Issues Found
- **Broken awk comparison for unhealthy deployments (two occurrences).** The post used `kubectl get deployments --all-namespaces | awk '$3 != $4 {print}'` to find deployments with unavailable replicas. Column `$3` is the READY field formatted as "ready/desired" (e.g. `"3/3"`), while `$4` is the UP-TO-DATE integer (e.g. `"3"`). Comparing them as strings is always true for a healthy deployment, so the command would print every deployment — the opposite of the intent. Fixed by changing the comparison to `$4 != $5` (UP-TO-DATE vs AVAILABLE), which correctly highlights deployments that have rolled out updates but do not yet have all replicas available. The same fix was applied in the `Post-Recovery Validation Script` section.

## Review Notes
- The DaemonSet awk (`$3 != $4`) compares DESIRED vs CURRENT, which is meaningful for that resource type, so it was left as-is.
- The `kubectl run dns-test --image=busybox` example will work on most clusters, but newer busybox images (>= 1.29) have a known DNS resolution issue. The Kubernetes documentation recommends `busybox:1.28` for DNS troubleshooting. Not changed as the test only uses `nslookup` against an in-cluster name, which generally works, but readers may want to pin the image tag if they hit issues.
- The Prometheus service name `prometheus-server` corresponds to the prometheus-community Helm chart with default release name. Installations via kube-prometheus-stack expose a different service name (e.g. `prometheus-operated` or `prometheus-kube-prometheus-prometheus`). The example is reasonable but installation-dependent.
- The `--force --grace-period=0` flag combination remains the documented way to force-delete pods, though users should be aware that forcing deletion does not wait for confirmation from kubelet — appropriate after recovery when the node is genuinely gone.
- The post focuses on post-recovery kubectl operations and is largely Talos-agnostic; the steps apply to any Kubernetes cluster restored from an etcd snapshot.
