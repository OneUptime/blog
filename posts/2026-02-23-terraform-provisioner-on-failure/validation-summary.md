# Validation Summary: How to Use Provisioner on_failure Settings in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform provisioners
- Terraform `local-exec` and `remote-exec`
- Terraform `on_failure` and `when` provisioner meta-arguments
- AWS CLI Elastic Load Balancing v2 commands
- Consul KV CLI
- Shell scripting with `curl`

## Sources Consulted
- Terraform resource block reference: https://developer.hashicorp.com/terraform/language/block/resource
- Terraform provisioners documentation: https://developer.hashicorp.com/terraform/language/provisioners
- AWS CLI `elbv2 deregister-targets` command reference: https://docs.aws.amazon.com/cli/latest/reference/elbv2/deregister-targets.html
- Consul `kv put` command reference: https://developer.hashicorp.com/consul/commands/kv/put
- PagerDuty API "Create a service" reference, used to check the original provider-specific curl example before replacing it with a generic service-registration endpoint: https://www.postman.com/pagerduty/pagerduty-public-api-collection/request/uwz72ms/create-a-service

## Issues Found
- The retry-loop example for the external service `curl` call did not exit with a failure status after all retries failed. Because the last command in the failed final iteration was `sleep 10`, the shell would exit successfully and Terraform would not treat the provisioner as failed. Added an explicit `exit 1` on the fifth failed attempt so `on_failure = continue` behaves as described.
- The same retry example used a provider-specific PagerDuty create-service API request without the required request headers and full API shape. Replaced it with a generic JSON service-registration endpoint so the example remains technically plausible while staying focused on Terraform provisioner failure behavior.
- The best-practice statement "Always use continue for destruction-time provisioners" was too absolute. Terraform supports failing destroy-time provisioners when cleanup must block deletion, although optional cleanup should usually use `continue`. Changed the wording to "Usually use continue for destruction-time provisioners."

## Review Notes
- Terraform is not installed in the local workspace, so validation was performed against official documentation rather than `terraform validate`.
- Terraform's documentation recommends using provisioners sparingly and preferring provider-native features, cloud-init, configuration management, or image-building workflows when possible.
