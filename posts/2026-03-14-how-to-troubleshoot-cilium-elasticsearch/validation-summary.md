# Validation Summary: Troubleshooting Elasticsearch Integration in Cilium

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Kubernetes
- Hubble
- Elasticsearch
- `kubectl`, `cilium`, `cilium-dbg`, and `jq`

## Sources Consulted
- Cilium Endpoint Lifecycle documentation: https://docs.cilium.io/en/stable/security/policy/lifecycle/
- Cilium policy troubleshooting documentation: https://docs.cilium.io/en/stable/security/policy/troubleshooting/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Cilium API reference for endpoint list JSON fields: https://docs.cilium.io/en/stable/api/
- Cilium Layer 7 policy documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium Securing Elasticsearch documentation: https://docs.cilium.io/en/stable/security/elasticsearch/
- Cilium Kubernetes policy namespace documentation: https://docs.cilium.io/en/stable/security/policy/kubernetes/
- Cilium command cheatsheet and `cilium-dbg` command reference: https://docs.cilium.io/en/stable/cheatsheet/ and https://docs.cilium.io/en/stable/cmdref/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/

## Issues Found
- The endpoint policy-inspection command referenced `.status.labels.id`, which is not the current field for endpoint identity labels in Cilium endpoint JSON. I changed the command to use `.status.identity.labels`, matching the Cilium endpoint API reference and CiliumEndpoint status model.

## Review Notes
- The CiliumNetworkPolicy examples use valid `cilium.io/v2` policy structure and valid HTTP L7 rule syntax. For Elasticsearch deployments using TLS on port 9200, HTTP L7 visibility and enforcement require plaintext HTTP or Cilium TLS inspection; that caveat is outside the narrow troubleshooting commands shown in this post.
