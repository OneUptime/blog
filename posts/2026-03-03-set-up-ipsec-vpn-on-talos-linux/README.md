# How to Set Up IPSec VPN on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, IPSec, VPN, Security, Networking, Encryption, Kubernetes

Description: Complete guide to setting up IPSec VPN connections on Talos Linux for secure site-to-site and remote access connectivity.

---

IPSec (Internet Protocol Security) provides encryption and authentication at the network layer, making it one of the most robust VPN technologies available. Unlike application-layer VPNs, IPSec secures all IP traffic between endpoints without requiring changes to applications. For Talos Linux clusters that need to communicate with remote sites, corporate networks, or cloud VPCs, IPSec VPN is often the right choice.

Setting up IPSec on Talos Linux requires a different approach than on traditional Linux, since you cannot install packages or run commands directly on the host. This guide shows you how to deploy and configure IPSec VPN on Talos Linux.

## IPSec Fundamentals

IPSec operates in two modes:

**Transport Mode**: Encrypts only the payload of the IP packet. The original IP headers remain intact. Used for host-to-host communication.

**Tunnel Mode**: Encrypts the entire IP packet and wraps it in a new IP header. Used for site-to-site VPNs where the tunnel endpoints are gateways.

IPSec uses two main protocols:
- **ESP (Encapsulating Security Payload)**: Provides encryption and optional authentication
- **AH (Authentication Header)**: Provides authentication but no encryption

And two phases for establishing connections:
- **IKE Phase 1 (IKEv2 SA)**: Establishes a secure channel for negotiation
- **IKE Phase 2 (Child SA)**: Creates the actual IPSec tunnel for data

## Deploying IPSec on Talos Linux

Since Talos does not include IPSec tools by default, you have two approaches:

### Approach 1: System Extension

If an IPSec system extension is available, it runs at the OS level:

```yaml
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/ipsec-tools:v1.0.0  # Example
```

### Approach 2: Containerized IPSec (strongSwan/Libreswan)

The more common approach is running an IPSec daemon inside a privileged pod:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: ipsec-gateway
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: ipsec-gateway
  template:
    metadata:
      labels:
        app: ipsec-gateway
    spec:
      hostNetwork: true
      nodeSelector:
        ipsec-gateway: "true"
      containers:
        - name: strongswan
          image: strongx509/strongswan:latest
          securityContext:
            privileged: true
            capabilities:
              add:
                - NET_ADMIN
                - SYS_MODULE
                - SYS_ADMIN
          volumeMounts:
            - name: ipsec-config
              mountPath: /etc/ipsec.d
            - name: ipsec-secrets
              mountPath: /etc/ipsec.secrets
              subPath: ipsec.secrets
            - name: ipsec-conf
              mountPath: /etc/ipsec.conf
              subPath: ipsec.conf
          ports:
            - containerPort: 500
              hostPort: 500
              protocol: UDP
            - containerPort: 4500
              hostPort: 4500
              protocol: UDP
      volumes:
        - name: ipsec-config
          emptyDir: {}
        - name: ipsec-secrets
          secret:
            secretName: ipsec-secrets
        - name: ipsec-conf
          configMap:
            name: ipsec-config
      tolerations:
        - operator: Exists
```

## Configuring strongSwan

### Site-to-Site VPN Configuration

Create the IPSec configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ipsec-config
  namespace: kube-system
data:
  ipsec.conf: |
    config setup
      charondebug="ike 2, knl 2, cfg 2"
      uniqueids=yes

    conn site-to-site
      type=tunnel
      auto=start
      keyexchange=ikev2

      # Local side (Talos cluster)
      left=%defaultroute
      leftsubnet=10.244.0.0/16    # Pod CIDR
      leftid=@talos-cluster
      leftauth=psk

      # Remote side
      right=203.0.113.50           # Remote gateway IP
      rightsubnet=172.16.0.0/16   # Remote network
      rightid=@remote-site
      rightauth=psk

      # Encryption settings
      ike=aes256-sha256-modp2048!
      esp=aes256-sha256!

      # Keep alive
      dpdaction=restart
      dpddelay=30s
      dpdtimeout=120s

      # Rekey settings
      ikelifetime=8h
      lifetime=1h
      margintime=5m
```

### Creating Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ipsec-secrets
  namespace: kube-system
type: Opaque
stringData:
  ipsec.secrets: |
    @talos-cluster @remote-site : PSK "your-very-strong-pre-shared-key-here"
```

For production, use certificates instead of pre-shared keys:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ipsec-secrets
  namespace: kube-system
type: Opaque
stringData:
  ipsec.secrets: |
    : RSA /etc/ipsec.d/private/server.key
data:
  server.key: <base64-encoded-private-key>
  server.crt: <base64-encoded-certificate>
  ca.crt: <base64-encoded-ca-certificate>
```

## Kernel Module Requirements

IPSec requires specific kernel modules. Talos includes the necessary modules, but you may need to ensure they are loaded:

