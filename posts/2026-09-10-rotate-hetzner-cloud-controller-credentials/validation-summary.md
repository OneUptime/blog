# Validation Summary: How to Rotate Hetzner CCM Credentials and Verify the New Token

## Status

validated

## Post Type

Credential rotation operations guide

## Technologies Covered

- Hetzner HCCM v1.36.0 and API token permissions
- Kubernetes Secrets, environment variables, Deployments and rollout
- Helm configuration and controller leader replacement

## Sources Consulted

- [Hetzner token creation and project scope](https://docs.hetzner.com/cloud/api/getting-started/generating-api-token/)
- [HCCM v1.36.0 startup token configuration](https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/v1.36.0/internal/config/config.go)
- [HCCM v1.36.0 chart token and network Secret defaults](https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/v1.36.0/chart/values.yaml)
- [Kubernetes Secret environment update behavior](https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure/)
- [kubectl secret creation from a named file key](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/)
- [kubectl rollout restart](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/)
- [kubectl logs](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [kubectl get output and resource syntax](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)

## Issues Found

No technical issues found.

## Review Notes

- Confirmed HCCM reads HCLOUD_TOKEN via its startup configuration, supports the `_FILE` alternative, and the pinned chart defaults to Secret `hcloud` key `token`. Network credentials/settings are separate entries, so a versioned token-only Secret preserves them.
- Kubernetes documentation explicitly requires a container restart to receive an updated Secret supplied through an environment variable. The described Deployment pod-template change or explicit rollout restart addresses this lifecycle.
- Checked the redacted jq inspection, `--from-file=token=...` syntax, SecretKeyRef structure, and recent-log commands. The sample avoids putting the credential itself in a command argument.
- The overlap, all-replica verification, cloud write/delete canary and post-revocation check are appropriate evidence for the token actually used by the controller; a list-only operation does not prove write permissions.
- Reviewed on 2026-09-10. All 4 shell examples passed `bash -n`; all 1 YAML examples parsed with PyYAML. These are syntax checks plus documentation/source review, not execution against a live Kubernetes cluster or cloud account. Cloud resource state, permissions, API actions, traffic, DNS propagation and certificate issuance were not runtime-verified.
