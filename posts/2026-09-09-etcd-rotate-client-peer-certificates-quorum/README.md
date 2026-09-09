# How to Rotate etcd Client and Peer Certificates Without Losing Quorum

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: etcd, TLS, Security, High Availability, Linux

Description: Rotate etcd server, client, and peer certificates in stages, verify both TLS directions, and preserve a working voting majority.

---

Certificate rotation is a trust migration as well as a file replacement. Each etcd member accepts client connections and exchanges traffic with peers, while application clients maintain their own trust stores and credentials. A certificate can be valid on disk yet fail because another participant does not trust its issuer or recognize its identity.

This procedure targets a healthy three-voter etcd 3.6 or 3.7 cluster managed as Linux services. Adapt the restart mechanism for an operator or static-pod deployment. Keep at least two voters working throughout every stage, and use the deployment's PKI to issue certificates rather than creating an unrelated new CA.

## Inventory the trust relationships

Record the configured client-serving certificate and key, peer certificate and key, client trust bundle, and peer trust bundle on each member. Include application clients, backup jobs, health probes, and administrative credentials in the inventory.

Typical server options are:

```text
--cert-file=/etc/etcd/pki/server.crt
--key-file=/etc/etcd/pki/server.key
--trusted-ca-file=/etc/etcd/pki/client-ca.crt
--client-cert-auth=true
--peer-cert-file=/etc/etcd/pki/peer.crt
--peer-key-file=/etc/etcd/pki/peer.key
--peer-trusted-ca-file=/etc/etcd/pki/peer-ca.crt
--peer-client-cert-auth=true
```

These are an inventory checklist, not a replacement server command. The server certificate identifies the client-facing listener. A peer certificate commonly needs both server and client extended key usages because each member participates in both directions. Client credentials need client authentication usage. Preserve CN-based RBAC identities where your deployment uses them. The [transport security guide](https://etcd.io/docs/v3.7/op-guide/security/) describes the corresponding options and peer identity checks.

List every DNS name and IP address used in advertised URLs and actual connections. Ensure the new SANs match those identities. Peer validation can also examine the incoming peer's remote address; a successful client connection to port 2379 does not validate the peer certificate on port 2380.

## Validate issued files before installation

In a protected staging directory, inspect each certificate's dates, issuer, subject, SANs, and usages. The following examples assume OpenSSL with these inspection options available:

```bash
openssl x509 -in peer.crt -noout -subject -issuer -dates -text
openssl verify -CAfile peer-trust-bundle.pem -purpose sslserver peer.crt
openssl verify -CAfile peer-trust-bundle.pem -purpose sslclient peer.crt
openssl x509 -in server.crt -noout -checkhost etcd1.example.com
```

If your PKI uses intermediates, supply the intermediate chain with `-untrusted` as appropriate. Verify that the private key matches the certificate without printing the private key:

```bash
openssl x509 -in peer.crt -pubkey -noout \
  | openssl pkey -pubin -outform DER \
  | openssl dgst -sha256
openssl pkey -in peer.key -pubout -outform DER \
  | openssl dgst -sha256
```

The digests should match. Check certificate validity against the member's clock and allow for `notBefore` times. Preserve file ownership and permissions that allow only the service and administrators to read private keys.

## Use overlapping trust when the CA changes

Renewing leaves under the same trusted CA is simpler than changing the CA itself. For a CA change, use three distinct phases:

1. Distribute bundles that trust both old and new issuers to all members and clients.
2. Replace leaf certificates and keys, one member or client group at a time.
3. Remove the old issuer only after every participant has migrated and rollback no longer requires it.

Complete the trust expansion before presenting any new-CA leaf. Keep client and peer trust domains separate if they already use separate CAs. A peer-trust change on only one member can produce asymmetric connections that are difficult to diagnose.

Use a controlled rolling restart to load trust changes. Although etcd documents certificate reloading on new connections, do not assume all trust-pool configuration and existing long-lived connections immediately adopt a changed file. A new TCP/TLS handshake is required to verify the newly served leaf. Follow the release and deployment's supported reload behavior.

## Rotate one member and wait for recovery

Before starting, verify all voting endpoints are healthy and save a snapshot through the approved backup workflow. Capture member IDs and a baseline status table using existing administrative credentials:

```bash
etcdctl endpoint health
etcdctl endpoint status --write-out=table
etcdctl member list --write-out=table
```

Choose a follower first. Stage the complete certificate/key set in a new protected directory and update the service's configured paths as one reviewed configuration change. For a simple service deployment, stop that one member, install the matching files or switch to the staged paths, and restart it. This avoids a process observing a new certificate with an old key during separate file writes.

```bash
sudo systemctl stop etcd
# Install the previously verified matching files and configuration here.
sudo systemctl start etcd
sudo journalctl -u etcd --since '5 minutes ago' --no-pager
```

The installation step depends on your secret-distribution system and is intentionally not a generic copy command. Confirm the other two voters remain available. Verify the restarted member's ID is unchanged, its Raft progress catches up, and peer logs show no authentication errors. Do not rotate the next member until the first is fully participating.

## Verify the served certificate and application access

Open a fresh connection to the changed member with the intended trust bundle:

```bash
openssl s_client -connect etcd1.example.com:2379 \
  -servername etcd1.example.com -verify_hostname etcd1.example.com \
  -verify_return_error -CAfile client-server-trust.pem \
  -cert operator.crt -key operator.key </dev/null
```

For peer TLS, test from an authorized peer environment using that peer's client certificate and validate the remote peer hostname. Then run authenticated etcd reads and endpoint health checks through the normal client path. TLS success alone does not confirm RBAC permissions or quorum-dependent operations.

Repeat for the other follower, then handle the leader, transferring leadership first if your maintenance procedure calls for it. Keep client reconnection behavior and watch recovery within the maintenance plan. One-at-a-time rotation preserves the ability to reach quorum; it does not promise every in-flight request will avoid a retry.

If one member fails after rotation, restore its prior verified paths while the other voters continue operating. Retain overlapping trust during rollback. After every client and member uses the new identity material, remove old trust in another controlled rollout and securely retire obsolete keys according to your PKI policy.

## Conclusion

Expand trust before changing issuers, validate matching leaf/key pairs and identities, and rotate one member at a time. Require fresh TLS handshakes, restored Raft participation, and successful application operations before advancing to the next member.

## Official Documentation

- [etcd transport security](https://etcd.io/docs/v3.7/op-guide/security/)
- [etcd TLS configuration options](https://etcd.io/docs/v3.6/op-guide/configuration/)
- [etcd runtime reconfiguration and maintenance sequencing](https://etcd.io/docs/v3.7/op-guide/runtime-configuration/)
- [OpenSSL verify command](https://docs.openssl.org/3.0/man1/openssl-verify/)