```yaml
machine:
  sysctls:
    # Enable IP forwarding for tunnel traffic
    net.ipv4.ip_forward: "1"

    # Disable ICMP redirects (security best practice for VPN gateways)
    net.ipv4.conf.all.send_redirects: "0"
    net.ipv4.conf.default.send_redirects: "0"
    net.ipv4.conf.all.accept_redirects: "0"
    net.ipv4.conf.default.accept_redirects: "0"

    # Increase xfrm (IPSec transform) state table
    net.core.xfrm_larval_drop: "1"

  kernel:
    modules:
      - name: af_key
      - name: ah4
      - name: esp4
      - name: xfrm_user
```

## Firewall Rules

IPSec uses specific ports and protocols that must be allowed through any network firewalls:

```
# Required for IKE negotiation
UDP 500 (IKE)
UDP 4500 (IKE NAT-Traversal)

# Required for ESP traffic (when not using NAT-T)
IP Protocol 50 (ESP)
IP Protocol 51 (AH)
```

## Certificate-Based Authentication

For production environments, use X.509 certificates instead of pre-shared keys:

### Generate Certificates

```bash
# Create CA
ipsec pki --gen --type rsa --size 4096 --outform pem > ca.key
ipsec pki --self --ca --lifetime 3650 --in ca.key \
  --dn "CN=VPN CA" --outform pem > ca.crt

# Create server certificate
ipsec pki --gen --type rsa --size 4096 --outform pem > server.key
ipsec pki --pub --in server.key --outform pem > server.pub
ipsec pki --issue --lifetime 730 --cacert ca.crt --cakey ca.key \
  --dn "CN=talos-cluster" --san @talos-cluster \
  --in server.pub --outform pem > server.crt
```

### Configure Certificate-Based Authentication

```
conn site-to-site-cert
  type=tunnel
  auto=start
  keyexchange=ikev2

  left=%defaultroute
  leftsubnet=10.244.0.0/16
  leftcert=server.crt
  leftid=@talos-cluster
  leftauth=pubkey

  right=203.0.113.50
  rightsubnet=172.16.0.0/16
  rightid=@remote-site
  rightauth=pubkey
  rightca="CN=VPN CA"

  ike=aes256-sha256-modp2048!
  esp=aes256-sha256!
```

## Connecting to Cloud VPCs

### AWS VPN Connection

When connecting a Talos cluster to an AWS VPC:

```
conn aws-vpc
  type=tunnel
  auto=start
  keyexchange=ikev2

  left=%defaultroute
  leftsubnet=10.244.0.0/16
  leftid=203.0.113.10
  leftauth=psk

  right=<aws-vpn-gateway-ip>
  rightsubnet=10.0.0.0/16    # AWS VPC CIDR
  rightid=<aws-vpn-gateway-ip>
  rightauth=psk

  ike=aes256-sha256-modp2048!
  esp=aes256-sha256!

  # AWS-specific settings
  dpdaction=restart
  dpddelay=10s
  dpdtimeout=30s
  reauth=no
  ikelifetime=8h
  lifetime=1h
```

### Azure VPN Connection

```
conn azure-vnet
  type=tunnel
  auto=start
  keyexchange=ikev2

  left=%defaultroute
  leftsubnet=10.244.0.0/16
  leftauth=psk

  right=<azure-vpn-gateway-ip>
  rightsubnet=10.1.0.0/16    # Azure VNet CIDR
  rightauth=psk

  ike=aes256-sha256-modp2048!
  esp=aes256-sha256-modp2048!
```

## Monitoring IPSec Tunnels

### Check Tunnel Status

```bash
# Exec into the strongSwan pod
kubectl exec -it -n kube-system <ipsec-pod> -- ipsec statusall

# Check specific connection
kubectl exec -it -n kube-system <ipsec-pod> -- ipsec status site-to-site
```

### Monitor Logs

```bash
# View strongSwan logs
kubectl logs -n kube-system -l app=ipsec-gateway --follow

# Filter for specific events
kubectl logs -n kube-system -l app=ipsec-gateway | grep -i "established\|failed\|error"
```

## Troubleshooting

### IKE Negotiation Fails

```bash
# Enable debug logging
# In ipsec.conf, set:
# charondebug="ike 4, knl 4, cfg 4, net 4"

# Check for phase 1 issues
kubectl logs -n kube-system -l app=ipsec-gateway | grep "IKE_SA"
```

### Tunnel Established But No Traffic

```bash
# Check routing
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- ip route

# Check xfrm policies
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- ip xfrm policy

# Check xfrm state
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- ip xfrm state
```

### NAT Traversal Issues

If either side is behind NAT, ensure NAT-T is enabled (UDP 4500):

```
conn nat-traversal
  # Force NAT-T even if not behind NAT
  forceencaps=yes
```

## Conclusion

Setting up IPSec VPN on Talos Linux requires running the IPSec daemon (strongSwan or Libreswan) as a privileged container, since Talos does not include VPN tools in the base image. The containerized approach works well and integrates with Kubernetes for configuration management through ConfigMaps and Secrets. For production deployments, use certificate-based authentication, monitor tunnel health through your observability stack, and ensure the necessary kernel modules and sysctls are configured in the Talos machine configuration.
