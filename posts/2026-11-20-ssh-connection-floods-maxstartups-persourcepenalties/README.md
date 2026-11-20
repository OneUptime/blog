# How to Limit SSH Connection Floods with `MaxStartups` and `PerSourcePenalties` in OpenSSH 9.8+

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, OpenSSH, Security, Rate Limiting

Description: Configure OpenSSH connection limits and source penalties, account for shared IP addresses, and verify that legitimate SSH access survives throttling.

An SSH server can spend resources accepting connections that never become authenticated sessions. `MaxStartups` limits how many of those connections can be outstanding. `PerSourcePenalties` temporarily refuses new connections from sources associated with unsuccessful or suspicious behavior. Use both to control different parts of the problem.

These controls protect the SSH listener's resources; network capacity still needs protection upstream when traffic can saturate the link.

## Check the server version first

`PerSourcePenalties` arrived in [OpenSSH 9.8](https://www.openssh.org/txt/release-9.8), enabled by default. Check the daemon on the destination server, rather than your workstation's SSH client:

```bash
/usr/sbin/sshd -V
```

Use the actual binary and configuration used by your service. Distribution backports can affect available features, so validate the configuration with that binary. Treat 9.8 as the feature baseline and use a maintained package.

Defaults have evolved: [OpenSSH 9.9](https://www.openssh.org/txt/release-9.9) reduced the configured `grace-exceeded` default from twenty to ten seconds. However, the original [9.8p1](https://github.com/openssh/openssh-portable/blob/V_9_8_P1/srclimit.c) and [9.9p1](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/srclimit.c) implementations used the `crash` duration for login-grace expiry. Read your installed manual and test your maintained vendor package's behavior before assuming identical timeout penalties across releases.

## Set a budget for unauthenticated connections

The three-part `MaxStartups` value is `start:rate:full`. For example:

```sshconfig
MaxStartups 10:30:60
```

With fewer than ten outstanding unauthenticated connections, this setting does not randomly reject arrivals. At ten, it rejects approximately 30% of new connections. The rejection probability rises linearly, reaching 100% at sixty. The upstream default is `10:30:100`; this example deliberately lowers the final ceiling. See the [MaxStartups documentation](https://man.openbsd.org/sshd_config#MaxStartups).

This is a concurrency budget, not a connections-per-second quota. A busy deployment can also reach it if many clients authenticate simultaneously. Measure that legitimate peak before choosing values. Increasing the ceiling allows more authentication work and memory consumption, so make sure the host can support it.

[`LoginGraceTime`](https://man.openbsd.org/sshd#g) bounds how long authentication can remain incomplete. Pick a value that accommodates your normal authentication flow, including MFA. A sixty-second budget is an example, not a universal recommendation.

## Configure both controls globally

Edit the effective settings in `/etc/ssh/sshd_config`, before any `Match` block:

```sshconfig
# Example policy; size the concurrency and time budgets for this host.
MaxStartups 10:30:60
LoginGraceTime 60
PerSourceNetBlockSize 32:128
PerSourcePenalties authfail:5s noauth:1s min:15s max:10m
```

The [OpenSSH 9.8 configuration parser](https://github.com/openssh/openssh-portable/blob/V_9_8_P1/servconf.c) marks these connection controls as global settings. They cannot be scoped to a username with `Match User`.

If your installation uses snippets, check that the main configuration actually includes their directory. Review existing definitions and include order instead of appending competing settings. Penalty sub-options are processed separately: a later line supplying a previously unset duration can enable penalties even after `PerSourcePenalties no`. Resolve conflicting definitions and confirm both enablement and values with the configuration dump below.

## Understand what accumulates a penalty

The example explicitly retains these documented penalty values:

| Setting | Meaning |
| --- | --- |
| `authfail:5s` | Adds a penalty when a client disconnects after unsuccessful authentication attempts |
| `noauth:1s` | Adds a penalty for disconnecting without attempting authentication |
| `min:15s` | Sets the threshold for activating accumulated penalties |
| `max:10m` | Caps the accumulated penalty duration |

Other reasons, including crashes and login-grace expiry, retain the installed release's settings. An enforced penalty refuses new connections from the affected source range; it does not terminate connections already in progress. These behaviors are described in the [OpenSSH 9.8 penalty documentation](https://github.com/openssh/openssh-portable/blob/V_9_8_P1/sshd_config.5#L1573).

Do not translate `authfail:5s min:15s` into a promise that exactly three wrong passwords cause a ban. The event is a connection ending after failed authentication, rather than each password attempt. Time also elapses between events. The [penalty implementation](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/srclimit.c) accumulates time against an expiry and activates a new penalty when its outstanding duration exceeds the minimum. Repeated events can extend that expiry up to the cap.

This is why a single typo and a tight loop of failed connections behave differently. Fix broken credentials and add retry backoff to automation before making penalties more aggressive.

## Account for shared source addresses

The example's `32:128` treats each IPv4 or IPv6 address separately. It cannot distinguish people sharing one public address. OpenSSH's [9.8 release notes](https://www.openssh.org/txt/release-9.8) specifically call out NAT and proxies: one broken client can affect other users behind the same apparent source.

For a narrowly trusted monitoring or management source, an exemption is available:

```sshconfig
# Documentation addresses: replace with your actual trusted source addresses.
PerSourcePenaltyExemptList 192.0.2.10/32,2001:db8::10/128
```

This exempts those addresses from penalties. They still face `MaxStartups`; the listener checks that separately after the penalty decision. See the [connection admission code](https://github.com/openssh/openssh-portable/blob/V_9_8_P1/sshd.c#L528).

Keep exemptions narrow. Exempting a shared proxy exempts everyone using it. Repeated banner probes and `ssh-keyscan` runs also deserve attention because they can disconnect without attempting authentication. Prefer fixing excessive probing before excluding a broad network.

## Validate, reload, and inspect real connections

Keep an authenticated administrative session open and retain your previous configuration. On the server:

```bash
sudo /usr/sbin/sshd -t -f /etc/ssh/sshd_config
sudo /usr/sbin/sshd -T -f /etc/ssh/sshd_config |
  awk '$1 ~ /^(maxstartups|logingracetime|persourcenetblocksize|persourcepenalties|persourcepenaltyexemptlist)$/ {print}'
```

[`sshd -t` and `-T`](https://man.openbsd.org/sshd#t) validate configuration; `-T` additionally prints effective values. Match the service's configuration path and command-line overrides. These commands do not show current penalty entries or prove that a running daemon has reloaded.

After both checks succeed, [reload your service](https://www.freedesktop.org/software/systemd/man/latest/systemctl.html#reload%20PATTERN%E2%80%A6) and inspect its [journal entries](https://www.freedesktop.org/software/systemd/man/latest/journalctl.html#--since=). For a systemd installation whose unit is named `sshd`:

```bash
sudo systemctl reload sshd
sudo journalctl -u sshd --since '10 minutes ago'
```

Some distributions use `ssh.service`; substitute your actual unit. From another terminal, make a fresh authenticated connection using your normal account and destination. [`-S none`](https://man.openbsd.org/ssh#S) disables connection sharing:

```bash
ssh -S none admin@server.example.com
```

Test bounded bursts on a staging host before tightening production limits. Include normal parallel deployments, failed-authentication disconnects, monitoring probes, and clients sharing a source IP. Correlate failures with server logs: the listener reports `MaxStartups` throttling and penalty-related refusal reasons. A client-side disconnect alone does not identify which control fired.

If legitimate clients are refused, use the retained session to restore the previous policy, validate it, and reload. Resolve the triggering workload or shared-address policy before trying stricter settings again.
