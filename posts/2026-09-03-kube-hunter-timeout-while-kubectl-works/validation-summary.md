# Validation Summary: Why Does kube-hunter Time Out While kubectl Works? Troubleshooting DNS, Routing, and API Endpoint Access

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- Kubernetes and `kubectl`
- kube-hunter
- DNS (A and AAAA resolution)
- IP routing, firewalls, proxies, and Kubernetes NetworkPolicy
- TLS and OpenSSL
- Kubernetes API authentication and authorization
- Amazon EKS private API endpoints
- Azure Kubernetes Service private clusters and Azure Private Link
- Google Kubernetes Engine control-plane endpoints and network isolation

## Sources Consulted

- [kube-hunter argument parser](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/conf/parser.py)
- [kube-hunter port discovery implementation](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/discovery/ports.py)
- [kube-hunter documentation](https://github.com/aquasecurity/kube-hunter/blob/main/docs/index.md)
- [Kubernetes API health endpoints](https://kubernetes.io/docs/reference/using-api/health-checks/)
- [Kubernetes troubleshooting kubectl](https://kubernetes.io/docs/tasks/debug/debug-cluster/troubleshoot-kubectl/)
- [Kubernetes authentication](https://kubernetes.io/docs/reference/access-authn-authz/authentication/)
- [Kubernetes authorization](https://kubernetes.io/docs/reference/access-authn-authz/authorization/)
- [OpenSSL `s_client` documentation](https://docs.openssl.org/3.0/man1/openssl-s_client/)
- [Amazon EKS cluster API endpoint access](https://docs.aws.amazon.com/eks/latest/userguide/config-cluster-endpoint.html)
- [Private Azure Kubernetes Service clusters](https://learn.microsoft.com/en-us/azure/aks/private-clusters)
- [GKE network isolation](https://cloud.google.com/kubernetes-engine/docs/how-to/latest/network-isolation)

## Issues Found
No technical issues found.

## Review Notes
The kube-hunter timeout details are revision-sensitive. At validation time, the upstream `main` branch defines `--network-timeout` with a 5-second default and `--num-worker-threads` with an 800-thread default, while port discovery independently applies a 1.5-second socket timeout and probes the fixed port list stated by the linked source. The post appropriately advises pinning the revision because these implementation details can change.
