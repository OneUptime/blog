# How to Use KMS-Based Disk Encryption in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, KMS, Disk Encryption, Key Management, Security

Description: Configure KMS-based disk encryption in Talos Linux for centralized key management and enterprise-grade security compliance.

---

For organizations that need centralized key management, audit trails, and the ability to revoke encryption keys remotely, KMS-based disk encryption in Talos Linux is the right approach. KMS (Key Management Service) integration lets you manage your encryption keys through an external service rather than storing them locally on the node. This provides a level of control and visibility that other key management options simply cannot match. This guide walks through setting up KMS-based encryption, choosing a KMS provider, and handling the operational aspects.

## Why KMS for Disk Encryption?

KMS-based encryption addresses several enterprise requirements that local key management cannot:

- **Centralized key control** - all encryption keys are managed from a single service
- **Audit logging** - every key access is logged and traceable
- **Key revocation** - you can revoke access to keys without physical access to the node
- **Key rotation** - rotate keys centrally without touching individual nodes
- **Compliance** - meets requirements for SOC 2, PCI-DSS, HIPAA, and other frameworks that mandate centralized key management
- **Separation of duties** - the team managing keys can be different from the team managing infrastructure

## How KMS Encryption Works in Talos

The flow for KMS-based encryption in Talos Linux:

1. **Boot starts** - Talos begins the boot process
2. **Key request** - Talos contacts the configured KMS endpoint to retrieve the encryption key
3. **Key wrapping** - The KMS returns a wrapped (encrypted) key or unwraps a locally stored key envelope
4. **Partition unlock** - The key is used to unlock the LUKS2 encrypted partitions
5. **Normal operation** - The node boots and joins the cluster

The KMS must be available at boot time. If the node cannot reach the KMS, it cannot decrypt its partitions and will not boot successfully.

## Configuring KMS Encryption

The machine configuration for KMS-based encryption specifies the KMS endpoint:

```yaml
machine:
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        - kms:
            endpoint: "https://kms.example.com/v1/keys/talos-state-key"
          slot: 0
    ephemeral:
      provider: luks2
      keys:
        - kms:
            endpoint: "https://kms.example.com/v1/keys/talos-ephemeral-key"
          slot: 0
```

The endpoint URL points to your KMS service. The exact URL format depends on which KMS implementation you use.

## KMS Server Setup

Talos uses a gRPC-based KMS protocol. The KMS server must implement the Talos KMS API, which handles key sealing and unsealing operations.

Siderolabs provides a reference KMS server implementation that you can deploy:

```bash
# Deploy the Talos KMS server
docker run -d \
  --name talos-kms \
  -p 4050:4050 \
  -v /path/to/keys:/keys \
  ghcr.io/siderolabs/kms-server:latest
```

For production, you would deploy this behind a load balancer with TLS termination:

```yaml
# Kubernetes deployment for KMS server
apiVersion: apps/v1
kind: Deployment
metadata:
  name: talos-kms
  namespace: security
spec:
  replicas: 3
  selector:
    matchLabels:
      app: talos-kms
  template:
    metadata:
      labels:
        app: talos-kms
    spec:
      containers:
      - name: kms
        image: ghcr.io/siderolabs/kms-server:latest
        ports:
        - containerPort: 4050
        volumeMounts:
        - name: keys
          mountPath: /keys
      volumes:
      - name: keys
        secret:
          secretName: kms-master-keys
---
apiVersion: v1
kind: Service
metadata:
  name: talos-kms
  namespace: security
spec:
  selector:
    app: talos-kms
  ports:
  - port: 4050
    targetPort: 4050
```

## High Availability for KMS

Since nodes cannot boot without KMS access, the KMS service must be highly available:

```yaml
# Deploy KMS with multiple replicas behind a load balancer
apiVersion: v1
kind: Service
metadata:
  name: talos-kms-lb
  namespace: security
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
spec:
  type: LoadBalancer
  selector:
    app: talos-kms
  ports:
  - port: 4050
    targetPort: 4050
```

Consider these availability strategies:

