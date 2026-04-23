# Validation Summary: How to Rotate RKE2 Certificates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RKE2
- Kubernetes TLS certificates
- Kubernetes kubelet certificate rotation
- RKE2 certificate and etcd snapshot CLI commands
- Prometheus and Prometheus Operator alerting rules
- OpenSSL certificate inspection
- systemd service management

## Sources Consulted
- RKE2 Certificate Management: https://docs.rke2.io/security/certificates
- RKE2 Advanced Options and Configuration: https://docs.rke2.io/advanced
- RKE2 Backup and Restore: https://docs.rke2.io/datastore/backup_restore
- RKE2 Configuration Options: https://docs.rke2.io/install/configuration
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Cluster Access: https://docs.rke2.io/cluster_access
- Kubernetes kubelet certificate rotation: https://kubernetes.io/docs/tasks/tls/certificate-rotation/
- Kubernetes kubelet CLI reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Kubernetes kubelet TLS bootstrapping: https://kubernetes.io/docs/reference/access-authn-authz/kubelet-tls-bootstrapping/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus query operators: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
1. **Manual RKE2 rotation workflow was incorrect**: The post stated that `rke2 certificate rotate` stops RKE2 and restarts it automatically. Official RKE2 documentation shows stopping `rke2-server`, running `rke2 certificate rotate`, and starting `rke2-server` again. Fixed the command sequence and clarified that the command rotates client/server certificates, not CA certificates.
2. **Specific certificate rotation used unsafe CA file deletion**: The post recommended deleting `server-ca.crt` and `server-ca.key` from `/var/lib/rancher/rke2/server/tls`. RKE2 documentation warns not to overwrite the in-use TLS directory for CA rotation and documents `rke2 certificate rotate --service ...` for service certificates and `rke2 certificate rotate-ca` for CA certificates. Replaced the deletion example with the documented `--service` workflow.
3. **Automatic rotation description was incomplete**: The post described automatic certificate rotation as only a kubelet setting. Current RKE2 docs state that RKE2 client/server certificates are automatically renewed on startup when expired or within 120 days of expiration. Updated the text and kept kubelet client/serving rotation as a separate kubelet-specific configuration.
4. **Expiration threshold was outdated for current RKE2 releases**: The manual OpenSSL check used 90 days. Current RKE2 Certificate Management docs use 120 days for renewal and warning events in current releases. Updated the check to 120 days.
5. **Agent certificate update steps were unsafe**: The post advised deleting agent CA files. Official RKE2 documentation says agent certificates are renewed when `rke2-agent` starts, while CA rotation requires following `rotate-ca` guidance and updating secure-token nodes with the new token value when applicable. Removed the file deletion commands and replaced them with restart and CA-rotation guidance.
6. **kubeconfig CA explanation was inaccurate**: The post said the cluster CA may change after certificate rotation. Normal `rke2 certificate rotate` does not rotate CA certificates. Updated the comment to state that the admin client certificate may change, while the cluster CA changes only during CA rotation.
7. **Prometheus alert expression label matching was incomplete**: The rule combined `_count` series with a `histogram_quantile(... sum by (job, le) ...)` result without a vector matching modifier, which can fail because the two sides usually have different label sets. Added `and on(job)` based on Prometheus vector matching rules.

## Review Notes
- `rke2 etcd-snapshot save --name ...`, `/etc/rancher/rke2/rke2.yaml`, and replacing `127.0.0.1` for external kubeconfig access are consistent with RKE2 documentation.
- Kubelet `--rotate-certificates` and `--rotate-server-certificates` are valid kubelet flags, but upstream Kubernetes marks these flags deprecated in favor of kubelet configuration fields. RKE2 still supports passing kubelet flags through `kubelet-arg`.
- Kubelet serving certificate rotation requires the `RotateKubeletServerCertificate` feature gate and CSR approval. The feature gate is enabled by default in current Kubernetes, but CSR approval behavior should still be checked in production clusters.
- The `apiserver_client_certificate_expiration_seconds` metric is an ALPHA Kubernetes metric and observes client certificates used to authenticate to the API server; it is not a complete inventory of every certificate file on disk.
- RKE2 releases before the May 2025 release line used a 90-day renewal/warning threshold instead of 120 days. Releases before the January 2025 release line also had stricter ordering guidance for rotating certificates across etcd servers, control-plane servers, and agents.
