# How to Customize Typha TLS in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, TLS, Customization, PKI, Hard Way

Description: A guide to customizing Typha TLS for specific PKI requirements including enterprise CA integration, custom certificate paths, and per-node Felix certificates.

---

## Introduction

The default Typha TLS setup uses a self-managed CA specific to the Calico deployment. Organizations with an existing enterprise PKI infrastructure may require that Typha and Felix certificates be issued by the corporate CA rather than a Calico-specific CA. Others may need custom certificate paths for binary Felix installations or per-node Felix certificates for auditing purposes. Customizing Typha TLS integrates Calico's mTLS requirements into the broader security infrastructure.

## Option 1: Integrate with an Enterprise CA

If your organization uses an internal CA (e.g., HashiCorp Vault, Active Directory Certificate Services, or an internal cfssl CA), you can use it to sign Typha and Felix certificates.

### Using HashiCorp Vault

```bash
# Configure Vault PKI secrets engine
vault secrets enable pki
vault write pki/root/generate/internal \
  common_name="calico-typha-ca" ttl=87600h

# Create a role for Typha certificates
vault write pki/roles/calico-typha \
  allowed_domains="calico-typha,calico-felix" \
  allow_bare_domains=true \
  allow_subdomains=false \
  max_ttl="2160h"

# Issue Typha server certificate
vault write pki/issue/calico-typha \
  common_name=calico-typha \
  alt_names="calico-typha.calico-system.svc,calico-typha.calico-system.svc.cluster.local" \
  format=pem_bundle > /tmp/typha-server.json

# Extract cert and key
jq -r '.data.certificate' /tmp/typha-server.json > /etc/calico/pki/typha-server.crt
jq -r '.data.private_key' /tmp/typha-server.json > /etc/calico/pki/typha-server.key
jq -r '.data.issuing_ca' /tmp/typha-server.json > /etc/calico/pki/typha-ca.crt

# Issue Felix client certificate
vault write pki/issue/calico-typha common_name=calico-felix > /tmp/felix-client.json
```

### Using cert-manager with an External Issuer

```bash
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: vault-issuer
spec:
  vault:
    server: https://vault.example.com
    path: pki/sign/calico-typha
    auth:
      kubernetes:
        role: calico
        mountPath: /v1/auth/kubernetes
EOF
```

## Option 2: Custom Certificate Paths for Binary Felix

For hard way installations where Felix runs as a binary, certificates are copied to each node. Customize the paths in Felix configuration.

```bash
# Copy to all nodes with a custom path
for node in $(kubectl get nodes -o name | grep worker); do
  NODE_IP=$(kubectl get $node -o jsonpath='{.status.addresses[0].address}')
  ssh ubuntu@$NODE_IP "sudo mkdir -p /etc/calico/tls"
  scp /etc/calico/pki/typha-ca.crt ubuntu@$NODE_IP:/etc/calico/tls/typha-ca.crt
  scp /etc/calico/pki/felix-client.crt ubuntu@$NODE_IP:/etc/calico/tls/felix.crt
  scp /etc/calico/pki/felix-client.key ubuntu@$NODE_IP:/etc/calico/tls/felix.key
  ssh ubuntu@$NODE_IP "sudo chmod 600 /etc/calico/tls/felix.key"
done
```

Configure Felix with custom paths.

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{
    "typhaCAFile": "/etc/calico/tls/typha-ca.crt",
    "tymphaCertFile": "/etc/calico/tls/felix.crt",
    "typhaKeyFile": "/etc/calico/tls/felix.key"
  }}'
```

## Option 3: Per-Node Felix Certificates

For enhanced auditing, issue a unique certificate per node so that Typha logs can identify which node is connecting.

```bash
for node in $(kubectl get nodes -o jsonpath='{.items[*].metadata.name}'); do
  openssl req -newkey rsa:2048 -keyout /etc/calico/pki/felix-$node.key \
    -out /etc/calico/pki/felix-$node.csr \
    -nodes -subj "/CN=calico-felix-$node"

  openssl x509 -req -in /etc/calico/pki/felix-$node.csr \
    -CA /etc/calico/pki/typha-ca.crt -CAkey /etc/calico/pki/typha-ca.key \
    -CAcreateserial -out /etc/calico/pki/felix-$node.crt -days 365
done
```

Update `TYPHA_CLIENTCN` to use a prefix match instead of an exact CN.

```bash
# Use TYPHA_CLIENTURISAN for more flexible matching if supported
# Or use a shared CN with per-node SANs for differentiation
```

## Option 4: Intermediate CA for Typha

Rather than using the root CA to sign Typha certificates directly, use an intermediate CA to limit root key usage.

```bash
# Create intermediate CA
openssl req -newkey rsa:4096 -keyout /etc/calico/pki/typha-int-ca.key \
  -out /etc/calico/pki/typha-int-ca.csr -nodes -subj "/CN=calico-typha-intermediate"

openssl x509 -req -in /etc/calico/pki/typha-int-ca.csr \
  -CA /etc/calico/pki/root-ca.crt -CAkey /etc/calico/pki/root-ca.key \
  -CAcreateserial -out /etc/calico/pki/typha-int-ca.crt -days 1825 \
  -extensions v3_ca -extfile /etc/ssl/openssl.cnf
```

## Conclusion

Customizing Typha TLS for enterprise requirements involves integrating with existing PKI systems (Vault, cert-manager with external issuers), supporting custom certificate file paths for binary Felix deployments, issuing per-node Felix certificates for enhanced auditability, and using intermediate CAs to limit root key exposure. These customizations ensure that Typha's mTLS requirements fit naturally into the organization's existing certificate management infrastructure rather than requiring a parallel self-managed PKI.
