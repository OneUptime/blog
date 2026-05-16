# How to Understand Discovery Service Architecture in Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Discovery Service, Architecture, Cluster Management, Security

Description: A deep dive into the architecture of the Talos Linux discovery service, covering its design principles, data flow, encryption model, and operational characteristics.

---

The discovery service in Talos Linux is a deceptively simple component that handles a critical function: helping cluster nodes find each other. Understanding its architecture helps you make better decisions about deployment, security, and operations. This post takes you through the internals of how the discovery service works.

## Design Philosophy

The discovery service was designed with several principles in mind:

**Minimal trust**: The service itself is untrusted. It stores and relays encrypted data but cannot read it. Even if the service is compromised, an attacker cannot learn the cluster topology or impersonate a node.

**Ephemeral operation**: The service keeps active data in memory with TTLs. Current deployments may snapshot encrypted state to disk to speed recovery after restarts, but the service still does not store plaintext node data. Nodes re-register automatically, so a service restart causes only a brief delay in discovery.

**Simplicity**: The service is a small Go binary that accepts gRPC requests. There is no distributed consensus requirement in the service itself.

## Data Flow

The discovery process involves three participants: the registering node, the discovery service, and the querying nodes. Here is how data flows between them.

### Registration

When a node registers with the discovery service:

```text
1. Node generates its discovery payload:
   - Network endpoints (IP addresses, ports)
   - KubeSpan public key (if enabled)
   - Node metadata

2. Node encrypts the payload using the cluster's shared secret:
   - Derive encryption key from cluster secrets
   - Encrypt affiliate data with AES-GCM
   - Encrypt endpoints separately so the service can deduplicate encrypted endpoint values
   - The encrypted blob is opaque to the discovery service

3. Node sends a gRPC AffiliateUpdate request to the discovery service:
   service: sidero.discovery.server.Cluster
   method: AffiliateUpdate
   fields: cluster_id, affiliate_id, affiliate_data, affiliate_endpoints, ttl

4. Discovery service stores the encrypted data:
   - Indexed by cluster ID and affiliate ID
   - TTL timer started
```

### Query

When a node queries for other members:

```text
1. Node uses the discovery service gRPC API:
   - List returns a snapshot of affiliates for a cluster
   - Watch streams the current snapshot and later affiliate updates

2. Discovery service returns stored affiliate records for that cluster ID:
   Response: affiliates with encrypted data and encrypted endpoints

3. Node decrypts each payload using the cluster's shared secret:
   - Only nodes with the correct cluster secrets can decrypt
   - Invalid payloads (wrong key) are silently discarded

4. Node updates its local discovery member list
```

You can observe this from the Talos side:

```bash
# View the result of the query (decrypted members)

talosctl get members --nodes <node-ip>

# View detailed member data
talosctl get members --nodes <node-ip> -o yaml
```

## The Cluster ID

Each cluster has a unique identifier that serves as the namespace for its discovery data. The cluster ID is derived from the cluster's secret bundle:

```bash
# View raw affiliates learned from each discovery registry
talosctl get affiliates --nodes <node-ip> --namespace=cluster-raw
```

The cluster ID is one of the pieces of information the discovery service can see in the clear. It is derived from the cluster secrets using a one-way hash, so an attacker who knows the cluster ID cannot reverse-engineer the cluster secrets.

Two clusters with different secrets will have different cluster IDs and will not see each other's discovery data, even if they use the same discovery service. This is how the public discovery service safely handles multiple clusters.

## Encryption Model

The encryption model is central to the discovery service's security:

```text
Cluster Secrets
    |
    v
Key Derivation Function (KDF)
    |
    +-- Cluster ID (public, sent to discovery service)
    |
    +-- Encryption Key (private, never leaves the node)
         |
         v
    Encrypt(payload) -> encrypted_blob (sent to discovery service)
```

The discovery service only sees:
- The cluster ID (a hash, not reversible)
- The affiliate ID (the node identity used as the affiliate identifier)
- The client version
- The number of affiliates in the cluster
- The encrypted affiliate data and encrypted endpoints (opaque, cannot be decrypted without cluster secrets)

It does not see:
- IP addresses or endpoints of nodes
- KubeSpan keys
- Node hostnames or metadata

## The Affiliate Model

Within a cluster's namespace, each node is identified as an "affiliate." Each affiliate has:

