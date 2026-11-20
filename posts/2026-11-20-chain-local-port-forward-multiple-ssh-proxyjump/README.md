# How to Chain a Local Port Forward Through Multiple SSH Jump Hosts with `ProxyJump`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, OpenSSH, ProxyJump, Port Forwarding, Networking

Description: Build a local forward through two SSH jump hosts with separate credentials, explicit destination permissions, and a check of the application beyond the final relay.

Suppose an internal API is reachable from a relay, but reaching that relay requires two SSH gateways. You need one local listener and an SSH connection to the relay through both gateways. The relay then opens the connection to the API.

This walkthrough uses OpenSSH portable 10.3p1 behavior. Replace the example addresses, accounts, key filenames, and health endpoint with your authorized infrastructure.

## Draw the connection path

Our example has these network connections:

```text
workstation -> bastion.example.net:2222 -> 10.20.0.5:22 -> 10.30.0.8:22
               edge jump                 inner jump      final SSH relay

application -> workstation:18443 -> SSH through both jumps to relay
                               -> relay connects to api.internal.example:443
```

The command-line shape is:

```bash
ssh -NT -o ExitOnForwardFailure=yes \
  -J edge@bastion.example.net:2222,jump@10.20.0.5 \
  -L 127.0.0.1:18443:api.internal.example:443 \
  tunnel@10.30.0.8
```

