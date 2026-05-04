# How to Configure Vault Cluster with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Vault, HashiCorp, IPv6, Secrets Management, High Availability, Cluster, Security

Description: Configure HashiCorp Vault in high-availability mode with IPv6 addresses for API listeners, cluster communication, and storage backend connectivity.

---

HashiCorp Vault manages secrets and protects sensitive data. Deploying a Vault HA cluster on IPv6 requires configuring IPv6 listeners, cluster addresses, and backend storage connection strings.

## Vault IPv6 Configuration

```hcl
# /etc/vault.d/vault.hcl

# HTTP/HTTPS API listener on IPv6

listener "tcp" {
  address       = "[2001:db8::1]:8200"
  tls_cert_file = "/etc/vault.d/certs/vault.crt"
  tls_key_file  = "/etc/vault.d/certs/vault.key"
  # Or disable TLS for development:
  # tls_disable = 1
}

# Cluster address for HA communication between Vault nodes
cluster_addr = "https://[2001:db8::1]:8201"

# API address advertised to clients
api_addr = "https://[2001:db8::1]:8200"

# Storage backend (Raft integrated)
storage "raft" {
  path    = "/var/lib/vault/data"
  node_id = "vault-node-1"

  # Retry join with other IPv6 nodes
  retry_join {
    leader_api_addr = "https://[2001:db8::2]:8200"
    leader_ca_cert_file = "/etc/vault.d/certs/ca.crt"
  }

  retry_join {
    leader_api_addr = "https://[2001:db8::3]:8200"
    leader_ca_cert_file = "/etc/vault.d/certs/ca.crt"
  }
}

# Enable UI
ui = true

# Disable mlock for containers (enable for production)
disable_mlock = false
```

## Generating TLS Certificates with IPv6 SANs

```bash
# Generate CA
openssl genrsa -out ca.key 4096
openssl req -new -x509 -key ca.key -out ca.crt -days 3650 \
  -subj "/CN=Vault CA"

# Generate Vault server cert with IPv6 SANs
cat > vault-cert.cnf << 'EOF'
[req]
default_bits = 2048
prompt = no
distinguished_name = dn
x509_extensions = v3_req

[dn]
CN = vault.example.com

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = vault.example.com
IP.1  = 2001:db8::1
IP.2  = 2001:db8::2
IP.3  = 2001:db8::3
IP.4  = ::1
EOF

openssl req -newkey rsa:2048 -nodes \
  -keyout vault.key -out vault.csr -config vault-cert.cnf
openssl x509 -req -in vault.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out vault.crt -days 365 -extensions v3_req \
  -extfile vault-cert.cnf

sudo cp vault.crt vault.key ca.crt /etc/vault.d/certs/
```

## Starting and Initializing Vault

```bash
# Start Vault
sudo systemctl enable --now vault

# Check if listening on IPv6
ss -tlnp | grep :8200

# Verify Vault status
export VAULT_ADDR="https://[2001:db8::1]:8200"
export VAULT_CACERT="/etc/vault.d/certs/ca.crt"

vault status

# Initialize Vault (first time only)
vault operator init \
  -key-shares=5 \
  -key-threshold=3

# Save the unseal keys and root token securely!
# Then unseal:
vault operator unseal <key1>
vault operator unseal <key2>
vault operator unseal <key3>
```

## Joining Vault Cluster Nodes

```bash
# On node 2, after it starts:
export VAULT_ADDR="https://[2001:db8::2]:8200"
vault operator raft join "https://[2001:db8::1]:8200"

# On node 3:
export VAULT_ADDR="https://[2001:db8::3]:8200"
vault operator raft join "https://[2001:db8::1]:8200"

# Unseal all nodes
vault operator unseal <key1>
vault operator unseal <key2>
vault operator unseal <key3>

# Check cluster status
vault operator raft list-peers
```

## Using Vault over IPv6

```bash
# Set environment for IPv6
export VAULT_ADDR="https://[2001:db8::1]:8200"
export VAULT_CACERT="/etc/vault.d/certs/ca.crt"

# Login with root token
vault login <root_token>

# Write a secret
vault kv put secret/myapp \
  username="dbuser" \
  password="secret123"

# Read the secret
vault kv get secret/myapp
```

```python
# Python Vault client over IPv6
import hvac

# Connect to Vault via IPv6
client = hvac.Client(
    url='https://[2001:db8::1]:8200',
    token='my_vault_token',
    verify='/etc/vault.d/certs/ca.crt'
)

# Read a secret
response = client.secrets.kv.read_secret_version(
    path='myapp',
    mount_point='secret'
)
print(response['data']['data']['password'])
```

## Firewall Rules for Vault IPv6

```bash
# Vault API
sudo ip6tables -A INPUT -p tcp --dport 8200 -j ACCEPT
# Vault cluster communication
sudo ip6tables -A INPUT -p tcp --dport 8201 -j ACCEPT

sudo ip6tables-save > /etc/iptables/rules.v6
```

HashiCorp Vault's configurable listener and cluster address settings make it straightforward to deploy a highly available secrets management cluster on IPv6 infrastructure with full TLS mutual authentication.
