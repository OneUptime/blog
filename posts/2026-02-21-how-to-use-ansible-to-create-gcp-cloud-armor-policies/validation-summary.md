# Validation Summary: How to Use Ansible to Create GCP Cloud Armor Policies

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Google Cloud CLI
- Google Cloud Armor
- Google Cloud HTTP(S) Load Balancing
- Cloud Armor custom rules language / CEL
- Cloud Armor preconfigured WAF rules
- Cloud Armor rate limiting

## Sources Consulted
- Google Cloud Armor product overview: https://cloud.google.com/armor/docs/cloud-armor-overview
- Google Cloud Armor security policy configuration guide: https://docs.cloud.google.com/armor/docs/configure-security-policies
- Google Cloud Armor custom rules language reference: https://cloud.google.com/armor/docs/rules-language-reference
- Google Cloud Armor preconfigured WAF rules overview: https://docs.cloud.google.com/armor/docs/waf-rules
- Google Cloud Armor WAF setup guide: https://docs.cloud.google.com/armor/docs/configure-waf
- Google Cloud Armor rate limiting guide: https://cloud.google.com/armor/docs/configure-rate-limiting
- Google Cloud SDK `gcloud compute security-policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/create
- Google Cloud SDK `gcloud compute security-policies rules create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/security-policies/rules/create
- Google Cloud SDK `gcloud auth activate-service-account` reference: https://cloud.google.com/sdk/gcloud/reference/auth/activate-service-account
- Ansible `google.cloud` collection index: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/index.html
- RFC 5737 IPv4 Address Blocks Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc5737

## Issues Found
- The post used `google.cloud.gcp_compute_security_policy`, but the current official `google.cloud` collection documentation does not list that module. Replaced the security-policy examples with supported `gcloud compute security-policies` commands executed through `ansible.builtin.command`.
- The prerequisites said only Compute Security Admin was needed. Added Compute Network Admin for attaching a Cloud Armor policy to a backend service, matching Google Cloud IAM documentation.
- The WAF examples used deprecated `evaluatePreconfiguredExpr()` calls. Replaced them with `evaluatePreconfiguredWaf()` and updated the examples to current CRS 4.22 stable rule names such as `sqli-v422-stable`.
- The rate limiting examples used API-style action names and response strings such as `rate_based_ban` and `deny(429)`. Replaced them with Google Cloud CLI values such as `rate-based-ban`, `throttle`, and `deny-429`.
- The backend attachment example used an unsupported Ansible security policy object shape. Replaced it with `gcloud compute backend-services update --security-policy`.
- The policy creation examples did not specify the policy type. Added `--type=CLOUD_ARMOR` for backend security policies.
- Several snippets described explicit default rules but relied on an implicit default allow rule. Added explicit updates to priority `2147483647` where appropriate.
- The examples labeled RFC 5737 documentation address ranges as known bad or malicious IPs. Changed the wording to describe them as example blocked IPs.

## Review Notes
The corrected examples are command-based Ansible tasks because the current official Ansible Google Cloud collection does not expose a Cloud Armor security policy module. The local environment did not have `gcloud` or `ansible-playbook` installed, so command execution and Ansible syntax checks could not be run locally. YAML code blocks were parsed successfully with PyYAML.
