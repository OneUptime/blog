# Validation Summary: How to Deploy ELK Stack with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Flux CD HelmRepository, HelmRelease, and Kustomization resources
- Kubernetes Namespaces, Services, StatefulSets, Ingress, Secrets, and PVCs
- Elastic Helm charts 8.5.1
- Elasticsearch 8.5.1
- Logstash 8.5.1 pipelines and plugins
- Kibana 8.5.1

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `flux get helmreleases` reference: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Elastic Helm charts repository and 8.5.1 chart values/templates: https://github.com/elastic/helm-charts/tree/v8.5.1
- Elastic Helm charts README and maintenance notice: https://github.com/elastic/helm-charts
- Elastic Logstash HTTP input plugin documentation: https://www.elastic.co/docs/reference/logstash/plugins/plugins-inputs-http
- Elastic Logstash Elasticsearch output plugin documentation: https://www.elastic.co/docs/reference/logstash/plugins/plugins-outputs-elasticsearch
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The Elasticsearch chart values used `persistence.size`, which is not a valid storage-size value in the Elastic 8.5.1 Elasticsearch chart. Changed it to `volumeClaimTemplate.resources.requests.storage`.
- The Elasticsearch example disabled `xpack.security.enabled` in `esConfig` while the 8.5.1 chart enables security and TLS through generated environment variables and certificates by default. Removed the conflicting override and kept the secured chart defaults.
- The Logstash pipeline used a Beats input but the verification command sent an HTTP request with `curl`. Changed the pipeline to use the Logstash HTTP input so the curl test matches the configured protocol.
- The Logstash Elasticsearch output used unsecured HTTP with no authentication even though the corrected Elasticsearch chart deployment uses TLS and credentials. Updated the output to use HTTPS, the generated Elasticsearch credentials, and the generated CA certificate.
- The Logstash HelmRelease did not expose the custom input port as a container port or mount the Elasticsearch CA secret. Added `extraPorts`, `extraEnvs`, and a certificate secret mount.
- The Kibana HelmRelease pointed to Elasticsearch over HTTP, which conflicts with the Elastic 8.5.1 chart's secured defaults. Updated it to HTTPS.
- The Kibana Ingress used the deprecated `kubernetes.io/ingress.class` annotation. Replaced it with the chart-supported `ingress.className` value.
- The memory prerequisite said 6 GiB, but the manifests request about 8.5 GiB across Elasticsearch, Logstash, and Kibana. Updated the prerequisite to 9 GiB.

## Review Notes
The Elastic Helm charts used in the post are valid for version 8.5.1, but the upstream repository is archived and Elastic recommends ECK for running the Elastic Stack on Kubernetes. Future updates could consider an ECK-based version of this guide.
