# Validation Summary: How to Troubleshoot Kubernetes Service Endpoints Not Populating

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Kubernetes Services
- Kubernetes Endpoints and EndpointSlices
- Kubernetes readiness probes
- Kubernetes NetworkPolicy
- kubectl
- jq and yq
- Prometheus alerting
- kube-state-metrics

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Endpoints API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/endpoints-v1/
- Kubernetes readiness probe documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes Services, Load Balancing, and Networking documentation: https://kubernetes.io/docs/concepts/services-networking/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics endpoint metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/service/endpoint-metrics.md
- kube-state-metrics service metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/service/service-metrics.md
- kube-state-metrics changelog: https://github.com/kubernetes/kube-state-metrics/blob/main/CHANGELOG.md

## Issues Found
- The post described NetworkPolicies as a cause of endpoint population failure. NetworkPolicies control traffic flow and do not prevent Services from getting EndpointSlices or Endpoints, so the text was corrected to explain that they cause traffic failures after endpoints exist.
- The post referred to the Endpoints controller as the primary current controller. Kubernetes has used EndpointSlices as the stable default mechanism since Kubernetes 1.21, so the controller references were updated to EndpointSlice controller where appropriate.
- The label selector examples piped kubectl JSONPath map output into `jq`, which would not produce valid JSON. The examples now use `kubectl ... -o json | jq ...`.
- The validation script used the same invalid JSONPath-to-`jq` pattern and had unquoted shell variables. It now reads Service JSON, builds a real kubectl label selector with `jq`, and quotes resource names and namespaces.
- The NetworkPolicy namespace selector used a non-standard `name` label for namespaces. It now uses the standard `kubernetes.io/metadata.name` namespace label.
- The controller-manager log command used a hard-coded pod name. It now selects kube-controller-manager pods by label and limits recent log output.
- The EndpointSlice section said EndpointSlices show why endpoints are excluded. EndpointSlices include endpoint conditions, so the text now describes the `ready`, `serving`, and `terminating` conditions instead.
- The Prometheus examples used removed kube-state-metrics metrics `kube_endpoint_address_available`. They now use the current `kube_endpoint_address` metric and align endpoint labels to Service labels with `label_replace`.
- The second alert compared Deployment replicas directly to endpoint counts without a reliable Service-to-Deployment label mapping. It was replaced with an alert for not-ready endpoints.

## Review Notes
- The post still uses `kubectl get endpoints` for quick troubleshooting because that command remains common, but Kubernetes documentation now treats EndpointSlices as the scalable source of truth and the Endpoints API is deprecated in Kubernetes v1.33+.
- kube-state-metrics v2.18+ enables EndpointSlice metrics by default and disables Endpoint metrics unless configured otherwise. The monitoring example is valid for installations that expose Endpoint metrics; future improvements could show a fuller EndpointSlice-based PromQL rule with label allowlisting.
