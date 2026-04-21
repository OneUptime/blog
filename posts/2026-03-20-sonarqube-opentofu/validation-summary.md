# Validation Summary: How to Deploy SonarQube with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform HCL
- Terraform Helm provider
- Terraform Kubernetes provider
- Kubernetes namespaces, DaemonSets, Ingress, and container images
- Helm
- SonarQube Server Helm chart
- Bitnami PostgreSQL Helm chart
- cert-manager annotations
- NGINX Ingress

## Sources Consulted
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu `yamlencode` function: https://opentofu.org/docs/language/functions/yamlencode/
- SonarQube Helm chart customization docs: https://docs.sonarsource.com/sonarqube-server/server-installation/on-kubernetes-or-openshift/customizing-helm-chart/
- SonarQube Helm chart 10.4.1+2389 chart archive, values, and templates: https://github.com/SonarSource/helm-chart-sonarqube/releases/download/sonarqube-10.4.1-sonarqube-dce-10.4.1/sonarqube-10.4.1+2389.tgz
- Bitnami PostgreSQL chart 13.4.4 values and templates: https://charts.bitnami.com/bitnami/postgresql-13.4.4.tgz
- SonarQube Server Linux pre-installation requirements: https://docs.sonarsource.com/sonarqube-server/2025.4/server-installation/pre-installation/linux/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes image registry migration notice: https://kubernetes.io/blog/2023/03/10/image-registry-redirect/
- SonarQube Server webhooks documentation: https://docs.sonarsource.com/sonarqube-server/2025.4/project-administration/webhooks/
- SonarQube Server quality gates documentation: https://docs.sonarsource.com/sonarqube-server/quality-standards-administration/managing-quality-gates/introduction-to-quality-gates

## Issues Found
- The HCL configured the Helm provider but not the Kubernetes provider, even though the snippet creates `kubernetes_namespace` and `kubernetes_daemon_set_v1` resources. Added a matching `provider "kubernetes"` block using the same cluster endpoint, CA certificate, and token variables.
- The SonarQube chart ingress values used `hosts[].paths = ["/"]`, but the pinned SonarQube chart expects `hosts[].path`. Changed the value to `path = "/"` so the chart renders the intended Ingress path.
- The ingress class was configured with the deprecated `kubernetes.io/ingress.class` annotation. Replaced it with the SonarQube chart's `ingressClassName = "nginx"` value, which renders `spec.ingressClassName`.
- The chart values used deprecated `jvmOpts` and `jvmCeOpts`. Replaced them with `sonarProperties` keys `sonar.web.javaOpts` and `sonar.ce.javaOpts`, which the pinned chart supports and maps into SonarQube JVM settings.
- The DaemonSet used `k8s.gcr.io/pause:3.9`. Kubernetes has moved official images to `registry.k8s.io`, and the legacy registry is frozen and being phased out. Updated the image to `registry.k8s.io/pause:3.9`.
- The persistence comment described the volume as "SonarQube data"; in this chart it primarily persists SonarQube's bundled Elasticsearch indexes while durable application data lives in PostgreSQL. Updated the comment to avoid implying the database data is stored there.

## Review Notes
- The SonarQube chart version `10.4.1+2389`, Bitnami PostgreSQL chart version `13.4.4`, and provider constraints are valid but old. Future refreshes should consider newer chart/provider versions and retest values because recent SonarQube chart docs use different JDBC key names.
- The SonarQube chart already includes an `initSysctl` mechanism for `vm.max_map_count`, `fs.file-max`, `nofile`, and `nproc`; the separate DaemonSet can work but is redundant unless the deployment intentionally centralizes node tuning outside the application release.
- The example still passes the database password directly through Helm values, which can expose it in OpenTofu state and Helm release data. For production, prefer Kubernetes secrets and the chart's `jdbcSecretName` / `jdbcSecretPasswordKey` settings.
