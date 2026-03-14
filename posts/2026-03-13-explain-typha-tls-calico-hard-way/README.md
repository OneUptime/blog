# How to Explain Typha TLS in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, TLS, Security, Communication

Description: How to explain Typha's mTLS authentication model to teammates who need to understand or audit the security posture of a manually installed Calico cluster.

---

## Introduction

Explaining Typha TLS to teammates requires translating the abstract concept of mutual TLS into concrete terms: who presents certificates, what those certificates prove, and what the security boundary looks like. The audience might be a security team auditing the cluster, a new platform engineer onboarding, or a developer trying to understand why a Calico component is failing.

## The Core Security Concern

Without authentication between Felix and Typha, the following attack is possible: a process running on a compromised worker node could connect to the Typha service and receive the complete state of all Calico network policies. This gives the attacker knowledge of which network policies are enforced, which pods are isolated, and potentially where security-critical workloads are running.

mTLS closes this attack surface: only processes holding certificates signed by the cluster's Calico CA can connect to Typha.

## Analogy for Security Teams

> "Typha mTLS is equivalent to a corporate VPN with client certificate authentication. The VPN server (Typha) has a server certificate that clients verify. Each VPN client (Felix) has a unique client certificate that the server verifies. Without a valid certificate from the corporate CA, the VPN server rejects the connection."

## Explaining to Platform Engineers

For engineers who understand Kubernetes but not Typha specifics:

```plaintext
The setup is equivalent to other mTLS systems in Kubernetes:
- etcd uses client certificates to authenticate kubeadm
- The Kubernetes API server uses client certificates for control plane components
- Typha uses the same pattern for Felix authentication
```

The certificates are just X.509 standard certificates. The only Typha-specific aspect is that both Felix and Typha reference the same CA certificate.

## How to Show the Current Security Posture

```bash
# Is TLS enabled on Typha?
kubectl get deployment calico-typha -n calico-system -o yaml | grep -c "TYPHA_CAFILE"

# What CA is Typha using?
kubectl get secret calico-typha-tls -n calico-system -o jsonpath='{.data.ca\.crt}' | \
  base64 -d | openssl x509 -noout -subject -issuer

# What CA is Felix using?
kubectl get secret calico-felix-typha-tls -n calico-system -o jsonpath='{.data.ca\.crt}' | \
  base64 -d | openssl x509 -noout -subject -issuer

# Are the CAs identical?
TYPHA_CA=$(kubectl get secret calico-typha-tls -n calico-system -o jsonpath='{.data.ca\.crt}')
FELIX_CA=$(kubectl get secret calico-felix-typha-tls -n calico-system -o jsonpath='{.data.ca\.crt}')
[ "$TYPHA_CA" = "$FELIX_CA" ] && echo "CA match: SECURE" || echo "CA mismatch: INSECURE"
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
ls /etc/calico/typha-ca.key  # Should exist only on the control plane

# Certificate validity
kubectl get secret calico-typha-tls -n calico-system -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl x509 -noout -dates

# TLS enforcement check
kubectl get deployment calico-typha -n calico-system -o yaml | grep TYPHA_REQUIREDCN
```

## Certificate Revocation

Typha does not support CRL (Certificate Revocation Lists). Revocation is handled by deleting the Felix client certificate Secret and restarting the affected Felix agents, which forces them to use new certificates.

## Conclusion

Explaining Typha TLS to different audiences requires adjusting the level of detail: security teams need the threat model and audit evidence, platform engineers need the operational mechanics, and new team members need the conceptual analogy. The core message is consistent across all audiences: Typha mTLS ensures that only authorized Felix agents - those with certificates signed by the cluster CA - can connect to the policy fan-out layer, closing a meaningful attack surface in the Calico architecture.
