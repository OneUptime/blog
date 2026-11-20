# How to Restrict SSH Certificate Logins with `AuthorizedPrincipalsFile` and Critical Options

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSSH, SSH, Security, Linux

Description: Restrict OpenSSH certificate access with account-specific principals, source-address and forced-command constraints, and tests that exclude alternative authentication paths.

A trusted SSH certificate authority establishes who can issue credentials. It does not, by itself, express which deployment role should reach which account or what that account may execute. Combine server-side principal authorization with restrictions signed into each certificate.

This example gives an existing `deploy` account one production deployment role. It assumes an established user CA, an existing client key, and a reviewed deployment program. Keep independent administrative access while changing the policy.

## Bind a principal to an account

Configure the intended account in your managed `sshd_config`, checking existing `Include` and `Match` rules for conflicting settings:

```text
Match User deploy
    PubkeyAuthentication yes
    TrustedUserCAKeys /etc/ssh/user_ca.pub
    AuthorizedPrincipalsFile /etc/ssh/auth_principals/%u
    AuthorizedPrincipalsCommand none
    AuthorizedKeysFile none
    AuthorizedKeysCommand none
    AuthenticationMethods publickey
    DisableForwarding yes
    PermitTunnel no
    PermitTTY no
    PermitUserRC no
Match all
```

