# Validation Summary: How to Choose Between Cloud Armor Security Policies and Cloud NGFW

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Armor security policies
- Cloud Armor preconfigured WAF rules
- Cloud Armor rate limiting
- Cloud Next Generation Firewall
- Google Cloud network firewall policies
- Cloud NGFW threat intelligence, FQDN objects, security profiles, and IPS
- Google Cloud CLI

## Sources Consulted
- Google Cloud Armor security policy overview: https://docs.cloud.google.com/armor/docs/security-policy-overview
- Google Cloud Armor preconfigured WAF rules overview: https://docs.cloud.google.com/armor/docs/waf-rules
- Set up Cloud Armor preconfigured WAF rules: https://docs.cloud.google.com/armor/docs/configure-waf
- gcloud compute security-policies rules create reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/rules/create
- Cloud NGFW overview: https://docs.cloud.google.com/firewall/docs/about-firewalls
- Cloud NGFW tiers: https://docs.cloud.google.com/firewall/docs/ngfw_tiers
- Cloud NGFW firewall policy rule components: https://docs.cloud.google.com/firewall/docs/firewall-policies-rule-details
- gcloud compute network-firewall-policies rules create reference: https://cloud.google.com/sdk/gcloud/reference/compute/network-firewall-policies/rules/create
- gcloud compute network-firewall-policies associations create reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/network-firewall-policies/associations/create
- Create and manage Cloud NGFW threat prevention security profiles: https://docs.cloud.google.com/firewall/docs/configure-security-profiles
- gcloud network-security security-profiles threat-prevention create reference: https://cloud.google.com/sdk/gcloud/reference/network-security/security-profiles/threat-prevention/create
- gcloud network-security security-profile-groups create reference: https://docs.cloud.google.com/sdk/gcloud/reference/network-security/security-profile-groups/create
- Google Cloud Armor pricing: https://cloud.google.com/armor/pricing
- Cloud NGFW pricing: https://cloud.google.com/firewall/pricing

## Issues Found
- The Cloud Armor overview said Cloud Armor attaches to Google's Global External HTTP(S) Load Balancer. Updated this to supported Google Cloud load balancers, including external Application Load Balancers, because Cloud Armor supports more load balancer and endpoint types than that statement implied.
- The WAF examples used `evaluatePreconfiguredExpr(...)`. Updated them to `evaluatePreconfiguredWaf(..., {'sensitivity': 2})`, matching current Cloud Armor WAF documentation.
- The rate-limit example used `--enforce-on-key IP`. Updated it to `--enforce-on-key ip`, matching the current gcloud enum value.
- The Cloud NGFW threat-intelligence rule used the incorrect flag `--src-threat-intelligences`. Updated it to `--src-threat-intelligence`.
- The threat-intelligence example was labeled Enterprise. Updated it to Standard tier because Google Threat Intelligence is listed as a Cloud NGFW Standard feature.
- The Cloud NGFW security profile example used `gcloud network-security security-profiles create --type THREAT_PREVENTION`. Updated it to the current `gcloud network-security security-profiles threat-prevention create` command and added the required organization scope.
- The security profile group and firewall rule examples used short security profile group/profile references that were incomplete for the documented organization-scoped resources. Updated them to include organization-scoped resource paths.
- The cost section stated that Cloud Armor Standard is included with the load balancer and that Managed Protection Plus costs $3,000/month. Updated this to current Cloud Armor Standard, Cloud Armor Enterprise Paygo/Annual, and Cloud NGFW tier pricing behavior.

## Review Notes
The local environment did not have `gcloud` installed, so command validation was performed against the official Google Cloud CLI reference and product documentation.
