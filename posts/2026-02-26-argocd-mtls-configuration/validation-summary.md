# Validation Summary: How to Implement mTLS Configuration with ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD Applications, automated sync, sync options, and resource hooks
- Kubernetes Jobs, Secrets, service accounts, and kubectl JSONPath
- Istio PeerAuthentication, DestinationRule, mTLS modes, automatic mTLS, and custom CA certificates
- External Secrets Operator ExternalSecret resources
- Prometheus Operator PrometheusRule resources
- Prometheus queries for Istio telemetry

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio TLS configuration and automatic mTLS documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio plug-in CA certificates task: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD resource hooks documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/resource_hooks/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes JSONPath support documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- External Secrets Operator ExternalSecret documentation: https://external-secrets.io/latest/api/externalsecret/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The opening paragraph claimed every service-to-service communication is encrypted and authenticated. Updated it to specify workloads in the mesh, because Istio mTLS only applies to enrolled mesh traffic.
- The Istio mTLS modes description omitted that the documented API also has an inherited `UNSET` value. Reworded the sentence to describe the three explicit behavior modes used in the post.
- The mesh-wide PeerAuthentication text implied `istio-system` is always mesh-wide. Updated it to say mesh-wide policies belong in Istio's configured root namespace, which defaults to `istio-system`.
- Istio PeerAuthentication and DestinationRule examples used `security.istio.io/v1beta1` and `networking.istio.io/v1beta1`. Updated them to the current documented `v1` APIs.
- The namespace DestinationRule used `*.production.svc.cluster.local`, which is not a safe service-registry host example for Kubernetes services. Replaced it with a service-specific FQDN and adjusted the comment.
- The rollout text said "three-phase" while the diagram listed five phases. Reworded it to "phased rollout."
- The Argo CD hook used a fixed Job name with only `HookSucceeded`. Added `BeforeHookCreation` so the named hook can be recreated on later syncs, including after failed validation runs.
- The ExternalSecret example used `external-secrets.io/v1beta1`. Updated it to the current documented `external-secrets.io/v1` API.
- The monitoring example used a non-standard `envoy_ssl_connection_error_total` metric and grouped by a label that was not documented for that metric. Replaced it with a PrometheusRule using Istio's documented `istio_requests_total`, `istio_tcp_connections_closed_total`, `connection_security_policy`, and `destination_workload_namespace` labels.

## Review Notes
The DestinationRule examples are valid when explicit client TLS policy is needed, but Istio automatic mTLS commonly removes the need to define a DestinationRule for every in-mesh service. The pre-sync hook validates sidecar presence only; a production rollout should also verify service-to-service traffic paths, authorization policies, and workloads that intentionally run outside the mesh.
