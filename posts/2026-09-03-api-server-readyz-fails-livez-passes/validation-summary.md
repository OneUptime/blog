# Validation Summary: `/readyz` Fails While `/livez` Passes: Reading Kubernetes API Server Health Checks

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- kube-apiserver
- kubectl
- HTTP health checks
- TLS
- etcd and etcdctl
- Kubernetes and etcd metrics
- Load balancer health probes

## Sources Consulted
- [Kubernetes API health endpoints](https://kubernetes.io/docs/reference/using-api/health-checks/)
- [kube-apiserver command-line reference](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/)
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes API concepts](https://kubernetes.io/docs/reference/using-api/api-concepts/)
- [Kubernetes metrics reference](https://kubernetes.io/docs/reference/instrumentation/metrics/)
- [etcd: How to check cluster status](https://etcd.io/docs/v3.5/tutorials/how-to-check-cluster-status/)
- [etcd transport security model](https://etcd.io/docs/v3.5/op-guide/security/)

## Issues Found
No technical issues found.

## Review Notes
- The set and names of readiness checks can vary with the Kubernetes release and kube-apiserver configuration, as the post correctly notes.
- The individual per-check health endpoint form is alpha beginning with Kubernetes v1.37, but the post uses the established `verbose` and `exclude` query parameters rather than relying on that alpha feature.
- The `--shutdown-delay-duration` behavior, including immediate readiness failure while `/livez` continues to succeed during the delay, matches the current kube-apiserver command-line reference.
