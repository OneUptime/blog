# Validation Summary: How to Deploy Elasticsearch on Kubernetes with ECK Operator

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Elasticsearch
- Elastic Cloud on Kubernetes (ECK)
- Kubernetes
- kubectl
- Helm
- Kibana
- Kubernetes Services, Ingress, StorageClass, PersistentVolumeClaims, and NetworkPolicy
- Prometheus Elasticsearch Exporter
- Elasticsearch snapshot and restore
- Elasticsearch security users, roles, TLS, and secure settings

## Sources Consulted
- Elastic ECK overview and supported versions: https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s
- Elastic ECK YAML manifest installation guide: https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/install-using-yaml-manifest-quickstart
- Elastic ECK Helm installation guide: https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/install-using-helm-chart
- Elastic ECK accessing services guide: https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/accessing-services
- Elastic ECK request routing to Elasticsearch nodes: https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/requests-routing-to-elasticsearch-nodes
- Elastic ECK nodes orchestration and upgrades: https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/nodes-orchestration
- Elastic ECK volume claim templates: https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/volume-claim-templates
- Elastic ECK transport certificate settings: https://www.elastic.co/docs/deploy-manage/security/k8s-transport-settings
- Google Kubernetes Engine Persistent Disk CSI Driver documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/gce-pd-csi-driver
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Prometheus Community Elasticsearch Exporter README: https://github.com/prometheus-community/elasticsearch_exporter

## Issues Found
- The article used ECK 2.11.1 manifest URLs and Elasticsearch/Kibana 8.12 examples. Updated examples to current ECK 3.4.0 installation URLs and Elasticsearch/Kibana 9.4.2 versions to match current Elastic documentation.
- The prerequisite listed Kubernetes 1.25 or later, which is not accurate for current ECK 3.4 support. Updated it to state that the Kubernetes version must be supported by the selected ECK release and noted the current ECK 3.4 support range.
- The memory prerequisite required 4GB per node, while the development manifest requests 2Gi. Clarified that 2GB is for the development example and 4GB or more is for production workloads.
- The Ingress example claimed TLS termination while also using the NGINX SSL passthrough annotation. Removed the passthrough annotation so the example matches TLS termination with HTTPS upstream traffic.
- The StorageClass example used the older in-tree GCE PD provisioner. Updated it to the GKE Persistent Disk CSI provisioner, `pd.csi.storage.gke.io`.
- The upgrade section claimed zero downtime unconditionally. Adjusted the wording to reflect ECK's documented limitations and prerequisites for highly available clusters.
- The custom transport TLS example implied a normal certificate secret. Clarified that ECK expects a transport CA secret with `ca.crt` and `ca.key`, while the HTTP certificate secret uses `tls.crt` and `tls.key`.
- The NetworkPolicy examples selected namespaces with a non-standard `name` label. Updated them to use Kubernetes' standard immutable `kubernetes.io/metadata.name` namespace label.

## Review Notes
The guide remains a broad production-oriented tutorial. Some operational choices, such as using `curl -k` and `--es.ssl-skip-verify` for examples, are acceptable for quick testing but should be replaced with CA validation in hardened production environments.
