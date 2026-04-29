# Validation Summary: How to Set Up Microsegmentation with OpenTofu on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes NetworkPolicy
- OpenTofu / HCL
- HashiCorp Kubernetes provider
- Cilium and CiliumNetworkPolicy
- Prometheus

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Namespaces documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes Declare Network Policy task guide: https://kubernetes.io/docs/tasks/administer-cluster/declare-network-policy/
- HashiCorp Kubernetes provider docs overview: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs
- HashiCorp Kubernetes provider `kubernetes_manifest` resource: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/manifest
- Cilium policy on Kubernetes constructs: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- Cilium Layer 7 policy reference: https://docs.cilium.io/en/stable/security/policy/layer7/

## Issues Found
- The Step 1 comment said "Empty policy types mean deny all", which is not how Kubernetes describes default-deny behavior. A deny-all policy comes from selecting pods for `Ingress` and/or `Egress` while defining no allow rules for that direction. Updated the comment to match the Kubernetes NetworkPolicy model.
- The Step 2 service examples were incomplete under the post's namespace-wide default-deny egress baseline. Kubernetes requires both source egress and destination ingress to allow a pod-to-pod connection when both sides are isolated. Added `frontend_allow_api` and `api_allow_db` egress policies so the examples would work as described.
- The monitoring example said Prometheus could scrape "all namespaces", but the code only applied to `production` and `staging`, and only on TCP port `9090`. Updated the wording so it accurately describes selected namespaces and workloads listening on that port.
- The Cilium HTTP example used `path = "/api/orders"` for what reads like a single endpoint rule. Because Cilium treats HTTP paths as extended POSIX regexes, that pattern was made exact with `path = "/api/orders$"` and the comment was updated to describe both method and path control.
- The summary claimed the approach provided "true zero trust within Kubernetes". NetworkPolicy plus Cilium L7 filtering materially improves segmentation, but that phrase overstates what these controls alone guarantee. Softened the claim to a stronger zero-trust posture.

## Review Notes
- The post's use of the namespace label `kubernetes.io/metadata.name` is consistent with current Kubernetes documentation; the API server sets this immutable label on all namespaces.
- The post's use of `kubernetes_manifest` for `CiliumNetworkPolicy` is appropriate because Cilium policies are CRDs, and the Kubernetes provider documents `kubernetes_manifest` as the generic manifest resource for managing such objects.
- The DNS example still assumes the cluster DNS pods are labeled `k8s-app=kube-dns`, which is common but can vary by distribution. Readers may need to adjust that selector for their cluster.
- Local checks: `validation.json` was validated with `jq`. Runtime validation of the HCL against OpenTofu or Terraform was not possible in this workspace because neither `tofu` nor `terraform` is installed, and no Kubernetes cluster context is available here.
