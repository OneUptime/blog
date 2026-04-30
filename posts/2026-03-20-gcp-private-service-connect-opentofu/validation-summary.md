# Validation Summary: How to Set Up GCP Private Service Connect with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HashiCorp Google provider for Terraform/OpenTofu
- Google Cloud Private Service Connect
- Google Cloud VPC
- Google Cloud DNS
- Google Cloud Service Attachments

## Sources Consulted
- Google Cloud: About accessing Google APIs through endpoints — https://docs.cloud.google.com/vpc/docs/about-accessing-google-apis-endpoints
- Google Cloud: Access Google APIs through endpoints — https://docs.cloud.google.com/vpc/docs/configure-private-service-connect-apis
- Google Cloud: Access published services through endpoints — https://docs.cloud.google.com/vpc/docs/configure-private-service-connect-services
- Google Cloud: Publish services by using Private Service Connect — https://docs.cloud.google.com/vpc/docs/configure-private-service-connect-producer
- Google Cloud: About published services — https://docs.cloud.google.com/vpc/docs/about-vpc-hosted-services
- Google Cloud: About controlling access to published services — https://docs.cloud.google.com/vpc/docs/about-controlling-access-published-services
- HashiCorp Google provider: `google_compute_global_address` — https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_global_address.html.markdown
- HashiCorp Google provider: `google_compute_global_forwarding_rule` — https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_global_forwarding_rule.html.markdown
- HashiCorp Google provider: `google_compute_forwarding_rule` — https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_forwarding_rule.html.markdown
- HashiCorp Google provider: `google_compute_service_attachment` — https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_service_attachment.html.markdown

## Issues Found
- The PSC Google APIs forwarding rule example used a generic hyphenated name and described `all-apis` as covering all Google APIs. The provider docs require PSC Google APIs forwarding rule names to be 1-20 lowercase letters or digits, and Google Cloud documents `all-apis` as covering most Google APIs and services. I changed the name to a compliant value and corrected the description.
- The PSC Google APIs example omitted the `google-beta` provider even though the provider docs still mark `PRIVATE_SERVICE_CONNECT` global address usage as beta. I added `provider = google-beta` to the Google APIs global address and forwarding rule resources.
- The DNS example for `googleapis.com` was invalid because it created both an `A` record and a `CNAME` record at `*.googleapis.com`, and it pointed the wildcard CNAME at `private.googleapis.com` instead of the zone apex. Google Cloud documents this pattern as an apex `A` record plus a wildcard `CNAME` back to the same zone. I corrected the `googleapis.com` records accordingly.
- The `gcr.io` DNS example had the same wildcard-record problem and the text claimed `pkg.dev` should also be configured without providing the records. I changed `gcr.io` to use an apex `A` record plus wildcard `CNAME`, and I added matching `pkg.dev` private zone and records.
- The producer service attachment example used `forwarding_rule`, which is not the correct provider argument. The provider docs require `target_service`. I replaced `forwarding_rule` with `target_service`.
- The service attachment example omitted `enable_proxy_protocol`, which the current provider resource requires. I added `enable_proxy_protocol = false`.
- The service attachment example combined `ACCEPT_AUTOMATIC` with a project allowlist. Google Cloud documents automatic approval as accepting all consumers, so the allowlist would not behave as described. I changed the example to `ACCEPT_MANUAL` so the `consumer_accept_lists` block matches the stated intent.
- The producer comment said an NLB is required for PSC published services. Google Cloud supports additional producer target service types. I narrowed the wording so the post accurately states that this example uses an internal passthrough NLB.

## Review Notes
- The Google APIs endpoint snippet now assumes a configured `google-beta` provider, which matches the current provider documentation for the PSC global address configuration.
- The post's published-service example is valid as a PSC producer pattern, but PSC published services can also target other supported internal load balancer types or Secure Web Proxy depending on the use case.
