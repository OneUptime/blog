# Validation Summary: How to Use Python requests Library with IPv6

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Python
- Requests
- urllib3
- IPv6
- HTTP/HTTPS
- DNS and socket resolution

## Sources Consulted
- Requests transport adapter source docs: https://requests.readthedocs.io/en/latest/_modules/requests/adapters/
- Requests advanced usage docs: https://requests.readthedocs.io/en/stable/user/advanced/
- urllib3 connection pool docs: https://urllib3.readthedocs.io/en/stable/reference/urllib3.connectionpool.html
- urllib3 connection docs: https://urllib3.readthedocs.io/en/stable/reference/urllib3.connection.html
- Python `socket` docs: https://docs.python.org/3/library/socket.html
- RFC 2732: https://datatracker.ietf.org/doc/html/rfc2732
- RFC 3986: https://www.rfc-editor.org/rfc/rfc3986
- HTTPX async docs: https://www.python-httpx.org/async/

## Issues Found
- The custom adapter example was not valid for current `requests`: it overrode `HTTPAdapter.get_connection`, which is deprecated in current Requests documentation, referenced `_get_host()` / `_get_port()` helpers that are not part of the adapter API, and only defined an HTTP pool. I replaced it with a working `init_poolmanager()`-based adapter that wires in custom HTTP and HTTPS connection pools for IPv6-only dialing.
- The `socket.getaddrinfo` monkey-patch example only reordered IPv6 ahead of IPv4, so it did not actually force IPv6 as claimed. It also restored the patch only on the happy path and relied on fragile private response internals to detect the peer address. I changed it to force IPv6 for `AF_UNSPEC` lookups, wrapped it in `try/finally`, and used a public-IP service response instead.
- The connectivity test used `http://[2001:4860:4860::8888]`, which is Google Public DNS and not an HTTP endpoint. I replaced that check with an IPv6 AAAA-resolution test plus an outbound HTTP check that reports whether the observed public address is IPv6.
- The API client example used `2001:db8::api`, which is not a valid IPv6 literal because `api` is not hexadecimal. I corrected it to a valid documentation address in `2001:db8::/32`.
- I also updated the URL syntax reference to mention RFC 3986 alongside RFC 2732, which reflects the current URI grammar that incorporates IP-literal bracket notation.

## Review Notes
- All five Python code blocks compile after the fixes, and the custom adapter plus resolver-patch examples were exercised locally with `requests 2.31.0` and `urllib3 2.0.7`.
- The `verify=False` example is acceptable for testing, but HTTPS verification against a literal IPv6 address only succeeds with `verify=True` when the certificate includes that IP address in the subject alternative name.
