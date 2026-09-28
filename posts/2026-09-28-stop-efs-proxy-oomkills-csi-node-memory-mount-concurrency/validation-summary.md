# Validation Summary: Stop efs-proxy OOMKills: Size EFS CSI Node Memory for Concurrent Mounts

## Status
validated

## Post Type
Technical troubleshooting and configuration guide.

## Technologies Covered
- Amazon EFS and EKS
- AWS EFS CSI driver v3.5.0 and efs-proxy
- Helm chart 4.5.0 and YAML configuration
- Kubernetes DaemonSets, CSINode, resource requests and limits, and kubectl
- Linux memory enforcement, OOM diagnosis, and NFS write workloads

## Sources Consulted
- [Driver v3.5.0 parameters and memory guidance](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/docs/parameters.md)
- [Driver v3.5.0 FAQ and proxy OOM guidance](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/docs/faq.md)
- [Chart metadata](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/charts/aws-efs-csi-driver/Chart.yaml)
- [Chart values](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/charts/aws-efs-csi-driver/values.yaml)
- [Node DaemonSet template](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/charts/aws-efs-csi-driver/templates/node-daemonset.yaml)
- [Node implementation](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/pkg/driver/node.go) and [driver initialization](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/pkg/driver/driver.go)
- [Kubernetes resource management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes node-specific volume limits](https://kubernetes.io/docs/concepts/storage/storage-limits/)
- [CSINode API reference](https://kubernetes.io/docs/reference/kubernetes-api/storage/csi-node-v1/)
- [kubectl logs reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [kubectl top pod reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/)
- [kubectl JSONPath reference](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- Local official CLI help for `kubectl get`, `kubectl describe`, `kubectl logs`, and `kubectl top pod`.
- [Amazon EFS recommended NFS mount settings](https://docs.aws.amazon.com/efs/latest/ug/mounting-fs-nfs-mount-settings.html)
- [AWS CLI describe-addon-configuration reference](https://docs.aws.amazon.com/cli/latest/reference/eks/describe-addon-configuration.html)

## Issues Found
No technical issues found.

## Review Notes
- Left README.md unchanged. Its examples and explanations are consistent with the explicitly targeted versions.
- Confirmed the documented 12 MiB per volume, 30 MiB per concurrent mount, and 1.5 safety multiplier. Independently calculated the example as 1,350 MiB; 1,536 MiB is a valid larger Kubernetes memory quantity. These are planning estimates, not a guarantee for sustained writes or arbitrary workload density.
- Downloaded the official v3.5.0 source archive and rendered the actual node DaemonSet with the post's YAML using `helm template`. The result uses driver image v3.5.0, enables both opt-ins, sets mount concurrency to 10 and volume count to 50, and applies both 1536Mi memory quantities to efs-plugin. Chart metadata confirms chart 4.5.0 maps to application version 3.5.0.
- Verified that the concurrency control applies to NodePublishVolume. At the limit, the implementation returns gRPC Aborted so callers can retry; it does not maintain an internal waiting queue. The post's description as throttling is accurate.
- Verified that NodeGetInfo reports the configured volume count. Kubernetes uses the advertised limit for scheduling. This is not a hard proxy-process count, particularly when multiple pods reuse a volume; the post appropriately recommends measuring actual mount activity.
- Checked all Bash blocks with `bash -n`, reviewed command flags against CLI help and documentation, and checked the JSONPath filter against the official syntax. Pod and worker names are placeholders to replace. `--previous` requires a previous container instance; metrics commands require a functioning metrics pipeline and can lag recent pod creation.
- Confirmed the heavy-write backlog explanation and volume-metrics memory caveat against driver documentation. The caution about soft mounts agrees with AWS guidance on data integrity.
- Confirmed that managed EKS add-on configuration is validated against a version-specific JSON schema, so Helm settings must not be assumed to transfer directly.
- No live cluster deployment, OOM reproduction, or EFS workload benchmark was performed. The canary and representative write tests remain necessary to establish an installation's actual memory requirement.
