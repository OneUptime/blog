# Validation Summary: Monitor Calico etcd Certificate Generation

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Calico
- Kubernetes
- etcd TLS certificates
- x509-certificate-exporter
- Prometheus alerting and PromQL
- Grafana dashboards
- cert-manager metrics
- OpenSSL

## Sources Consulted
- Calico documentation, "Segmenting etcd on Kubernetes (basic)": https://docs.tigera.io/calico/latest/reference/etcd-rbac/kubernetes
- Calico documentation, "Generating certificates": https://docs.tigera.io/calico/latest/reference/etcd-rbac/certificate-generation
- x509-certificate-exporter README and Helm chart values: https://github.com/enix/x509-certificate-exporter
- x509-certificate-exporter metrics documentation: https://github.com/enix/x509-certificate-exporter/blob/main/docs/metrics.md
- cert-manager Prometheus metrics documentation: https://cert-manager.io/docs/devops-tips/prometheus-metrics/
- cert-manager API reference for Certificate Ready conditions: https://cert-manager.io/docs/reference/api-docs/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes Secret volume documentation: https://kubernetes.io/docs/concepts/storage/volumes/#secret

## Issues Found
- The post used `helm repo add enix https://charts.enix.io` and `enix/x509-certificate-exporter` with `secretsExporter.secrets[...]` values. Current x509-certificate-exporter documentation ships the chart as an OCI chart at `oci://quay.io/enix/charts/x509-certificate-exporter`, and the current chart uses filters such as `includeNamespaces`, `includeSecrets`, and `secretTypes`. Updated the Helm command accordingly.
- The examples used the Secret name `calico-etcd-certs`. Calico's current manifest/RBAC documentation uses `calico-etcd-secrets` with `etcd-ca`, `etcd-cert`, and `etcd-key`. Updated the Secret name throughout the post.
- The Prometheus metric examples used `namespace` as a label. x509-certificate-exporter's Kubernetes Secret metrics use labels such as `secret_namespace`, `secret_name`, and `secret_key`. Updated the sample metric and PromQL queries.
- The manual CronJob used the `alpine/openssl` image but called `kubectl`, which that image does not provide. It also required unnecessary Kubernetes API permissions. Reworked the CronJob to mount the Calico Secret directly and run `openssl x509` against the mounted certificate file.

## Review Notes
- The cert-manager readiness alert is technically valid for environments where Calico etcd certificates are represented as cert-manager `Certificate` resources. It is optional because manually managed Calico certificates will not emit cert-manager certificate metrics.
