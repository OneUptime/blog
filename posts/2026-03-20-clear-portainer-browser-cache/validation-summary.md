# Validation Summary: How to Clear the Portainer Browser Cache to Fix UI Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Portainer
- Browser caching
- Chrome DevTools
- Google Chrome
- Mozilla Firefox
- Microsoft Edge
- Reverse proxies / CDNs

## Sources Consulted
- Portainer FAQ: After upgrading, why doesn’t my version number match the latest version? https://docs.portainer.io/faqs/upgrading/after-upgrading-why-doesnt-my-version-number-match-the-latest-version
- Portainer FAQ: Unable to Authenticate After Portainer Update https://docs.portainer.io/faqs/troubleshooting/access-and-authentication/unable-to-authenticate-after-portainer-update
- Portainer source: webpack output filenames use content hashes https://github.com/portainer/portainer/blob/e7ec69708e599d63197b7df073de716a15d8bc5a/webpack/webpack.common.js
- Portainer source: static file handler cache headers https://github.com/portainer/portainer/blob/e7ec69708e599d63197b7df073de716a15d8bc5a/api/http/handler/file/handler.go
- Portainer source: HTML no-cache meta tags https://github.com/portainer/portainer/blob/e7ec69708e599d63197b7df073de716a15d8bc5a/app/index.html
- Chrome DevTools: Application panel overview https://developer.chrome.com/docs/devtools/application
- Chrome DevTools: Keyboard shortcuts https://developer.chrome.com/docs/devtools/shortcuts
- Chrome Help: Delete browsing data in Chrome https://support.google.com/chrome/answer/2392709?co=GENIE.Platform%3DDesktop&hl=en
- Chrome Help: Browse in Incognito mode https://support.google.com/chrome/answer/95464?hl=en-GB&ref_topic=7439636
- Firefox Help: Keyboard shortcuts - Perform common Firefox tasks quickly https://support.mozilla.org/en-US/kb/keyboard-shortcuts-perform-firefox-tasks-quickly
- Firefox Help: Clear cookies and site data in Firefox https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox
- Firefox Help: Private Browsing - Use Firefox without saving history https://support.mozilla.org/en-US/kb/private-browsing-use-firefox-without-history
- Microsoft Support: Keyboard shortcuts in Microsoft Edge https://support.microsoft.com/en-gb/microsoft-edge/keyboard-shortcuts-in-microsoft-edge-50d3edab-30d9-c7e4-21ce-37fe2713cfad
- NGINX documentation: ngx_http_headers_module https://nginx.org/en/docs/http/ngx_http_headers_module.html

## Issues Found
- The DevTools instructions were too specific and did not match the current Chrome/Edge Application panel structure. I updated them to the current `Application > Storage > Clear site data` flow without relying on outdated checkbox names.
- The Firefox manual-clear steps used outdated labels (`Cache`, `Cookies`, `Clear Now`). I updated them to the current Firefox wording: `When: Everything`, `Cookies and site data`, `Temporary cached files and pages`, and `Clear`.
- The incognito explanation was too absolute about “no cached data” and “definitely the browser cache.” I tightened that language to reflect current browser behavior while staying aligned with Portainer’s own troubleshooting guidance.
- The reverse-proxy header section was technically misleading. Portainer already serves HTML with `Cache-Control: no-cache, no-store, must-revalidate` and non-HTML assets with a long `max-age`, so I replaced the custom NGINX override example with correct guidance to preserve Portainer’s upstream cache headers when using a reverse proxy or CDN.
- The service-worker section incorrectly implied that Portainer itself may register a service worker. I corrected this to the accurate statement that a service worker on the same origin can affect caching, without attributing that behavior to Portainer itself.

## Review Notes
- Portainer’s documentation explicitly recommends testing in private/incognito mode after upgrades to confirm browser-side cached data issues.
- Portainer’s source confirms both content-hashed frontend bundles and built-in cache-control behavior, so custom reverse-proxy cache overrides should be treated as exceptions, not defaults.
- Browser UI labels can drift between releases, so the revised post avoids over-specific wording where vendor documentation does not guarantee identical labels across versions.
