# Validation Summary: How to Set Up a Webhooks Server on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- adnanh/webhook
- JSON hook configuration
- Bash scripting
- systemd services
- Nginx reverse proxy and TLS
- GitHub/GitLab webhook signatures
- HMAC validation
- Certbot

## Sources Consulted
- adnanh/webhook README: https://github.com/adnanh/webhook
- adnanh/webhook hook definition docs: https://github.com/adnanh/webhook/blob/master/docs/Hook-Definition.md
- adnanh/webhook hook rules docs: https://github.com/adnanh/webhook/blob/master/docs/Hook-Rules.md
- adnanh/webhook request value docs: https://github.com/adnanh/webhook/blob/master/docs/Referencing-Request-Values.md
- adnanh/webhook CLI parameter docs: https://github.com/adnanh/webhook/blob/master/docs/Webhook-Parameters.md
- adnanh/webhook template docs: https://github.com/adnanh/webhook/blob/master/docs/Templates.md
- adnanh/webhook systemd activation docs: https://github.com/adnanh/webhook/blob/master/docs/Systemd-Activation.md
- adnanh/webhook latest GitHub release metadata: https://api.github.com/repos/adnanh/webhook/releases/latest
- Nginx HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- systemd.exec manual: https://www.freedesktop.org/software/systemd/man/systemd.exec.html

## Issues Found
- Updated the pinned prebuilt `webhook` release from `2.8.1` to `2.8.3`, which is the current latest release.
- Updated the source build command to match upstream documentation: `go build github.com/adnanh/webhook`.
- Fixed `pass-file-to-command` examples that attempted to read a payload key named `payload.json`. The correct way to pass the whole payload is `source: "entire-payload"` and the generated temporary file path is exposed through an environment variable.
- Fixed the debug script to read the payload file path from `PAYLOAD_FILE` instead of `$1`, matching `pass-file-to-command` behavior.
- Added the required `-template` flag to the systemd `ExecStart` command because `getenv` is only evaluated when the hooks file is parsed as a Go template.
- Updated `getenv` examples to use the upstream documented template form with `| js`, and marked those snippets as templated text rather than plain JSON.
- Corrected the systemd comment that described `-secure` as binding to localhost. The actual flag in use is `-ip 127.0.0.1`; `-secure` enables HTTPS in `webhook`.
- Added a caveat that `webhook`'s `ip-whitelist` trigger rule checks the reverse proxy address when running behind Nginx, so client IP allowlisting should be enforced in Nginx in that deployment.
- Updated the Nginx HTTPS example from deprecated `listen ... http2` syntax to the current `http2 on;` directive syntax.

## Review Notes
Validated the remaining JSON code fences with `jq`. The templated hook examples are intentionally fenced as text because they are rendered by Go templates before becoming JSON.
