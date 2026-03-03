# How to Secure Cluster Discovery Communications in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Security, Cluster Discovery, Encryption, Zero Trust

Description: Learn how to secure cluster discovery communications in Talos Linux, including encryption verification, self-hosted services, and hardening techniques.

---

Cluster discovery is a critical communication path in Talos Linux. Nodes share their network endpoints and identities through the discovery service, and if this communication is compromised, an attacker could learn about your cluster topology or potentially inject malicious node information. Fortunately, Talos Linux includes strong security properties by default, and with a few additional measures, you can harden discovery communications to meet even the strictest security requirements.

## Default Security Properties

Before adding any hardening, understand what Talos already provides. The discovery service communication has several built-in security features.

### End-to-End Encryption

All discovery data is encrypted before it leaves the node. The encryption uses keys derived from the cluster's secret bundle, which is generated during cluster creation:

```bash
# View the cluster secrets (these should be kept secure)
# The secrets file is generated during talosctl gen config
# and should be stored in a secure location
ls -la secrets.yaml
```

The encryption chain works like this:

```text
Cluster Secrets -> Key Derivation -> AES-256-GCM Encryption -> Discovery Service
```

The discovery service receives only encrypted blobs and cannot decrypt them. This is not something you need to configure; it happens automatically.

### Transport Layer Security

Communication between nodes and the discovery service uses HTTPS (TLS 1.2 or higher). This provides an additional layer of encryption for data in transit:

```bash
# The discovery endpoint must be HTTPS
# Default: https://discovery.talos.dev/
talosctl get machineconfig --nodes <node-ip> -o yaml | grep "endpoint:"
```

### Cluster Isolation

Each cluster has a unique ID derived from its secrets. The discovery service uses this ID to isolate data between clusters. A node from one cluster cannot see or interact with discovery data from another cluster.

## Securing the Cluster Secrets

The most important security measure is protecting your cluster secrets. These secrets are the root of trust for all discovery encryption:

```bash
# Generate cluster secrets
talosctl gen secrets -o secrets.yaml

# This file contains everything needed to impersonate a cluster member
# Protect it accordingly
chmod 600 secrets.yaml
```

Best practices for cluster secrets:

- Store secrets in a vault (HashiCorp Vault, AWS Secrets Manager, etc.)
- Never commit secrets to version control
- Limit access to the secrets to only administrators who need to manage nodes
- Rotate secrets periodically (requires cluster reconfiguration)

```bash
# Using HashiCorp Vault to store secrets
vault kv put secret/talos/my-cluster secrets=@secrets.yaml

# Retrieve when needed
vault kv get -field=secrets secret/talos/my-cluster > secrets.yaml
```

## Self-Hosting the Discovery Service

For maximum control over discovery security, self-host the discovery service within your private network:

```yaml
cluster:
  discovery:
    enabled: true
    registries:
      service:
        disabled: false
        endpoint: https://discovery.internal.corp.com/
```

Benefits of self-hosting:
- No data leaves your network (even encrypted data)
- You control access to the discovery endpoint
- You can add network-level authentication
- You can audit all discovery traffic

### Restricting Access to the Discovery Endpoint

Use network policies or firewall rules to restrict which IPs can reach your discovery service:

```yaml
# Network policy to restrict discovery service access
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: discovery-access
  namespace: talos-system
spec:
  podSelector:
    matchLabels:
      app: discovery-service
  policyTypes:
    - Ingress
  ingress:
    - from:
        - ipBlock:
            cidr: 10.0.0.0/8  # Only allow access from your cluster network
      ports:
        - protocol: TCP
          port: 3000
```

Or at the firewall level:

```bash
# Allow only cluster node IPs to reach the discovery service
iptables -A INPUT -p tcp --dport 443 -s 10.0.0.0/24 -d <discovery-ip> -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -d <discovery-ip> -j DROP
```

## Monitoring Discovery Communications

Set up monitoring to detect unusual discovery activity:

```bash
#!/bin/bash
# Monitor discovery for anomalies

NODE="10.0.0.10"

# Check the number of discovered members
# A sudden increase might indicate unauthorized nodes trying to join
MEMBERS=$(talosctl get discoveredmembers --nodes $NODE -o json | jq 'length')
EXPECTED=5  # Set to your expected cluster size

if [ "$MEMBERS" -gt "$EXPECTED" ]; then
  echo "ALERT: More discovered members ($MEMBERS) than expected ($EXPECTED)"
  echo "Possible unauthorized node attempting to join"
  # Show details of all members for investigation
  talosctl get discoveredmembers --nodes $NODE -o yaml
fi
```

If you self-host the discovery service, enable access logging:

