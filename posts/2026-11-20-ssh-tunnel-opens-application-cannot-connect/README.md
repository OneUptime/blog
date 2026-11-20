# SSH Tunnel Opens but App Cannot Connect: Bind Addresses and Final-Hop Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, OpenSSH, Networking, IPv6, Troubleshooting

Description: Trace SSH tunnel failures from the listening socket through forwarding policy and the final TCP hop to application protocol, TLS, and authentication.

An SSH connection stays open, but the application still fails. Trace four stages: reaching the listener, requesting an SSH forwarding channel, connecting to the destination, and completing the application protocol. Listener acceptance does not establish destination connectivity, and a completed TCP connection does not establish application health.

This guide covers static TCP `-L` and `-R` forwards, using OpenSSH portable 9.9p1 semantics and OpenBSD 7.6 manuals. Linux socket examples use iproute2 `ss` syntax checked against 6.11.0. The HTTPS example requires a TLS-capable curl with `--connect-to`, introduced in 7.49.0. Check your packaged versions for differences. [curl option history](https://curl.se/docs/optionswhen.html).

## Locate both ends before changing anything

Assume the SSH client runs on your workstation and connects to `relay.example.net`:

| Forwarding argument | Listener location | Process making the final connection |
|---|---|---|
| `-L 127.0.0.1:18443:api.internal.example:443` | Workstation, port 18443 | Server on relay, resolving `api.internal.example` |
| `-R 127.0.0.1:18080:127.0.0.1:3000` | Relay, requested port 18080 | Workstation's SSH client, connecting to its loopback port 3000 |

The destination in `-L` is interpreted on the server side; in static `-R`, it is interpreted on the client side. With `ProxyJump`, the `-L` destination connection originates at the ultimate SSH server, not an intermediate jump host. [OpenSSH forwarding and jump-host syntax](https://man.openbsd.org/OpenBSD-7.6/ssh.1).

Thus `-L 18443:localhost:443` targets the relay's loopback, even if you meant another backend. For `-R`, the final `localhost` belongs to the workstation. Server `GatewayPorts` can change the actual remote listener binding, so inspect it instead of assuming the requested address was honored. [Server bind policy](https://man.openbsd.org/OpenBSD-7.6/sshd_config.5#GatewayPorts).

## Confirm the configuration and actual listener

For an authorized reproduction, use the intended account and endpoints and keep SSH visible:

```bash
ssh -vvv -N -S none \
  -o ForkAfterAuthentication=no -o ExitOnForwardFailure=yes \
  -L 127.0.0.1:18443:api.internal.example:443 \
  tunnel@relay.example.net
```

`-S none` prevents reuse of a multiplexed master. It does not remove that master's existing listener, which may still occupy the port. [Connection sharing](https://man.openbsd.org/OpenBSD-7.6/ssh_config.5#ControlPath).

Before connecting, replace `-vvv` with `-G` to inspect effective client configuration. Check `hostname`, `user`, `port`, `proxyjump`, `controlpath`, and every forwarding entry: configuration files can add forwards. This describes a new invocation, not the configuration of an already-running master. Existing `Match exec` clauses can execute commands during configuration evaluation. [Configuration inspection](https://man.openbsd.org/OpenBSD-7.6/ssh.1#G), [Match behavior](https://man.openbsd.org/OpenBSD-7.6/ssh_config.5#Match).

On the Linux listener host, in its relevant network namespace:

```bash
ss -ltnp 'sport = :18443'
```

For the reverse example, inspect port 18080 on the relay instead. Verify the address and owning process; another service can occupy the expected port. Process information may be hidden from your account. [iproute2 socket filters](https://raw.githubusercontent.com/iproute2/iproute2/v6.11.0/man/man8/ss.8).

`ExitOnForwardFailure=yes` detects forwarding setup failures. It does not check whether the ultimate destination accepts connections. Likewise, a successful TCP-only probe of the tunnel listener proves neither destination connectivity nor application health: OpenSSH accepts that socket before requesting the forwarding channel. [ExitOnForwardFailure](https://man.openbsd.org/OpenBSD-7.6/ssh_config.5#ExitOnForwardFailure), [OpenSSH listener implementation](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/channels.c).

## Give localhost a host and a namespace

A bridged application container's `127.0.0.1` refers to that container's network namespace. A tunnel listening on the workstation's loopback is outside it. The reverse mistake occurs when SSH runs in a container but the backend runs on the host. Network namespaces isolate interfaces, routes, and sockets. [Linux network namespaces](https://man7.org/linux/man-pages/man7/network_namespaces.7.html).

Inspect and test from the consumer's actual namespace. Arrange for the tunnel and consumer to share the intended namespace, or configure an explicitly controlled access path between them. A host-gateway address alone cannot reach a socket bound only to host loopback. Widening the bind to `0.0.0.0` also changes who can access the tunnel; make exposure an intentional design choice.

## Separate the three address-family decisions

The consumer-to-listener connection, SSH transport, and final TCP connection can use different families. A listener at `127.0.0.1:18443` cannot accept a connection sent to `[::1]:18443`. Check the address the application actually attempts when configured with `localhost`.

For an IPv6 loopback listener with an IPv4 loopback destination on the relay, the forwarding argument is:

```text
-L [::1]:18443:127.0.0.1:443
```

Quote this argument in a shell. IPv6 literals in forwarding specifications need brackets. [Forwarding address syntax](https://man.openbsd.org/OpenBSD-7.6/ssh.1#L).

Client `ssh -4` does not force the server-side final hop of `-L` to IPv4. In OpenSSH 9.9p1, the server initializes its channel address family from its own configuration; its destination resolver uses that value. Check server-side resolution and reachability for both families. An explicit destination address can isolate a DNS/family issue, but it must still satisfy forwarding policy. [Server channel initialization](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/sshd-session.c), [Destination resolution](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/channels.c).

## Follow the error to the failing stage

Trigger one application request while watching SSH diagnostics:

- **Listener connection refused:** inspect the consumer's host, namespace, port, address family, and actual listener.
- **`open failed: administratively prohibited`:** for `-L`, check account-specific `AllowTcpForwarding`, `DisableForwarding`, `PermitOpen`, and restrictions on the accepted credential, including `permitopen` or disabled forwarding. A successful login does not authorize this channel. `PermitOpen` does not resolve names when matching, so replacing a hostname with an IP can change authorization. [Server channel checks](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/serverloop.c), [PermitOpen](https://man.openbsd.org/OpenBSD-7.6/sshd_config.5#PermitOpen), [Key restrictions](https://man.openbsd.org/OpenBSD-7.6/sshd.8#AUTHORIZED_KEYS_FILE_FORMAT).
- **Channel connection refused, resolution failure, or timeout:** inspect the final-hop host from the table. Check its resolver, route, egress policy, backend ingress policy, and the backend's listening address. A backend bound to its own loopback cannot accept a connection to its network interface. A timeout alone does not prove that a firewall dropped traffic; a busy server can also time out. [Linux connection errors](https://man7.org/linux/man-pages/man2/connect.2.html).

At either TCP hop, a refusal can mean no listener at the attempted address and port, or an active rejection such as a firewall's TCP reset. It is not proof that the intended application is stopped. [TCP reset handling](https://www.rfc-editor.org/rfc/rfc9293.html#section-3.10.7.3), [Firewall reject behavior](https://netfilter.org/projects/nftables/manpage.html).

Have the service owner test the same destination from the forwarding process's network context. For `-L`, that is the relay; for `-R`, the workstation. The backend sees a new TCP connection from that side. The tunnel listener's bind address does not select its outgoing source address. Check backend allowlists against the source the backend observes, including any NAT, rather than assuming the consumer's IP is preserved. Correlate backend and SSH logs instead of changing permissions indiscriminately. [Final-hop socket creation](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/channels.c), [Source NAT](https://wiki.nftables.org/wiki-nftables/index.php/Performing_Network_Address_Translation_%28NAT%29).

## Preserve application identity through the tunnel

For the HTTPS `-L` example, run this from the consumer namespace, substituting an existing safe health endpoint:

```bash
curl -q --noproxy '*' --silent --show-error \
  --connect-timeout 3 --max-time 10 \
  --connect-to api.internal.example:443:127.0.0.1:18443 \
  --output /dev/null --write-out 'HTTP %{http_code}\n' \
  https://api.internal.example/health
```

`--connect-to` changes the socket destination while preserving the URL hostname for TLS verification, SNI, and the HTTP Host header or HTTP/2 authority. `-q` skips curl's default configuration; `--noproxy '*'` prevents an environment proxy from diverting the request. Here `--connect-timeout 3` limits curl's connection phase, including the TLS handshake through the tunnel; `--max-time 10` limits the whole transfer. These do not configure the SSH process's final-hop TCP timeout. Inspect the printed HTTP status: this command can exit successfully for HTTP 401 or 500. [curl options](https://curl.se/docs/manpage.html#--connect-to).

Use the service's trusted CA with `--cacert` when needed; retain certificate verification. A certificate error, HTTP rejection, or database authentication error belongs to a later stage than socket establishment. Match HTTP versus HTTPS and use the appropriate database or gRPC client for those protocols. A successful application operation through the intended consumer path is the useful completion check. [curl certificate verification](https://curl.se/docs/sslcerts.html).
