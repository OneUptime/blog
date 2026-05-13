# Validation Summary: How to Secure Elasticsearch Using Cilium

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Kubernetes
- Elasticsearch
- Hubble
- HTTP L7 network policy
- eBPF

## Sources Consulted
- Cilium Layer 7 Policies documentation: https://docs.cilium.io/en/latest/security/policy/layer7/
- Cilium Kubernetes Network Policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Cilium Securing Elasticsearch documentation: https://docs.cilium.io/en/stable/security/elasticsearch/
- Cilium Layer 7 Protocol Visibility documentation: https://docs.cilium.io/en/stable/observability/visibility/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Cilium Elasticsearch demo app manifest: https://raw.githubusercontent.com/cilium/cilium/1.19.3/examples/kubernetes-es/es-sw-app.yaml
- Cilium Elasticsearch demo policy manifest: https://raw.githubusercontent.com/cilium/cilium/1.19.3/examples/kubernetes-es/es-sw-policy.yaml
- Elasticsearch Index API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/v9/operation/operation-index

## Issues Found
- The Elasticsearch deployment URL pointed to `examples/kubernetes-es/es-deploy.yaml`, which is not the Cilium Elasticsearch demo manifest. Changed it to the official Cilium `es-sw-app.yaml` manifest for Cilium 1.19.3.
- The policy examples selected Elasticsearch with `app: elasticsearch`, but the official Cilium demo service and backend pod use `component: elasticsearch`. Updated the endpoint selectors and Hubble filter to use `component: elasticsearch`.
- The example client labels and test pod names did not match the deployed Cilium Elasticsearch demo. Updated examples to use the official demo clients `empire-hq` and `outpost`.
- The document-write path example used a generic `POST` to `^/.*/_doc$`, which did not match the official Cilium Elasticsearch demo paths. Updated the example to use the demo's `PUT` path pattern for `troop_logs`.
- The L7 HTTP policy snippet was not a complete Kubernetes manifest even though the next command applies `elasticsearch-policy.yaml`. Added `apiVersion`, `kind`, and `metadata` so the snippet can be saved and applied.
- The introduction implied network policy was the only possible control. Clarified that Kubernetes is default-allow unless a network policy or Elasticsearch authentication and authorization blocks access.
- Added a prerequisite caveat that Cilium HTTP L7 inspection requires plaintext HTTP traffic, or Cilium TLS visibility for encrypted Elasticsearch traffic.

## Review Notes
The Cilium Elasticsearch demo currently uses an older Elasticsearch demo image, but it remains the official Cilium walkthrough for Elasticsearch-aware policy examples. For production Elasticsearch, pair Cilium network policy with Elasticsearch's built-in authentication, authorization, and TLS.
