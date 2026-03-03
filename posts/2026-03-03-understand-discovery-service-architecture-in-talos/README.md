# How to Understand Discovery Service Architecture in Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Discovery Service, Architecture, Cluster Management, Security

Description: A deep dive into the architecture of the Talos Linux discovery service, covering its design principles, data flow, encryption model, and operational characteristics.

---

The discovery service in Talos Linux is a deceptively simple component that handles a critical function: helping cluster nodes find each other. Understanding its architecture helps you make better decisions about deployment, security, and operations. This post takes you through the internals of how the discovery service works.

## Design Philosophy

The discovery service was designed with several principles in mind:

**Minimal trust**: The service itself is untrusted. It stores and relays encrypted data but cannot read it. Even if the service is compromised, an attacker cannot learn the cluster topology or impersonate a node.

**Stateless operation**: The service keeps data in memory with TTLs. There is no database, no persistent storage, and no state that survives a restart. Nodes re-register automatically, so a service restart causes only a brief delay in discovery.

**Simplicity**: The service is a small Go binary that accepts HTTP requests. There are no complex protocols, no distributed consensus, and no clustering requirements.

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
   - Encrypt payload with AES-256-GCM (or similar)
   - The encrypted blob is opaque to the discovery service

3. Node sends HTTP POST to the discovery service:
   POST /clusters/{cluster-id}/affiliates/{affiliate-id}
   Body: encrypted_payload

4. Discovery service stores the encrypted blob:
   - Indexed by cluster ID and affiliate ID
   - TTL timer started
```

### Query

When a node queries for other members:

```text
1. Node sends HTTP GET to the discovery service:
   GET /clusters/{cluster-id}/affiliates

2. Discovery service returns all stored blobs for that cluster ID:
   Response: [encrypted_payload_1, encrypted_payload_2, ...]

3. Node decrypts each payload using the cluster's shared secret:
   - Only nodes with the correct cluster secrets can decrypt
   - Invalid payloads (wrong key) are silently discarded

4. Node updates its local discovery member list
```

You can observe this from the Talos side:

```bash
# View the result of the query (decrypted members)
talosctl get discoveredmembers --nodes <node-ip>

# View detailed member data
talosctl get discoveredmembers --nodes <node-ip> -o yaml
```

## The Cluster ID

Each cluster has a unique identifier that serves as the namespace for its discovery data. The cluster ID is derived from the cluster's secret bundle:

```bash
# View the cluster identity
talosctl get clusteridentity --nodes <node-ip>
```

The cluster ID is the only piece of information the discovery service can see in the clear. It is derived from the cluster secrets using a one-way hash, so an attacker who knows the cluster ID cannot reverse-engineer the cluster secrets.

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
- The affiliate ID (a hash of the node identity)
- The encrypted blob (opaque, cannot be decrypted without cluster secrets)

It does not see:
- IP addresses or endpoints of nodes
- KubeSpan keys
- Node hostnames or metadata
- The number of distinct pieces of information (the blob is a single encrypted unit)

## The Affiliate Model

Within a cluster's namespace, each node is identified as an "affiliate." Each affiliate has:

- An affiliate ID (derived from the node's machine ID and cluster secrets)
- One or more encrypted data blobs
- Endpoints that other affiliates can use to reach it

The affiliate model allows nodes to have multiple pieces of discovery data. For example, a node might publish both its service registry data and additional metadata.

```bash
# The affiliate identity is part of the KubeSpan identity
talosctl get kubespanidentity --nodes <node-ip>
```

## TTL and Refresh Mechanism

Discovery entries have a TTL (time-to-live). If a node stops refreshing its registration, the entry expires and is removed from the discovery service.

The lifecycle looks like this:

```text
Node boots -> Register (TTL = 30 minutes)
              |
              +-- Refresh every ~5 minutes
              |
Node stops -> No more refreshes
              |
              +-- TTL expires -> Entry removed
```

This automatic cleanup means the discovery service never accumulates stale entries. If a node crashes or is decommissioned, its entry naturally expires.

```bash
# You can observe entries appearing and disappearing
talosctl get discoveredmembers --nodes <node-ip> --watch
```

## The HTTP API

The discovery service exposes a simple HTTP API:

```text
POST /clusters/{cluster-id}/affiliates/{affiliate-id}
  - Register or update an affiliate
  - Body: encrypted discovery data
  - Response: 200 OK

GET /clusters/{cluster-id}/affiliates
  - List all affiliates for a cluster
  - Response: JSON array of encrypted blobs

DELETE /clusters/{cluster-id}/affiliates/{affiliate-id}
  - Remove an affiliate (used during graceful shutdown)
  - Response: 200 OK

GET /healthz
  - Health check endpoint
  - Response: 200 OK
```

The API is intentionally minimal. There is no authentication at the HTTP level because the encryption model provides the necessary security. Any client can POST to any cluster ID, but only clients with the correct cluster secrets can produce valid encrypted data that other nodes will accept.

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

The discovery controller merges results from both registries. If a member appears in both, the most recent data is used. This provides redundancy: if the service registry is down, the Kubernetes registry keeps discovery working (and vice versa).

```bash
# View which registries are configured
talosctl get machineconfig --nodes <node-ip> -o yaml | grep -A15 registries
```

## Scaling Characteristics

The discovery service scales well because of its simplicity:

- Memory usage is proportional to the number of cluster-affiliate entries
- Each entry is small (a few KB of encrypted data)
- There is no inter-instance coordination (each instance is independent)
- CPU usage is minimal (just storing and serving encrypted blobs)

For a cluster with 100 nodes, the discovery service stores approximately 100 entries per cluster. The total memory for the encrypted data is well under 1MB. The service can comfortably handle thousands of clusters on a single small instance.

```bash
# If self-hosting, monitor resource usage
# The service is very lightweight
docker stats talos-discovery
```

## Fault Tolerance

The discovery service is designed to tolerate failures gracefully:

**Service restart**: Nodes re-register within their next refresh cycle (typically a few minutes). During the gap, nodes continue operating with their last known peer list.

**Service unavailable**: Nodes fall back to the Kubernetes registry if enabled. Existing peer connections (KubeSpan tunnels) remain up because they do not depend on continuous discovery.

**Network partition**: Nodes in different partitions maintain their own view of the cluster based on the last successful discovery query. When the partition heals, discovery automatically reconciles.

```bash
# Even if discovery is down, existing connections persist
talosctl get kubespanpeerstatus --nodes <node-ip>
# Will still show peers that were discovered before the outage
```

## Security Analysis

The discovery service's security model is strong for several reasons:

1. **Confidentiality**: All discovery data is encrypted. The service operator cannot read it.
2. **Integrity**: The encryption scheme includes authentication (AEAD), so tampered data is detected and discarded.
3. **Availability**: The service is stateless and can be easily replicated for high availability.
4. **Cluster isolation**: Different clusters are completely isolated by their cluster IDs.

The main attack surface is availability (an attacker could DDoS the discovery service) and metadata (an attacker could learn that a cluster exists and approximately how many nodes it has). Neither of these reveals the actual cluster topology or allows unauthorized access.

Understanding the discovery service architecture gives you confidence in how your cluster operates and helps you make informed decisions about security, deployment, and monitoring. The service is intentionally simple, secure by design, and easy to operate, whether you use the public instance or self-host your own.
