# Validation Summary: How to Back Up NeuVector Configuration - Part 3

## Status
validated

## Post Type
Tutorial / Operational guide

## Technologies Covered
- NeuVector (SUSE NeuVector container security platform)
- NeuVector REST API (`/v1/auth`, `/v1/file/config`, `/v1/group`, `/v1/policy/rule`)
- Kubernetes (`CronJob`, `Secret`)
- `kubectl`
- AWS S3 / `aws s3 cp`
- `curl`, `jq`, shell scripting

## Sources Consulted
- [NeuVector REST API and Automation docs](https://open-docs.neuvector.com/automation/automation/)
- [NeuVector Restoring Configuration docs](https://open-docs.neuvector.com/deploying/restore/)
- [NeuVector OpenAPI spec (`controller/api/apis.yaml` on GitHub `main`)](https://raw.githubusercontent.com/neuvector/neuvector/main/controller/api/apis.yaml)
- [NeuVector Go API package (`pkg.go.dev`)](https://pkg.go.dev/github.com/neuvector/neuvector/controller/api) — for `RESTAuthData` / `RESTAuthPassword` struct fields

## Issues Found
1. **Auth endpoint path was wrong.** The post used `https://.../auth`, but the NeuVector REST API authentication endpoint is `/v1/auth`. Fixed all three occurrences (Step 1, Step 2 CronJob, Step 4).
2. **Auth request body was the wrong shape.** The post sent a flat JSON `{"username":"admin","password":"admin"}`, but NeuVector's `RESTAuthData` schema requires the credentials to be wrapped under a `password` key: `{"password":{"username":"admin","password":"admin"}}`. Fixed in all three auth calls.
3. **Restore command used the wrong upload format.** The original used `--data-binary @file` with `Content-Type: application/json`. Per the NeuVector OpenAPI spec, `POST /v1/file/config` accepts `multipart/form-data` with a form field named `configuration`. Fixed by switching to `-F "configuration=@..."` and removing the conflicting `Content-Type` header (curl sets the multipart boundary automatically).
4. **Token extraction in the CronJob was order-fragile.** The original `grep -o '"token":"[^"]*' | cut -d'"' -f4` would match the *first* `"token":"..."` occurrence in the response. Since the response shape is `{"token":{"token":"...", ...}}`, the outer `"token"` key is followed by `{`, so the inner string is what is matched — but to make this robust against response field reordering, I added `tail -n1` so the inner string token is selected even if other `"token":"..."` fields appear earlier.

## Review Notes
- The post correctly notes that backups should be stored externally (S3, secrets manager) and that a dedicated, non-admin backup user should be used.
- Per the NeuVector restore documentation, configuration backups also require restoring the corresponding `neuvector-store-secret` because the export is encrypted with that secret. The post already covers backing up secrets in Step 3, but readers should be aware that restoring without the matching store secret will fail to decrypt — this could be made more explicit in a future revision.
- NeuVector's documented restore guidance is that backups apply to the same cluster they were exported from; cross-cluster restores are not officially supported. The post's "Restore from Backup" example uses `neuvector-new.example.com`, which is fine for a DR scenario where the same store secret is restored alongside the config, but readers attempting environment replication should be aware of this constraint.
- The default REST API port for the NeuVector controller is `10443` when accessed externally; the post uses HTTPS hostnames without a port, which is valid if a reverse proxy / Service / Ingress maps 443 → 10443. This is fine as-is.
