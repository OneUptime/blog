# Validation Summary: How to Test GraphQL APIs over IPv6

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- GraphQL over HTTP
- IPv6 URL literals
- curl
- Jest
- Node.js HTTP server testing
- Python requests
- pytest
- k6
- OneUptime API monitoring

## Sources Consulted
- RFC 3986 URI Generic Syntax: https://datatracker.ietf.org/doc/html/rfc3986#section-3.2.2
- RFC 3849 IPv6 Documentation Address Prefix: https://datatracker.ietf.org/doc/html/rfc3849
- curl man page: https://curl.se/docs/manpage.html
- GraphQL over HTTP draft specification: https://graphql.github.io/graphql-over-http/draft/#sec-POST
- GraphQL draft specification, type name introspection: https://spec.graphql.org/draft/#sec-Type-Name-Introspection
- Node.js net server documentation: https://nodejs.org/api/net.html
- Node.js global fetch documentation: https://nodejs.org/api/globals.html#fetch
- Jest globals API documentation: https://jestjs.io/docs/api
- Requests quickstart and timeout documentation: https://requests.readthedocs.io/en/latest/user/quickstart/
- pytest parametrization documentation: https://docs.pytest.org/en/stable/how-to/parametrize.html
- Grafana k6 HTTP Response documentation: https://grafana.com/docs/k6/latest/javascript-api/k6-http/response/
- Grafana k6 http.post documentation: https://grafana.com/docs/k6/latest/javascript-api/k6-http/post/
- OneUptime API Monitor documentation: https://oneuptime.com/docs/monitor/api-monitor

## Issues Found
1. **Documentation IPv6 address could be mistaken for a reachable remote server**: Clarified the curl and k6 examples that `2001:db8::1` is a placeholder that should be replaced with the reader's server address. RFC 3849 reserves `2001:db8::/32` for documentation.

2. **Jest cleanup did not wait for Node's asynchronous server shutdown**: Changed `afterAll(() => server.close())` to return a Promise that resolves from the `server.close()` callback. Node documents `server.close()` as asynchronous, and Jest waits only when hooks return a Promise or use an async function.

3. **pytest skip path did not handle request timeouts**: Added `requests.exceptions.Timeout` to the caught exceptions in the multi-address test. Requests raises `Timeout` separately from `ConnectionError`, so an unreachable IPv6 test endpoint could otherwise fail instead of being skipped.

4. **OneUptime monitor type was imprecise for POST health checks**: Changed "HTTP monitors" to "API monitors" because OneUptime's API monitor documentation explicitly supports POST requests, custom headers, and JSON request bodies.

## Review Notes
- The bracketed IPv6 URL form, such as `http://[::1]:4000/graphql`, is correct for URI host literals.
- The GraphQL POST examples use the standard JSON body shape with `query` and optional `variables` fields.
- curl's `-6`, `-H`, and `-d` usage is valid; `-X POST` is redundant when `-d` is present but not incorrect.
- The Jest example relies on Node.js global `fetch`, which is available in current Node.js releases. Older Node.js versions would need a fetch polyfill.
