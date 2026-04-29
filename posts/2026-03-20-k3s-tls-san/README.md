# How to Configure K3s TLS SAN

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Rancher, TLS, Security, Certificate

Description: Learn how to configure TLS Subject Alternative Names (SANs) in K3s to enable secure API access from multiple IP addresses and hostnames.

## Introduction

When K3s generates its TLS certificate for the Kubernetes API server, it includes Subject Alternative Names (SANs) that define which hostnames and IP addresses the certificate is valid for. If you try to access the API server via an address not in the certificate's SANs, you'll get a TLS certificate validation error. Properly configuring TLS SANs is essential for multi-interface servers, load-balanced clusters, and external API access.

## Why TLS SANs Matter

When kubectl connects to the API server, it validates the server's certificate against the server address. If you connect to `k3s.example.com` but the certificate only includes `192.168.1.100`, the connection fails with:

```text
x509: certificate is valid for 192.168.1.100, not k3s.example.com
```

Adding `k3s.example.com` to the TLS SANs resolves this.

## Default TLS SANs in K3s

K3s automatically includes the standard Kubernetes service DNS names, plus local and server addresses that it associates with the API server. Typical defaults include:
- `kubernetes`
- `kubernetes.default`
- `kubernetes.default.svc`
- `kubernetes.default.svc.cluster.local`
- Local addresses such as `localhost` and `127.0.0.1`
- The server node's own addresses/hostnames

## Adding Custom TLS SANs

### Before Installation

```bash
sudo mkdir -p /etc/rancher/k3s

sudo tee /etc/rancher/k3s/config.yaml > /dev/null <<EOF
token: "ClusterToken"

# TLS Subject Alternative Names

tls-san:
  - 192.168.1.100         # Primary server IP
  - 192.168.1.99          # Load balancer VIP
  - k3s.example.com       # External DNS name
  - k3s.internal.local    # Internal DNS name
  - my-cluster.lab        # Additional hostname
EOF

curl -sfL https://get.k3s.io | sudo sh -
```

### On an Existing Cluster

Adding TLS SANs to an existing cluster requires rotating the certificates:

```bash
# Add the new SANs without duplicating the tls-san key in config.yaml
sudo mkdir -p /etc/rancher/k3s/config.yaml.d
sudo tee /etc/rancher/k3s/config.yaml.d/tls-san.yaml > /dev/null <<EOF
tls-san+:
  - 192.168.1.99
  - k3s.example.com
EOF

# Stop K3s
sudo systemctl stop k3s

# Rotate certificates so the new SANs are included
sudo k3s certificate rotate

# Start K3s
sudo systemctl start k3s

# Monitor certificate rotation
sudo journalctl -u k3s -f | grep -E "cert|tls|san"
```

## Verifying TLS SANs

```bash
# Check the certificate SANs of the running API server
openssl s_client -connect 192.168.1.100:6443 </dev/null 2>/dev/null | \
    openssl x509 -noout -text | \
    grep -A 10 "Subject Alternative Name"

# Expected output includes all configured SANs:
# X509v3 Subject Alternative Name:
#     IP Address:192.168.1.100, IP Address:192.168.1.99,
#     DNS:k3s.example.com, DNS:kubernetes, ...
```

## Updating kubeconfig to Use a Custom SAN

After adding a TLS SAN, update your kubeconfig to connect via the new address:

```bash
# Get the current kubeconfig
sudo cat /etc/rancher/k3s/k3s.yaml

# Update the server address in your kubeconfig
# Replace the IP with your DNS name
sed -i 's/https:\/\/127.0.0.1:6443/https:\/\/k3s.example.com:6443/' ~/.kube/config

# Test connection
kubectl get nodes
```

## Common TLS SAN Scenarios

### Load-Balanced HA Cluster

```yaml
tls-san:
  - 192.168.1.100   # Server 1
  - 192.168.1.101   # Server 2
  - 192.168.1.102   # Server 3
  - 192.168.1.99    # Load balancer VIP (most important)
  - k3s-ha.example.com
```

### Cloud Instance with Public IP

```yaml
tls-san:
  - 10.0.0.10           # Private IP
  - 203.0.113.50         # Public IP
  - k3s.mycompany.com    # DNS A record pointing to public IP
```

### Development Cluster with Multiple Access Methods

```yaml
tls-san:
  - 192.168.1.100
  - 10.10.0.100          # VPN interface
  - k3s.local            # mDNS hostname
  - k3s.dev.example.com  # External CNAME
```

## Automating kubeconfig Distribution

After adding SANs, distribute the kubeconfig to team members:

```bash
# Get the kubeconfig with the load balancer address
sudo cat /etc/rancher/k3s/k3s.yaml | \
    sed 's/127.0.0.1/192.168.1.99/' > k3s-team.yaml

# Share with team members
scp k3s-team.yaml user@workstation:~/.kube/config-k3s

# Set KUBECONFIG to use it
export KUBECONFIG=~/.kube/config-k3s
kubectl get nodes
```

## Troubleshooting TLS SAN Issues

### Certificate Validation Error

```bash
# Check the error message
kubectl --insecure-skip-tls-verify=true get nodes
# If this works, the issue is the TLS certificate

# Verify what SANs are in the certificate
openssl s_client -connect k3s.example.com:6443 -servername k3s.example.com </dev/null 2>/dev/null | \
    openssl x509 -noout -text | grep -A 5 "Subject Alternative"

# If your desired SAN is missing, add it to config.yaml and rotate certs
```

### Connecting from a Remote Machine

```bash
# Copy the kubeconfig to your remote machine
# The admin kubeconfig is usually root-readable only
ssh ubuntu@192.168.1.100 'sudo cat /etc/rancher/k3s/k3s.yaml' > ~/.kube/k3s-config

# Update the server address to use an accessible IP or hostname
sed -i 's/127.0.0.1/192.168.1.100/' ~/.kube/k3s-config

# Ensure the address is in the certificate SANs
export KUBECONFIG=~/.kube/k3s-config
kubectl get nodes
```

### Certificate Not Yet Updated After Rotation

```bash
# Check when the certificate expires/was issued
openssl s_client -connect 192.168.1.100:6443 </dev/null 2>/dev/null | \
    openssl x509 -noout -dates

# If the certificate is old, check that K3s restarted properly
sudo systemctl status k3s
sudo journalctl -u k3s | grep "tls" | tail -20
```

## Conclusion

TLS SANs in K3s control which IP addresses and hostnames are valid for API server connections. Always include your load balancer VIP and any DNS names used to access the cluster in the `tls-san` configuration. For existing clusters, adding new SANs requires updating the K3s configuration, rotating the certificates, and restarting K3s so it issues certificates including the new SANs. This is a non-destructive operation that takes only a minute to complete.
