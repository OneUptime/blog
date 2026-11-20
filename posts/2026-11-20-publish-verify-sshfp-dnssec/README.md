# How to Publish and Verify SSH Host Fingerprints with DNSSEC-Protected SSHFP Records

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, OpenSSH, SSHFP, DNSSEC, DNS, Security

Description: Publish trusted SSH host fingerprints in DNS, validate the DNSSEC chain and resolver path, and prove that OpenSSH authenticates a server through SSHFP.

SSHFP lets a DNS zone publish fingerprints of SSH host public keys. To authenticate a server, the client needs both a matching fingerprint and an authenticated DNS result. Publishing a record, seeing an RRSIG, or completing an SSH login proves only part of that workflow. [SSHFP specification](https://www.rfc-editor.org/rfc/rfc4255.html)

This example uses `app.example.com`, one active Ed25519 host key, and OpenSSH. Substitute your actual hostname and key path. Start with a maintained client containing the CVE-2025-26465 fix: upstream OpenSSH 9.9p2 fixed an impersonation vulnerability affecting 6.8p1 through 9.9p1 when `VerifyHostKeyDNS` was enabled. Older vendor version numbers require checking the vendor's backport status. [OpenSSH security release](https://www.openssh.org/txt/release-9.9p2)

## Generate records from an authenticated key

Obtain the active server's public host key through its console or an already authenticated administrative channel. Confirm which key the running daemon uses; a leftover `.pub` file is insufficient evidence.

On that server, generate the record from the verified public file:

```bash
ssh-keygen -r app.example.com. \
  -f /etc/ssh/ssh_host_ed25519_key.pub
```

`-r` prints SSHFP records for the supplied name; `-f` selects the public key. It does not generate or replace the server key. Some versions print both SHA-1 and SHA-256 records. Select the `SSHFP 4 2` line for this example. [ssh-keygen options](https://man.openbsd.org/ssh-keygen#r)

Here, algorithm `4` identifies Ed25519 and fingerprint type `2` identifies SHA-256. The final field is a 64-character hexadecimal digest, unlike the base64 `SHA256:...` display from ordinary SSH fingerprint listings. [Ed25519 registration](https://www.rfc-editor.org/rfc/rfc7479.html), [SHA-256 SSHFP format](https://www.rfc-editor.org/rfc/rfc6594.html)

Although `ssh-keyscan -D` can produce records, it does not authenticate the keys it collects. Publishing an unverified scan can establish trust in an attacker's key. [ssh-keyscan security properties](https://man.openbsd.org/ssh-keyscan)

## Publish into a working DNSSEC chain

In the DNS provider's editor, add an SSHFP record at `app.example.com` with algorithm `4`, fingerprint type `2`, and the generated hexadecimal digest. For a zone file, the form is:

```text
app.example.com. 300 IN SSHFP 4 2 <generated-64-character-hex-digest>
```

Replace the angle-bracketed placeholder; `300` is an example TTL in seconds. Preserve other intended host-key algorithms. SSHFP uses the hostname as its owner and contains no port field, so it cannot distinguish independent SSH identities on different ports of that hostname. [Record structure](https://www.rfc-editor.org/rfc/rfc4255.html#section-3)

Publish through the zone's normal signed-update process. With manually signed BIND zones, updating the unsigned file also requires re-signing and loading the signed result. A publicly validated chain needs the matching DS record at the parent, the zone's DNSKEY records, and valid signatures through to the resolver's trust anchor. A signed zone without its parent linkage does not acquire public DNSSEC trust merely by serving RRSIGs. [BIND signing and delegation guide](https://bind9.readthedocs.io/en/stable/dnssec-guide.html)

## Validate the data and the path to SSH

Check the exact SSHFP owner, not just the zone's A record:

```bash
dig +dnssec app.example.com. SSHFP
delv app.example.com. SSHFP
```

`dig +dnssec` requests DNSSEC material; it does not itself validate signatures. `delv` performs validation using its configured trust anchor and obtains the supporting records through its resolver. Require the SSHFP answer to be reported as fully validated and compare its digest with the trusted server-generated value. Use `delv +vtrace app.example.com. SSHFP` to investigate failures. Keep the validator's trust anchor and system clock current. [BIND lookup and validation tools](https://bind9.readthedocs.io/en/stable/manpages.html#delv-dns-lookup-and-validation-utility)

Separately establish how **SSH's resolver path** authenticates answers. A practical arrangement is a locally validating resolver reached over loopback. A remote validating resolver requires a trusted, authenticated path from the client, including any local forwarding stub. Plain UDP or TCP to a public resolver does not authenticate its AD-bit claim; DNSSEC also does not encrypt DNS traffic. [AD-bit trust requirements](https://www.rfc-editor.org/rfc/rfc4035.html#section-4.9.3), [DNSSEC scope](https://www.rfc-editor.org/rfc/rfc4033.html#section-4)

OpenSSH consumes the resolver's validated-result indication. A successful standalone `delv` check does not configure that integration. Confirm the actual client build, OS resolver behavior, and forwarding path; changing a resolver address alone is insufficient. [OpenSSH DNS verification implementation](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/dns.c)

## Configure the acceptance policy

For the intended host, place this before broader client defaults:

```sshconfig
Host app.example.com
    VerifyHostKeyDNS yes
    StrictHostKeyChecking yes
```

`VerifyHostKeyDNS yes` permits automatic trust for a secure DNS match. `ask` only supplies fingerprint information and leaves confirmation to the ordinary host-key policy; `no` disables DNS verification. With `StrictHostKeyChecking yes`, an unknown key cannot be interactively accepted through fallback. [Client policy](https://man.openbsd.org/ssh_config#VerifyHostKeyDNS)

The distinction matters when diagnosing these results:

| DNS result | Meaning and OpenSSH behavior |
| --- | --- |
| Secure matching fingerprint | With `yes`, DNS can authenticate the host before ordinary known-hosts lookup. |
| Insecure matching fingerprint | No automatic DNS trust; ordinary host-key checks apply. |
| Secure records, fingerprint mismatch | The DNS answer authenticated, but the presented key disagrees. OpenSSH warns and proceeds to ordinary host-key checks. |
| Bogus validation or lookup failure | No secure DNS acceptance. A validating resolver commonly returns SERVFAIL for bogus data; SSH can fall back if the connection otherwise reaches host-key verification. |

DNSSEC-insecure data belongs to a branch established as unsigned, or marked insecure by local policy; bogus data fails expected validation. OpenSSH's “insecure” log more broadly means the resolver supplied no validated-result flag. Missing records are another lookup outcome. [DNSSEC result states](https://www.rfc-editor.org/rfc/rfc4033.html#section-5), [OpenSSH result handling](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/dns.c)

In OpenSSH 10.3p1, an already trusted local key can therefore allow a connection despite an SSHFP mismatch or lookup error. Conversely, a secure DNS match returns before ordinary known-hosts comparison. The two options above are not a requirement that DNS and a saved key must both agree. `RevokedHostKeys` is checked before DNS acceptance; ordinary known-hosts `@revoked` markers are consulted only during fallback. [Acceptance and fallback order](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/sshconnect.c)

## Prove DNS authenticated the connection

Use a controlled canary with the published Ed25519 key. Temporarily exclude ordinary known-hosts sources for this invocation, while retaining required routing, user authentication, and `RevokedHostKeys` configuration. If revocation is required, ensure it uses an approved, current `RevokedHostKeys` source before running the canary; `@revoked` entries in the excluded sources cannot enforce it. [Revocation configuration](https://man.openbsd.org/ssh_config#RevokedHostKeys)

```bash
ssh -vv -o ControlPath=none \
  -o VerifyHostKeyDNS=yes -o StrictHostKeyChecking=yes \
  -o HostKeyAlgorithms=ssh-ed25519 \
  -o UserKnownHostsFile=none -o GlobalKnownHostsFile=none \
  -o KnownHostsCommand=none -o UpdateHostKeys=no \
  app.example.com true
```

The plain-key algorithm avoids certificate authentication, and disabling connection reuse forces a new handshake. Require debug evidence of **secure fingerprints** and a **matching host key fingerprint** from DNS, then check user authentication separately. This invocation cannot succeed through the excluded known-hosts sources. Keep these temporary source overrides out of the normal host configuration. [SSH connection options](https://man.openbsd.org/ssh), [DNS diagnostic messages](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/dns.c)

For an insecure result, investigate resolver integration. For a mismatch, compare the presented key with the server inventory and every published fingerprint. OpenSSH 10.3p1 clears its match result when any comparable fingerprint fails: publishing two different Ed25519/SHA-256 keys together does not automatically permit either one. Treat rotations and multiple backends as separately tested designs. [Fingerprint comparison logic](https://github.com/openssh/openssh-portable/blob/V_10_3_P1/dns.c)

Repeat validation after key or DNS changes, account for cached TTLs, and monitor signature expiry. Removing SSHFP alone does not revoke a key that clients still accept through another trust source.
