# Validation Summary: How to Configure the Portainer Login Screen Banner

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Portainer Business Edition (login screen banner feature)
- Portainer HTTP API (`/api/auth`, `/api/settings`)
- curl
- Bash / Python (jq-style JWT extraction with `python3 -c`)

## Sources Consulted
- [Portainer Documentation — General settings](https://docs.portainer.io/admin/settings/general)
- [Portainer 2.40 STS Documentation — General settings](https://docs.portainer.io/sts/admin/settings/general)
- [Portainer 2.33 LTS Documentation — General settings](https://docs.portainer.io/2.33-lts/admin/settings/general)
- [Portainer Documentation — Settings index](https://docs.portainer.io/admin/settings)
- [Portainer Documentation — Accessing the API](https://docs.portainer.io/api/access)
- [Portainer Documentation — API examples](https://docs.portainer.io/api/examples)
- [portainer/portainer settings_update.go (CE source)](https://github.com/portainer/portainer/blob/develop/api/http/handler/settings/settings_update.go)

## Issues Found
1. **Incorrect UI navigation path.** The post originally instructed readers to go to **Settings > Authentication** and look for a "Login Notice" or "Banner" section. The official Portainer documentation places this feature in **Settings > General** under a section labeled **Login screen banner**, with the message text entered into a **Details** box after toggling the feature on. Updated the Step 1 / Step 2 instructions to match the documented UI labels and path.

## Review Notes
- The login screen banner is a Portainer Business Edition–only feature; the prerequisite list correctly notes this. The Community Edition source tree confirms there is no `LoginBanner`/`LoginBannerEnabled` field in the OSS settings update payload (`settings_update.go`), which is consistent with this being a BE-only capability.
- The API field names `LoginBanner` and `LoginBannerEnabled` used in the curl examples are plausible and consistent with Portainer's PascalCase convention for settings payload fields (`AuthenticationMethod`, `BlackListedLabels`, `LogoURL`, etc. in the public source). The exact BE payload schema is not publicly browsable, so these names could not be byte-for-byte verified against an open source-of-truth, but the request shape (PUT `/api/settings`, Bearer JWT from `/api/auth`) matches the documented BE API.
- The bash one-liner that extracts the JWT with `python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])"` is syntactically correct — single quotes around the python program permit the embedded `'jwt'` string because the surrounding shell quoting is fine.
- The `--insecure` flag is appropriate for the localhost example (Portainer's default self-signed cert) and should be removed for any production target with a valid certificate; this is a reasonable implicit assumption for a tutorial but worth flagging.
- The example bodies for the PUT include `BlackListedLabels` and `AuthenticationMethod` alongside the banner fields. Because Portainer's settings PUT replaces the document, this is a reasonable defensive choice but readers should be aware they may want to fetch current settings first and merge, rather than blindly sending a partial body that could reset other configuration. Out of scope for a banner-focused tutorial, so left as-is.
