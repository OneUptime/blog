# Validation Summary: How to Diagnose Kubernetes etcd Database Size Exceeded Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- etcd
- etcdctl
- etcdutl
- kubectl
- Prometheus alerting rules

## Sources Consulted
- etcd v3.5 maintenance documentation: https://etcd.io/docs/v3.5/op-guide/maintenance/
- etcd v3.5 configuration options: https://etcd.io/docs/v3.5/op-guide/configuration/
- etcd v3.5 snapshot backup documentation: https://etcd.io/docs/v3.5/tutorials/how-to-save-database/
- Kubernetes operating etcd clusters documentation: https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/
- Kubernetes kube-apiserver flag reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl delete reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Kubernetes image registry migration announcement: https://kubernetes.io/blog/2023/03/10/image-registry-redirect/
- Kubernetes 1.36 release page: https://kubernetes.io/releases/1.36/

## Issues Found
- The managed Kubernetes log example implied that etcd pods are available through `kubectl logs`. Updated it to say provider control plane logs should be used, and added a kubeadm static etcd pod lookup before `kubectl exec`.
- The `endpoint status` example said the output shows quota. It shows DB size but not quota, so the comment now says to compare DB size with the configured quota.
- The read-only symptom example used `kubectl get pods` as if reads fail due to the quota alarm. Replaced it with a write operation example.
- The auto-compaction example used the legacy `k8s.gcr.io` registry and an ambiguous retention value. Updated the registry to `registry.k8s.io` and changed retention to `1h`.
- The text described 1 hour as reasonable for most clusters. Updated it to match etcd guidance: 10 hours is the general-purpose default recommendation, while shorter periods fit high-churn keys.
- The event deletion command chained two equality field selectors on `reason`, which is an AND condition and cannot match both values at once. Split it into two commands.
- The API server example used the deprecated `k8s.gcr.io` registry and an end-of-life Kubernetes v1.28 image tag. Updated it to `registry.k8s.io/kube-apiserver:v1.36.1`.
- The Prometheus alert recorded a 0-100 percentage but rendered it with `humanizePercentage`, which expects a ratio. Updated annotations to use `humanize` with an explicit percent sign.
- The snapshot verification command used deprecated `etcdctl snapshot status` and a wildcard that could expand to multiple files. Updated it to store the snapshot path in a variable and verify with `etcdutl snapshot status`.
- The revision-history and resource-churn wording overstated what revision and generation numbers prove. Updated the wording to distinguish write churn, Kubernetes generation changes, and current object count.
- The pod recreation example sorted by creation timestamp and used `head`, showing oldest pods. Changed it to `tail` so the example shows newest pods.
- The conclusion said quota errors completely halt cluster operations. Updated it to say they halt cluster write operations.

## Review Notes
The article is technically relevant and accurate after the fixes. Some commands remain environment-dependent because certificate paths, etcd pod names, and managed control plane access vary by distribution and provider.
