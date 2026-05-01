# Validation Summary: How to Display IPv6 Addresses in Web UI

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 address text representation
- URI and URL formatting
- JavaScript
- React
- Clipboard API
- CSS

## Sources Consulted
- RFC 3986: Uniform Resource Identifier (URI): Generic Syntax - https://datatracker.ietf.org/doc/html/rfc3986
- RFC 4291: IP Version 6 Addressing Architecture - https://www.rfc-editor.org/rfc/rfc4291
- RFC 5952: A Recommendation for IPv6 Address Text Representation - https://www.rfc-editor.org/rfc/rfc5952.html
- RFC 6874: Representing IPv6 Zone Identifiers in Address Literals and Uniform Resource Identifiers - https://www.rfc-editor.org/rfc/rfc6874.html
- URL Standard (WHATWG) - https://url.spec.whatwg.org/
- MDN: `URL.hostname` - https://developer.mozilla.org/en-US/docs/Web/API/URL/hostname
- MDN: Clipboard `writeText()` - https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText
- MDN: Clipboard API - https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API
- React Docs: `useState` - https://react.dev/reference/react/useState
- MDN: `user-select` - https://developer.mozilla.org/en-US/docs/Web/CSS/user-select
- MDN: `<button>` - https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button

## Issues Found
- `expandIPv6()` incorrectly used the `URL` API as if it would expand compressed IPv6 addresses into eight hextets. `URL.hostname` normalizes hostnames, but it does not provide the full expanded IPv6 form. I replaced it with explicit IPv6 parsing and expansion logic.
- `getIPv6Prefix64()` split the input on `:` and could generate invalid results for compressed addresses such as `2001:db8::1`. I changed it to derive the prefix from normalized hextets.
- `truncateIPv6()` truncated raw characters even though the comment said it showed address groups. That could cut through hextet boundaries. I updated it to truncate by IPv6 groups instead.
- The React `IPv6Address` example computed `displayAddress` but never used it, so the shortened-display behavior described by the post did not actually happen. I wired the component to `truncateIPv6()` when `showFull` is false.
- The copy button lacked `type="button"`, which can cause accidental form submission when used inside a form. I added `type="button"` and wrapped clipboard writes in `try/catch`.
- `createIPv6Link()` and `IPv6Link` duplicated formatting logic and rendered bracketed text incorrectly for IPv4 addresses. I updated both to use `formatForURL()` so the generated link text and `href` stay correct for both IPv4 and IPv6.
- `sortIPv6()` relied on `URL` normalization and lexicographic comparison of compressed strings, which does not reliably sort IPv6 addresses numerically. I changed it to sort by fully expanded, zero-padded hextets.
- `formatForURL()` only added brackets, but zone identifiers in URIs require `%` to be encoded as `%25` per RFC 6874. I updated the helper to encode zone identifiers before bracketing.

## Review Notes
- `navigator.clipboard.writeText()` requires a secure context and browser permission/user activation rules still apply, so the example is correct for normal HTTPS app contexts but should not be assumed to work in insecure contexts.
- RFC 6874 defines URI encoding for IPv6 zone identifiers, but real browser behavior around navigating link-local URLs with zone IDs can still vary. The helper now emits the standards-compliant form.
