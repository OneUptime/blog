# How to Fix etcd TLS Handshake Errors by Auditing URLs and SANs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: etcd, TLS, Networking, Troubleshooting, Security

Description: Diagnose plaintext and TLS mismatches in etcd endpoints, then validate certificate trust and SANs without disabling verification.

---

`tls: first record does not look like a TLS handshake` usually means one side expected TLS but received bytes from a different protocol. In an etcd deployment, the first suspect is a mismatch between an `http://` or `https://` URL and the listener or proxy actually reached.

A certificate SAN mismatch is a separate failure that appears after a TLS handshake reaches certificate validation. Investigate protocol alignment first, then trust and identity. This workflow applies to etcd 3.6 and 3.7 client and peer connections.

## Locate the endpoint that produced the error

Start with the log's local address, remote address, timestamp, and component. An etcd member rejecting an incoming plaintext health probe is different from an application trying TLS against an HTTP backend.

Write down the actual connection path:

```text
Application -> load balancer -> etcd client listener
etcd1 -> etcd2 advertised peer listener
Health checker -> metrics or client listener
```

Record the scheme and port on every hop. TLS termination at a load balancer means the frontend and backend may intentionally use different protocols; the proxy configuration must match that arrangement. TLS passthrough means the original handshake should reach etcd unchanged. Confirm which design you have before editing either side.

Typical ports are 2379 for clients and 2380 for peers, but your configuration is authoritative. A port number alone never proves that a listener speaks TLS.

## Audit listen and advertise settings separately

On each affected member, inspect the effective configuration source. Record these settings:

```text
listen-client-urls
advertise-client-urls
listen-peer-urls
initial-advertise-peer-urls
listen-metrics-urls
cert-file / key-file
peer-cert-file / peer-key-file
```

The listen URL controls the local socket and scheme. The advertised URL tells other participants where to connect. A correctly secured listener with a stale advertised HTTP URL can still produce failing clients or peers. A metrics listener can have a distinct transport configuration, so keep its probes separate from application readiness.

With working administrative credentials, inspect the cluster's membership URLs:

```bash
etcdctl --endpoints=https://etcd1.example.com:2379 \
  --cacert=/etc/etcd/pki/ca.crt \
  --cert=/etc/etcd/pki/operator.crt \
  --key=/etc/etcd/pki/operator.key \
  member list --write-out=table
```

Check process flags, environment files, systemd units, container arguments, and operator-managed manifests against that output. If a YAML configuration file is supplied, do not assume editing an ignored environment variable changes the running server. The [configuration reference](https://etcd.io/docs/v3.6/op-guide/configuration/) documents the precedence rules.

## Prove the transport directly

Bypass the proxy for a controlled test from an authorized network location. For an endpoint configured as HTTPS, make a verified connection:

```bash
openssl s_client -connect etcd1.example.com:2379 \
  -servername etcd1.example.com \
  -verify_hostname etcd1.example.com \
  -verify_return_error \
  -CAfile /etc/etcd/pki/ca.crt \
  -cert /etc/etcd/pki/operator.crt \
  -key /etc/etcd/pki/operator.key </dev/null
```

If the peer listener is the affected path, use port 2380 and the originating member's authorized peer certificate and key. Test from that member's actual network context because peer authentication may check the source IP against certificate identity.

A protocol error before any certificate is presented points back to the wrong socket, scheme, or proxy behavior. An unknown-authority error points to the trust chain. A hostname error points to SANs. A client-certificate error points to mutual TLS or identity policy. Keep those observations distinct rather than repeatedly regenerating certificates.

Do not use insecure certificate-verification flags as a fix. They do not correct a plaintext/TLS protocol mismatch, and they hide the identity problem once TLS starts working.

## Validate SANs against the address actually used

Inspect the leaf that the server presents, then compare it with the configured certificate file. A process can still serve a different file or an older certificate through a proxy.

```bash
openssl x509 -in /etc/etcd/pki/server.crt \
  -noout -subject -issuer -dates -ext subjectAltName
openssl x509 -in /etc/etcd/pki/server.crt \
  -noout -checkhost etcd1.example.com
```

For an IP URL, verify that the certificate includes that address as an IP SAN. A DNS SAN containing the text of an IP address does not substitute for an IP SAN. Using a DNS name requires a matching DNS identity and correct name resolution.

etcd also applies incoming peer certificate checks described in its [transport security model](https://etcd.io/docs/v3.7/op-guide/security/). Those checks can depend on peer IP SANs or DNS resolution. NAT, changed host addresses, or using a certificate issued for another member can fail even when the basic outgoing server-name check succeeds.

## Correct the narrow configuration error

If only a client URL or health probe uses the wrong scheme, correct that client or probe to the intended listener. If the proxy frontend expects TLS but the backend is configured incorrectly, repair the proxy's backend protocol and verify a fresh connection through it.

For an advertised peer URL change, use the supported membership update before restarting the member with its matching local peer configuration:

```bash
etcdctl member update MEMBER_ID \
  --peer-urls=https://etcd2.example.com:2380
```

`MEMBER_ID` is the existing hexadecimal ID from `member list`; do not invent a replacement identity. Execute the command through a healthy authenticated voter and only as part of a reviewed peer endpoint change. Maintain quorum and repair one member at a time. Updating a bootstrap flag alone does not rewrite existing cluster membership.

If a leaf has the wrong SANs, issue a corrected certificate through the existing PKI and rotate it with its matching key. Preserve the previous working configuration for rollback while the other voters remain healthy. A CA change requires an overlapping-trust migration, not just a leaf replacement.

## Verify the original failing operation

Repeat the direct TLS check, then an authenticated etcd read through the original application path. Confirm the client and peer URLs in membership remain correct, the affected member has caught up, and the original logs stop reporting failures under the same traffic.

A successful `/version` response or TCP connection is insufficient evidence for a write or watch workload. Test the actual operation and credentials that failed, including client reconnection through a load balancer where applicable.

## Conclusion

Treat the first-record error as a transport mismatch until the connection proves otherwise. Align schemes and listeners first, then validate the served certificate's trust chain, SANs, and peer identity policy, preserving quorum during any member changes.

## Official Documentation

- [etcd transport security and SAN validation](https://etcd.io/docs/v3.7/op-guide/security/)
- [etcd listen and advertise configuration](https://etcd.io/docs/v3.6/op-guide/configuration/)
- [Updating advertised peer URLs](https://etcd.io/docs/v3.7/op-guide/runtime-configuration/)
- [OpenSSL s_client verification options](https://docs.openssl.org/3.0/man1/openssl-s_client/)