Here `%u` expands to the requested local account, so `ssh deploy@server` selects `/etc/ssh/auth_principals/deploy`. The file contains principal names, optionally preceded by key options. At least one must match a principal carried by the certificate. Without a principals file or command, the usual `TrustedUserCAKeys` path requires the local username in the certificate instead. Certificates with no principals are rejected by this trust path. [Principal authorization configuration](https://man.openbsd.org/sshd_config#AuthorizedPrincipalsFile), [CA trust requirements](https://man.openbsd.org/sshd_config#TrustedUserCAKeys)

Use this single line in the `deploy` principals file:

```text
restrict,from="192.0.2.40/32",command="/usr/local/libexec/deploy-web" deploy:web:prod
```

`deploy:web:prod` is an issuer-defined role name, not a Unix account or group lookup. Principals-file matching is exact and case-sensitive. Do not use `*` expecting a role wildcard or split restrictions across matching lines: OpenSSH's parser takes the first matching line's options. Keep each grant complete. [Principal parser](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/auth2-pubkeyfile.c)

Manage the directory and file as root-owned, readable by `deploy`, and not writable by that account. On Linux, directory mode `0755` and file mode `0644` are suitable starting points; retain required SELinux labels. OpenSSH opens the principals file under the target user's credentials. [Principals-file lookup](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/auth2-pubkey.c)

`restrict` removes PTY, port/agent/X11 forwarding, and user-rc permissions; `command=` selects the deployment program. Keep `PermitTunnel no` explicit to deny tunnel-device forwarding too. These restrictions do not confine the program's filesystem or process access. Make the program and its parent directories administrator-controlled, limit the account's privileges, and never `eval` client-supplied `SSH_ORIGINAL_COMMAND`. Control shell startup files and the execution environment too. A shell-capable deployment tool can defeat the intended command boundary. [Key options](https://man.openbsd.org/sshd#AUTHORIZED_KEYS_FILE_FORMAT), [Tunnel forwarding checks](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/serverloop.c)

## Sign the same restrictions into the certificate

On the protected signing system, sign the client's existing public key:

```bash
ssh-keygen -s ./user_ca -I 'ci-web-prod-run-1842' -z 10072 \
  -n deploy:web:prod -V -5m:+30m \
  -O clear \
  -O source-address=192.0.2.40/32 \
  -O force-command=/usr/local/libexec/deploy-web \
  ./deploy_key.pub

ssh-keygen -L -f ./deploy_key-cert.pub
```

Allocate serials through your issuer; `10072` is illustrative. The key ID is an audit label, not the authorization principal. The validity interval permits five minutes of clock skew before issuance and expires thirty minutes afterward. Review the signing CA fingerprint, principal, validity, both critical options, and an empty extensions list before distributing the certificate. [Certificate issuance options](https://man.openbsd.org/ssh-keygen#CERTIFICATES)

`-O clear` removes default permissions, including port/agent/X11 forwarding, PTY allocation, and user rc execution. It does **not** prohibit arbitrary command execution by itself; that is why this certificate also has `force-command`. `source-address` is a CIDR restriction on the peer address observed by the destination server. Replace the documentation address with the actual runner, NAT gateway, or jump host address seen there. A certificate cannot recover the original laptop address through a jump connection. [Certificate options](https://man.openbsd.org/ssh-keygen#source-address), [Server peer and authorization checks](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/auth2-pubkey.c)

Critical options and extensions have different failure behavior. An unknown critical option makes the certificate unacceptable. Unknown extensions may be ignored. Therefore, adding a custom extension called `production-only` does not implement a new restriction in an unmodified server. Standard `permit-*` extensions grant capabilities; `force-command` and `source-address` carry restrictions. [OpenSSH certificate protocol](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/PROTOCOL.certkeys)

## Understand how restrictions combine

The principals-file `from=` condition and certificate `source-address` must both pass. For permissions such as PTY allocation, the principals-file options and certificate permissions combine restrictively: enabling a capability in one cannot restore it when the other denies it. If both specify a forced command, their command strings must be identical or authentication fails. [Address checks](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/auth2-pubkeyfile.c), [Option merge implementation](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/auth-options.c)

Also inspect server `ForceCommand`: it takes precedence over the accepted certificate/key forced command when the session starts. Keep it absent or aligned with this workflow. Disabling forwarding separately matters because a forced command alone does not prevent forwarding. [Session command selection](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/session.c)

## Close alternative paths, then test

`AuthorizedPrincipalsFile` only governs certificates authorized through `TrustedUserCAKeys`. CA entries in `authorized_keys` or `AuthorizedKeysCommand` have their own policy, including `principals=`. Raw keys can authorize independently too. An `AuthorizedPrincipalsCommand` can supply a match when the principals file does not. The example disables these alternatives for `deploy`; its `AuthenticationMethods publickey` is a deliberate policy for this automation account. Preserve required MFA in accounts that use it. [Authorization path implementation](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/auth2-pubkey.c)

Run `sudo sshd -t` before reloading the appropriate SSH service. Inspect effective settings for the canary connection, then test fresh connections. Configuration validation does not evaluate certificate authorization or execute your deployment program. For an Ed25519 client key:

```bash
ssh -F /dev/null -vv -T \
  -o ControlPath=none -o IdentityAgent=none -o IdentitiesOnly=yes \
  -o PreferredAuthentications=publickey \
  -o PubkeyAcceptedAlgorithms=ssh-ed25519-cert-v01@openssh.com \
  -o StrictHostKeyChecking=yes \
  -i ./deploy_key -o CertificateFile=./deploy_key-cert.pub \
  deploy@canary.example.com
```

Supply required routing and managed host trust explicitly. This excludes connection reuse, agent identities, and raw-key fallback. The forced deployment program will run, so use an approved canary workload. [Client identity and connection settings](https://man.openbsd.org/ssh_config)

Test each failure independently using otherwise valid credentials:

| Change | Expected result |
|---|---|
| Matching principal, source, CA, and commands | Only the intended deployment program runs |
| Wrong principal or missing principals file | Authentication rejected through the isolated trust path |
| Connect from outside the allowed source CIDR | Authentication rejected |
| Different certificate forced command | Authentication rejected |
| Request a PTY or forwarding channel | Request denied, even after successful authentication |

Correlate results with server logs showing the certificate ID, serial, CA, and rejection reason. A network error or generic exit status is insufficient evidence. Principal-file removal affects subsequent authentication; it does not terminate an already authenticated connection.
