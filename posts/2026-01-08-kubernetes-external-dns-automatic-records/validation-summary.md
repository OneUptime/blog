# Validation Summary: How to Configure External DNS for Automatic DNS Records in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes (Services, Ingress, RBAC, Deployments)
- ExternalDNS (kubernetes-sigs/external-dns)
- AWS Route53 (IAM, IRSA, eksctl)
- Cloudflare DNS
- Google Cloud DNS (gcloud)
- Azure DNS (az CLI, service principal)
- Helm
- Prometheus metrics
- cert-manager (referenced in complete example)

## Sources Consulted
- ExternalDNS official docs / annotations: https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/
- ExternalDNS policy implementation (`plan/policy.go`): https://github.com/kubernetes-sigs/external-dns/blob/master/plan/policy.go
- ExternalDNS FAQ: https://kubernetes-sigs.github.io/external-dns/latest/docs/faq/
- ExternalDNS Helm chart repo: https://kubernetes-sigs.github.io/external-dns/
- AWS Route53 IAM action references (route53:ChangeResourceRecordSets, ListHostedZones, etc.)
- Cloudflare API token scopes (Zone:Read, DNS:Edit)
- GCP IAM `roles/dns.admin` and Azure "DNS Zone Contributor" role references

## Issues Found
- **Incorrect annotation comment**: The `external-dns.alpha.kubernetes.io/target` annotation was labeled `# Set specific record type`. This is inaccurate — the `target` annotation manually specifies the target value of the record, not the record type. ExternalDNS infers the record type from the target value (an IP produces an A record; a hostname produces a CNAME). Changed the comment to `# Manually set the target (IP creates an A record, hostname creates a CNAME)`.

## Review Notes
- The `--policy` values described (`sync`, `upsert-only`, `create-only`) are all valid. ExternalDNS also supports `update-only`, which the post omits, but omission is acceptable for an introductory guide; the three described are accurately characterized.
- The Service Annotations example deliberately lists two `external-dns.alpha.kubernetes.io/hostname` keys (single vs. multiple hostnames) within one annotation map. As literal YAML this is a duplicate key and would not apply as-is — but in context it is clearly an illustrative menu of available options, each preceded by an explanatory comment, rather than a deployable manifest. Left unchanged to preserve the author's intent and structure.
- The container image `registry.k8s.io/external-dns/external-dns:v0.14.0` is a valid, real tag. Readers should note newer versions exist; the pinned version is fine and works with all flags shown.
- The Helm repo URL, RBAC ClusterRole rules, Route53 IAM policy, Cloudflare `CF_API_TOKEN` env var and token scopes, GCP `roles/dns.admin`, Azure service principal/`azure.json` format, Prometheus metrics names (`external_dns_source_endpoints`, `external_dns_registry_endpoints`, `external_dns_controller_last_sync_timestamp_seconds`), default metrics address `:7979`, and CLI flags (`--interval`, `--min-event-sync-interval`, `--dry-run`, `--label-filter`, `--annotation-filter`, `--zone-id-filter`, `--aws-zone-type`, `--exclude-domains`) all verified as correct and current.
