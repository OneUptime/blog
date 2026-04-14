# Validation Summary: How to Fix Dapr mTLS Certificate Issues

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr (Sentry service, mTLS, sidecars)
- Kubernetes (secrets, deployments, patching)
- Dapr CLI (mtls subcommands)
- cert-manager (Certificate resources, ClusterIssuer)
- Helm (Dapr chart configuration)
- OpenSSL (certificate inspection)

## Sources Consulted
- Dapr security concepts documentation — https://docs.dapr.io/concepts/security-concept/
- Dapr mTLS setup and configuration — https://docs.dapr.io/operations/security/mtls/
- Dapr Sentry service overview — https://docs.dapr.io/concepts/dapr-services/sentry/
- Dapr CLI mtls command reference — https://docs.dapr.io/reference/cli/dapr-mtls/
- Dapr CLI mtls export reference — https://docs.dapr.io/reference/cli/dapr-mtls/dapr-mtls-export/
- Dapr CLI mtls expiry reference — https://docs.dapr.io/reference/cli/dapr-mtls/dapr-mtls-expiry/
- Dapr CLI mtls renew-certificate reference — https://docs.dapr.io/reference/cli/dapr-mtls/dapr-mtls-renew-certificate/
- Dapr Helm chart values — https://github.com/dapr/dapr/blob/master/charts/dapr/values.yaml
- Dapr configuration overview — https://docs.dapr.io/operations/configuration/configuration-overview/

## Issues Found

1. **Incorrect certificate rotation procedure (line 52-55)**: The post claimed that running `kubectl rollout restart deployment dapr-sentry` would rotate issuer certificates. This is incorrect — restarting Sentry alone does not generate new certificates, and even after updating certs, all Dapr control plane services and application pods must be restarted. Fixed by replacing with `dapr mtls renew-certificate -k --restart` which handles the full rotation automatically, and added a note about restarting application pods.

2. **Incorrect Helm values for external CA (line 90-92)**: The post used `--set-string dapr_sentry.trustAnchorsFile=/var/run/secrets/dapr.io/tls/ca.crt` which is not a valid Dapr Helm chart value. Fixed to use the correct values: `--set-file dapr_sentry.tls.root.certPEM`, `--set-file dapr_sentry.tls.issuer.certPEM`, and `--set-file dapr_sentry.tls.issuer.keyPEM`.

3. **Wrong Configuration resource name for disabling mTLS (line 100)**: The post referenced `configuration appconfig -n default` but the Dapr control plane Configuration resource is named `daprsystem` in the `dapr-system` namespace. Fixed the resource name and namespace.

4. **Summary text referenced incorrect rotation method (line 107)**: The summary advised "rotate issuer certificates by restarting Sentry" which was consistent with the incorrect advice above. Updated to reference `dapr mtls renew-certificate -k --restart`.

## Review Notes
- The cert-manager integration example shows a basic Certificate resource. In practice, integrating cert-manager with Dapr typically requires the third-party `diagridio/dapr-cert-manager` controller to bridge cert-manager's standard secret format (`tls.crt`, `tls.key`, `ca.crt`) with Dapr's expected format (`ca.crt`, `issuer.crt`, `issuer.key`). The example is a reasonable starting point but readers may need additional configuration.
- The `dapr mtls export` command exports existing certificates — it does not generate new ones. The post's comment "Generate new root and issuer certificates" above that command is slightly misleading, though the command is valid for exporting current certs to local files for backup or inspection purposes.
- The cert-manager Certificate spec should ideally include `privateKey.algorithm: ECDSA` with `size: 256` to match Dapr's default key algorithm, though RSA keys also work.
