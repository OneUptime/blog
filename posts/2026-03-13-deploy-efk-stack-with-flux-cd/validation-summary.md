# Validation Summary: How to Deploy EFK Stack with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository resources
- Kustomization resources
- Elasticsearch
- Fluentd
- Kibana
- Helm charts
- Kubernetes Ingress
- PersistentVolumeClaims

## Sources Consulted
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `flux get kustomizations` reference: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Elastic Helm charts repository and 8.5.1 chart values: https://github.com/elastic/helm-charts
- Elastic Stack Helm chart and ECK documentation: https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/managing-deployments-using-helm-chart
- Elasticsearch security settings documentation: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/security-settings
- Bitnami Fluentd Helm chart README and values: https://github.com/bitnami/charts/tree/main/bitnami/fluentd
- Fluentd Elasticsearch output plugin documentation: https://docs.fluentd.org/output/elasticsearch
- fluent-plugin-elasticsearch README: https://github.com/uken/fluent-plugin-elasticsearch
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes PersistentVolume documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/

## Issues Found
- The Fluentd `HelmRelease` referenced a `bitnami` `HelmRepository` that was not defined. Added the Bitnami HelmRepository to the source manifest.
- The Elasticsearch chart values used `persistence.size`, which is not a valid storage size key for the Elastic Elasticsearch 8.5.1 Helm chart. Replaced it with `volumeClaimTemplate.resources.requests.storage`.
- The Elasticsearch example disabled security and changed Kibana to HTTP, but the Elastic Kibana 8.5.1 chart expects the Elasticsearch credentials and CA secrets and runs a pre-install token job against a secure Elasticsearch endpoint. Kept Elasticsearch security enabled and configured Kibana to use HTTPS, the generated CA secret, and the generated credentials secret.
- The Fluentd chart version was outdated and no longer appears in the current Bitnami repository index. Updated it to chart version `7.2.5`.
- The Fluentd values placed `extraEnvVars` at the wrong level for the current Bitnami chart and did not actually configure an Elasticsearch output. Moved the environment variables under `forwarder`, added the Elasticsearch output plugin, mounted the Elasticsearch CA secret, and added a `fluentd-output.conf` that sends logs to Elasticsearch over HTTPS.
- The Kibana Ingress example used the legacy `kubernetes.io/ingress.class` annotation. Updated it to the chart's `ingress.className` value, which renders `spec.ingressClassName`.
- The Flux `Kustomization` health checks targeted Helm-managed Deployment and StatefulSet objects. Updated them to check the `HelmRelease` resources directly, matching Flux guidance for Kustomizations that contain HelmRelease objects.
- The best-practices text said Flux waits for StatefulSets. Updated it to say Flux waits for Helm releases, matching the corrected health checks.
- The post described the manifests as production patterns while using archived standalone Elastic Helm charts. Softened the claim and added a caveat that new production deployments should evaluate ECK.

## Review Notes
- The standalone Elastic Helm charts for Elasticsearch and Kibana are archived, but the pinned `8.5.1` charts still exist in the Elastic Helm repository. This post is technically valid as a pinned-chart example, with the added ECK caveat.
- The YAML examples were parsed successfully with PyYAML after the changes. No live Kubernetes cluster was available, so the manifests were not applied to a cluster.
