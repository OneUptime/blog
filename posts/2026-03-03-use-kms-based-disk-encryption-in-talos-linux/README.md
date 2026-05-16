# How to Use KMS-Based Disk Encryption in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, KMS, Disk Encryption, Key Management, Security

Description: Configure KMS-based disk encryption in Talos Linux for centralized key management and enterprise-grade security compliance.

---

For organizations that need centralized key handling, audit trails, and operational control over disk unlocks, KMS-based disk encryption in Talos Linux is a strong approach. KMS (Key Management Service) integration lets Talos seal and unseal disk encryption keys through an external service rather than relying only on local key material. The exact level of control and visibility depends on the KMS server implementation you deploy. This guide walks through setting up KMS-based encryption, choosing a KMS provider, and handling the operational aspects.

## Why KMS for Disk Encryption?

KMS-based encryption addresses several enterprise requirements that local key management cannot:

- **Centralized key control** - disk unlock operations depend on a service you control
- **Audit logging** - a production KMS implementation can log seal and unseal operations
- **Key revocation** - you can revoke access to the KMS without physical access to the node
- **Key rotation** - rotate KMS-backed disk encryption keys by updating Talos encryption key slots
- **Compliance** - can help satisfy controls in SOC 2, PCI-DSS, HIPAA, and other frameworks when paired with the right operational processes
- **Separation of duties** - the team managing keys can be different from the team managing infrastructure

## How KMS Encryption Works in Talos

The flow for KMS-based encryption in Talos Linux:

1. **Boot starts** - Talos begins the boot process
2. **Key request** - Talos contacts the configured KMS endpoint
3. **Key unsealing** - The KMS unseals the sealed disk encryption key material
4. **Partition unlock** - The unsealed key is used to unlock the LUKS2 encrypted partitions
5. **Normal operation** - The node boots and joins the cluster

The KMS must be available at boot time. If the node cannot reach the KMS, it cannot decrypt its partitions and will not boot successfully.

## Configuring KMS Encryption

The machine configuration for KMS-based encryption specifies the KMS endpoint. In current Talos releases, system volume encryption is configured with `VolumeConfig` documents:

```yaml
apiVersion: v1alpha1
kind: VolumeConfig
name: STATE
encryption:
  provider: luks2
  keys:
    - kms:
        endpoint: "https://kms.example.com:4050"
      slot: 0
---
apiVersion: v1alpha1
kind: VolumeConfig
name: EPHEMERAL
encryption:
  provider: luks2
  keys:
    - kms:
        endpoint: "https://kms.example.com:4050"
      slot: 0
```

The endpoint URL points to your gRPC KMS service. It should be the KMS service endpoint, not a REST key path.

## KMS Server Setup

Talos uses a gRPC-based KMS protocol. The KMS server must implement the Talos KMS API, which handles key sealing and unsealing operations.

Sidero Labs provides a simple reference KMS server implementation. It requires a 32-byte key file and is useful as a starting point; production deployments usually wrap a real key management backend and add their own authentication, authorization, and audit logging:

```bash
# Deploy the Talos KMS server

docker run -d \
  --name talos-kms \
  -p 4050:4050 \
  -v /path/to/kms.key:/kms.key:ro \
  ghcr.io/siderolabs/kms-server:latest \
  --key-path=/kms.key
```

This command starts the reference server without TLS, so the matching Talos endpoint would use `http://<kms-host>:4050`. Use TLS for production endpoints.

For production, you would deploy this behind a load balancer and enable TLS on the gRPC endpoint:

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
        args:
        - --key-path=/keys/kms.key
        - --tls-enable
        - --tls-cert-path=/tls/tls.crt
        - --tls-key-path=/tls/tls.key
        ports:
        - containerPort: 4050
        volumeMounts:
        - name: keys
          mountPath: /keys
          readOnly: true
        - name: tls
          mountPath: /tls
          readOnly: true
      volumes:
      - name: keys
        secret:
          secretName: kms-master-keys
      - name: tls
        secret:
          secretName: talos-kms-tls
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

1. **Multiple replicas** - run at least 3 KMS server instances backed by the same key material or backend
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
apiVersion: v1alpha1
kind: VolumeConfig
name: STATE
encryption:
  provider: luks2
  keys:
    - kms:
        endpoint: "https://10.0.1.50:4050"
      slot: 0
```

Using an IP address instead of a hostname avoids potential DNS issues during early boot.

## Adding Recovery Keys

Always pair KMS encryption with a recovery mechanism:

```yaml
apiVersion: v1alpha1
kind: VolumeConfig
name: STATE
encryption:
  provider: luks2
  keys:
    - kms:
        endpoint: "https://kms.example.com:4050"
      slot: 0
    - static:
        passphrase: "emergency-recovery-passphrase"
      slot: 1
---
apiVersion: v1alpha1
kind: VolumeConfig
name: EPHEMERAL
encryption:
  provider: luks2
  keys:
    - kms:
        endpoint: "https://kms.example.com:4050"
      slot: 0
    - static:
        passphrase: "emergency-recovery-passphrase"
      slot: 1
```

The recovery passphrase gives Talos another configured LUKS key slot if the KMS is temporarily unreachable. Store it securely in a separate system from the KMS. Avoid using a static key for `STATE` unless you accept that Talos stores the `STATE` encryption configuration in cleartext on the `META` partition.

## Key Rotation with KMS

One of the main advantages of KMS is centralized control, but Talos still rotates disk encryption keys by updating the configured LUKS key slots:

1. Add a new KMS key entry in a different LUKS slot while keeping the old working key
2. Apply the configuration with a reboot so Talos can sync the new key
3. Remove the old key entry from the machine configuration
4. Apply the configuration again with a reboot

```bash
# Rolling key rotation across the cluster
for node in 192.168.1.10 192.168.1.11 192.168.1.12; do
  # Drain the node
  kubectl drain "$node" --ignore-daemonsets --delete-emptydir-data

  # Apply updated config and reboot so Talos syncs the encryption keys
  talosctl apply-config --nodes "$node" --file updated-config.yaml --mode=reboot

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

**Key unsealing errors:**
- Check KMS server logs for authorization failures
- Verify the KMS backend can unseal data for the node
- Check for clock skew between the node and KMS server

```bash
# Check encryption-related logs on the node
talosctl logs machined --nodes 192.168.1.10 | grep -i "kms\|encrypt\|key"
```

## Summary

KMS-based disk encryption in Talos Linux provides external key handling for your encrypted partitions. It requires more infrastructure than local key management approaches, but can deliver centralized control, audit trails, and the ability to revoke KMS access when implemented with a production-grade backend. Deploy your KMS service with high availability, always configure recovery keys where appropriate, and monitor the KMS endpoint carefully since it sits on the critical path for node boot. For organizations with compliance requirements around key management, KMS integration is a strong option.
