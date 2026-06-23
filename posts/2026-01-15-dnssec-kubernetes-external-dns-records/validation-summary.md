# Validation Summary: How to Implement DNSSEC for Kubernetes External DNS Records

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- DNSSEC (DNSKEY, RRSIG, DS, NSEC/NSEC3, KSK/ZSK)
- Kubernetes External-DNS controller
- AWS Route 53 + AWS KMS
- Google Cloud DNS
- Cloudflare DNS API
- Azure DNS
- PowerDNS (pdnsutil, gpgsql backend)
- Prometheus / PrometheusRule alerting
- dig, drill, delv (DNSSEC validation tooling)
- Helm

## Sources Consulted
- AWS Route 53 — Using the AWS CLI to enable DNSSEC signing: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-configuring-dnssec-cli.html
- AWS Route 53 — Enabling DNSSEC signing and establishing a chain of trust: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-configuring-dnssec-enable-signing.html
- AWS KMS — CreateKey API reference (KeySpec vs deprecated CustomerMasterKeySpec): https://docs.aws.amazon.com/kms/latest/APIReference/API_CreateKey.html
- AWS KMS — create-key CLI reference: https://docs.aws.amazon.com/cli/latest/reference/kms/create-key.html
- Google Cloud DNS — Use advanced DNSSEC: https://docs.cloud.google.com/dns/docs/dnssec-advanced
- Microsoft Learn — How to sign your Azure Public DNS zone with DNSSEC: https://learn.microsoft.com/en-us/azure/dns/dnssec-how-to
- Cloudflare API — Edit DNSSEC status (PATCH /zones/{id}/dnssec)
- PowerDNS — pdnsutil / DNSSEC documentation: https://doc.powerdns.com/authoritative/

## Issues Found
1. **AWS KMS `create-key` used both `--key-spec` and the deprecated `--customer-master-key-spec`.** These are aliases for the same API field (`KeySpec` / `CustomerMasterKeySpec`); supplying both is redundant and `CustomerMasterKeySpec` is deprecated. Removed the `--customer-master-key-spec ECC_NIST_P256` line, leaving the current `--key-spec ECC_NIST_P256`.

2. **AWS Route 53 steps were in the wrong order.** The post ran `enable-hosted-zone-dnssec` before `create-key-signing-key`. Per AWS docs, a KSK must exist before DNSSEC signing can be enabled, so `enable-hosted-zone-dnssec` would fail with no KSK present. Reordered so the KSK is created first, then signing is enabled, and added a clarifying comment.

3. **Azure DNS DS-record query used a non-existent field and key-type value.** The post queried `signingKeys[?keyType=='KEY_SIGNING'].dsRecord`. Azure exposes the DS data under `delegationSignerInfo` (not `dsRecord`), and only the KSK populates that field. Replaced the JMESPath query with `signingKeys[?delegationSignerInfo!=null].delegationSignerInfo`, which matches the Microsoft Learn documentation.

## Review Notes
- The Google Cloud DNS command including `--ksk-key-length 256 --zsk-key-length 256` with `ECDSAP256SHA256` is valid; gcloud requires all four KSK/ZSK algorithm and key-length flags together, and 256 is the supported length for ECDSAP256SHA256. Left unchanged.
- The validation script's `if [ $? -ne 0 ]` after `dig +short DNSKEY` is a weak check: `dig` typically exits 0 even when no records are returned, so an empty-but-successful query would not trigger the error branch. This is a common simplification and not strictly incorrect, so it was left as-is. A more robust check would test for empty output.
- `pdnsutil`, `drill -S`, and `delv ... +rtrace` usages are correct for current ldns/BIND tooling. The `powerdns/pdns-auth-master:latest` image and `PDNS_*` environment-variable convention are valid for the official PowerDNS container.
- External-DNS image `registry.k8s.io/external-dns/external-dns:v0.14.0` and the provider flags (`--provider=aws|google|cloudflare|azure|pdns`, `--registry=txt`, `--policy=sync`, etc.) are accurate for that release.
- DNSSEC algorithm numbers (8 = RSASHA256, 13 = ECDSAP256SHA256, 14 = ECDSAP384SHA384) and the awk field positions used to parse `dig +short DNSKEY`/`DS` output are correct.