1. **Multiple replicas** - run at least 3 KMS server instances
2. **Geographic distribution** - spread replicas across availability zones
3. **Separate from the Talos cluster** - the KMS should run independently so that Talos nodes can reach it during boot before the cluster is up
4. **Health monitoring** - actively monitor KMS availability and alert on failures

## Network Considerations

The KMS must be reachable during the early boot phase, before Kubernetes networking is configured. This means:

- The KMS endpoint must be accessible from the node's network (the network that Talos configures during early boot)
- DNS resolution must work at boot time if you use a hostname in the endpoint
- Firewall rules must allow the node to reach the KMS port

```yaml
# Using an IP address avoids DNS dependency at boot
machine:
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        - kms:
            endpoint: "https://10.0.1.50:4050/v1/keys/talos-state"
          slot: 0
```

Using an IP address instead of a hostname avoids potential DNS issues during early boot.

## Adding Recovery Keys

Always pair KMS encryption with a recovery mechanism:

```yaml
machine:
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        - kms:
            endpoint: "https://kms.example.com/v1/keys/talos-state"
          slot: 0
        - static:
            passphrase: "emergency-recovery-passphrase"
          slot: 1
    ephemeral:
      provider: luks2
      keys:
        - kms:
            endpoint: "https://kms.example.com/v1/keys/talos-ephemeral"
          slot: 0
        - static:
            passphrase: "emergency-recovery-passphrase"
          slot: 1
```

The recovery passphrase lets you unlock partitions if the KMS is temporarily unreachable. Store it securely in a separate system from the KMS.

## Key Rotation with KMS

One of the main advantages of KMS is centralized key rotation:

1. Generate a new key in the KMS
2. Update the Talos machine configuration to reference the new key endpoint
3. Apply the configuration to nodes in a rolling fashion
4. Decommission the old key

```bash
# Rolling key rotation across the cluster
for node in 192.168.1.10 192.168.1.11 192.168.1.12; do
  # Drain the node
  kubectl drain "$node" --ignore-daemonsets --delete-emptydir-data

  # Apply updated config with new key reference
  talosctl apply-config --nodes "$node" --file updated-config.yaml

  # Wait for node to rejoin
  kubectl wait --for=condition=Ready "node/$node" --timeout=300s

  # Uncordon
  kubectl uncordon "$node"
done
```

## Integrating with Cloud KMS Services

If you are running Talos on cloud infrastructure, you can potentially integrate with cloud-native KMS services:

**AWS KMS:**
You would need a proxy service that translates between the Talos KMS protocol and the AWS KMS API.

**Google Cloud KMS:**
Similarly, a translation layer between Talos KMS protocol and Google Cloud KMS.

**HashiCorp Vault:**
Vault's Transit secrets engine can serve as a KMS backend:

```bash
# Enable Transit engine in Vault
vault secrets enable transit

# Create an encryption key
vault write -f transit/keys/talos-state

# The KMS server would use Vault as its backend
```

## Monitoring KMS Health

Monitor your KMS service carefully since it is on the critical path for node boots:

```yaml
# Prometheus alerting for KMS availability
groups:
- name: kms-alerts
  rules:
  - alert: KMSEndpointDown
    expr: up{job="talos-kms"} == 0
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Talos KMS endpoint is unreachable"
      description: "Nodes will fail to boot if KMS is unavailable"
```

## Troubleshooting

**Node stuck at boot waiting for KMS:**
- Verify the KMS endpoint is reachable from the node's network
- Check KMS server logs for connection errors
- Verify TLS certificates if using HTTPS

**Key retrieval errors:**
- Check KMS server logs for authorization failures
- Verify the key exists in the KMS
- Check for clock skew between the node and KMS server

```bash
# Check encryption-related logs on the node
talosctl logs machined --nodes 192.168.1.10 | grep -i "kms\|encrypt\|key"
```

## Summary

KMS-based disk encryption in Talos Linux provides enterprise-grade key management for your encrypted partitions. It requires more infrastructure than local key management approaches, but delivers centralized control, audit trails, and the ability to rotate or revoke keys remotely. Deploy your KMS service with high availability, always configure recovery keys, and monitor the KMS endpoint carefully since it sits on the critical path for node boot. For organizations with compliance requirements around key management, KMS integration is the way to go.
