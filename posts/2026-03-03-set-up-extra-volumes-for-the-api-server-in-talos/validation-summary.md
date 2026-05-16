# Validation Summary: How to Set Up Extra Volumes for the API Server in Talos

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Talos Linux machine configuration
- Kubernetes API server static pods
- Kubernetes audit policy configuration
- Kubernetes encryption at rest
- Kubernetes OIDC and webhook authentication
- Kubernetes admission control configuration
- talosctl and kubectl CLI commands

## Sources Consulted
- Talos MachineConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos configuration patching guide: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/patching
- Talos talosctl CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Kubernetes kube-apiserver command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes encryption at rest documentation: https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- Kubernetes kube-apiserver config API reference: https://kubernetes.io/docs/reference/config-api/apiserver-config.v1/
- Kubernetes authentication documentation: https://v1-35.docs.kubernetes.io/docs/reference/access-authn-authz/authentication/

## Issues Found
- The Talos `cluster.apiServer.extraVolumes` examples used `readOnly`, but the current Talos machine configuration field is `readonly`. Updated all extra volume examples to use `readonly`.
- The Talos `extraVolumes` examples included a `name` field, but current `VolumeMountConfig` only documents `hostPath`, `mountPath`, and `readonly`. Removed the unsupported `name` entries from `extraVolumes`.
- The apply example used `talosctl apply-config --patch`, but the `apply-config` command uses `--config-patch` with a full config file. For the post's "patch a running node" workflow, changed the command to `talosctl patch mc --patch @audit-policy-volume.yaml`.
- The Talos file permission examples used YAML values such as `0644` and `0600`; current Talos documentation shows octal permissions using `0o` notation. Updated them to `0o644` and `0o600`.
- The verification and troubleshooting examples used older or incorrect Talos CLI command forms: `talosctl ls` and `talosctl services`. Updated these to the documented `talosctl list` and `talosctl service` commands.

## Review Notes
- Kubernetes OIDC command-line flags still work, but Kubernetes v1.34 and later also support stable structured authentication configuration via `--authentication-config`. The post's OIDC example remains technically valid.
- Talos also has first-class `cluster.apiServer.auditPolicy` and `cluster.apiServer.admissionControl` configuration fields, which may be preferable for those specific use cases. The extra-volume approach is still valid for demonstrating mounted API server config files.
