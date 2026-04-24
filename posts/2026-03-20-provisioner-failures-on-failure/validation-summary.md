# Validation Summary: Handling Provisioner Failures with on_failure in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- OpenTofu provisioners (`remote-exec`, `local-exec`)
- HCL
- AWS provider resources (`aws_instance`, `aws_route53_record`)
- `terraform_data`
- `jq`
- `curl`
- Slack incoming webhooks

## Sources Consulted
- OpenTofu provisioners syntax: https://opentofu.org/docs/language/resources/provisioners/syntax/
- OpenTofu provisioner connection settings: https://opentofu.org/docs/language/resources/provisioners/connection/
- OpenTofu `remote-exec` provisioner: https://opentofu.org/docs/language/resources/provisioners/remote-exec/
- OpenTofu provisioners without a resource: https://opentofu.org/docs/language/resources/provisioners/null_resource/
- OpenTofu `terraform_data` resource: https://opentofu.org/docs/language/resources/tf-data/
- OpenTofu `show` command / JSON output guidance: https://opentofu.org/docs/cli/commands/show/
- OpenTofu JSON output format: https://opentofu.org/docs/internals/json-format/
- OpenTofu `state show` command: https://opentofu.org/docs/cli/commands/state/show/
- OpenTofu `untaint` command: https://opentofu.org/docs/cli/commands/untaint/
- Slack incoming webhooks: https://api.slack.com/messaging/webhooks
- curl man page: https://curl.se/docs/manpage.html

## Issues Found
- The opening explanation overstated default behavior for all provisioners. I corrected it to distinguish creation-time failures, which taint the resource, from destroy-time failures, which stop the apply and are retried on the next `tofu apply`.
- The multi-command `remote-exec` examples implied that any failed command would trigger `on_failure`. OpenTofu documents that `inline` commands are concatenated into a script and `on_failure` applies only to the final command, so I added `set -o errexit` to the multi-command examples.
- The destroy-time `remote-exec` example omitted a required `connection` block. I added the SSH connection details because `remote-exec` requires a connection configuration.
- The notification example used `null_resource`, while current OpenTofu guidance for provisioners not tied to a real resource is to use `terraform_data`. I updated the example to `terraform_data` and replaced `triggers` with `triggers_replace`.
- The Slack `curl` example did not set the JSON content type and would not treat HTTP 4xx/5xx responses as failures. I updated it to send JSON with `Content-type: application/json` and to use `curl -fsS` so `on_failure` can actually observe HTTP errors.
- The taint inspection command relied on `tofu state show` piped through `grep`, but the official docs describe `state show` as human-oriented and document programmatic inspection through `tofu show -json`. I replaced it with a `jq` example that reads the documented `tainted` field from the JSON state representation.
- The best-practices section said to always use `continue` for destroy provisioners. I narrowed that guidance to cases where cleanup failure should not block deletion, which is more accurate.

## Review Notes
- OpenTofu’s current documentation still recommends treating provisioners as a last resort; the post already reflects that guidance.
- The examples assume a Unix-like remote host reachable over SSH and a local environment with `jq` and `curl` available.
- `tofu untaint` remains valid. The deprecated OpenTofu command is `tofu taint`, which the post does not rely on.
