# Validation Summary: How to Use Route 53 Traffic Flow for Complex Routing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Route 53 Traffic Flow
- Route 53 traffic policy documents
- AWS CLI for Route 53
- Route 53 health checks
- AWS CloudTrail
- DNS routing policies

## Sources Consulted
- AWS Route 53 API Reference: Traffic Policy Document Format: https://docs.aws.amazon.com/Route53/latest/APIReference/api-policies-traffic-policy-document-format.html
- AWS CLI Command Reference: create-traffic-policy: https://docs.aws.amazon.com/cli/latest/reference/route53/create-traffic-policy.html
- AWS CLI Command Reference: create-traffic-policy-instance: https://docs.aws.amazon.com/cli/latest/reference/route53/create-traffic-policy-instance.html
- AWS CLI Command Reference: update-traffic-policy-instance: https://docs.aws.amazon.com/cli/latest/reference/route53/update-traffic-policy-instance.html
- AWS CLI Command Reference: create-health-check: https://docs.aws.amazon.com/cli/latest/reference/route53/create-health-check.html
- AWS Route 53 Developer Guide: Using Traffic Flow to route DNS traffic: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/traffic-flow.html
- AWS Route 53 pricing: https://aws.amazon.com/route53/pricing/
- OneUptime linked post: https://oneuptime.com/blog/post/2026-02-12-route-53-application-recovery-controller/view

## Issues Found
- The weighted plus failover policy used `Secondary` inside a weighted rule, which is not valid in the Route 53 traffic policy document schema. Changed the example to use a `failover` rule that points the primary path at the weighted rule and the secondary path at the disaster recovery endpoint.
- The latency policy used `Items`, but Route 53 latency rules require `Regions`. Updated the field name and kept the same regional routing intent.
- The geolocation policy used `Items`, `ContinentCode`, and `GeoDefault`, but Route 53 geolocation rules require `Locations` with `Continent` / `Country` fields. Updated the example to use `Locations` and a `Country: "*"` default.
- The examples described Application Load Balancers but used the `elastic-load-balancer` endpoint type, which AWS documents for Classic Load Balancers. Updated ALB endpoints to use `application-load-balancer` and ALB-style DNS names.
- The first failover example implied failover only after both primary regions fail, but its primary failover health check would have represented one endpoint. Changed the placeholder to a separate calculated health check and added a short note explaining that the primary group health check should aggregate the weighted regional checks.
- The versioning section said switching policy versions is instant. AWS documents a brief traffic policy instance update process before the instance reaches `Applied`; updated the wording to reflect that TTL propagation is only part of the delay.

## Review Notes
- The AWS CLI was not installed in the local environment, so CLI validation was performed against the current official AWS CLI command reference.
- The JSON examples were parsed locally with `jq` after editing.
- Pricing was verified against the AWS Route 53 pricing page on 2026-06-02.