- An affiliate ID (the node's unique identity, generated as a base62-encoded random 32-byte value)
- Encrypted affiliate data
- Encrypted endpoints that other affiliates can use to reach it

The affiliate model allows the discovery service to track a proposed cluster member that has the same cluster ID and secret. The merged `affiliates` view is built from data pulled from the enabled registries.

```bash
# View the node identity used as the affiliate identifier
talosctl get identities --nodes <node-ip> -o yaml
```

## TTL and Refresh Mechanism

Discovery entries have a TTL (time-to-live). If a node stops refreshing its registration, the entry expires and is removed from the discovery service.

The lifecycle looks like this:

```text
Node boots -> Register (TTL = 30 minutes)
              |
              +-- Refresh periodically before the TTL expires
              |
Node stops -> No more refreshes
              |
              +-- TTL expires -> Entry removed
```

This automatic cleanup means the discovery service never accumulates stale entries. If a node crashes or is decommissioned, its entry naturally expires.

```bash
# You can observe entries appearing and disappearing
talosctl get members --nodes <node-ip> --watch
```

## The Service API

The discovery service exposes a simple gRPC API:

```text
service sidero.discovery.server.Cluster

Hello
  - First request sent by the client
  - Can return the client IP as seen by the server or a redirect

AffiliateUpdate
  - Register or update encrypted affiliate data and endpoints
  - Includes cluster ID, affiliate ID, encrypted data, encrypted endpoints, and TTL

AffiliateDelete
  - Remove an affiliate

List
  - List all affiliates for a cluster

Watch
  - Stream the current affiliate snapshot and later updates
```

The API is intentionally minimal. The discovery data is protected by the encryption model rather than by the service being trusted to read the data. Only clients with the correct cluster secrets can produce valid encrypted data that other nodes will accept.

## Dual Registry Architecture

Talos supports two registries simultaneously:

```text
                    +-- Service Registry (external HTTP endpoint)
                    |   - Works before Kubernetes boots
                    |   - Requires network access to the endpoint
Discovery Controller|
                    +-- Kubernetes Registry (Node annotations)
                        - Works only after Kubernetes is running
                        - No external dependencies
```

The discovery controller merges results from enabled registries. In the raw namespace, Talos prefixes affiliate IDs with `service/` for data from the discovery service and `k8s/` for data from the Kubernetes registry. This provides redundancy: if the service registry is down, the Kubernetes registry can keep discovery working after Kubernetes is available.

```bash
# View which registries are configured
talosctl get machineconfig --nodes <node-ip> -o yaml | grep -A15 registries
```

## Scaling Characteristics

The discovery service scales well because of its simplicity:

- Memory usage is proportional to the number of cluster-affiliate entries
- Each entry is small (a few KB of encrypted data)
- CPU usage is minimal (just storing and serving encrypted blobs)

For a cluster with 100 nodes, the discovery service stores approximately 100 affiliate records plus encrypted endpoint data for that cluster. Actual memory use depends on how many endpoints are reported and deduplicated.

```bash
# If self-hosting, monitor resource usage
# The service is very lightweight
docker stats talos-discovery
```

## Fault Tolerance

The discovery service is designed to tolerate failures gracefully:

**Service restart**: Nodes re-register automatically, and current service deployments may restore encrypted snapshots to reduce the recovery delay. During the gap, nodes continue operating with their last known peer list.

**Service unavailable**: Nodes fall back to the Kubernetes registry if enabled. Existing peer connections (KubeSpan tunnels) remain up because they do not depend on continuous discovery.

**Network partition**: Nodes in different partitions maintain their own view of the cluster based on the last successful discovery query. When the partition heals, discovery automatically reconciles.

```bash
# Even if discovery is down, existing connections persist
talosctl get kubespanpeerstatuses --nodes <node-ip>
# Will still show peers that were discovered before the outage
```

## Security Analysis

The discovery service's security model is strong for several reasons:

1. **Confidentiality**: All discovery data is encrypted. The service operator cannot read it.
2. **Integrity**: The encryption scheme includes authentication (AEAD), so tampered data is detected and discarded.
3. **Availability**: The service keeps active data ephemeral and nodes refresh their registrations automatically.
4. **Cluster isolation**: Different clusters are completely isolated by their cluster IDs.

The main attack surface is availability (an attacker could DDoS the discovery service) and metadata (an attacker could learn that a cluster exists and approximately how many nodes it has). Neither of these reveals the actual cluster topology or allows unauthorized access.

Understanding the discovery service architecture gives you confidence in how your cluster operates and helps you make informed decisions about security, deployment, and monitoring. The service is intentionally simple, secure by design, and easy to operate, whether you use the public instance or self-host your own.
