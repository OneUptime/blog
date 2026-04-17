# Validation Summary: How to Implement Zero Trust Networking with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide — practical walkthrough with HCL (OpenTofu/Terraform) code examples illustrating zero trust networking patterns across AWS, Kubernetes, and Istio.

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS VPC security groups (`aws_security_group`, `aws_security_group_rule`)
- AWS IAM (policy conditions: `aws:SourceVpc`, `aws:SecureTransport`)
- AWS CloudTrail (`aws_cloudtrail`, S3 data events)
- Kubernetes NetworkPolicy (Terraform `kubernetes_network_policy`)
- Istio service mesh (`PeerAuthentication`, `AuthorizationPolicy`, mTLS STRICT mode)
- SPIFFE/SPIRE, IRSA, Workload Identity (referenced conceptually)
- Mermaid diagrams

## Sources Consulted
- Terraform AWS provider — `aws_cloudtrail`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudtrail
- Terraform AWS provider — `aws_security_group_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule
- AWS CloudTrail `DataResource` API reference: https://docs.aws.amazon.com/awscloudtrail/latest/APIReference/API_DataResource.html
- AWS global condition context keys: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- IAM JSON policy elements (Condition): https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition.html
- Terraform Kubernetes provider — `kubernetes_network_policy`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/network_policy
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio v1 APIs announcement: https://istio.io/latest/blog/2024/v1-apis/

## Issues Found
1. **CloudTrail S3 data resource ARN pattern** — The post used `values = ["arn:aws:s3:::"]` to mean "all S3 objects". The canonical AWS-documented form is `"arn:aws:s3"` (no trailing colons). Changed to `["arn:aws:s3"]` to match AWS/Terraform provider documentation.
2. **IAM condition key casing** — The post used `"aws:sourceVpc"` (lowercase `s`). While AWS IAM condition keys are case-insensitive at evaluation time, the canonical documented form is `"aws:SourceVpc"`. Updated to the canonical casing for consistency with AWS docs.

## Review Notes
- The `security.istio.io/v1beta1` API version used for `PeerAuthentication` and `AuthorizationPolicy` remains backwards-compatible, but `security.istio.io/v1` has been GA since Istio 1.22 and is the recommended version for new deployments. Not changed since `v1beta1` still works; readers on Istio 1.22+ may prefer to update the apiVersion to `v1`.
- The `aws_security_group_rule` resource is still supported, but the AWS provider now recommends `aws_vpc_security_group_ingress_rule` / `aws_vpc_security_group_egress_rule` (introduced in v5.x) for finer-grained state management and fewer race conditions. Not changed — the existing resource still functions correctly and is widely used.
- Port values as strings (e.g., `port = "8080"`) in `kubernetes_network_policy` are correct per the Terraform Kubernetes provider schema (the field is typed as a string to support named ports).
- All other HCL syntax, resource attribute names, Istio principal format (`cluster.local/ns/<ns>/sa/<sa>`), and conceptual explanations (default-deny, service identity over network location, STRICT vs PERMISSIVE mTLS, defense in depth) are accurate.
