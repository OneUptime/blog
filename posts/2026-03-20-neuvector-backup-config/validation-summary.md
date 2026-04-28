# Validation Summary: How to Back Up NeuVector Configuration

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- NeuVector (container security platform, SUSE)
- NeuVector REST API (v1)
- Kubernetes (kubectl, CronJob, Secret, PVC)
- SUSE Rancher integration (`cattle-neuvector-system` namespace)
- curl, jq, yq

## Sources Consulted
- [NeuVector REST API and Automation docs](https://open-docs.neuvector.com/automation/automation/)
- [Restoring NeuVector Configuration](https://open-docs.neuvector.com/deploying/restore/)
- [NeuVector Rancher Deployment](https://open-docs.neuvector.com/deploying/rancher/)
- [NeuVector apis.yaml (Swagger spec, main branch)](https://raw.githubusercontent.com/neuvector/neuvector/main/controller/api/apis.yaml)
- [Connect to Manager / REST API server](https://open-docs.neuvector.com/configuration/console/)

## Issues Found

1. **`/v1/file/config` GET response treated as JSON.** The endpoint returns the configuration as a YAML file (the apis.yaml spec describes the import body as "a yaml configure file", and the official NeuVector Python sample tools save the export as YAML). The post saved the export as `.json` and parsed it with `jq '.policies | keys'`, which would fail.
   - **Fix:** Changed the output filename to `.yaml` in Step 2 and Step 4 (CronJob), and changed the verification command to `yq 'keys'`. Added a one-line explainer that the endpoint returns YAML.

2. **`/v1/file/config` POST used wrong content type.** The Swagger spec is explicit: `consumes: multipart/form-data`, with a `configuration` form field of type `file`. The post used `-H "Content-Type: application/json" -d @file.json`, which would be rejected by the controller.
   - **Fix:** Rewrote the Step 5 and Step 6 import commands to use `-F "configuration=@<file>.yaml"` and removed the bogus `Content-Type: application/json` header.

3. **Cross-cluster restore presented without the documented warning.** The official restore docs explicitly state that backup files should only be used to restore on the same cluster they were exported from, and that cross-cluster restore "may result in unpredictable behavior". Step 6 directs the reader to do exactly that.
   - **Fix:** Added a one-sentence note at the top of Step 6 surfacing the official caveat before showing the commands.

4. **Missing mention of `neuvector-store-secret` (KEK).** The official restore docs call out that the Key Encryption Key secret must be backed up alongside the configuration; without it, encrypted fields cannot be decrypted on restore. The post made no mention of this.
   - **Fix:** Added a short note at the end of Step 5 recommending that `neuvector-store-secret` be backed up with the configuration, plus the docs' caveat that a full import overwrites the admin credential in the target cluster.

## Review Notes
- Endpoints `/v1/auth`, `/v1/file/config`, `/v1/policy/rule`, `/v1/admission/rules`, and `/v1/group` were all verified against the upstream Swagger spec at `controller/api/apis.yaml`. The `.token.token` JSON path on the auth response is also correct.
- The `cattle-neuvector-system` namespace and `neuvector-svc-controller` service name are correct for NeuVector deployed via the Rancher Apps & Marketplace / Extensions chart, which matches the post's tagging. NeuVector also ships a `neuvector-svc-controller-api` service intended for external LoadBalancer exposure of port 10443; either works for `kubectl port-forward`, so no change was needed.
- Default credentials `admin/admin` are accurate for a fresh NeuVector install. The post could be improved in a future revision by recommending a dedicated read-only API key or service-account user for the backup CronJob rather than storing the admin password in a Secret, but this is a hardening recommendation rather than a technical error.
- The Best Practices section (S3 versioning, pre-upgrade backups, periodic restore drills) is accurate generic guidance and required no changes.
