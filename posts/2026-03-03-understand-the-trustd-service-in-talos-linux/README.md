# How to Understand the trustd Service in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Trustd, Security, Certificate, TLS, Kubernetes, Infrastructure

Description: Learn how the trustd service manages certificate trust relationships in Talos Linux, including how it handles certificate signing, node identity, and cluster security.

---

Security in Talos Linux is not an afterthought - it is baked into the foundation of the operating system. One of the services that makes this possible is `trustd`, the trust daemon responsible for managing certificate operations and establishing trust relationships between nodes in a Talos cluster. If you want to understand how Talos keeps your cluster secure at the infrastructure level, you need to understand `trustd`.

## What Does trustd Do?

The `trustd` service handles certificate issuance for worker nodes within a Talos Linux cluster. When a new worker node joins the cluster, it needs a valid Talos API server certificate signed by the cluster's operating system certificate authority (CA) to participate in secure Talos API communications. The `trustd` service on control plane nodes is responsible for signing these certificate requests.

In a traditional Linux environment, you might use tools like `cfssl` or `openssl` to manually generate and distribute certificates. Talos automates worker Talos API certificate issuance through `trustd`, removing the operational burden and reducing the chance of human error.

## How trustd Works Under the Hood

When you bootstrap a Talos cluster, the initial configuration includes a root CA certificate and key. This CA is the ultimate source of trust for the entire cluster. The `trustd` service on control plane nodes has access to the CA key and uses it to sign certificate requests from worker nodes.

Here is the general flow when a worker node joins the cluster:

```text
Worker Node                     Control Plane (trustd)
    |                                    |
    |--- Generate key pair ------------->|
    |--- Send CSR (Certificate          |
    |    Signing Request) ------------->|
    |                                    |--- Verify request
    |                                    |--- Sign certificate
    |<--- Return signed certificate -----|
    |                                    |
    |--- Use certificate for Talos API TLS ->|
```

The worker node generates a private key locally, creates a Certificate Signing Request (CSR), and sends it to `trustd` on a control plane node. After authenticating the request with the machine token, `trustd` signs a server certificate with the cluster OS CA and returns it. The worker node then uses this signed certificate for Talos API TLS.

## Where trustd Runs

The `trustd` service runs on control plane nodes by default. It listens on port 50001 and accepts certificate signing requests from nodes that can present the correct machine token from the Talos machine configuration.

```bash
# Check trustd status on a control plane node

talosctl -n 192.168.1.10 service trustd

# Expected output
# NODE           SERVICE   STATE     HEALTH   LAST CHANGE
# 192.168.1.10   trustd    Running   OK       12h ago
```

Worker nodes do not run `trustd` because they do not need to sign certificates. They are consumers of the trust chain, not providers.

## The Machine Token and Initial Trust

One of the interesting challenges in distributed systems is the bootstrapping problem: how do you establish trust when no trust exists yet? Talos solves this with a machine token that is embedded in the machine configuration.

When you generate a cluster configuration with `talosctl gen config`, a machine token is created:

```bash
# Generate cluster configuration
talosctl gen config my-cluster https://192.168.1.10:6443

# The generated worker.yaml will contain a machine token
# that allows the worker to authenticate with trustd
```

The machine token in the worker configuration allows the new node to authenticate with `trustd` while requesting its Talos API server certificate. This is similar in spirit to how Kubernetes itself handles node bootstrap with the TLS bootstrap process, but it is part of Talos machine configuration rather than a Kubernetes bootstrap token.

## Certificate Rotation

Certificates have expiration dates, and `trustd` plays a role in worker Talos API certificate rotation as well. Talos automatically handles renewal of server-side certificates before they expire. When a worker needs a fresh Talos API server certificate, it contacts `trustd` to get a new certificate signed.

```bash
# View certificate information on a node
talosctl -n 192.168.1.10 get ApiCertificates.secrets.talos.dev -o yaml

# Check Kubernetes dynamic certificates on a control plane node
talosctl -n 192.168.1.10 get KubernetesDynamicCerts.secrets.talos.dev -o yaml
```

