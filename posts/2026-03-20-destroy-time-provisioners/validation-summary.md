# Validation Summary: How to Use Destroy-Time Provisioners in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Provisioners
- `remote-exec`
- `local-exec`
- `terraform_data`
- Kubernetes `kubectl drain`
- AWS EC2

## Sources Consulted
- OpenTofu provisioners documentation: https://opentofu.org/docs/v1.7/language/resources/provisioners/syntax/
- OpenTofu provisioner connection settings: https://opentofu.org/docs/language/resources/provisioners/connection/
- OpenTofu `pathexpand` function: https://opentofu.org/docs/language/functions/pathexpand/
- OpenTofu `terraform_data` resource: https://opentofu.org/docs/v1.8/language/resources/tf-data/
- OpenTofu provisioners without a resource: https://opentofu.org/docs/language/resources/provisioners/null_resource/
- Kubernetes `kubectl drain` reference: https://v1-35.docs.kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/

## Issues Found
- The `remote-exec` example used `file("~/.ssh/worker.pem")`. OpenTofu does not expand `~` automatically in file paths, and its documentation recommends `pathexpand` for transient values in provisioner and connection blocks. I changed it to `file(pathexpand("~/.ssh/worker.pem"))`.
- The post recommended `null_resource` with `triggers` for cleanup workflows. Current OpenTofu documentation recommends `terraform_data` for provisioners that are not directly attached to a real resource, and explicitly presents it as the replacement pattern for `null_resource`. I updated the section, caveat, and summary to use `terraform_data` with `input` and `triggers_replace`.

## Review Notes
- The `kubectl drain` command and the flags used in the post are valid according to the current Kubernetes CLI reference.
- OpenTofu documents additional destroy-time caveats that the post does not currently mention, including that destroy provisioners do not run when `create_before_destroy = true`, do not run for tainted resources, and only run while the resource remains in configuration. These are worth considering for a future revision, but the current post is technically acceptable after the fixes above.
