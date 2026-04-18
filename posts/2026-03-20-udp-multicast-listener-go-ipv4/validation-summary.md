# Validation Summary: How to Implement a UDP Multicast Listener in Go for IPv4

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go (standard library `net` package)
- `golang.org/x/net/ipv4` package
- UDP multicast (IPv4)
- IGMP group membership (via `JoinGroup`)

## Sources Consulted
- `golang.org/x/net/ipv4` package documentation: https://pkg.go.dev/golang.org/x/net/ipv4
- `net` package documentation: https://pkg.go.dev/net (`ListenPacket`, `ListenMulticastUDP`, `UDPAddr`, `Interface`)
- `golang.org/x/net/ipv4` source (`payload_cmsg.go`, `endpoint.go`) on GitHub: https://github.com/golang/net/tree/master/ipv4
- RFC 5771 (IANA IPv4 Multicast Guidelines) for multicast address range

## Issues Found
1. **Nil pointer dereference risk on `cm.IfIndex`** — In the listener example, the loop reads `cm.IfIndex` from the `*ControlMessage` returned by `pc.ReadFrom`. Per the `x/net/ipv4` source (`payload_cmsg.go`), `cm` is only allocated when out-of-band data is present, which only happens after the relevant control flags are enabled via `SetControlMessage`. Without enabling them, `cm` is `nil` and `cm.IfIndex` panics. **Fix:** added `pc.SetControlMessage(ipv4.FlagInterface, true)` right after `ipv4.NewPacketConn(conn)` so the interface-index control message is actually populated.

## Review Notes
- `224.0.0.100` lies within the `224.0.0.0/24` Local Network Control Block. This is fine for a local-subnet demo (the sender sets `SetMulticastTTL(1)`) but readers deploying multicast for application traffic should pick an address from the `239.0.0.0/8` administratively-scoped range.
- `net.ListenMulticastUDP` is acknowledged in the Go standard library docs as being for "simple, small applications" only; the post correctly presents it as a simplified alternative and directs more advanced usage through `golang.org/x/net/ipv4`.
- The sender hardcodes `eth0` as the outgoing interface but guards it with an error check, so the code still runs on systems where `eth0` does not exist — acceptable for an example.
- All other API usages (`JoinGroup`, `SetMulticastTTL`, `SetMulticastInterface`, `WriteTo` with `nil` control message, `ReadFromUDP`) match current `golang.org/x/net/ipv4` and standard-library signatures.
