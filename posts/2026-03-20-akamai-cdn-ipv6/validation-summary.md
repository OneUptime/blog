# Validation Summary: How to Configure Akamai CDN for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Akamai Property Manager
- Akamai Property Manager API (PAPI)
- Akamai CLI / Property Manager CLI
- IPv6
- CDN edge hostname configuration
- Origin IP Access Control List
- Akamai Reporting API
- HTTP request headers

## Sources Consulted
- Akamai Blog, "At 21 Tbps, Reaching New Levels of IPv6 Traffic" - https://www.akamai.com/blog/performance/at-21-tbps-reaching-new-levels-ipv6-traffic
- Akamai Global Infrastructure - https://www.akamai.com/us/en/about/facts-figures.jsp
- Akamai TechDocs, "Create a new edge hostname" - https://techdocs.akamai.com/property-mgr/reference/post-edgehostnames
- Akamai TechDocs, "Manage hostnames" - https://techdocs.akamai.com/property-mgr/reference/modify-property-hostnames
- Akamai TechDocs, "Configure property hostname settings" - https://techdocs.akamai.com/api-definitions/docs/config-props-hn-settings
- Akamai TechDocs, "Origin Server" - https://techdocs.akamai.com/property-mgr/docs/origin-server
- Akamai TechDocs, "origin" behavior reference - https://techdocs.akamai.com/property-mgr/reference/latest-origin
- Akamai CLI GitHub repository - https://github.com/akamai/cli
- Akamai Property Manager CLI GitHub repository - https://github.com/akamai/cli-property-manager
- Akamai TechDocs, "Pragma headers" - https://techdocs.akamai.com/edge-diagnostics/docs/pragma-headers
- Akamai TechDocs, "Enhanced Debug" - https://techdocs.akamai.com/property-mgr/docs/enhanced-debug
- Akamai TechDocs, "Update your origin server" - https://techdocs.akamai.com/origin-ip-acl/docs/update-your-origin-server
- Akamai TechDocs, "delivery/traffic/current" - https://techdocs.akamai.com/reporting/reference/delivery-traffic-current

## Issues Found
- The introduction incorrectly said Akamai supported IPv6 since 2011. I corrected this to production IPv6 support since 2012 and tightened the wording around Akamai's edge scale to match official sources.
- The architecture note incorrectly said Akamai edge CNAMEs themselves have A and AAAA records. I changed it to explain that the property hostname typically CNAMEs to an Akamai edge hostname, which then resolves to A and AAAA records when dual-stack is enabled.
- The PAPI example used undocumented fields such as `enableIpv6`, `dualStack`, and `ipVersion: "IPV6"` inside a made-up behavior object. I replaced it with the documented edge hostname payload that uses `ipVersionBehavior: "IPV6_COMPLIANCE"`.
- The UI steps incorrectly told readers to add `IP/Geo ACL` to enable IPv6. I corrected this to the documented Property Hostnames IP-version workflow and clarified that origin IPv6 is controlled separately in the Origin Server behavior.
- The origin configuration example used the invalid enum `IPV4_IPV6` and allowed client-supplied `True-Client-IP` values. I changed the enum to the documented `DUALSTACK`, set `trueClientIpClientSetting` to `false`, and added the documented Origin IP ACL requirement for Dual Stack and IPv6-Only origin connectivity.
- The CLI section used incorrect installation, authentication, and command names, including `pip install akamai-edgegrid`, `akamai auth`, and `akamai property ...`. I replaced them with the documented Akamai CLI and Property Manager CLI workflow.
- The client IP section incorrectly implied Akamai sends `X-Real-IP`, and the sample IPv6 literals were invalid. I corrected the header behavior to documented `X-Forwarded-For` and optional `True-Client-IP`, and fixed the example addresses.
- The testing section assumed Akamai cache/debug headers appear without enabling debug pragmas. I updated the example to use the documented `Pragma` headers that return `X-Cache` and `X-Check-Cacheable`.
- The origin-protection section used a generic `api.akamai.com/siteshield` example that did not match the documented dual-stack origin allowlist workflow. I replaced it with Akamai's documented Origin IP ACL guidance and current IPv6 CIDR examples.
- The monitoring section used an invalid Reporting API endpoint and nonexistent metrics. I replaced it with the documented Reporting API v2 `delivery/traffic/current` example using `ipVersion`, `edgeHitsSum`, and `originHitsSum`.

## Review Notes
- The `productId`, `contractId`, `groupId`, and `cpcode` values in examples are placeholders and need real account-specific values.
- Secure `edgekey.net` hostnames can require additional certificate setup beyond the simplified hostname example shown here.
- Origin IP ACL CIDR ranges can change over time, so the post now points readers to the live Akamai documentation before they update firewalls.
