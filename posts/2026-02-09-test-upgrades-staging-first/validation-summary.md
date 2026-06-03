# Validation Summary: How to Test Kubernetes Upgrades in Staging Environment First

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- Amazon EKS
- AWS CLI
- kubectl
- Argo CD ApplicationSet
- jq
- etcd/etcdctl
- k6
- Chaos Mesh
- Helm

## Sources Consulted
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes kubectl quick reference for api-resources: https://kubernetes.io/docs/reference/kubectl/quick-reference/
- Kubernetes etcd administration documentation: https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/
- etcd snapshot documentation: https://etcd.io/docs/v3.7/tasks/operator/how-to-save-database/
- Amazon EKS cluster update documentation: https://docs.aws.amazon.com/eks/latest/userguide/update-cluster.html
- Amazon EKS version lifecycle documentation: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Amazon EKS platform versions documentation: https://docs.aws.amazon.com/eks/latest/userguide/platform-versions.html
- AWS CLI EKS create-cluster command reference: https://docs.aws.amazon.com/cli/latest/reference/eks/create-cluster.html
- AWS CLI EKS wait command reference: https://docs.aws.amazon.com/cli/latest/reference/eks/wait/
- Amazon EKS add-on update documentation: https://docs.aws.amazon.com/eks/latest/userguide/updating-an-add-on.html
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Grafana k6 options and thresholds documentation: https://grafana.com/docs/k6/latest/using-k6/k6-options/ and https://grafana.com/docs/k6/latest/using-k6/thresholds/
- Chaos Mesh PodChaos documentation: https://chaos-mesh.org/docs/next/simulate-pod-chaos-on-kubernetes/
- Chaos Mesh Helm installation documentation: https://chaos-mesh.org/docs/production-installation-using-helm/

## Issues Found
- The EKS staging creation script derived the Kubernetes version from a node kubelet string such as `v1.29.0-eks-*`, but `aws eks create-cluster --version` expects an EKS cluster minor version such as `1.34`. Changed it to read `cluster.version` from `aws eks describe-cluster`.
- The EKS VPC configuration passed tab-separated subnet IDs from `--output text` directly to `--resources-vpc-config`, which expects comma-separated shorthand values. Added conversion and optional security group handling.
- The Argo CD ApplicationSet example used cluster names in `destination.server`. Changed the values to API server URLs, matching the `server` field semantics.
- The upgrade script labeled `kubectl get all` output as a backup and attempted an unconditional `etcdctl snapshot save` in an EKS-focused example. Reworded this as a common resource export and made the etcd snapshot a self-managed-cluster-only command with explicit endpoints.
- The EKS upgrade script manually polled cluster and node group status. Replaced those loops with the official AWS CLI waiters for `cluster-active` and `nodegroup-active`.
- The deprecated API check only inspected `kubectl get all`, which misses many resource types. Changed it to iterate over listable namespaced API resources from `kubectl api-resources`.
- The connectivity test image used `curlimages/curl`, which is not a good fit for the later `nslookup` test. Changed it to `nicolaka/netshoot`, which includes common network troubleshooting tools.
- The staging test summary reused `$?` long after the service connectivity command had run, so the reported result could be wrong. Stored service, DNS, and storage results in variables before generating the summary.
- The performance benchmark used `kubectl run -it` in a redirected script context. Removed `-it` to avoid TTY-related failures.
- The Chaos Mesh install command used a non-current `kubectl apply` URL. Replaced it with the Helm installation flow from the official Chaos Mesh documentation.
- Chaos Mesh cleanup omitted the namespace for resources created in `default`. Added `-n default`.
- The EKS example upgraded to Kubernetes `1.29`, which is outside EKS extended support on the validation date. Updated the example report and target version to a supported `1.33` to `1.34` upgrade path.

## Review Notes
- The examples are still templates and require environment-specific values such as real Argo CD cluster API URLs, IAM role permissions, VPC/subnet choices, storage classes, service names, and application test commands.
- For production-grade EKS upgrades, readers should also update EKS add-ons such as VPC CNI, CoreDNS, and kube-proxy after the control plane upgrade. The post mentions add-ons conceptually but does not provide a full add-on upgrade script.