The comma list runs from the jump closest to the workstation toward the final relay. The final SSH destination stays outside that list. `-N` requests no remote command; `-T` disables a terminal. The command assumes suitable local credentials and host trust already exist. [OpenSSH command options](https://man.openbsd.org/ssh.1).

The first address in `-L` binds the listener on the workstation. The API hostname is resolved and connected to by the final relay. Replacing it with `127.0.0.1` would target the relay's loopback, not either jump host. No intermediate application-port listeners are needed. [Forwarding connections and resolution](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/channels.c).

If later SSH hops use hostnames instead of the IP addresses shown here, the preceding forwarding server must resolve those names. The workstation must resolve the first jump. Keep that separate from the final relay's API lookup.

## Give each SSH endpoint its own configuration

A destination's `-i` or `User` setting does not generally configure the jump hosts. Define each endpoint explicitly. Save this example as `~/.ssh/chain.conf`, replacing the identity paths with your existing local credentials:

```sshconfig
Host edge-hop
    HostName bastion.example.net
    Port 2222
    User edge
    IdentityFile ~/.ssh/edge_ed25519

Host inner-hop
    HostName 10.20.0.5
    Port 22
    User jump
    IdentityFile ~/.ssh/inner_ed25519

Host api-tunnel
    HostName 10.30.0.8
    Port 22
    User tunnel
    IdentityFile ~/.ssh/relay_ed25519
    ProxyJump edge-hop,inner-hop
    LocalForward 127.0.0.1:18443 api.internal.example:443
    ExitOnForwardFailure yes

Host *
    IdentitiesOnly yes
    ForwardAgent no
    StrictHostKeyChecking yes
    CanonicalizeHostname no
    ControlPath none
    ForkAfterAuthentication no
```

Provision independently verified host-key or host-CA trust for all three SSH endpoints before connecting. `StrictHostKeyChecking yes` rejects unknown hosts. `IdentitiesOnly yes` limits identity selection to configured identities. [Client identity and trust settings](https://man.openbsd.org/ssh_config.5).

All SSH client processes run locally; use local keys or the local agent for each authentication. Agent forwarding and copying private keys to the gateways are unnecessary. OpenSSH implements the chain with local `ssh -W` proxy processes, passing the remaining jump list and the explicit `-F` configuration path onward. [ProxyJump construction](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/ssh.c#L1231).

Using `-F` selects this dedicated file and skips the usual client configuration files. Include any required organizational settings deliberately. `ControlPath none` prevents connection sharing, and the foreground setting keeps this invocation visible. [Alternate configuration files](https://man.openbsd.org/ssh.1#F), [connection sharing](https://man.openbsd.org/ssh_config.5#ControlPath).

## Authorize the next connection on every server

Authentication and forwarding permission are separate checks. Each gateway needs permission to open the next SSH connection; only the final relay needs permission to reach the API. For the configuration above, the required destinations are:

| SSH server and account | Destination its forwarding policy must allow |
|---|---|
| `bastion.example.net`, account `edge` | `10.20.0.5:22` |
| `10.20.0.5`, account `jump` | `10.30.0.8:22` |
| `10.30.0.8`, account `tunnel` | `api.internal.example:443` |

An administrator can scope `AllowTcpForwarding local` and the corresponding `PermitOpen` value to the intended account on each server. `yes` or `all` also permits the required forwarding direction. Here `local` describes forwarding from the SSH client's perspective, including the gateways' `-W` connections. `DisableForwarding yes` overrides forwarding permission. [Server forwarding controls](https://man.openbsd.org/sshd_config.5), [direct-tcpip authorization](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/serverloop.c#L391).

For example, the final relay's destination restriction is `PermitOpen api.internal.example:443`. Do not substitute its resolved IP in that rule while the client still requests the hostname: `PermitOpen` matches the requested destination without resolving names. The table uses each endpoint's actual `HostName` and port, not the local aliases `inner-hop` or `api-tunnel`. [PermitOpen matching](https://man.openbsd.org/sshd_config.5#PermitOpen).

Also inspect restrictions on the accepted credential. An `authorized_keys` entry with `no-port-forwarding`, or `restrict` without forwarding re-enabled, can reject the channel despite permissive daemon configuration. A key's `permitopen` restriction must also allow the requested destination. [Authorized-key restrictions](https://man.openbsd.org/sshd.8#AUTHORIZED_KEYS_FILE_FORMAT).

Network policy must permit every arrow independently. The API sees a connection originating from the relay side, subject to routing and NAT, rather than the workstation's source address. SSH encryption ends at the relay; HTTPS protects the API connection beyond it.

## Inspect, start, and exercise the application

Inspect the three configurations before starting:

```bash
ssh -G -F ~/.ssh/chain.conf edge-hop
ssh -G -F ~/.ssh/chain.conf inner-hop
ssh -G -F ~/.ssh/chain.conf api-tunnel
```

Check `hostname`, `port`, `user`, and `identityfile` for each; check `proxyjump` and `localforward` on `api-tunnel`. `-G` prints configuration and exits. These checks do not authenticate or establish reachability. [Configuration inspection](https://man.openbsd.org/ssh.1#G).

Start the configured tunnel without repeating `-L`:

```bash
ssh -vv -NT -F ~/.ssh/chain.conf api-tunnel
```

Keep it running in that terminal. Confirm that this SSH process owns the workstation's `127.0.0.1:18443` listener before testing it. `ExitOnForwardFailure` catches listener setup failures, including an occupied port; it does not establish API readiness. [Forwarding failure semantics](https://man.openbsd.org/ssh_config.5#ExitOnForwardFailure).

From another workstation terminal, exercise an existing safe health endpoint:

```bash
curl -q --noproxy '*' --silent --show-error \
  --connect-timeout 3 --max-time 10 \
  --connect-to api.internal.example:443:127.0.0.1:18443 \
  --write-out '\nHTTP %{http_code}\n' \
  https://api.internal.example/ready
```

This preserves the API hostname for TLS verification and HTTP routing while connecting through the local port. Add the service's trusted `--cacert` file if needed. Require the expected status and body; curl's successful exit alone does not reject HTTP errors. [curl connection and response options](https://curl.se/docs/manpage.html#--connect-to).

A failure before relay authentication points toward a jump's authentication, forwarding permission, or next-hop reachability. A channel error triggered by the health request points toward the relay's API authorization, resolution, or connection. A TLS or HTTP error moves the investigation to the service and its identity. Correlate the verbose output with the responsible server's logs, then stop the foreground tunnel with Ctrl-C when finished.
