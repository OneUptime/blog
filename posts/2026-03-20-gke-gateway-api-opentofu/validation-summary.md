# Validation Summary: How to Set Up GKE Gateway API with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes Gateway API (`Gateway`, `HTTPRoute`)
- OpenTofu / Terraform-style HCL
- HashiCorp Kubernetes provider (`kubernetes_manifest`)
- Google Cloud Load Balancing

## Sources Consulted
- GKE: Deploying Gateways — https://cloud.google.com/kubernetes-engine/docs/how-to/deploying-gateways
- GKE: Secure a Gateway — https://cloud.google.com/kubernetes-engine/docs/how-to/secure-gateway
- GKE: Gateway traffic management — https://cloud.google.com/kubernetes-engine/docs/concepts/traffic-management
- GKE: Deploy a multi-cluster Gateway for weighted traffic splitting — https://cloud.google.com/kubernetes-engine/docs/how-to/deploy-gateway-traffic-splitting
- GKE: Gateway security — https://cloud.google.com/kubernetes-engine/docs/concepts/gateway-security
- Google provider docs for `google_container_cluster` — https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/container_cluster.html.markdown
- Kubernetes provider docs for `kubernetes_manifest` — https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/templates/resources/manifest.md.tmpl

## Issues Found
1. **Incorrect OpenTofu/Kubernetes provider workflow**: The post implied OpenTofu could create the GKE cluster and apply `kubernetes_manifest` resources in the same flow. The Kubernetes provider documents that `kubernetes_manifest` requires API access during planning time, so the cluster must already exist and the Gateway API CRDs must be installed before these resources can be planned or applied. Fixed the Overview and Step 2 comment to make the staged, separate-apply workflow explicit.

2. **Cluster example removed the only node pool**: The `google_container_cluster` example set `remove_default_node_pool = true` but did not define any replacement `google_container_node_pool` resources. The Google provider documents that this pattern is for configurations that create separate node-pool resources. Removed `remove_default_node_pool` so the example remains functional as shown.

3. **Gateway TLS example omitted the Secret prerequisite**: The Gateway example referenced `tls-secret` without clarifying that it must already exist as a Kubernetes TLS Secret. Updated the comment and simplified the `certificateRefs` example to match GKE's documented Secret-backed Gateway pattern.

4. **Canary example used a conflicting second `HTTPRoute`**: The original Step 4 created a second `HTTPRoute` on the same Gateway without matching hostnames or paths, which would overlap with the earlier route instead of demonstrating GKE's documented weighted traffic-splitting pattern for a single route. Replaced it with an updated `web_app_route` example that preserves the `/api` rule and applies weighted `backendRefs` on the `"/"` rule.

## Review Notes
- GKE documentation currently notes that enabling Gateway API can take time to reconcile and install the CRDs. The post now reflects that Gateway and HTTPRoute resources should be applied only after that reconciliation is complete.
- The examples remain partial snippets and assume that the VPC, subnet, Kubernetes provider configuration, TLS Secret, and backend Services already exist.
