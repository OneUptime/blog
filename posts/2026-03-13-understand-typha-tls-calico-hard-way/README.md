# How to Understand Typha TLS in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, TLS, Security, Hard Way

Description: An explanation of how TLS and mutual TLS authentication work between Felix and Typha in a manually installed Calico cluster.

---

## Introduction

Typha uses mutual TLS (mTLS) to authenticate connections from Felix agents. Without mTLS, any process that can reach the Typha service endpoint could connect and receive the full stream of Calico resource state - including network policy configurations. mTLS ensures that only Felix agents with certificates signed by the trusted CA can receive this data.

Understanding Typha TLS in a hard way installation requires understanding how X.509 certificates work in the context of mutual authentication, why a shared CA is required, and what happens when certificates expire or are rotated.

## The mTLS Handshake

In a standard TLS connection, only the server presents a certificate (the client verifies the server's identity). In mTLS, both sides present certificates, and both sides verify the other's certificate against a trusted CA.

In the Typha context:

1. Felix (client) connects to Typha (server) on port 5473
2. Typha presents its server certificate (`typha-server.crt`)
3. Felix verifies Typha's certificate against the CA (`typha-ca.crt`)
4. Felix presents its client certificate (`felix-client.crt`)
5. Typha verifies Felix's certificate against the same CA
6. Both sides are authenticated - the connection is established

## Certificate Roles

| Certificate | Holder | Used By | Purpose |
|-------------|--------|---------|---------|
| `typha-ca.crt` | Both | Both | Root of trust for verification |
| `typha-server.crt` | Typha | Felix (to verify Typha) | Proves Typha's identity |
| `typha-server.key` | Typha | Typha | Signs the TLS handshake |
| `felix-client.crt` | Felix | Typha (to verify Felix) | Proves Felix's identity |
| `felix-client.key` | Felix | Felix | Signs the TLS handshake |

## Certificate Distribution in Kubernetes

In a Kubernetes deployment, certificates are stored as Secrets and mounted into the respective containers.

```bash
# Typha's certificates
kubectl get secret calico-typha-tls -n calico-system

# Felix's certificates
kubectl get secret calico-felix-typha-tls -n calico-system
```

Felix's certificate is distributed to each node either through a DaemonSet volume mount or, in a hard way binary installation, by copying the certificate files to each node.

## Subject Names and CN Verification

Typha verifies that the Common Name (CN) or Subject Alternative Name (SAN) in Felix's certificate matches the expected value. By default, Felix presents a certificate with `CN=calico-felix`.

```bash
# Verify Felix client certificate CN
kubectl get secret calico-felix-typha-tls -n calico-system \
  -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -subject
```

If the CN does not match Typha's expected value, the connection is rejected.

## What Happens Without TLS

If TLS is not configured on either side:

```bash
# Typha without TLS - any connection is accepted
# Felix without TLS - connects without authenticating Typha

# Check if TLS is configured
kubectl get deployment calico-typha -n calico-system -o yaml | grep -i "TYPHA_CA\|TYPHA_SERVER" | wc -l
```

If this returns 0, TLS is not configured - this is insecure and should only be acceptable in isolated development environments.

## Certificate Expiry

Certificates have a validity period. When a certificate expires, TLS handshakes fail and Felix cannot connect to Typha.

```bash
# Check all relevant certificate expiry dates
for secret in calico-typha-tls calico-felix-typha-tls; do
  echo "Secret: $secret"
  kubectl get secret $secret -n calico-system -o jsonpath='{.data.tls\.crt}' | \
    base64 -d | openssl x509 -enddate -noout
done
```

## Conclusion

Typha TLS in a hard way installation is an mTLS system where both Felix and Typha authenticate each other using certificates signed by a shared CA. Understanding the certificate roles (CA for trust, server cert for Typha identity, client cert for Felix identity), how they are distributed as Kubernetes Secrets, and how expiry affects connectivity is the foundation for correctly setting up, rotating, and troubleshooting TLS in a manually managed Calico cluster.
