# How to Explain Typha TLS in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, TLS, Security, Communication

Description: How to explain Typha's mTLS authentication model to teammates who need to understand or audit the security posture of a manually installed Calico cluster.

---

## Introduction

Explaining Typha TLS to teammates requires translating the abstract concept of mutual TLS into concrete terms: who presents certificates, what those certificates prove, and what the security boundary looks like. The audience might be a security team auditing the cluster, a new platform engineer onboarding, or a developer trying to understand why a Calico component is failing.

## The Core Security Concern

Without authentication between Felix and Typha, the following attack is possible: a process that can reach the Typha service could connect and receive the Calico datastore updates that Typha fans out to per-node daemons, including network policy state. This gives the attacker knowledge of which network policies are enforced, which pods are isolated, and potentially where security-critical workloads are running.

mTLS closes this attack surface for unauthenticated clients: only processes holding certificates signed by the Calico Typha CA and matching Typha's configured client identity can connect to Typha.

## Analogy for Security Teams

> "Typha mTLS is equivalent to a corporate VPN with client certificate authentication. The VPN server (Typha) has a server certificate that clients verify. Each VPN client (Felix) has a client certificate that the server verifies. Without a valid certificate from the corporate CA and the expected client identity, the VPN server rejects the connection."

## Explaining to Platform Engineers

For engineers who understand Kubernetes but not Typha specifics:

```plaintext
The setup is equivalent to other mTLS systems in Kubernetes:
- etcd uses client certificates to authenticate kube-apiserver
- The Kubernetes API server uses client certificates for control plane components
- Typha uses the same pattern for Felix authentication
```

The certificates are just X.509 standard certificates. The Typha-specific aspects are that both Felix and Typha reference the same CA certificate and that Typha checks the client certificate identity using `TYPHA_CLIENTCN` or `TYPHA_CLIENTURISAN`.

## How to Show the Current Security Posture

```bash
# Is TLS enabled on Typha?

kubectl get deployment calico-typha -n kube-system -o yaml | grep -E "TYPHA_CAFILE|TYPHA_SERVERCERTFILE|TYPHA_CLIENTCN"

# What CA is Typha using?
kubectl get configmap calico-typha-ca -n kube-system -o jsonpath='{.data.typhaca\.crt}' | \
  openssl x509 -noout -subject -issuer

# What certificate is Typha presenting?
kubectl get secret calico-typha-certs -n kube-system -o jsonpath='{.data.typha\.crt}' | \
  base64 -d | openssl x509 -noout -subject -issuer

# What client certificate is calico/node using for Felix-to-Typha?
kubectl get secret calico-node-certs -n kube-system -o jsonpath='{.data.calico-node\.crt}' | \
  base64 -d | openssl x509 -noout -subject -issuer

# Are Typha and calico/node using the same CA bundle?
kubectl get deployment calico-typha -n kube-system -o yaml | grep /calico-typha-ca/typhaca.crt
kubectl get daemonset calico-node -n kube-system -o yaml | grep /calico-typha-ca/typhaca.crt
```

## What Auditors Will Ask

Security auditors reviewing Typha TLS will typically ask:

1. **Who generated the CA?** Is it a self-signed CA or issued by the organization's PKI?
2. **Where is the CA private key stored?** It should not be in a Kubernetes Secret.
3. **What is the certificate validity period?** Short-lived certificates (90 days) are preferred.
4. **Is certificate rotation automated?** Manual rotation risks expiry-induced outages.
5. **Is TLS enforced?** Can Typha accept connections without a client certificate?

Answers to prepare:

```bash
# CA storage location
ls typhaca.key  # Should exist only in your secured certificate-generation location

# Certificate validity
kubectl get secret calico-typha-certs -n kube-system -o jsonpath='{.data.typha\.crt}' | \
  base64 -d | openssl x509 -noout -dates

# TLS enforcement check
kubectl get deployment calico-typha -n kube-system -o yaml | grep TYPHA_CLIENTCN
```

## Certificate Revocation

Typha does not document CRL (Certificate Revocation List) checking for Felix-to-Typha client certificates. In a hard-way installation, revocation is handled operationally: issue a new client certificate, update the `calico-node-certs` Secret, and restart the affected `calico/node` pods so Felix uses the new certificate. If the CA itself is no longer trusted, rotate the Typha CA and both the Typha and calico/node certificates together.

## Conclusion

Explaining Typha TLS to different audiences requires adjusting the level of detail: security teams need the threat model and audit evidence, platform engineers need the operational mechanics, and new team members need the conceptual analogy. The core message is consistent across all audiences: Typha mTLS ensures that only authorized Felix agents - those with certificates signed by the Calico Typha CA and matching Typha's configured client identity - can connect to the policy fan-out layer, closing a meaningful attack surface in the Calico architecture.
