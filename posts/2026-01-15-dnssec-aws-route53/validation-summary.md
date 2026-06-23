# Validation Summary: How to Configure DNSSEC with AWS Route 53

## Status
validated

## Post Type
Tutorial / Step-by-step configuration guide

## Technologies Covered
- DNSSEC (Domain Name System Security Extensions)
- AWS Route 53 (public hosted zones, DNSSEC signing, KSK management)
- AWS KMS (asymmetric ECC_NIST_P256 keys, key policies)
- AWS CLI v2 (route53, route53domains, kms, logs, cloudwatch, sts)
- AWS CloudWatch Logs / Alarms (query logging, monitoring)
- DNS tooling: `dig`, `delv`, DNSViz, Verisign DNSSEC Debugger/Analyzer
- Domain registrars: Route 53, GoDaddy, Cloudflare, Namecheap, Squarespace

## Sources Consulted
- AWS Route 53 Developer Guide — Configuring DNSSEC signing: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-configuring-dnssec.html
- AWS Route 53 Developer Guide — KMS key and ZSK management: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-configuring-dnssec-zsk-management.html
- AWS Route 53 Developer Guide — Working with key-signing keys (KSKs): https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-configuring-dnssec-ksk.html
- AWS Route 53 Developer Guide — Enabling DNSSEC signing and establishing a chain of trust: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-configuring-dnssec-enable-signing.html
- AWS Route 53 pricing & billing: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/Route53Pricing.html and https://aws.amazon.com/route53/pricing/
- AWS Networking & Content Delivery Blog — Configuring DNSSEC signing and validation with Amazon Route 53: https://aws.amazon.com/blogs/networking-and-content-delivery/configuring-dnssec-signing-and-validation-with-amazon-route-53/
- Squarespace Help Center / Google Cloud Domains FAQ — Google Domains migration to Squarespace: https://support.squarespace.com/hc/en-us/articles/17131164996365-About-the-Google-Domains-migration-to-Squarespace
- RFC 4033/4034/4035 (DNSSEC) and DNSSEC algorithm 13 (ECDSAP256SHA256) / digest type 2 (SHA-256) background knowledge

## Issues Found
1. **Incorrect ZSK rotation interval.** The post stated Route 53 rotates the Zone Signing Key "approximately every 7 days." AWS documentation states ZSK rotation begins within 7–30 days of signing and repeats every 7–30 days. Changed the text to "on a regular schedule, every 7 to 30 days."

2. **Incorrect cost claim for DNSSEC signing.** The cost table listed "Route 53 DNSSEC Signing | $1.00/month per hosted zone." Route 53 does **not** charge an additional fee to enable DNSSEC signing; the costs come from the AWS KMS customer managed key and signing operations. Updated the table row to "No additional charge to enable signing," added a clarifying sentence, and revised the estimated added cost from "$2-5/month" to a more accurate "$1-3/month."

3. **Defunct registrar (Google Domains).** The post included step-by-step instructions for adding a DS record in "Google Domains," which was sold to Squarespace in 2023 and fully shut down/migrated by mid-2024 — it no longer exists. Replaced the section with "Squarespace Domains (formerly Google Domains)," noting the migration and giving the equivalent Squarespace steps.

4. **Mislabeled verification tool.** The post labeled `https://dnssec-analyzer.verisignlabs.com/` as the "ICANN DNSSEC Analyzer." This tool is operated by Verisign Labs, not ICANN. Renamed the entry to "Verisign DNSSEC Analyzer" (URL unchanged).

## Review Notes
- The core AWS CLI commands were verified and are correct, including: `aws kms create-key --key-spec ECC_NIST_P256 --key-usage SIGN_VERIFY`, `aws route53 create-key-signing-key`, `enable-hosted-zone-dnssec`, `get-dnssec` (including the `Status.ServeSignature` → `SIGNING` query and `KeySigningKeys[0].DSRecord`), `deactivate-key-signing-key`, `delete-key-signing-key`, `disable-hosted-zone-dnssec`, and `aws route53domains associate-delegation-signer-to-domain`.
- The KMS key policy is accurate: the `dnssec-route53.amazonaws.com` service principal with `kms:DescribeKey`, `kms:GetPublicKey`, and `kms:Sign` actions, the `aws:SourceAccount` / `aws:SourceArn` conditions, and the us-east-1 region requirement all match AWS guidance.
- DNSSEC fundamentals (algorithm 13 = ECDSAP256SHA256, digest type 2 = SHA-256, the KSK/ZSK two-tier hierarchy, DS record chain of trust, what DNSSEC does and does not protect, SERVFAIL on broken chains, and the safe disable ordering of "remove DS first, then disable signing") are all technically accurate.
- Minor portability caveat (left unchanged): the `sed -i '' "s/.../g"` command uses BSD/macOS syntax. On GNU/Linux, the equivalent is `sed -i "s/.../g"` (no empty-string argument). This is correct on macOS but would fail on Linux; consider noting the platform or using a portable form in a future revision.
- The `example.com` A record IP `93.184.216.34` is used purely as illustrative example output; this is fine for a tutorial even though the real example.com address has changed over time.