```nginx
# Nginx access log for the discovery service
server {
    listen 443 ssl;
    server_name discovery.internal.corp.com;

    access_log /var/log/nginx/discovery-access.log combined;

    # Log the client IP for audit purposes
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## Disabling the Service Registry

If your security policy prohibits any external communication, disable the service registry entirely:

```yaml
# Disable external discovery service
cluster:
  discovery:
    enabled: true
    registries:
      service:
        disabled: true
      kubernetes:
        disabled: false
```

This eliminates the external dependency but limits discovery to the Kubernetes registry, which only works after Kubernetes is running.

## TLS Certificate Hardening

For self-hosted discovery services, use strong TLS configuration:

```nginx
# Strong TLS configuration for the discovery service
server {
    listen 443 ssl;
    server_name discovery.internal.corp.com;

    # Use strong cipher suites
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers on;

    # Short-lived certificates (use cert-manager for auto-rotation)
    ssl_certificate /etc/ssl/certs/discovery.pem;
    ssl_certificate_key /etc/ssl/private/discovery-key.pem;

    # Enable OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
}
```

For Talos nodes using an internal CA, add the CA to the machine configuration:

```yaml
machine:
  files:
    - content: |
        -----BEGIN CERTIFICATE-----
        <your-internal-CA-certificate>
        -----END CERTIFICATE-----
      path: /etc/ssl/certs/internal-ca.pem
      permissions: 0644
```

## Verifying Discovery Security

Periodically verify that your discovery security measures are working:

```bash
# Verify that discovery data is encrypted (you should not see readable data)
talosctl logs controller-runtime --nodes <node-ip> | grep -i "encrypt\|decrypt\|discovery"

# Verify that the discovery service is using HTTPS
talosctl get machineconfig --nodes <node-ip> -o yaml | grep "endpoint:"
# Should start with https://

# Verify cluster identity matches across all nodes
for node in 10.0.0.10 10.0.0.11 10.0.0.12; do
  echo -n "Node $node: "
  talosctl get clusteridentity --nodes $node -o json | jq -r '.[0].spec.id'
done
# All nodes should show the same cluster ID
```

## Network Segmentation

Place the discovery service in a network segment with restricted access:

```text
+-------------------+
| Cluster Nodes     | <-- Can reach discovery service
+-------------------+
        |
    [Firewall]
        |
+-------------------+
| Discovery Service | <-- Only accessible from cluster network
+-------------------+
        |
    [Firewall]
        |
+-------------------+
| Management Net    | <-- Admin access only
+-------------------+
```

## Audit and Compliance

For compliance requirements, document your discovery security controls:

1. **Data encryption**: All discovery data is encrypted end-to-end using AES-256-GCM with keys derived from cluster secrets
2. **Transport security**: HTTPS (TLS 1.2+) for all discovery communications
3. **Access control**: Discovery service accessible only from cluster network
4. **Audit logging**: All access to the discovery service is logged
5. **Key management**: Cluster secrets stored in a hardware security module or vault
6. **Monitoring**: Alerts for unusual discovery activity

```bash
# Generate an audit report
echo "=== Discovery Security Audit ==="
echo "Date: $(date)"
echo ""
echo "Discovery endpoint:"
talosctl get machineconfig --nodes <node-ip> -o yaml | grep "endpoint:"
echo ""
echo "Cluster identity:"
talosctl get clusteridentity --nodes <node-ip>
echo ""
echo "Discovered members:"
talosctl get discoveredmembers --nodes <node-ip>
echo ""
echo "KubeSpan status:"
talosctl get kubespanpeerstatus --nodes <node-ip>
```

## Incident Response

If you suspect the discovery service has been compromised:

1. **Immediate**: Check for unauthorized members in the discovery list
2. **Contain**: Disable the service registry on all nodes to stop using the potentially compromised service
3. **Investigate**: Check discovery service logs for unauthorized access
4. **Recover**: If cluster secrets were exposed, rotate them (requires cluster reconfiguration)
5. **Prevent**: Implement additional access controls and monitoring

```bash
# Emergency: Disable service registry on all nodes
talosctl patch machineconfig \
  --patch '{"cluster": {"discovery": {"registries": {"service": {"disabled": true}}}}}' \
  --nodes <all-node-ips>

# Check for unauthorized members
talosctl get discoveredmembers --nodes <node-ip> -o yaml
```

Securing cluster discovery in Talos Linux is largely about understanding and verifying the built-in protections, then adding layers based on your security requirements. The default encryption model is strong, and for most clusters, it provides sufficient security. For high-security environments, self-hosting the discovery service, restricting network access, and implementing monitoring and auditing close the remaining gaps.
