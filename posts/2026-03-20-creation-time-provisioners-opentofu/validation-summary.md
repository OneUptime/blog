# Validation Summary: How to Use Creation-Time Provisioners in OpenTofu - Opentofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (provisioners, lifecycle, state tainting)
- HCL configuration language
- AWS provider (`aws_instance`, `data.aws_ami`)
- Built-in provisioners: `remote-exec`, `local-exec`, `file`
- TLS provider (`tls_private_key`)
- Bash scripting / `systemctl` (idempotent installation)

## Sources Consulted
- OpenTofu Provisioners docs: https://opentofu.org/docs/language/resources/provisioners/syntax/
- OpenTofu `remote-exec` provisioner: https://opentofu.org/docs/language/resources/provisioners/remote-exec/
- OpenTofu `local-exec` provisioner: https://opentofu.org/docs/language/resources/provisioners/local-exec/
- OpenTofu `file` provisioner: https://opentofu.org/docs/language/resources/provisioners/file/
- OpenTofu `connection` block: https://opentofu.org/docs/language/resources/provisioners/connection/
- OpenTofu `tofu taint` CLI: https://opentofu.org/docs/cli/commands/taint/
- OpenTofu `tofu apply -replace`: https://opentofu.org/docs/cli/commands/plan/#replace-address

## Issues Found
- **Flowchart inaccuracy in "When Creation-Time Provisioners Run"**: The original flowchart showed that when a resource is *not* created, OpenTofu would "Mark resource as tainted." This conflicted with the post's own text below the diagram, which (correctly) attributes tainting to provisioner failures. If creation itself fails, OpenTofu reports an error and the resource is generally not added to state — there is nothing to taint in the typical case. Updated the "No" branch from `Mark resource as tainted` to `Error: creation failed` so the flowchart aligns with how OpenTofu actually behaves and with the explanatory text that follows.

## Review Notes
- `tofu taint aws_instance.web` is still a valid command in OpenTofu, but it has been deprecated (carried over from Terraform's deprecation in 0.15.2). The modern recommended approach is `tofu apply -replace="aws_instance.web"`. The post's recommendation works as documented, so no change was made, but readers should be aware of the more current alternative.
- In the idempotent install script, `systemctl start nginx || systemctl restart nginx` is slightly redundant: `systemctl start` is already a no-op when the service is active. A bare `systemctl restart nginx` (or just `systemctl start nginx`) would be cleaner. This is a code-style observation, not a technical inaccuracy, so it was left unchanged.
- The HCL syntax, attribute references (`self.public_ip`, `self.id`, `path.module`), `connection` block structure, `on_failure = continue` option, and the description of tainting / re-provisioning behavior all match current OpenTofu documentation.
