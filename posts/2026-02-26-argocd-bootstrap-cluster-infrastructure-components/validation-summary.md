# Validation Summary: How to Bootstrap Cluster Infrastructure Components with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications and sync waves
- Kubernetes Namespaces, PriorityClasses, and StorageClasses
- Helm chart configuration
- ingress-nginx
- ExternalDNS
- cert-manager and ACME ClusterIssuers
- Sealed Secrets
- Vertical Pod Autoscaler
- kubectl and jq verification commands

## Sources Consulted
- Argo CD sync phases and waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Application specification and declarative setup: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/application-specification/ and https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Amazon EKS StorageClass / EBS CSI parameter documentation: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html
- ingress-nginx Helm chart documentation and values: https://github.com/kubernetes/ingress-nginx/blob/main/charts/ingress-nginx/README.md and https://raw.githubusercontent.com/kubernetes/ingress-nginx/helm-chart-4.9.1/charts/ingress-nginx/values.yaml
- ExternalDNS Helm chart documentation and values: https://kubernetes-sigs.github.io/external-dns/latest/charts/external-dns/ and https://raw.githubusercontent.com/kubernetes-sigs/external-dns/external-dns-helm-chart-1.14.3/charts/external-dns/values.yaml
- cert-manager Helm and HTTP01 documentation: https://cert-manager.io/v1.14-docs/installation/helm/ and https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager v1.14.4 chart values/templates: https://raw.githubusercontent.com/cert-manager/cert-manager/v1.14.4/deploy/charts/cert-manager/values.yaml
- Sealed Secrets chart values: https://raw.githubusercontent.com/bitnami-labs/sealed-secrets/helm-v2.14.2/helm/sealed-secrets/values.yaml
- Vertical Pod Autoscaler upstream documentation and Cowboysysop chart repository: https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler and https://cowboysysop.github.io/charts/index.yaml

## Issues Found
- The post implied Application sync-wave annotations alone order independent Argo CD Applications. Argo CD sync waves order resources within a sync operation, so I added the app-of-apps/parent Application assumption needed for deterministic child Application ordering.
- The description claimed the examples bootstrap CNI and CSI drivers, but the post only configures components such as namespaces, storage classes, DNS, and platform services. I narrowed the description and introductory wording to match the actual examples.
- The ExternalDNS values used the legacy `provider: aws` shape. I changed it to `provider.name: aws`, which is the current chart value shape for the referenced chart.
- The cert-manager Helm values set `priorityClassName` at the top level, which the v1.14.4 chart would ignore. I changed it to `global.priorityClassName`.
- The ClusterIssuer HTTP01 solver used `ingress.class`. For cert-manager versions that support `ingressClassName`, this is the recommended field for ingress-nginx, so I changed it to `ingress.ingressClassName: nginx`.

## Review Notes
The YAML snippets parse successfully with PyYAML. The local environment did not have `helm` or `kubectl` installed, so Helm chart fields and Kubernetes command/configuration behavior were checked against official documentation, chart source, and repository indexes instead of local CLI help.
