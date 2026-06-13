# Validation Summary: How to Set Up K3s Production Cluster

## Status
validated

## Post Type
Tutorial / production deployment guide

## Technologies Covered
- K3s
- Kubernetes
- embedded etcd
- HAProxy
- Keepalived
- Flannel networking
- cert-manager
- NGINX Ingress Controller
- Kubernetes RBAC and Pod Security Standards
- Kubernetes NetworkPolicy
- External Secrets Operator
- Velero
- Prometheus, Grafana, and Alertmanager
- Rancher System Upgrade Controller

## Sources Consulted
- K3s High Availability Embedded etcd documentation: https://docs.k3s.io/datastore/ha-embedded
- K3s server CLI options: https://docs.k3s.io/cli/server
- K3s installation requirements and networking ports: https://docs.k3s.io/installation/requirements
- K3s networking services and network policy controller documentation: https://docs.k3s.io/networking/networking-services
- K3s etcd snapshot and restore documentation: https://docs.k3s.io/cli/etcd-snapshot
- K3s automated upgrades documentation: https://docs.k3s.io/upgrades/automated
- cert-manager installation documentation and releases: https://cert-manager.io/docs/installation/kubectl/ and https://cert-manager.io/docs/releases/
- Kubernetes Pod Security Admission and Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-admission/ and https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes deprecated API migration guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubernetes ingress-nginx retirement notice: https://github.com/kubernetes/ingress-nginx
- F5 NGINX Ingress Controller Helm installation documentation: https://docs.nginx.com/nginx-ingress-controller/install/helm/open-source/
- Velero releases and AWS plugin compatibility: https://github.com/velero-io/velero/releases and https://github.com/velero-io/velero-plugin-for-aws

## Issues Found
- The required ports table omitted UDP 51821 for Flannel WireGuard IPv6 and did not clarify that Flannel ports depend on the selected backend. Updated the table and UFW example to match K3s networking requirements.
- Additional server nodes joined through the first server IP even though the guide had already introduced a fixed load balancer address. Updated the join command to use the load balancer endpoint.
- The health check used `kubectl get componentstatuses`, which is obsolete in modern Kubernetes. Replaced it with the Kubernetes API `/readyz?verbose` readiness endpoint.
- The cert-manager install manifest pinned v1.14.0, which is no longer an appropriate current production recommendation. Updated the manifest URL to v1.20.2.
- The ingress section installed the retired community `kubernetes/ingress-nginx` controller using an old v1.9.0 manifest. Replaced it with the supported F5 NGINX Ingress Controller Helm installation path.
- The restricted security example used the default `nginx:alpine` image while dropping all capabilities, running as a non-root user, and keeping the root filesystem read-only. Updated it to use the unprivileged NGINX image on port 8080 and aligned the NetworkPolicy port.
- The Velero CLI and AWS plugin versions were outdated. Updated them to Velero v1.18.1 and `velero/velero-plugin-for-aws:v1.14.1`.
- The etcd restore sequence omitted K3s's reset-flag safety check after a cluster reset. Added a check before rejoining other servers.
- The K3s upgrade examples pinned the outdated v1.29.0+k3s1 release. Replaced it with an explicit supported-version placeholder and added comments explaining that operators should choose the next supported K3s version.
- The System Upgrade Controller install command omitted the CRD manifest. Updated it to apply both `crd.yaml` and `system-upgrade-controller.yaml`.

## Review Notes
The guide is technically relevant and broadly accurate after the fixes. Operators should still adapt storage, ingress exposure, certificate challenge type, backup storage, and version targets to their environment before using the commands in production.
