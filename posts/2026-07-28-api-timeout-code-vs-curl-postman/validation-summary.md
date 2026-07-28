# Validation Summary: Why Does an API Call Time Out in Code but Succeed with curl or Postman?

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- HTTP clients and timeout semantics
- curl and libcurl
- Postman
- Python Requests and urllib3
- Go `net/http`
- Node.js `http`
- DNS, IPv4/IPv6, and Happy Eyeballs
- HTTP and SOCKS proxies
- TLS, SNI, ALPN, CA certificates, and mutual TLS
- HTTP redirects, retries, connection pooling, and keepalive reuse
- Kubernetes networking and application concurrency

## Sources Consulted

- [curl command-line manual](https://curl.se/docs/manpage.html)
- [libcurl environment variables](https://curl.se/libcurl/c/libcurl-env.html)
- [libcurl `CURLOPT_HAPPY_EYEBALLS_TIMEOUT_MS`](https://curl.se/libcurl/c/CURLOPT_HAPPY_EYEBALLS_TIMEOUT_MS.html)
- [Python Requests advanced usage and timeout documentation](https://docs.python-requests.org/en/latest/user/advanced/#timeouts)
- [Go `net/http` package documentation](https://pkg.go.dev/net/http)
- [Node.js HTTP documentation](https://nodejs.org/api/http.html)
- [Postman proxy configuration](https://learning.postman.com/docs/getting-started/installation/proxy/)
- [Postman CA and client certificate documentation](https://learning.postman.com/docs/use/send-requests/authorization/certificates/)
- [Postman request debugging documentation](https://learning.postman.com/docs/use/send-requests/response-data/troubleshooting-api-requests/)
- [Kubernetes: Debug Running Pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/)
- [Kubernetes NetworkPolicy API reference](https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/)
- [Linux `getent(1)` manual page](https://man7.org/linux/man-pages/man1/getent.1.html)
- [RFC 8305: Happy Eyeballs Version 2](https://www.rfc-editor.org/rfc/rfc8305.html)
- [RFC 5737: IPv4 Address Blocks Reserved for Documentation](https://www.rfc-editor.org/rfc/rfc5737.html)

## Issues Found

- The curl timing probe labeled `time_namelookup`, `time_connect`, `time_appconnect`, and `time_starttransfer` as DNS, TCP, TLS, and first-byte values without explaining that curl reports them as cumulative elapsed milestones from the start of the transfer. Added a sentence explaining that adjacent milestones must be subtracted to calculate individual phase durations.
- The original Kubernetes guidance allowed a debug container merely in the same namespace and node/network class. That does not ensure the same pod network namespace, label-selected NetworkPolicies, or service-mesh path. Changed the guidance to prefer the application container or an ephemeral debug container attached to the same pod, and to require closer configuration matching when a separate debug pod is unavoidable.

## Review Notes

- The curl flags and write-out variables used in the examples are current and valid. Available HTTP versions and TLS behavior still depend on how the installed curl binary was built.
- `getent ahosts` is a GNU/Linux Name Service Switch diagnostic. A minimal container may not include `getent`, and non-Linux environments require an equivalent resolver tool.
- No product or library versions are pinned in the post. The reviewed timeout, proxy, redirect, and connection-reuse behavior matches the official documentation available on 2026-07-28.
