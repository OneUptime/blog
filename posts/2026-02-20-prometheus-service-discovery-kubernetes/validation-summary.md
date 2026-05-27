# Validation Summary: How Prometheus Service Discovery Works in Kubernetes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus
- Kubernetes service discovery
- Prometheus scrape configuration
- Prometheus relabeling
- Kubernetes RBAC
- Prometheus HTTP API

## Sources Consulted
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/3.9/querying/api/
- Prometheus Kubernetes example configuration: https://raw.githubusercontent.com/prometheus/prometheus/main/documentation/examples/prometheus-kubernetes.yml
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Endpoints API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/endpoints-v1/
- Kubernetes component metrics documentation: https://kubernetes.io/docs/concepts/cluster-administration/system-metrics/
- OneUptime website: https://oneuptime.com

## Issues Found
- The post said Prometheus supports five Kubernetes service discovery roles, but listed six supported roles. Updated the count to six.
- The post described the `endpoints` role as the most common approach without noting that the Kubernetes Endpoints API is deprecated in Kubernetes v1.33+. Updated the table and endpoints-role text to recommend `endpointslice` for newer clusters.
- The `node` role table entry referred to node-exporter, but Prometheus `role: node` discovers Kubernetes nodes and is commonly used for kubelet/node metrics. Updated the wording.
- The kubelet scrape example used `bearer_token_file`; current Prometheus examples use `authorization.credentials_file`. Updated the snippet and adjusted the comments.
- The kubelet scrape comment said the `labelmap` rule replaced the target address, but the rule copies node labels. Updated the comment.
- The RBAC example did not include `discovery.k8s.io/endpointslices`, which is needed when using the `endpointslice` role discussed in the post. Added the EndpointSlice permission.
- The debugging command for "service discovery results before relabeling" used `/api/v1/targets/metadata`, which returns metric metadata. Updated it to use `/api/v1/targets?state=active` and show `discoveredLabels`.
- The conclusion recommended only pod or endpoints roles. Updated it to include `endpointslice`.

## Review Notes
The examples are conventional raw Prometheus configuration rather than Prometheus Operator `ServiceMonitor` or `PodMonitor` resources. That is technically valid, but teams using Prometheus Operator would usually express similar discovery behavior through operator-managed custom resources.
