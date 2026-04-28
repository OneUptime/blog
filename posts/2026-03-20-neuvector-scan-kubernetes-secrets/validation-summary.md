# Validation Summary: How to Scan Kubernetes Secrets with NeuVector

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- NeuVector (container security platform, secrets scanner)
- NeuVector REST API (v1)
- Kubernetes (Secrets, Deployments)
- External Secrets Operator
- HashiCorp Vault / AWS Secrets Manager (referenced)
- kubectl
- jq
- curl
- bash scripting
- Docker / Dockerfile

## Sources Consulted
- [External Secrets Operator – ExternalSecret API](https://external-secrets.io/latest/api/externalsecret/)
- [External Secrets Operator – Stability and Support](https://external-secrets.io/latest/introduction/stability-support/)
- [External Secrets Operator – Releases](https://github.com/external-secrets/external-secrets/releases)
- [NeuVector Documentation](https://open-docs.neuvector.com/)
- Kubernetes Secret API reference (apiVersion: v1, type: Opaque, stringData)
- jq manual for string slicing and `//` alternative operator
- bash / kubectl `get pods -o json` output format

## Issues Found
- **External Secrets Operator API version was outdated.** The post used `apiVersion: external-secrets.io/v1beta1`. ESO has since graduated the ExternalSecret CRD to `v1` as the stable, recommended version (the field structure for `refreshInterval`, `secretStoreRef`, `target`, and `data`/`remoteRef` is unchanged). Updated the example to `apiVersion: external-secrets.io/v1`.

## Review Notes
- The NeuVector REST API endpoints (`/v1/scan/config`, `/v1/scan/image`, `/v1/scan/image/{tag}`, `/v1/scan/workload`, `/v1/scan/workload/{id}/report`, `/v1/admission/rule`) and request/response shapes used in the post follow NeuVector's documented controller API patterns and the standard `X-Auth-Token` authentication header. The exact JSON response field names (e.g., `report.secrets[]`, `secret_count`) match the patterns used in NeuVector's published API for scanned image and workload reports.
- The jq inline `#` comment in `evidence: .evidence[:50]  # Truncate to avoid displaying full secrets` is valid jq syntax (jq supports `#` line comments), so this works as written.
- The Kubernetes `Secret` and `Deployment` manifests are syntactically correct and use current `apiVersion`s (`v1`, `apps/v1`).
- The bash script in Step 7 correctly handles missing `.env` arrays via `(.env // [])[]` and missing `.value` (when `valueFrom` is used) via `\(.value // "[from secret/configmap]")`. The subsequent `grep -v` filters those out cleanly. Note: the script only inspects pod `containers[]`; it does not include `initContainers[]` or `ephemeralContainers[]`, but this is a reasonable scope for the example.
- v1beta1 of the External Secrets API is still served by the controller (with automatic conversion), so existing manifests in the wild continue to work — but new content should use `v1` as the post now does.

Sources:
- [ExternalSecret - External Secrets Operator](https://external-secrets.io/latest/api/externalsecret/)
- [Stability and Support - External Secrets Operator](https://external-secrets.io/latest/introduction/stability-support/)
- [Releases · external-secrets/external-secrets](https://github.com/external-secrets/external-secrets/releases)
