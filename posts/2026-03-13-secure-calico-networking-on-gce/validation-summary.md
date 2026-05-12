# Validation Summary: Secure Calico Networking on Google Compute Engine

## Status
validated

## Post Type
Guide / Tutorial (security hardening recipes)

## Technologies Covered
- Calico (Project Calico, GlobalNetworkPolicy)
- Kubernetes (NetworkPolicy, `networking.k8s.io/v1`)
- Google Compute Engine (GCE)
- GCP Hierarchical Firewall Policies (`gcloud compute firewall-policies`)
- GCP VPC Firewall Rules (`gcloud compute firewall-rules`)
- GCP VPC Service Controls
- GCP IAM Service Accounts
- Google Cloud Armor (`gcloud compute security-policies`)
- GCE Metadata Server (link-local 169.254.169.254)

## Sources Consulted
- gcloud compute firewall-policies reference — https://cloud.google.com/sdk/gcloud/reference/compute/firewall-policies
- Hierarchical firewall policies overview — https://cloud.google.com/firewall/docs/firewall-policies
- gcloud compute firewall-rules create — https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create (verified `--target-service-accounts` and `--source-service-accounts`)
- Calico GlobalNetworkPolicy reference — https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy (verified `nets` field accepts CIDRs only)
- Cloud Armor custom rules language reference — https://cloud.google.com/armor/docs/rules-language-reference (verified `origin.asn` attribute)
- gcloud compute security-policies — https://cloud.google.com/sdk/gcloud/reference/compute/security-policies (verified `deny-403` action)
- GCE metadata server documentation — https://cloud.google.com/compute/docs/metadata/overview (confirmed 169.254.169.254 endpoint)
- Kubernetes NetworkPolicy reference — https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#networkpolicy-v1-networking-k8s-io

## Issues Found

1. **Section 1 — Hierarchical Firewall Policy creation missing scope flag.**
   The original command `gcloud compute firewall-policies create k8s-baseline-policy --description ...` was missing the required `--folder` (or `--organization`) flag. Hierarchical firewall policies cannot be created without specifying an organization or folder scope. Since the surrounding prose explicitly states "Create a firewall policy at the folder level", I added `--folder FOLDER_ID` as a placeholder so the command is well-formed and matches the narrative.

2. **Section 2 — Invalid CIDR in Calico GlobalNetworkPolicy `nets` field.**
   The original policy listed `metadata.google.internal/32` alongside `169.254.169.254/32` in the `nets` array. Calico's `nets` field accepts only CIDR notation (IP/prefix), not DNS hostnames — `metadata.google.internal/32` would be rejected as an invalid CIDR by the API server / calicoctl. Additionally, `metadata.google.internal` resolves to `169.254.169.254`, so it would have been redundant even if Calico supported hostname matching here. I removed the offending entry, keeping `169.254.169.254/32` which fully covers the GCE metadata endpoint.

## Review Notes
- The `gcloud compute firewall-policies rules create` invocations use `--layer4-configs all` and `--layer4-configs tcp:22`. Both are valid values per the gcloud reference (the `all` protocol keyword is accepted).
- Section 4 uses both `--target-service-accounts` and `--source-service-accounts` on `gcloud compute firewall-rules create`. These flags are valid and a common pattern for service-account-based segmentation; note that source and target service accounts are mutually exclusive with network-tag-based source/target flags on the same rule (per gcloud reference) — fine here.
- Section 5's `NetworkPolicy` uses `apiVersion: networking.k8s.io/v1`, which is the stable Kubernetes API and is enforced by Calico — correct.
- The Cloud Armor example in Section 6 uses ASN `1234` as a sample; readers should substitute a real abuser ASN. `origin.asn` is the documented Cloud Armor attribute, and `deny-403` is a supported action. Correct as written.
- Cloud Armor security policies are intended for HTTP(S) Load Balancer / external Application Load Balancer backends rather than Kubernetes ingress at the pod layer — readers should attach the policy to the backend service used by their GKE/self-managed ingress; the post does not show the attachment step, but the policy creation commands themselves are correct.
