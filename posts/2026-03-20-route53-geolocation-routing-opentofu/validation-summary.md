# Validation Summary: How to Configure Route 53 Geolocation Routing with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Route 53
- Route 53 geolocation routing
- AWS CLI
- HashiCorp AWS provider `aws_route53_record`
- DNS alias records

## Sources Consulted
- AWS Route 53 Developer Guide: Geolocation routing: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-geo.html
- AWS Route 53 Developer Guide: Values specific for geolocation records: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-geo.html
- AWS Route 53 Developer Guide: EDNS0 client subnet behavior: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-edns0.html
- AWS Route 53 Developer Guide: Checking DNS responses from Route 53: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-test.html
- AWS Route 53 API Reference: GeoLocation: https://docs.aws.amazon.com/Route53/latest/APIReference/API_GeoLocation.html
- AWS CLI Command Reference: `route53 test-dns-answer`: https://docs.aws.amazon.com/cli/latest/reference/route53/test-dns-answer.html
- HashiCorp AWS Provider `aws_route53_record` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- HashiCorp AWS Provider `aws_route53_record` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route53_record.html.markdown
- OpenTofu CLI docs: `init`, `plan`, and `apply`: https://opentofu.org/docs/cli/commands/init/, https://opentofu.org/docs/cli/commands/plan/, https://opentofu.org/docs/cli/commands/apply/
- AWS public IP address ranges: https://ip-ranges.amazonaws.com/ip-ranges.json
- Cloudflare 1.1.1.1 documentation: https://developers.cloudflare.com/1.1.1.1/

## Issues Found
- The introduction overstated geolocation routing as an enforcement mechanism for data residency. Updated the wording to say Route 53 selects DNS answers by location and can support data residency controls.
- The default geolocation record comment said it was required for geolocation routing. AWS recommends a default record, and omitting it causes no-answer responses for unmatched or unmapped locations, but the API does not require it for every geolocation configuration. Updated the comment accordingly.
- The AWS CLI examples used `<zone-id>`, which Bash interprets as input redirection if pasted. Replaced it with a `HOSTED_ZONE_ID` variable.
- The test IP examples included `1.1.1.1` as an Australian IP. Cloudflare documents `1.1.1.1` as its public DNS resolver, so it is not a reliable client-location example. Replaced the test IPs with sample AWS public ranges from `eu-central-1` and `ap-southeast-2`.
- The conclusion suggested combining geolocation and latency routing without naming the supported mechanism. Clarified that this should be done with Route 53 Traffic Flow or an alias-record hierarchy.

## Review Notes
The HCL snippets use valid `aws_route53_record` geolocation fields and valid Route 53 continent, country, default, and US subdivision patterns. The local environment did not have `tofu` or `aws` installed, so CLI behavior was verified against official documentation rather than executed locally.
