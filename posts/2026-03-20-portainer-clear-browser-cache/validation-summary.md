# Validation Summary: How to Clear the Portainer Browser Cache to Fix UI Issues - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Browser cache and site data
- Chrome DevTools
- Google Chrome
- Mozilla Firefox
- Safari
- JavaScript browser APIs

## Sources Consulted
- Portainer FAQ: After upgrading, why doesn’t my version number match the latest version? - https://docs.portainer.io/faqs/upgrading/after-upgrading-why-doesnt-my-version-number-match-the-latest-version
- Portainer FAQ: Unable to Authenticate After Portainer Update - https://docs.portainer.io/faqs/troubleshooting/access-and-authentication/unable-to-authenticate-after-portainer-update
- Portainer source repository review (`localStorage`, `sessionStorage`, auth cookie handling, no current service-worker usage found in the app code) - https://github.com/portainer/portainer
- Chrome DevTools: Application panel overview - https://developer.chrome.com/docs/devtools/application
- Google Chrome Help: Delete browsing data in Chrome - https://support.google.com/chrome/answer/95582
- Firefox Help: Clear cookies and site data in Firefox - https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox
- Apple Support: Clear your cache and cookies in Safari on Mac - https://support.apple.com/en-mide/guide/safari/sfri11471/mac
- Apple Support: Clear your browsing history in Safari on Mac - https://support.apple.com/en-bw/guide/safari/sfri47acf5d6/mac
- Apple Support: Browse privately in Safari on Mac - https://support.apple.com/en-tm/guide/safari/ibrw1069/mac
- MDN: `Location.reload()` - https://developer.mozilla.org/en-US/docs/Web/API/Location/reload
- MDN: `Document.cookie` - https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie
- MDN: `Window.localStorage` - https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
- MDN: Same-origin policy - https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy
- MDN: `ServiceWorkerContainer.getRegistrations()` - https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/getRegistrations

## Issues Found
- The post claimed Portainer-relevant browser data included IndexedDB and service workers, but current Portainer source usage reviewed for this validation shows active use of `localStorage`, `sessionStorage`, and cookies instead. I removed the misleading rows and added a caveat to the service-worker section.
- The Chrome DevTools "Clear site data" steps listed a fixed set of checkboxes, including obsolete/version-specific items like Application Cache. I changed the instructions to the stable documented flow and noted that the exact categories vary by Chrome version and available site data.
- The Firefox and Safari clearing steps were outdated. I updated Firefox to the current `Settings > Privacy & Security > Cookies and Site Data > Clear Data` flow and Safari to `Safari > Settings > Privacy > Manage Website Data`, with `History > Clear History` as an extra step when needed.
- The console snippet used `localStorage.clear()` and `sessionStorage.clear()` while claiming to target only Portainer data. Those calls clear the entire origin, not only Portainer keys. I replaced them with code that removes only keys prefixed with `portainer`.
- The console snippet claimed to clear cookies from JavaScript, but Portainer's auth cookie is set as `HttpOnly`, so JavaScript cannot reliably remove it. I removed that claim and added a note to use browser site-data tools for cookies.
- Both JavaScript snippets used `window.location.reload(true)`. MDN documents the boolean argument as non-standard and only supported in Firefox. I changed both to `window.location.reload()`.
- The service-worker cleanup snippet reloaded immediately without waiting for cache deletion to complete. I rewrote it to await unregister/delete operations before reloading.
- The incognito/private-mode section treated the result as a strict cache-vs-server binary. I corrected it to note that extensions and browser-profile state can also affect the result.
- The URL-change section implied old-domain cache directly affects the new domain, then contradicted itself in the code block. I rewrote it around origin-scoped storage rules and updated the example to Portainer's current default HTTPS port `9443` instead of legacy HTTP `9000`.

## Review Notes
- Portainer's own docs support using private/incognito mode and clearing cached browser data for post-upgrade UI and auth issues, so the overall troubleshooting direction is valid.
- Portainer currently stores client-side state in `localStorage`, `sessionStorage`, and cookies. Browser UI labels and available site-data categories can vary slightly by browser version.
