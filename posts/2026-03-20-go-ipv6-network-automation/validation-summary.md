# Validation Summary: How to Use Go for IPv6 Network Automation

## Status
validated

## Post Type
Guide

## Technologies Covered
- Go
- IPv6
- SSH
- `golang.org/x/crypto/ssh`
- NetBox REST API
- Go standard library `net/http`
- Go standard library `net/netip`
- CSV-based IPAM reporting

## Sources Consulted
- Go `net` package documentation: https://pkg.go.dev/net
- Go `net/netip` package documentation: https://pkg.go.dev/net/netip
- Go `net/url` package documentation: https://pkg.go.dev/net/url
- Go `golang.org/x/crypto/ssh` package documentation: https://pkg.go.dev/golang.org/x/crypto/ssh
- NetBox REST API documentation: https://netbox.readthedocs.io/en/stable/integrations/rest-api/
- NetBox Prefix model documentation: https://netbox.readthedocs.io/en/stable/models/ipam/prefix/
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291.html
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html

## Issues Found
- The SSH example used invalid IPv6 literals such as `2001:db8::router1` and `2001:db8:remote::/48`. I replaced them with valid documentation-prefix IPv6 addresses, because RFC 4291 requires IPv6 text to use hexadecimal fields and RFC 3849 reserves `2001:db8::/32` for examples.
- The SSH configuration example used `Session.Run()` to send multiple Cisco-style configuration commands. I changed it to request a PTY, start an interactive shell, and write commands through `StdinPipe()`, which matches the documented `golang.org/x/crypto/ssh` session model for shell-based interaction.
- The SSH connection example manually formatted `[host]:port`. I changed it to `net.JoinHostPort()` so IPv6 literals are bracketed correctly according to the Go networking docs.
- The NetBox REST example used the legacy `Authorization: Token ...` header form without qualification. I updated it to the current v2 `Authorization: Bearer ...` format shown in the NetBox REST API documentation.
- The NetBox base URL example used an invalid bracketed host literal. I replaced it with a valid IPv6 literal URL.
- The tags and description claimed NETCONF coverage, but the post did not include any NETCONF implementation. I removed that inaccurate reference.
- The conclusion said Go has standard library support for SSH. I corrected that statement because SSH support here comes from `golang.org/x/crypto/ssh`, not the Go standard library.

## Review Notes
- The `net/netip` validation/reporting example is technically correct as written. Its ordering checks `IsPrivate()` before `IsGlobalUnicast()`, which is important because Go documents that IPv6 unique local addresses still satisfy `IsGlobalUnicast()`.
- The SSH example is now aligned with the package docs for interactive shell usage, but real network devices may still require additional prompt or pagination handling depending on the platform.
- Local compilation was not performed in this workspace because the Go toolchain is not installed (`go: command not found`).
