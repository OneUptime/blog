# Validation Summary: How to Reduce Network Egress Costs on GCP Using Cloud CDN Private Google Access

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Platform networking and billing
- Cloud CDN
- Cloud Load Balancing
- Cloud Storage
- Private Google Access
- Cloud DNS
- VPC Network Peering
- Cloud Interconnect
- Storage Transfer Service
- BigQuery billing export
- Flask HTTP cache headers

## Sources Consulted
- Google Cloud CDN pricing: https://cloud.google.com/cdn/pricing
- Google Cloud CDN cache locations: https://docs.cloud.google.com/cdn/docs/locations
- Google Cloud CDN caching overview: https://cloud.google.com/cdn/docs/caching
- Google Cloud Load Balancing metrics: https://cloud.google.com/load-balancing/docs/metrics
- Google Cloud VPC pricing: https://cloud.google.com/vpc/pricing
- Private Google Access overview: https://cloud.google.com/vpc/docs/private-google-access
- Configure Private Google Access: https://cloud.google.com/vpc/docs/configure-private-google-access
- Cloud Interconnect overview: https://cloud.google.com/network-connectivity/docs/interconnect/concepts/overview
- Cloud Interconnect pricing: https://cloud.google.com/network-connectivity/docs/interconnect/pricing
- `gcloud compute backend-buckets create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-buckets/create
- `gcloud compute backend-services update` reference: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- `gcloud compute forwarding-rules create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/forwarding-rules/create
- `gcloud compute interconnects create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/interconnects/create
- `gcloud dns record-sets create` reference: https://cloud.google.com/sdk/gcloud/reference/dns/record-sets/create
- Storage Transfer Service transfer creation docs: https://docs.cloud.google.com/storage-transfer/docs/create-transfers
- Storage Transfer Service pricing: https://cloud.google.com/storage-transfer/pricing
- Network Service Tiers overview and pricing: https://cloud.google.com/network-tiers/docs/overview and https://cloud.google.com/network-tiers/pricing

## Issues Found
- Cloud CDN cache locations were described as "over 150 edge locations." Google Cloud currently documents Cloud CDN as operating caches in more than 100 cache locations, so the wording was corrected.
- The Cloud CDN savings example treated cache hits as if they made most client egress nearly free. Cloud CDN still charges cache data transfer out, plus cache fill and request charges, so the example and pricing explanation were updated to match current pricing.
- The cache hit rate command used `gcloud compute backend-services get-health`, which reports backend health rather than cache hit rate. The text now says to use Cloud Monitoring request metrics grouped by the `cache_result` label.
- Private Google Access was described as eliminating egress charges for Google APIs and services. PGA provides private access for instances without external IPs, but data transfer charges still depend on VM-to-Google-service pricing and region placement, so the claim and examples were narrowed.
- The Dedicated Interconnect command omitted required `--link-type` and `--requested-link-count` flags. The command now includes those flags and a NOC contact email.
- The VPC peering example said same-region peered traffic is free. Google Cloud pricing makes same-zone internal traffic free, while inter-zone same-region traffic is charged, so the comment was corrected.
- The Storage Transfer Service section implied the service is inherently cheaper than application-based transfer. Storage Transfer Service still incurs applicable network and operation charges, so the wording now focuses on operational reliability and incremental transfers.

## Review Notes
The local environment did not have `gcloud` installed, so CLI syntax was verified against official Google Cloud SDK reference documentation rather than local `--help` output. Pricing examples remain rough estimates because Google Cloud prices vary by destination, tier, currency, and SKU updates.
