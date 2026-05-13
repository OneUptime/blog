# Validation Summary: How to Deploy OpenSearch with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenSearch
- OpenSearch Helm chart
- Flux CD HelmRelease and Kustomization
- Kubernetes StatefulSet, Secret, Namespace, Job, and PersistentVolumeClaim storage
- OpenSearch Security plugin TLS and audit logging
- OpenSearch Index State Management
- kubectl and curl

## Sources Consulted
- OpenSearch Helm installation documentation: https://docs.opensearch.org/latest/install-and-configure/install-opensearch/helm/
- OpenSearch Helm chart repository and chart values: https://github.com/opensearch-project/helm-charts/tree/main/charts/opensearch
- OpenSearch Helm chart 2.23.0 metadata and values: https://github.com/opensearch-project/helm-charts/tree/opensearch-2.23.0/charts/opensearch
- Flux HelmRelease v2 documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- OpenSearch ISM policy documentation: https://docs.opensearch.org/latest/im-plugin/ism/policies/
- OpenSearch ISM API documentation: https://docs.opensearch.org/latest/im-plugin/ism/api/
- OpenSearch audit log storage documentation: https://docs.opensearch.org/latest/security/audit-logs/storage-types/
- OpenSearch Software Foundation information: https://opensearch.org/foundation/

## Issues Found
- The introduction said OpenSearch is maintained by AWS and the community and is API-compatible with Elasticsearch 7.x. Updated this to reference the OpenSearch Software Foundation under the Linux Foundation and narrowed the compatibility statement to Elasticsearch 7.10-era compatibility.
- The guide claimed to deploy a production-grade cluster and set up an Ingress, but the manifests use demo certificates, a plaintext Secret example, and do not include an Ingress resource. Updated the wording to match the actual manifests and production caveats.
- The memory prerequisite listed 6 GiB. Updated it to 8 GiB to match the official OpenSearch Helm chart recommendation for the default three-node deployment.
- The Helm values comment described `opensearchJavaOpts` as the OpenSearch version. Corrected the comment to JVM heap size.
- The example admin password was likely too weak for OpenSearch 2.12+ demo security password requirements. Replaced it with a stronger generated example and updated the verification commands.
- The ISM rollover example created only a policy and did not configure the required rollover alias/template setup. Updated the Job to create an ISM template for `logs-*`, configure `plugins.index_state_management.rollover_alias`, and create the initial write index alias.
- The text called the Kubernetes Job an init Job. Updated it to "one-time Kubernetes Job" for accuracy.

## Review Notes
The Flux `HelmRepository`, `HelmRelease` v2, and `Kustomization` API versions are current. The post pins OpenSearch chart version `2.23.0`, which maps to OpenSearch app version `2.16.0`; newer chart versions exist, but the pinned version is valid and not inherently incorrect.
