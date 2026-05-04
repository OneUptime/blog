# Validation Summary: How to Configure Private Google Access for IPv4 in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Platform (GCP)
- Private Google Access (PGA)
- VPC subnets
- gcloud CLI (`compute networks subnets`, `compute firewall-rules`, `compute ssh`)
- Identity-Aware Proxy (IAP) tunneling
- Cloud DNS / private VIPs (`private.googleapis.com`, `restricted.googleapis.com`)
- VPC Service Controls (referenced for comparison)

## Sources Consulted
- Google Cloud docs: Configure Private Google Access — https://cloud.google.com/vpc/docs/configure-private-google-access
- Google Cloud docs: Private Google Access overview — https://cloud.google.com/vpc/docs/private-google-access
- Google Cloud docs: Private Google Access for on-premises hosts (private/restricted VIPs) — https://cloud.google.com/vpc/docs/private-google-access-supported-services
- Google Cloud docs: `gcloud compute networks subnets update` reference
- Google Cloud docs: VPC Service Controls overview — https://cloud.google.com/vpc-service-controls/docs/overview

## Issues Found
1. **Swapped private VIP ranges.** The original DNS section labelled `199.36.153.8/30` as `restricted.googleapis.com` and `199.36.153.4/30` as `private.googleapis.com`. Per Google's documentation, the mapping is reversed: `private.googleapis.com` = `199.36.153.8/30`, `restricted.googleapis.com` = `199.36.153.4/30`. Fixed by rewriting the section with the correct mapping.

2. **Misleading claim about DNS resolution under PGA.** The post stated that enabling Private Google Access causes VMs to resolve `*.googleapis.com` to `199.36.153.x` addresses, with an `nslookup` example asserting the same. This is inaccurate — PGA by itself does not change DNS; `*.googleapis.com` continues to resolve to its public IPs and PGA only changes the network path. Resolution to the private VIPs (199.36.153.x) requires explicitly configuring Cloud DNS private zones to point to `private.googleapis.com` or `restricted.googleapis.com`. Rewrote the section and the `nslookup` comment to reflect the actual behaviour.

## Review Notes
- All `gcloud` commands and flags (`--enable-private-ip-google-access`, `--no-enable-private-ip-google-access`, `--tunnel-through-iap`, `--format="get(privateIpGoogleAccess)"`) are current and correct.
- The firewall rule's `--destination-ranges` includes `34.126.0.0/18` as an example public Google range. In production deployments aiming to allow egress only to public Google API IPs, the full set of Google's published IP ranges (via `goog.json` / `_cloud-netblocks.googleusercontent.com`) is much broader; `34.126.0.0/18` alone is illustrative and not exhaustive. Left as-is since the post presents it as one option alongside the private VIPs.
- The PGA vs VPC Service Controls comparison table is a fair high-level summary.
- The bash `while read NAME REGION` loop relies on gcloud's default tab/space-separated `value()` output and works correctly with the default IFS.
