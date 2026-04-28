# Validation Summary: How to Integrate NeuVector with CI/CD Pipelines

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- NeuVector (REST API: `/v1/auth`, `/v1/user`, `/v1/scan/repository`, role `ciops`)
- Bash / curl / jq scan script
- GitHub Actions (`actions/checkout@v4`, `docker/setup-buildx-action@v3`, `docker/build-push-action@v5`, `docker/login-action@v3`)
- GitLab CI (stages, `needs`, `only`)
- Tekton Pipelines (`Task` CRD)
- Container registries (GHCR, Docker Hub)

## Sources Consulted
- NeuVector OpenAPI spec (`apis.yaml`): https://github.com/neuvector/neuvector/blob/main/controller/api/apis.yaml — confirmed that `/v1/scan/image` is GET-only (runtime workload scan summary) and that the correct POST scan endpoint is `/v1/scan/repository`, with required fields `registry`, `repository`, `tag`, `scan_layers`, `base_image`. Also confirmed the response field is `report.vulnerabilities` (plural) and that POST `/v1/user` uses `RESTUserData` (wrapper key `user`), while `RESTUserConfigData` (wrapper key `config`) is used by PATCH.
- NeuVector docs — Users and Roles: https://open-docs.neuvector.com/configuration/users/ — confirmed default roles include Admin, Reader, and CI/Ops; the API role string is `ciops`.
- NeuVector docs — REST API and Automation: https://open-docs.neuvector.com/automation/automation/
- Tekton — Migrating from v1beta1 to v1: https://tekton.dev/docs/pipelines/migrating-v1beta1-to-v1/ — confirmed `tekton.dev/v1` is the current stable version (v1beta1 deprecated since Pipelines v0.50.0).
- Companion validated post `posts/2026-03-20-neuvector-container-image-scanning/README.md` for cross-referencing API conventions used elsewhere in the series.

## Issues Found
1. **Wrong scan endpoint.** The post used POST `/v1/scan/image` to submit scan requests. That endpoint exists only as a GET (returns runtime scan summary by workload image). The correct endpoint for submitting an image scan is POST `/v1/scan/repository`. Fixed in Step 2 (script), Step 4 (GitLab CI), and Step 5 (Tekton).
2. **Wrong request body shape for the scan API.** The post passed `tag: "<image>:<tag>"` as a single combined string. The `RESTScanRepoReq` schema requires separate `repository` and `tag` fields. Updated the script to split `IMAGE` into `REPOSITORY` and `TAG` before posting, and updated the GitLab CI and Tekton snippets to pass the two fields separately.
3. **Wrong response field for vulnerabilities.** All `jq` filters used `.report.vulnerability[]`. The actual response field is `.report.vulnerabilities[]` (plural). Fixed every occurrence in the scan script, GitLab CI block, and Tekton block.
4. **Wrong wrapper key for POST `/v1/user`.** The user-creation example wrapped the body in `"config": { … }`, which is the schema for PATCH (update). POST uses `RESTUserData`, which wraps in `"user": { … }`. Also removed the redundant `username` field — NeuVector identifies local users by `fullname` in this schema (matches the convention used in the validated companion post). Kept the `ciops` role and 300-second timeout.
5. **Outdated Tekton API version.** The Tekton example used `apiVersion: tekton.dev/v1beta1`, which has been deprecated since Tekton Pipelines v0.50.0 in favor of `tekton.dev/v1`. Updated to `tekton.dev/v1` and reshaped the params (`repository`, `tag`, `registry`) so the body matches the corrected scan API.

## Review Notes
- The post addresses the Manager on `https://neuvector-manager:8443`, while the validated companion post (`neuvector-container-image-scanning`) uses the Controller directly on `https://neuvector-svc-controller:10443`. Both are valid — the Manager proxies REST API calls to the Controller — so this was left as written.
- The GitHub Actions step gates the push on `steps.scan.outcome == 'success'`. For a non-`continue-on-error` step, GitHub will short-circuit the job on failure anyway, so the explicit `if` is belt-and-suspenders rather than strictly necessary, but it is technically correct and harmless. Not changed.
- The `NEUVECTOR_URL` example value `https://neuvector.company.com` in the GitLab snippet does not include a port. In real deployments the Manager listens on 8443 and the Controller on 10443; readers may need to add a port suffix depending on how they expose the API. Not changed since the post is illustrative.
- The plaintext password embedded in the user-creation curl (`CIPipelineSecure456!`) is clearly a placeholder, but in a production setting this should be sourced from a secret manager rather than embedded in the command. Out of scope for a technical-correctness fix.
