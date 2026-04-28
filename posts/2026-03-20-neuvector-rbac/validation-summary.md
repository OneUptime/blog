# Validation Summary: How to Configure NeuVector RBAC

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- NeuVector (RBAC, REST API, password profile, federation roles)
- Kubernetes RBAC (ClusterRole, ClusterRoleBinding)
- NeuVector CRDs (`nvsecurityrules`, `nvclustersecurityrules` in `neuvector.com` API group)
- `curl` and `jq`

## Sources Consulted
- NeuVector Users and Roles documentation: https://open-docs.neuvector.com/configuration/users/
- NeuVector REST API and Automation: https://open-docs.neuvector.com/automation/automation/
- NeuVector Connect to Manager / REST API server: https://open-docs.neuvector.com/configuration/console/
- NeuVector Deploy Using ConfigMap (password profile fields): https://open-docs.neuvector.com/deploying/production/configmap/
- NeuVector Custom Resource Definitions: https://open-docs.neuvector.com/policy/usingcrd/
- NeuVector Helm CRD chart (canonical CRD plural names): https://github.com/neuvector/neuvector-helm/blob/master/charts/crd/templates/crd.yaml
- NeuVector OpenAPI/Swagger spec for `RESTUser`, `RESTUserConfig`, `RESTUserData`, `RESTPwdProfileConfig`, `/v1/user`, `/v1/password_profile/{name}`, `/v1/system/config`: https://raw.githubusercontent.com/neuvector/neuvector/main/controller/api/apis.yaml
- NeuVector controller source for `handlerUserCreate` / `handlerUserConfig` (verifying request wrappers and `clear_failed_login` semantics): https://raw.githubusercontent.com/neuvector/neuvector/main/controller/rest/user.go
- SUSE KB: configuring failed-login behavior (`enable_block_after_failed_login`, `block_after_failed_login_count`, `block_minutes`): https://www.suse.com/support/kb/doc/?id=000021275

## Issues Found

1. **Built-in roles table listed non-existent roles.** The original table claimed "Runtime Security" and "Compliance" were built-in roles. Per the official Users & Roles docs, only `admin`, `reader`, and `ciops` are preconfigured (with `fedAdmin` / `fedReader` for federation). Replaced the table with the actual preconfigured roles and added a note that "runtime policy" / "compliance" are permission categories used to compose custom roles, not roles themselves.

2. **REST API host and port were wrong everywhere.** Examples used `https://neuvector-manager:8443`. The NeuVector REST API is served by the controller on port `10443` (typically via the `neuvector-svc-controller-api` service); port `8443` is the Manager web console. Updated every `curl` URL to `https://neuvector-svc-controller-api.neuvector:10443`.

3. **`POST /v1/user` body used the wrong wrapper.** The handler `handlerUserCreate` unmarshals into `RESTUserData`, which has a top-level `user` field, not `config`. The Step 1 and Step 4 create-user examples were changed from `{"config": ...}` to `{"user": ...}`.

4. **Confused `username` vs `fullname`.** In the create payload, the original used `"username": "security-engineer"` plus `"fullname": "Jane Smith"` (display name). The API treats `fullname` as the user identifier (the controller does `username := ruser.Fullname`). Removed the separate `username` field, set `fullname` to the login name, and adjusted the UI step description and the `jq` selector accordingly.

5. **PATCH `/v1/user/{fullname}` examples were missing `fullname`.** `RESTUserConfig` declares `fullname` as required. Added `fullname` to every PATCH body in Steps 2 and 3.

6. **"Disable a user" example was not real.** The original PATCHed `blocked_for_failed_login: true` against `/v1/user/{name}`. `blocked_for_failed_login` is a read-only status field on `RESTUser`, not a writable config field on `RESTUserConfig`, so this call would be a no-op (the field is silently ignored). Replaced with the correct `clear_failed_login` example against `POST /v1/user/{fullname}/password` (which uses `RESTUserPwdConfigData`) and added a paragraph explaining that NeuVector does not expose a "disable without delete" toggle.

7. **Password policy used the wrong endpoint and wrong wrapper.** The original posted to `PATCH /v1/system/config` with a nested `password_policy` object. There is no `password_policy` field in `RESTSystemConfigConfig`; password rules are managed by `PATCH /v1/password_profile/{name}` against the only supported profile, `default`, using `RESTPwdProfileConfigData` (`{"config": {"name": "default", ...}}`). Rewrote Step 6 to use the correct endpoint, wrapper, and required `name` field.

8. **Password policy field names were wrong.** Replaced:
   - `enable_password_policy` → removed (no such field; behavior is controlled by individual `enable_*` toggles)
   - `require_uppercase` (boolean) → `min_uppercase_count` (integer)
   - `require_lowercase` → `min_lowercase_count`
   - `require_digit` → `min_digit_count`
   - `require_special_character` → `min_special_count`
   - `password_keep_history` → `password_keep_history_count`
   - Added the missing `enable_password_expiration` and `enable_password_history` toggles, which gate the `*_after_days` and `*_history_count` fields.

9. **Step 7 "session settings" used the wrong endpoint and missing toggle.** Moved to `/v1/password_profile/default`, used the documented `session_timeout` field, and added the required `enable_block_after_failed_login: true` toggle (without it, `block_after_failed_login_count` and `block_minutes` are inert).

10. **Kubernetes CRD plural was wrong.** The ClusterRole listed `nvclusterSecurityrules` (mixed case). Kubernetes resource names in RBAC must match the CRD's lowercase plural — per `neuvector-helm/charts/crd/templates/crd.yaml` the correct plural is `nvclustersecurityrules`. Fixed.

## Review Notes
- Settings menu name was updated from "Users & Roles" to "Users, API Keys & Roles", matching the current console.
- The `POST /v1/user` Swagger schema (`RESTUserData` → `RESTUser`) lists many response-only fields (`last_login_timestamp`, `default_password`, `password_resettable`, etc.) as required. In practice the controller's create handler only requires `fullname`, `password`, and `role`, which is what the post now shows.
- NeuVector currently supports only one password profile, `default`. If multi-profile support is added in a future release, the URL path would need to change.
- The Kubernetes ClusterRole/ClusterRoleBinding example in Step 8 grants Kubernetes API access to the NeuVector CRDs themselves; it does not propagate into the NeuVector application's RBAC. That distinction is implicit in the post's framing ("Integrate NeuVector RBAC with Kubernetes service accounts") but may be worth making explicit in a future revision.
