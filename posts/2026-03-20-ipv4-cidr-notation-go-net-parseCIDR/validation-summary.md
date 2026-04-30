# Validation Summary: How to Handle IPv4 CIDR Notation in Go with net.ParseCIDR

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- Go standard library `net` package
- IPv4 addressing
- CIDR notation and subnetting

## Sources Consulted
- Go standard library `net` package documentation: https://pkg.go.dev/net
- Go language specification, shift expressions: https://go.dev/ref/spec
- RFC 3021, Using 31-Bit Prefixes on IPv4 Point-to-Point Links: https://www.rfc-editor.org/rfc/rfc3021
- RFC 4632, Classless Inter-domain Routing (CIDR): https://www.rfc-editor.org/rfc/rfc4632

## Issues Found
- The `NetworkDetails` example assumed all parsed CIDRs were IPv4, but it calls `To4()` and then indexes a 4-byte slice. I added an explicit IPv4 check so non-IPv4 input returns cleanly instead of panicking.
- The `NetworkDetails` example always subtracted two usable addresses, which is wrong for `/31` and `/32` IPv4 networks and can underflow the unsigned host count. I updated the example to handle `/31` and `/32` correctly.
- The `SplitCIDR` example did not validate `newPrefix` against the address width, so values above `/32` could cause an invalid negative shift at runtime. I added prefix-range validation based on `network.Mask.Size()`.
- The `SplitCIDR` loop used `network.Contains(...)` as its stop condition while incrementing a `uint32` cursor. For `0.0.0.0/0`, that can wrap back to `0.0.0.0` and loop forever. I changed the code to iterate a fixed subnet count and format each subnet through `net.IPNet.String()`.

## Review Notes
- The post is technically relevant and the rest of the explanations around `net.ParseCIDR`, `net.ParseIP`, `IPNet.Contains`, and `IPMask.Size()` match the current Go documentation.
- The local environment did not have the `go` tool installed, so the validation was completed against the official documentation, the language specification, and direct code review rather than local compilation.
