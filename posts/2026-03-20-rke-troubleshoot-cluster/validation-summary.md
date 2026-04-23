# Validation Summary: How to Troubleshoot RKE Cluster Issues

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- RKE / RKE1
- Kubernetes
- Rancher
- Docker
- etcd and etcdctl
- kubectl
- Linux networking and system diagnostics
- OpenSSL certificate inspection

## Sources Consulted
- RKE1 Default Kubernetes Services: https://rke.docs.rancher.com/config-options/services
- RKE1 Certificate Management: https://rke.docs.rancher.com/cert-mgmt
- RKE1 SSH Connectivity Errors: https://rke.docs.rancher.com/troubleshooting/ssh-connectivity-errors
- RKE1 Provisioning Errors and EOL notice: https://rke.docs.rancher.com/troubleshooting/provisioning-errors
- RKE upstream architecture notes: https://github.com/rancher/rke/blob/release/v1.8/docs/architecture.md
- RKE upstream util command source: https://github.com/rancher/rke/blob/release/v1.8/cmd/util.go
- RKE upstream service/container constants: https://github.com/rancher/rke/blob/release/v1.8/services/services.go
- Kubernetes ComponentStatus API reference: https://kubernetes.io/docs/reference/kubernetes-api/cluster-resources/component-status-v1/
- Kubernetes API health endpoints: https://kubernetes.io/docs/reference/using-api/health-checks/
- Kubernetes deprecated API migration guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- etcd cluster status guide: https://etcd.io/docs/v3.5/tutorials/how-to-check-cluster-status/
- etcd maintenance guide: https://etcd.io/docs/v3.5/op-guide/maintenance/
- Docker container CLI reference: https://docs.docker.com/reference/cli/docker/container/

## Issues Found
- The post treated RKE as current without noting RKE1's end-of-life status. Added a concise RKE1/EOL caveat in the introduction.
- `kubectl get componentstatuses` uses the deprecated Kubernetes `ComponentStatus` API. Replaced it with `kubectl get --raw='/readyz?verbose'` and `kubectl get --raw='/livez?verbose'`.
- Event sorting used the deprecated `.lastTimestamp` field. Changed it to `.metadata.creationTimestamp`.
- The kubelet API connectivity check used `docker exec kubelet curl`, which depends on tools being present inside the kubelet container. Changed it to a host-level `curl` against the local API endpoint.
- The CNI log command used `docker logs canal-node`, but Canal runs as Kubernetes pod containers rather than a Docker container named `canal-node`. Replaced it with `kubectl logs` commands for the Canal `calico-node` and `kube-flannel` containers.
- The Calico interface check used `ip addr show cali*`, which can fail or print misleading output when shell globbing does not match. Replaced it with a link listing filtered for common Flannel/Calico interfaces.
- etcd defragmentation was shown as if it covered the whole cluster. Clarified that the command defragments the local member and should be repeated on each etcd node.
- Certificate inspection attempted every `*.pem`, including private key files. Changed it to skip `*-key.pem` files and use `sudo` for node certificate paths.
- The kubectl certificate comment implied it checked all cluster certificates. Reworded it to describe the kubeconfig/API server TLS path it actually validates.
- The DNS test pod did not attach to show `nslookup` output and used an unpinned BusyBox image. Updated it to `busybox:1.36` with `--rm -it`.
- `rke util get-state --config cluster.yml` is not a valid RKE util subcommand. Replaced it with `rke util get-state-file --config cluster.yml`.
- The state file example referenced `cluster-rkestate.json`, but RKE's default state file is `cluster.rkestate`. Updated the inspection command accordingly.

## Review Notes
The corrected commands are accurate for RKE1 clusters using Docker and the default Canal/CoreDNS setup. Operators using a non-default RKE network plugin, custom pod/service CIDRs, or external etcd should adjust the plugin labels, CIDR filters, and etcd certificate/endpoint paths accordingly. The RKE state file can contain sensitive cluster data, so it should be handled as a secret when collected for diagnostics.
