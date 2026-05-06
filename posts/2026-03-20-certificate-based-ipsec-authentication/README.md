# How to Set Up Certificate-Based IPsec Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPsec, PKI, Certificate, strongSwan, IKEv2, Linux

Description: Configure IPsec VPN authentication using X.509 certificates with strongSwan, providing more scalable and secure authentication than pre-shared keys.

Certificate-based IPsec authentication eliminates shared secrets and enables scalable deployment. Each gateway or client has a unique certificate, and revocation is possible without affecting other users.

## Step 1: Create a Certificate Authority

```bash
# Generate the CA private key

pki --gen --type rsa --size 4096 --outform pem > /etc/swanctl/private/ca.key.pem
chmod 600 /etc/swanctl/private/ca.key.pem

# Create the self-signed CA certificate
pki --self --ca --lifetime 3650 \
  --in /etc/swanctl/private/ca.key.pem \
  --type rsa \
  --dn "C=US, O=My Org, CN=IPsec Root CA" \
  --outform pem > /etc/swanctl/x509ca/ca.cert.pem
```

## Step 2: Generate Gateway Certificates

For each gateway, create a key pair and certificate signed by the CA:

```bash
# Gateway A certificate
pki --gen --type rsa --size 2048 --outform pem > /etc/swanctl/private/gateway-a.key.pem
chmod 600 /etc/swanctl/private/gateway-a.key.pem

pki --req --type priv \
  --in /etc/swanctl/private/gateway-a.key.pem \
  --dn "C=US, O=My Org, CN=Gateway A" \
  --san "gateway-a.example.com" \
  --outform pem > /tmp/gateway-a.req.pem

pki --issue --type pkcs10 --lifetime 1825 \
  --in /tmp/gateway-a.req.pem \
  --cacert /etc/swanctl/x509ca/ca.cert.pem \
  --cakey /etc/swanctl/private/ca.key.pem \
  --flag serverAuth \
  --outform pem > /etc/swanctl/x509/gateway-a.cert.pem

# Generate Gateway B the same way, changing the filenames, DN, and SAN.

# Verify the certificate
pki --print --in /etc/swanctl/x509/gateway-a.cert.pem
```

## Step 3: Configure swanctl.conf for Certificate Auth

```conf
# /etc/swanctl/swanctl.conf on Gateway A

connections {
  cert-tunnel {
    version = 2
    local_addrs = 1.2.3.4
    remote_addrs = 5.6.7.8
    proposals = aes256-sha256-modp2048

    local {
      auth = pubkey
      id = "C=US, O=My Org, CN=Gateway A"
      certs = gateway-a.cert.pem
    }

    remote {
      auth = pubkey
      id = "C=US, O=My Org, CN=Gateway B"
    }

    children {
      cert-tunnel {
        local_ts = 10.1.0.0/24
        remote_ts = 10.2.0.0/24
        esp_proposals = aes256-sha256
        start_action = start
      }
    }
  }
}
```

## Step 4: Configure the Private Key for Certificate Auth

```bash
# No ipsec.secrets entry is required with swanctl-based certificate authentication.
# Keep the gateway's private key in /etc/swanctl/private/ and readable only by root.
chmod 600 /etc/swanctl/private/gateway-a.key.pem
```

## Step 5: Copy Certificates for Gateway B

```bash
# Transfer to Gateway B (use secure channel)
scp /etc/swanctl/x509ca/ca.cert.pem admin@gateway-b:/etc/swanctl/x509ca/
scp /etc/swanctl/x509/gateway-b.cert.pem admin@gateway-b:/etc/swanctl/x509/
scp /etc/swanctl/private/gateway-b.key.pem admin@gateway-b:/etc/swanctl/private/
```

## Verifying Certificate-Based Authentication

```bash
# Start strongSwan and load the updated configuration
sudo systemctl restart strongswan
sudo swanctl --load-all

# Verify authentication succeeded
sudo journalctl -u strongswan | grep -Ei "certificate|pubkey|authentication"

# Check tunnel status
sudo swanctl --list-sas | grep "ESTABLISHED"
```

## Certificate Revocation with CRL

```bash
# If a gateway's certificate is compromised, revoke it
# On the CA host:

# Generate a CRL that revokes the compromised certificate
pki --signcrl \
  --cacert /etc/swanctl/x509ca/ca.cert.pem \
  --cakey /etc/swanctl/private/ca.key.pem \
  --reason key-compromise \
  --cert /etc/swanctl/x509/compromised-gateway.cert.pem \
  --outform pem > /etc/swanctl/x509crl/revoked.crl.pem

# If you already published a CRL, include:
#   --lastcrl /etc/swanctl/x509crl/revoked.crl.pem

# Distribute the CRL to all gateways and reload credentials
# Gateways load CRLs from /etc/swanctl/x509crl/ with swanctl --load-creds
```

Certificate-based IPsec authentication is the production standard for deployments with multiple gateways or clients, providing per-device accountability and certificate revocation without rotating credentials for every peer.
