# Validation Summary: How to Use talosctl apply-config Command

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes node machine configuration
- JSON Patch / RFC 6902
- Strategic merge patches

## Sources Consulted
- Sidero Labs Talos CLI reference for `talosctl apply-config`: https://docs.siderolabs.com/talos/latest/reference/cli
- Sidero Labs Talos editing machine configuration guide: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/editing-machine-configuration
- Sidero Labs Talos configuration patching guide: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/patching
- RFC 6902 JSON Patch: https://www.rfc-editor.org/rfc/rfc6902

## Issues Found
- The description of `--insecure` said it bypasses TLS verification. Updated it to match the official CLI wording: it uses the encrypted maintenance service without client authentication.
- The `--config-patch` examples omitted `--file` and implied that `apply-config` patches the existing remote machine configuration directly. Updated the examples to patch a local config file before sending it, and noted that patching the running machine configuration should use `talosctl patch machineconfig`.
- The patching section said patches use only JSON Patch. Updated it to say Talos supports both JSON Patch and strategic merge patches, with the shown example using JSON Patch.
- The reboot examples listed several fields too broadly, including certificate and Kubernetes version changes. Reworded the list to avoid overclaiming and align with Talos' documented immediate/staged/reboot apply behavior.
- The backup command saved the full `machineconfig` resource as YAML, but `apply-config` expects raw machine configuration. Updated the command to extract `.spec` with `-o jsonpath='{.spec}'`.

## Review Notes
The post is technically relevant and the command examples now align with current Talos documentation. Future improvements could mention `--mode=try` and `--timeout`, which are supported by current `talosctl apply-config`, but they are not required for correctness.
