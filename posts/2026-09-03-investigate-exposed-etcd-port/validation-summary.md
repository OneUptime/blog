# Validation Summary: How to Investigate an Exposed etcd Port Reported by kube-hunter

## Status
validated

## Post Type
Security investigation guide

## Technologies Covered
- Kubernetes
- kube-hunter
- etcd 3.6
- TLS and mutual TLS
- OpenSSL `s_client`
- Network firewalls and Kubernetes NetworkPolicy

## Sources Consulted
- [kube-hunter etcd discovery source](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/discovery/etcd.py)
- [kube-hunter etcd hunters source](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/hunting/etcd.py)
- [etcd 3.6 transport security model](https://etcd.io/docs/v3.6/op-guide/security/)
- [etcd 3.6 configuration options](https://etcd.io/docs/v3.6/op-guide/configuration/)
- [etcd 3.6 database snapshot procedure](https://etcd.io/docs/v3.6/tasks/operator/how-to-save-database/)
- [Kubernetes ports and protocols](https://kubernetes.io/docs/reference/networking/ports-and-protocols/)
- [Kubernetes security checklist](https://kubernetes.io/docs/concepts/security/security-checklist/)
- [Kubernetes NetworkPolicy documentation](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Kubernetes kubeadm implementation details](https://kubernetes.io/docs/reference/setup-tools/kubeadm/implementation-details/)
- [OpenSSL `s_client` documentation](https://docs.openssl.org/3.6/man1/openssl-s_client/)

## Issues Found
- The description of kube-hunter's passive etcd hunter had the protocol-selection order reversed. The hunter first tries the HTTP `/version` endpoint, selects HTTP if that succeeds, and otherwise retains HTTPS; it then requests `/version` and, after a successful version response, `/v2/keys`. The text now reflects the implementation and notes that the HTTPS requests disable certificate verification.
- The TLS-handshake discussion could imply that the shown `openssl s_client` command establishes certificate trust. By default, `s_client` reports verification errors but continues unless `-verify_return_error` is used. The text now distinguishes certificate inspection from a trust-validating client test.

## Review Notes
- The kube-hunter behavior described is tied to the current `main` branch. Retaining the recommendation to record an image digest or commit is important because future releases may change these probes.
- The `timeout` command is commonly available through GNU coreutils on Linux but is not specified by POSIX and may require separate installation on some Unix-like systems.
