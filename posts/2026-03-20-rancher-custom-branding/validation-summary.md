# Validation Summary: How to Configure Custom Branding in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Rancher Dashboard UI customization
- Rancher v3 API
- Rancher management settings
- Bash
- cURL
- Kubernetes Secrets

## Sources Consulted
- Rancher Custom Branding docs: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/custom-branding
- Rancher Authentication, Permissions and Global Settings docs: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration
- Rancher Previous v3 API Guide: https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide
- Rancher API Keys docs: https://ranchermanager.docs.rancher.com/reference-guides/user-settings/api-keys
- Rancher dashboard source, release-2.14, branding settings/constants: https://github.com/rancher/dashboard/blob/release-2.14/shell/config/settings.ts
- Rancher dashboard source, release-2.14, branding page implementation: https://github.com/rancher/dashboard/blob/release-2.14/shell/pages/c/_cluster/settings/brand.vue
- Rancher dashboard source, release-2.14, Home links legacy settings handling: https://github.com/rancher/dashboard/blob/release-2.14/shell/config/home-links.js
- Rancher dashboard source, release-2.6, legacy Support Links branding UI strings: https://github.com/rancher/dashboard/blob/release-2.6/shell/assets/translations/en-us.yaml

## Issues Found
1. Corrected the prerequisite permissions. Rancher’s documentation says custom branding requires at least cluster member permissions, not full admin access.
2. Corrected the supported asset guidance. The post claimed ICO favicons and 32x32 requirements, but the Rancher dashboard branding UI accepts JPEG/PNG/SVG uploads and documents 20 KB limits instead.
3. Corrected the settings reference table. The original table reversed the light/dark logo meanings, omitted `ui-link-color`, used inaccurate defaults for several settings, and described `ui-issues` as a boolean flag when it is used as a custom issue-reporting URL.
4. Corrected the UI instructions. The field label is `Private Label`, not `Company Name / Product`, and recent Rancher versions manage default external links under `Home Links` rather than directly on the Branding page.
5. Corrected the API script authentication. Rancher’s v3 API guide documents HTTP basic authentication with API keys; the post’s `Authorization: Bearer ...` example was replaced with `curl -u`.
6. Corrected the base64/data URL handling in the API script. The original script used GNU-specific `base64 -w 0` and hard-coded `image/png` MIME types, which was inconsistent with the post’s SVG/PNG asset guidance. The script now uses a portable base64 pattern and derives the correct MIME type from the file extension.
7. Corrected the issue-link configuration examples. The original post set `ui-issues` to `false`, but Rancher uses that setting for a URL. The examples now show redirecting it to an internal support endpoint instead.
8. Corrected the disaster-recovery guidance. Storing the script in a Kubernetes Secret does not reapply branding by itself, so the post now explicitly states that an automation workflow still needs to execute the script.

## Review Notes
- Rancher v2.14 still supports the legacy `/v3` API, but Rancher’s documentation positions it as the previous API alongside the newer Rancher Kubernetes API.
- Rancher v2.6 exposed `Support Links` directly on the Branding page, while newer versions emphasize `Home Links` for controlling default external links. The updated post reflects that version-sensitive behavior.
