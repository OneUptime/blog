# Validation Summary: How to Use the --license-key Flag for Portainer Business Edition

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Docker
- Docker Compose
- Portainer HTTP API
- Shell commands

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer licensing FAQ for command-line licensing: https://docs.portainer.io/faqs/licensing/is-there-a-way-to-specify-the-license-at-the-command-line
- Portainer license management UI: https://docs.portainer.io/admin/licenses
- Portainer initial setup flow: https://docs.portainer.io/start/install/server/setup
- Portainer license migration FAQ: https://docs.portainer.io/faqs/licensing/how-can-i-move-my-license-from-one-instance-to-another
- Portainer activity logs docs: https://docs.portainer.io/admin/logs/activity
- Portainer settings and S3 backup docs: https://docs.portainer.io/admin/settings/general
- Portainer authentication settings docs: https://docs.portainer.io/admin/settings/authentication
- Docker Compose top-level `version` deprecation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose named volumes reference: https://docs.docker.com/reference/compose-file/volumes/
- Portainer source for current license API client behavior: https://github.com/portainer/portainer/blob/develop/app/react/portainer/licenses/license.service.ts
- Portainer source for current license sidebar label: https://github.com/portainer/portainer/blob/develop/app/react/sidebar/SettingsSidebar.tsx
- Portainer source for `/api/system/info`: https://github.com/portainer/portainer/blob/develop/api/http/handler/system/system_info.go
- Portainer source for `/api/system/version`: https://github.com/portainer/portainer/blob/develop/api/http/handler/system/version.go
- Portainer source for `/api/auth`: https://github.com/portainer/portainer/blob/develop/api/http/handler/auth/authenticate.go

## Issues Found
- The post said `portainer.io/take-3` provides a free 5-node trial. Current Portainer docs point to `take-3` for 3 free nodes, so I corrected the node count and removed the inaccurate “5-node trial” wording.
- The post implied a fixed license-key format. Current Portainer behavior and docs show license formats vary by license type, so I removed the incorrect example format.
- The UI path for adding a license was outdated. I changed `Settings → License → Apply License` to the current `Licenses → Add license` flow.
- The Docker Compose snippets used the obsolete top-level `version` field. I removed it to match the current Compose specification.
- The second Compose example was described as a Docker secret example, but it was actually `.env` interpolation and also used the wrong variable name in the comment. I corrected the wording, fixed the variable name, and added the missing top-level `volumes` declaration.
- The API verification example used `/api/system/info` to fetch `Version` and `InstanceID`, but the current handler does not return those fields. I changed the example to use `/api/system/version` for version details and `/api/licenses/info` for license state.
- The license update API payload was wrong. The current Portainer client posts `{"licenseKeys":[...]}` to `/api/licenses`, so I replaced the invalid `{"key": ...}` payload.
- The migration example tried to export a license key from the API and reuse it directly. Current Portainer guidance is that licenses are not concurrent-use licenses, so I changed the example to stop the old instance first and reuse the original license key on the new instance.
- The “license key file” example mounted a file into the container unnecessarily while reading it on the host with shell substitution. I corrected it to read the host file at launch time and inject it through `PORTAINER_LICENSE_KEY`.
- The post claimed the environment-variable approach was “more secure” and recommended Docker secrets in the conclusion without an officially documented Portainer license-secret mechanism. I softened that guidance to match what the docs and examples actually support.

## Review Notes
- The post still uses the `portainer/portainer-ee:latest` image tag. This is valid, but pinning a specific LTS or STS tag would make the deployment examples more reproducible.
