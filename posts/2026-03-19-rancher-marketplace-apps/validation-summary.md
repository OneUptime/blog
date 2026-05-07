# Validation Summary: How to Deploy Apps from the Rancher Marketplace

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Kubernetes
- Helm
- Rancher Monitoring
- Rancher Logging
- Rancher Istio
- Bitnami PostgreSQL Helm chart
- cert-manager
- Let's Encrypt ACME

## Sources Consulted
- Rancher Helm Charts and Apps: https://ranchermanager.docs.rancher.com/v2.11/how-to-guides/new-user-guides/helm-charts-in-rancher
- Rancher Enable Monitoring: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-alerting-guides/enable-monitoring
- Rancher Built-in Dashboards: https://ranchermanager.docs.rancher.com/v2.11/integrations-in-rancher/monitoring-and-alerting/built-in-dashboards
- Rancher Logging integration: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/logging
- Rancher Outputs and ClusterOutputs: https://ranchermanager.docs.rancher.com/v2.13/integrations-in-rancher/logging/custom-resource-configuration/outputs-and-clusteroutputs
- Rancher Istio: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/istio
- Rancher Istio on RKE2/K3s: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/istio/configuration-options/install-istio-on-rke2-cluster
- Bitnami PostgreSQL chart README: https://github.com/bitnami/charts/blob/main/bitnami/postgresql/README.md
- cert-manager Helm installation docs: https://cert-manager.io/docs/installation/helm/
- cert-manager HTTP01 solver docs: https://cert-manager.io/docs/configuration/acme/http01/

## Issues Found
- The introduction and chart source description implied built-in community apps and used incorrect source labels. I updated this to match Rancher's documented chart sources: `Rancher`, `Partners`, and custom repositories added by the user.
- The Rancher Logging section treated log outputs as Helm chart install values and configured them before the chart was installed. I replaced that with a valid post-install `ClusterOutput` and `ClusterFlow` example in `cattle-logging-system`, which matches Rancher's logging operator model.
- The Istio section omitted two version-sensitive caveats from Rancher's current docs. I added that Rancher-Istio is deprecated in Rancher v2.12.0 and later, and noted the extra CNI plus overlay requirements for RKE2 and K3s installs.
- The Bitnami PostgreSQL example enabled `readReplicas` without setting `architecture: replication`. I added `architecture: replication` and an explicit `auth.replicationPassword` so the example is consistent with the current chart's replication configuration.
- The cert-manager install example used the older `installCRDs` value and the ACME solver example used `class: nginx`. I updated these to `crds.enabled: true` and `ingressClassName: nginx`, which match current cert-manager documentation.
- The summary said the marketplace "keeps charts updated," which overstates Rancher's behavior. I changed this to say Rancher surfaces chart updates from configured repositories, which is the accurate behavior.

## Review Notes
- The Jetstack HTTP repository at `https://charts.jetstack.io` is still valid, but current cert-manager documentation recommends OCI charts as the source of truth. The post's Rancher UI flow remains workable because Rancher supports standard Helm repositories.
- Rancher-Istio is still documented and can still appear in Rancher, but for Rancher v2.12.0 and later it is explicitly marked deprecated. New deployments should take that into account.
