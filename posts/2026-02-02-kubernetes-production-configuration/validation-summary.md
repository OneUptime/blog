# Validation Summary: How to Configure Kubernetes for Production

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Kubernetes (Namespaces, ResourceQuota, LimitRange, RBAC, NetworkPolicy, Pod Security Standards, PDB, topology spread, HPA, VPA, StorageClass, StatefulSet, Ingress, Service)
- AWS EBS CSI driver (gp3, iops, throughput)
- NGINX Ingress Controller
- cert-manager
- Prometheus Operator (ServiceMonitor, PrometheusRule)
- Fluent Bit (Kubernetes filter, Elasticsearch output)
- External Secrets Operator (AWS Secrets Manager backend)
- PostgreSQL 15
- kubectl

## Sources Consulted
- Kubernetes official docs — Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes official docs — Ingress / IngressClass: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes official docs — Horizontal Pod Autoscaler: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
- Kubernetes official docs — Configure Service Accounts: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- AWS EBS CSI driver parameters: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/parameters.md
- AWS Load Balancer Controller annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.5/guide/service/annotations/
- External Secrets Operator deprecation policy: https://external-secrets.io/latest/introduction/deprecation-policy/
- Prometheus Operator API reference (ServiceMonitor / PrometheusRule)
- Fluent Bit `kubernetes` filter documentation
- cert-manager Ingress annotation reference

## Issues Found

1. **Storage class provisioner was incompatible with gp3/throughput parameters.** Both StorageClass examples used `provisioner: kubernetes.io/aws-ebs` (the in-tree provisioner) together with `type: gp3`, `iops`, and `throughput`. The in-tree provisioner never supported `gp3` or `throughput`; those parameters are only valid with the AWS EBS CSI driver. Updated both StorageClasses to `provisioner: ebs.csi.aws.com`.

2. **Missing markdown header.** The "Resource Management and Autoscaling" section was plain text with no `##` prefix, breaking the doc's heading structure. Added the missing `##`.

3. **Deprecated `kubernetes.io/ingress.class` annotation.** Replaced with `spec.ingressClassName: nginx`, the field-based mechanism that superseded the annotation in Kubernetes 1.18.

4. **Misleading AWS Load Balancer annotations on a `ClusterIP` Service.** `service.beta.kubernetes.io/aws-load-balancer-healthcheck-*` annotations are reconciled only for `type: LoadBalancer` Services and are silently ignored on `ClusterIP`. Removed them and added a comment clarifying that the Ingress controller fronts this service so `ClusterIP` is intentional.

5. **`external-secrets.io/v1beta1` API version.** The v1beta1 API was removed in External Secrets Operator v0.17.0; v1 is the GA version. Updated both `ClusterSecretStore` and `ExternalSecret` to `external-secrets.io/v1`.

6. **Awkward `annotations:` block in ServiceAccount.** The `annotations:` key was present but contained only comments (parsing as `null`), with `automountServiceAccountToken: false` at the document root. Although valid, it triggers lint warnings and is confusing. Removed the empty `annotations:` key while keeping the explanatory comments and the (correctly placed) top-level `automountServiceAccountToken` field.

## Review Notes
- The `cluster-reader` ClusterRole comment says "Explicitly deny access to secrets at cluster level" — RBAC is purely additive and cannot express deny, but the practical outcome (no access because no rule grants it) matches the author's intent, so left as-is.
- Pod Security Standards labels omit `pod-security.kubernetes.io/enforce-version`. This is valid: when the version label is absent, PSA evaluates against the `latest` profile. Worth noting that pinning a specific version (e.g. `v1.29`) is recommended for clusters that want reproducible behavior across upgrades.
- The `kubernetes.io/aws-ebs` in-tree plugin was removed in Kubernetes 1.27 (after CSI migration). Anyone targeting clusters older than that may still use the in-tree provisioner, but the gp3/throughput fix is correct for modern clusters.
- The HA deployment uses both `topologySpreadConstraints` (hostname, `ScheduleAnyway`) and `podAntiAffinity` (hostname, required). The two together are redundant but not incorrect — the required anti-affinity already guarantees one pod per node.
- Postgres 15 is still in support (EOL November 2027), so the image tag is fine for now but will eventually need refreshing.
