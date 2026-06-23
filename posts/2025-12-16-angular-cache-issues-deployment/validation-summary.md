# Validation Summary: How to Fix Angular Cache Issues After Deployment

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Angular CLI
- Angular service worker / PWA support
- Nginx configuration
- HTTP cache headers
- RxJS
- TypeScript
- Bash deployment scripting

## Sources Consulted
- Angular CLI `ng build` documentation: https://angular.dev/cli/build
- Angular workspace configuration documentation: https://angular.dev/reference/configs/workspace-config
- Angular service worker overview: https://angular.dev/ecosystem/service-workers
- Angular service worker devops documentation: https://angular.dev/ecosystem/service-workers/devops
- Nginx `ngx_http_headers_module` documentation: https://nginx.org/en/docs/http/ngx_http_headers_module.html
- Nginx `ngx_http_core_module` documentation for location and `try_files`: https://nginx.org/en/docs/http/ngx_http_core_module.html
- MDN Cache-Control reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control
- MDN X-XSS-Protection reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection
- RxJS `firstValueFrom` documentation: https://rxjs.dev/api/index/function/firstValueFrom
- RxJS `interval` documentation: https://rxjs.dev/api/index/function/interval

## Issues Found
- The post implied `ng build --configuration production` always creates hashed filenames. Updated the wording to clarify that this depends on Angular CLI output hashing being enabled, while noting that the default generated production configuration uses it.
- The Nginx hashed-file regex only matched dotted, lowercase hexadecimal hashes of 16-20 characters. Updated the examples to match both dot and hyphen separators and common alphanumeric hash formats used by Angular build output.
- The initial Nginx snippet cached all JavaScript and CSS files for one year while describing the rule as applying to hashed files. Added a short-cache fallback for non-hashed JavaScript and CSS.
- The complete Nginx configuration used `add_header` in nested `location` blocks without repeating inherited security headers. Nginx only inherits parent `add_header` directives when none are defined at the current level, so repeated the still-current security headers in those locations.
- The example used deprecated `X-XSS-Protection: 1; mode=block`. Removed it because MDN marks the header deprecated and recommends avoiding it.
- The `/assets/version.json` example was fenced as JSON but contained a JavaScript-style comment, making it invalid JSON. Removed the comment from the JSON block.
- The deployment script wrote `assets/version.json` without ensuring the directory existed and left path variables unquoted. Added `mkdir -p "$APP_DIR/assets"` and quoted path variables.
- The deployment script generated the version file after setting ownership and reloading Nginx. Moved version-file generation before the permission and reload steps.

## Review Notes
Local Nginx was not installed, so Nginx validation was documentation-based rather than `nginx -t` based. The local Node.js version was `v22.22.0`, which is below the current Angular CLI 22 minimum, so a fresh Angular 22 build could not be run locally; an Angular CLI 21 generated project was checked to confirm the generated production configuration includes `outputHashing: "all"`. The corrected Bash deployment snippet passed `bash -n`, the JSON example parsed as strict JSON, and `git diff --check` passed.
