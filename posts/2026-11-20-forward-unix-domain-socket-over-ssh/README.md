# How to Forward a Unix Domain Socket over SSH

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, OpenSSH, Unix Socket, Port Forwarding, Linux

Description: Forward Unix domain sockets with OpenSSH, choose the correct direction, control listener permissions, and diagnose stale paths and failed application connections.

A service listening on `/run/myapi/api.sock` can remain socket-only while you access it from another machine. OpenSSH creates a new listener and carries connections through SSH to the existing service. Native Unix socket forwarding arrived in OpenSSH 6.7; use maintained client and server packages. This guide uses Linux pathname stream sockets and OpenSSH portable 10.3p1 behavior. [OpenSSH 6.7 release notes](https://www.openssh.org/txt/release-6.7).

## Choose where the listener belongs

“Local” means the machine running `ssh`; “remote” means the SSH server. The first endpoint is the listener, and the second is the destination:

| Forwarding argument | Listener | Destination connection originates on |
|---|---|---|
| `-L /local/api.sock:/remote/api.sock` | Client | Server |
| `-R /remote/api.sock:/local/api.sock` | Server | Client |
| `-L 127.0.0.1:18080:/remote/api.sock` | Client TCP loopback | Server |
| `-L /local/api.sock:127.0.0.1:8080` | Client Unix socket | Server |

The final row connects to the server's loopback address. OpenSSH also supports the corresponding mixed TCP/socket forms with `-R`. Use explicit absolute socket paths and keep them short: pathname length limits vary by operating system. [Forwarding syntax](https://man.openbsd.org/ssh.1#L), [Unix socket pathname limits](https://man7.org/linux/man-pages/man7/unix.7.html).

## Bring a remote socket to your workstation

Assume `deploy@app.example.net` can already connect to an HTTP API at `/run/myapi/api.sock`. Replace these examples with your account, hostname, socket, and safe health endpoint. Verify the server's SSH host key through your normal trusted process.

First, log in as `deploy` and test the API directly on the server:

```bash
curl -q --noproxy '*' --fail --show-error --max-time 5 \
  --unix-socket /run/myapi/api.sock http://api.internal/health
```

If this fails, fix the service or that account's access first. On Linux, connecting requires write permission on the socket and search permission through its parent directories. Having permission to run `sudo` does not automatically give an SSH forward elevated socket access. [Linux socket permissions](https://man7.org/linux/man-pages/man7/unix.7.html).

On your workstation, create a private directory and keep SSH in the foreground:

```bash
tunnel_dir=$(mktemp -d /tmp/ssh-sock.XXXXXXXX) || exit 1
chmod 700 "$tunnel_dir"
printf 'Local socket: %s/api.sock\n' "$tunnel_dir"

ssh -NT -S none \
  -o ForkAfterAuthentication=no \
  -o ExitOnForwardFailure=yes \
  -o StreamLocalBindMask=0177 \
  -o StreamLocalBindUnlink=no \
  -L "$tunnel_dir/api.sock:/run/myapi/api.sock" \
  deploy@app.example.net
```

`-N` requests no remote command; `-T` disables a terminal. `-S none` prevents connection sharing, keeping this forward attached to this SSH process. Your SSH configuration still applies, including any additional configured forwards. [SSH client options](https://man.openbsd.org/ssh.1).

In another workstation terminal, replace `REPLACE` with the printed directory suffix:

```bash
curl -q --noproxy '*' --fail --show-error --max-time 5 \
  --unix-socket /tmp/ssh-sock.REPLACE/api.sock \
  http://api.internal/health
```

`--unix-socket` selects the connection path; the URL still identifies the HTTP service. Use its expected hostname and authentication. `-q` skips curl's default configuration, and `--noproxy '*'` avoids proxy diversion. Check the expected response body as well as command success. [curl options](https://curl.se/docs/manpage.html#--unix-socket).

`ExitOnForwardFailure` catches setup failures such as an occupied listener path. It does not establish application health or guarantee that the destination socket accepts connections. [Forwarding failure semantics](https://man.openbsd.org/ssh_config.5#ExitOnForwardFailure).

## Expose a workstation socket on the server

For the reverse direction, suppose your workstation service already listens at `/run/user/1000/dev-api.sock`. Substitute your actual path and UID. Create a dedicated directory on the server, owned by the login account:

```bash
ssh deploy@app.example.net \
  'install -d -m 700 /home/deploy/ssh-sockets'

ssh -NT -S none \
  -o ForkAfterAuthentication=no \
  -o ExitOnForwardFailure=yes \
  -R /home/deploy/ssh-sockets/dev-api.sock:/run/user/1000/dev-api.sock \
  deploy@app.example.net
```

A consumer running as `deploy` on the server can now use `/home/deploy/ssh-sockets/dev-api.sock`. Test it there with the same curl pattern and the development service's URL. The workstation's SSH client must have access to the original development socket.

The server creates this listener. Its `StreamLocalBindMask` and `StreamLocalBindUnlink` settings come from **sshd configuration**, not the client's `-o` settings. The protocol request carries the pathname, not a requested creation mask. [OpenSSH streamlocal protocol](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/PROTOCOL#L257), [remote listener setup](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/serverloop.c#L763).

If an administrator needs to enable both directions for this account, these are relevant settings in the appropriate server configuration context:

```text
Match User deploy
    AllowStreamLocalForwarding yes
    StreamLocalBindMask 0177
    StreamLocalBindUnlink no
```

Use `local` or `remote` instead of `yes` when only that direction is intended. Validate the complete configuration with `sshd -t` before reloading the distribution's SSH service. `DisableForwarding` and restrictions on the accepted credential can still deny socket forwarding. [Server settings](https://man.openbsd.org/sshd_config.5#AllowStreamLocalForwarding), [authorization checks](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/serverloop.c#L435).

For mixed forwards, policy follows the SSH request: a local Unix listener targeting TCP uses `AllowTcpForwarding`; a local TCP listener targeting a Unix socket uses `AllowStreamLocalForwarding`. [Channel selection](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/channels.c), [server request handling](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/serverloop.c).

## Handle permissions, stale sockets, and cleanup

The default mask `0177` produces an owner-only socket. Keep its directory private too, since socket mode enforcement differs across systems. Deliberately provision group access when another service account needs the listener; forwarding a privileged API grants its consumers access to that API. [Socket creation settings](https://man.openbsd.org/ssh_config.5#StreamLocalBindMask).

If startup reports an occupied path, identify its owner and stop the previous tunnel before removing it. `StreamLocalBindUnlink=yes` unlinks an existing pathname before binding; it does not determine whether the previous listener is abandoned. Enable it only for a dedicated path whose lifecycle you control. [OpenSSH listener implementation](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/misc.c#L1903).

Add `-vvv` to SSH and make one application request when diagnosing failures. A local bind error points to the listener directory or pathname. A channel failure points to server forwarding policy or destination access. A missing destination, denied filesystem access, and a service that has stopped listening require different fixes; inspect the destination on the machine identified in the table.

Stop the foreground tunnel with Ctrl-C. In its original workstation shell, remove only this invocation's listener and directory:

```bash
rm -f -- "$tunnel_dir/api.sock"
rmdir -- "$tunnel_dir"
```

For a reverse forward, remove its dedicated listener on the server after stopping SSH. Never remove the application's original socket. Treat successful application requests through the forwarded path as the verification result; a pathname alone proves neither an active listener nor a healthy service.
