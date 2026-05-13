# Validation Summary: How to Fix unable to retrieve the complete list of server APIs Error in Flux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux
- Kubernetes API discovery
- Kubernetes aggregation layer
- APIService resources
- Metrics Server
- EndpointSlice
- kubectl

## Sources Consulted
- Kubernetes API Aggregation Layer: https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/apiserver-aggregation/
- Kubernetes kubectl api-resources reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Service documentation for deprecated Endpoints API: https://kubernetes.io/docs/concepts/services-networking/service/
- Metrics Server official README: https://github.com/kubernetes-sigs/metrics-server
- Flux CLI reconcile kustomization reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The `kubectl get apiservices | grep -v Available` command only removed the header and did not filter unavailable APIService rows. Changed it to `kubectl get apiservices | grep -E 'False|Unknown'`.
- The stale-registration root cause incorrectly tied deleted CRDs to APIService registrations. Changed it to refer to partially removed aggregated API components, since CRDs and the aggregation layer are separate Kubernetes extension mechanisms.
- The CRD conversion webhook root cause implied that conversion webhook failures are the same APIService discovery failure. Clarified that conversion webhook failures can cause similar API-server errors when Flux reads or applies custom resources, but are separate from APIService registrations.
- The metrics-server TLS fix presented `--kubelet-insecure-tls` as a general TLS correction. Clarified that CA-signed kubelet serving certificates are preferred and the insecure flag is for test clusters.
- The backend-service check used the deprecated Endpoints API. Updated it to use EndpointSlices with the `kubernetes.io/service-name=metrics-server` label.
- The "Set APIService Availability Condition" fix was technically misleading because manually patching APIService status is not a valid remediation and unavailable APIServices still block discovery. Changed it to verification guidance that checks for remaining `False` or `Unknown` availability conditions.

## Review Notes
The Flux reconciliation command and the metrics-server installation URL match current official documentation. The post remains a concise troubleshooting guide and is technically valid after the corrections above.