This automatic rotation is a significant advantage over manually managed certificate infrastructure, where expired certificates are a common cause of cluster outages.

## Relationship with Other Services

The `trustd` service does not operate in isolation. It is part of the same Talos PKI model used by other services:

- **apid** on worker nodes uses the server certificates issued through `trustd`; without a valid certificate, the Talos API endpoint cannot present its identity correctly.
- **machined** uses the trust infrastructure to verify that configuration changes come from authorized sources.
- **etcd** requires valid peer certificates for inter-node communication, and these certificates are generated from Talos-managed PKI on control plane nodes.

```bash
# View all running services and their relationships
talosctl -n 192.168.1.10 services

# Check service dependencies
talosctl -n 192.168.1.10 service trustd
```

## Troubleshooting trustd Issues

### Node Cannot Join the Cluster

If a new node fails to join the cluster, certificate signing failures are a common root cause. Check the `trustd` logs on your control plane nodes:

```bash
# View trustd logs on control plane
talosctl -n 192.168.1.10 logs trustd

# Look for errors related to certificate signing
talosctl -n 192.168.1.10 logs trustd | grep -i error
```

Common causes include:

1. **Invalid machine token** - If the worker configuration has an incorrect machine token, `trustd` will reject the signing request.

2. **Network issues** - The worker node must be able to reach port 50001 on a control plane node. Firewalls or network segmentation can block this traffic.

3. **CA key mismatch** - If the control plane was rebuilt or the configuration was regenerated without matching CAs, existing nodes will have certificates signed by a different CA.

### Certificate Expiration Warnings

If you see warnings about certificate expiration in your logs, verify that `trustd` is healthy and that the node can reach it for renewal:

```bash
# Check certificate status across all nodes
talosctl -n 192.168.1.10,192.168.1.11,192.168.1.12 get ApiCertificates.secrets.talos.dev -o yaml

# Verify trustd is running on all control plane nodes
talosctl -n 192.168.1.10,192.168.1.11,192.168.1.12 service trustd
```

### Verifying the Trust Chain

You can inspect the certificates on a node to verify the trust chain is intact:

```bash
# Get the CA certificate
talosctl -n 192.168.1.10 get OSRootSecrets.secrets.talos.dev -o yaml

# View the Talos API certificate resource
talosctl -n 192.168.1.10 get ApiCertificates.secrets.talos.dev -o yaml
```

## Security Considerations

The `trustd` service holds the CA private key, which makes control plane nodes particularly sensitive from a security perspective. If an attacker gains access to the CA key, they can sign certificates for arbitrary identities and impersonate any node in the cluster.

Talos mitigates this risk in several ways:

- The CA key is stored as sensitive machine configuration and secret data on control plane nodes
- There is no shell access to extract the key from the filesystem
- All access to node resources goes through authenticated API calls
- The immutable nature of Talos and its controlled persistent state reduce the places where an attacker could install persistent backdoors

## Comparing trustd to Traditional PKI

In a traditional Kubernetes setup, you might use tools like `kubeadm` to manage certificates, or run an external PKI system like Vault or cert-manager. The `trustd` approach is different because it is built directly into the operating system layer rather than running as a Kubernetes workload.

This has a practical benefit: the certificate infrastructure is available before Kubernetes even starts. Kubernetes itself relies on the certificates that `trustd` helps provision, so having the PKI at the OS level means there are no chicken-and-egg problems.

## Summary

The `trustd` service is one of those components that works quietly in the background but is absolutely critical to cluster security. It handles worker Talos API certificate issuance and renewal without requiring manual certificate distribution. Understanding how it works gives you the knowledge to diagnose trust-related issues and appreciate the security model that makes Talos Linux different from traditional distributions.

When things go wrong with worker Talos API certificate issuance or renewal, `trustd` logs should be one of the first places you check. And when things are working smoothly, you can thank `trustd` for keeping those worker API certificates valid and properly signed.
