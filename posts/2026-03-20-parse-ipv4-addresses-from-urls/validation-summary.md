# Validation Summary: How to Parse IPv4 Addresses from URLs in Various Languages

## Status
validated

## Post Type
Tutorial / Reference (multi-language code examples)

## Technologies Covered
- Python `urllib.parse.urlparse`
- JavaScript WHATWG `URL` API
- Go `net/url` and `net` packages
- Java `java.net.URI` and `InetAddress`
- Regular expressions for IPv4 validation

## Sources Consulted
- Python `urllib.parse` docs: https://docs.python.org/3/library/urllib.parse.html (notably `ParseResult.hostname` strips brackets and lowercases)
- WHATWG URL Standard: https://url.spec.whatwg.org/ (host parsing, `hostname` returns `[::1]` with brackets for IPv6)
- Go `net/url` docs: https://pkg.go.dev/net/url (`URL.Host` includes port; `URL.Hostname()` strips it)
- Go `net` docs: https://pkg.go.dev/net (`SplitHostPort`, `ParseIP`, `IP.To4`)
- Java `java.net.URI` docs: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/net/URI.html
- Java `java.net.InetAddress.getByName` docs: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/net/InetAddress.html#getByName(java.lang.String) (explicitly performs DNS resolution for non-literal hosts)
- RFC 3986 (URI Generic Syntax) for host component definitions

## Issues Found
- **Java example performed an unwanted DNS lookup and could mislabel hostnames as IPv4 addresses.** The original code called `InetAddress.getByName(host)` and returned `host` if the result was an `Inet4Address`. Per the JDK docs, `getByName` resolves any non-literal host via the system resolver — so for the included test URL `http://example.com/`, the lookup succeeds, the resolved address is an `Inet4Address`, and the function would return `"example.com"` (a hostname) instead of `null`. This contradicts the post's stated goal of extracting IPv4 addresses. Replaced the `InetAddress` check with a strict IPv4-literal regex (octets 0–255), matching the approach shown in the post's "Regex Validation" section. No DNS is performed and `example.com` correctly returns `null`.

## Review Notes
- The Python and JavaScript snippets use a permissive regex (`^(\d{1,3}\.){3}\d{1,3}$`) that does not enforce 0–255 octet bounds. This is acceptable in the post's context because:
  - The author calls this out and provides the strict regex in the "Regex Validation" section.
  - The JavaScript WHATWG `URL` constructor itself rejects invalid IPv4 hosts (e.g., `999.999.999.999`) before the regex runs.
  - Python's `urlparse` is purely syntactic and does not validate octet ranges, so a stricter regex would be needed for hard guarantees — the post points readers there.
- The Go snippet works correctly for all test cases. `u.Hostname()` would be a slightly cleaner alternative to `net.SplitHostPort(u.Host)` (it handles missing ports and IPv6 brackets in one call), but the existing approach is functionally correct.
- `urlparse(...).hostname` in Python intentionally lowercases the host and strips IPv6 brackets — irrelevant for numeric IPv4 but worth noting.
- For very modern Java (22+), `InetAddress.ofLiteral(String)` is a non-resolving alternative to `getByName` and could replace the regex. Avoided here to keep the example portable across LTS releases (8/11/17/21).
