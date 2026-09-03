# Validation Summary: Why Does kube-hunter Report “No Vulnerabilities” but List Open Kubelet and etcd Services?

## Status
validated

## Post Type
Technical security guide

## Technologies Covered

- Kubernetes
- kube-hunter
- Kubelet API and authentication/authorization
- etcd client and peer endpoints
- TLS and mutual TLS
- curl, OpenSSL, and jq command-line tools

## Sources Consulted

- [kube-hunter report structure](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/report/base.py)
- [kube-hunter CLI arguments](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/conf/parser.py)
- [kube-hunter port discovery](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/discovery/ports.py)
- [kube-hunter kubelet discovery](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/discovery/kubelet.py)
- [kube-hunter etcd discovery](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/discovery/etcd.py)
- [kube-hunter etcd hunters](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/hunting/etcd.py)
- [kube-hunter usage documentation](https://github.com/aquasecurity/kube-hunter/blob/main/README.md)
- [Kubernetes kubelet authentication and authorization](https://kubernetes.io/docs/reference/access-authn-authz/kubelet-authn-authz/)
- [Kubeadm certificate management and kubelet serving certificates](https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-certs/)
- [Kubernetes ports and protocols](https://kubernetes.io/docs/reference/networking/ports-and-protocols/)
- [etcd transport security](https://etcd.io/docs/v3.6/op-guide/security/)
- [etcd configuration options](https://etcd.io/docs/v3.6/op-guide/configuration/)
- [etcd monitoring](https://etcd.io/docs/v3.6/op-guide/monitoring/)

## Issues Found

- The post advised checking “etcd audit/connection logs,” but etcd does not provide a general request/audit access log. Changed this to “available etcd server logs, and network telemetry” so the recommended evidence sources match etcd's documented logging and monitoring capabilities.

## Review Notes

- The kube-hunter implementation links point to the moving `main` branch. The post appropriately advises recording an image digest or Git commit because discovery and hunter behavior can change.
- The current kube-hunter etcd hunter still requests legacy v2 paths. This is correctly presented as a coverage limitation rather than evidence that a v3 endpoint is secure.
- The `timeout` utility used in the OpenSSL example is common on Linux but is not part of POSIX and is not installed by default on every operating system, including macOS. This is a portability caveat, not a correctness issue for a typical Linux-based Kubernetes administration environment.
