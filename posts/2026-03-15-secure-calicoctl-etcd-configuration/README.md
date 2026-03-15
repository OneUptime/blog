# How to Secure Calicoctl etcd Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, etcd, Security, TLS, Encryption

Description: Secure your calicoctl etcd datastore configuration with TLS encryption, certificate management, file permissions, and access controls.

---

## Introduction

When calicoctl connects to etcd directly, the security of that connection determines whether your network policy data is protected from eavesdropping and unauthorized modification. An unsecured etcd connection exposes all Calico configuration data.

Securing calicoctl etcd configuration involves enforcing mutual TLS authentication, protecting certificate files on disk, implementing certificate rotation, and restricting etcd access to only what calicoctl needs.

This guide covers practical steps to harden the connection between calicoctl and your etcd datastore.

## Prerequisites

- Calico cluster using etcd as the datastore
- `calicoctl` binary installed (v3.25+)
- `openssl` for certificate operations
- etcd cluster with TLS support enabled
- Root or sudo access for file permission changes

## Enforcing Mutual TLS

Ensure calicoctl always connects to etcd over TLS with client certificate authentication:

```bash
cat > /etc/calico/calicoctl.cfg <<EOF
apiVersion: projectcalico.org/v3
kind: CalicoAPIConfig
metadata:
spec:
  datastoreType: "etcdv3"
  etcdEndpoints: "https://etcd1:2379,https://etcd2:2379,https://etcd3:2379"
  etcdCACertFile: "/etc/calico/certs/ca.pem"
  etcdCertFile: "/etc/calico/certs/client.pem"
  etcdKeyFile: "/etc/calico/certs/client-key.pem"
EOF
```

Verify TLS is enforced by testing a plaintext connection (which should fail):

```bash
# This should fail if etcd requires TLS
curl -s http://etcd1:2379/health
# Expected: Connection refused or empty response
```

## Generating Dedicated Client Certificates

Create a separate client certificate for calicoctl rather than reusing the etcd peer certificates:

```bash
# Generate a private key
openssl genrsa -out calicoctl-key.pem 4096

# Create a certificate signing request
openssl req -new -key calicoctl-key.pem \
  -out calicoctl.csr \
  -subj "/CN=calicoctl/O=calico"

# Sign with your etcd CA
openssl x509 -req -in calicoctl.csr \
  -CA ca.pem -CAkey ca-key.pem \
  -CAcreateserial \
  -out calicoctl-cert.pem \
  -days 365 \
  -sha256
```

## Setting Strict File Permissions

Lock down certificate and configuration files:

```bash
# Set ownership
sudo chown root:root /etc/calico/calicoctl.cfg
sudo chown root:root /etc/calico/certs/*

# Restrict permissions
sudo chmod 600 /etc/calico/calicoctl.cfg
sudo chmod 600 /etc/calico/certs/client-key.pem
sudo chmod 644 /etc/calico/certs/ca.pem
sudo chmod 644 /etc/calico/certs/client.pem

# Restrict directory access
sudo chmod 700 /etc/calico/certs
```

Verify permissions:

```bash
ls -la /etc/calico/certs/
ls -la /etc/calico/calicoctl.cfg
```

## Configuring etcd Role-Based Access

Create a dedicated etcd role and user for calicoctl:

```bash
# Create a role with access to Calico keys only
etcdctl --endpoints="$ETCD_ENDPOINTS" \
  --cacert="$ETCD_CA_CERT_FILE" \
  --cert="$ETCD_CERT_FILE" \
  --key="$ETCD_KEY_FILE" \
  role add calico-role

etcdctl --endpoints="$ETCD_ENDPOINTS" \
  --cacert="$ETCD_CA_CERT_FILE" \
  --cert="$ETCD_CERT_FILE" \
  --key="$ETCD_KEY_FILE" \
  role grant-permission calico-role readwrite /calico --prefix

# Create a user and assign the role
etcdctl --endpoints="$ETCD_ENDPOINTS" \
  --cacert="$ETCD_CA_CERT_FILE" \
  --cert="$ETCD_CERT_FILE" \
  --key="$ETCD_KEY_FILE" \
  user add calicoctl-user --no-password

etcdctl --endpoints="$ETCD_ENDPOINTS" \
  --cacert="$ETCD_CA_CERT_FILE" \
  --cert="$ETCD_CERT_FILE" \
  --key="$ETCD_KEY_FILE" \
  user grant-role calicoctl-user calico-role
```

## Implementing Certificate Rotation

Create a script to rotate calicoctl client certificates:

```bash
#!/bin/bash
# rotate-calicoctl-certs.sh

CERT_DIR="/etc/calico/certs"
CA_CERT="/path/to/ca.pem"
CA_KEY="/path/to/ca-key.pem"

echo "Generating new client key..."
openssl genrsa -out "${CERT_DIR}/client-new.pem" 4096

echo "Creating CSR..."
openssl req -new -key "${CERT_DIR}/client-new.pem" \
  -out /tmp/calicoctl.csr \
  -subj "/CN=calicoctl/O=calico"

echo "Signing certificate..."
openssl x509 -req -in /tmp/calicoctl.csr \
  -CA "$CA_CERT" -CAkey "$CA_KEY" \
  -CAcreateserial \
  -out "${CERT_DIR}/client-cert-new.pem" \
  -days 365 -sha256

echo "Testing new certificate..."
ETCD_CERT_FILE="${CERT_DIR}/client-cert-new.pem" \
ETCD_KEY_FILE="${CERT_DIR}/client-new.pem" \
calicoctl get nodes > /dev/null 2>&1

if [ $? -eq 0 ]; then
  mv "${CERT_DIR}/client-key.pem" "${CERT_DIR}/client-key.pem.bak"
  mv "${CERT_DIR}/client.pem" "${CERT_DIR}/client.pem.bak"
  mv "${CERT_DIR}/client-new.pem" "${CERT_DIR}/client-key.pem"
  mv "${CERT_DIR}/client-cert-new.pem" "${CERT_DIR}/client.pem"
  chmod 600 "${CERT_DIR}/client-key.pem"
  echo "Certificate rotation complete"
else
  echo "ERROR: New certificate failed validation. Rotation aborted."
  rm -f "${CERT_DIR}/client-new.pem" "${CERT_DIR}/client-cert-new.pem"
  exit 1
fi
```

## Verification

Confirm the secured configuration works:

```bash
calicoctl get nodes -o wide
calicoctl get ippools -o yaml

# Verify TLS is used
openssl s_client -connect etcd1:2379 \
  -CAfile /etc/calico/certs/ca.pem \
  -cert /etc/calico/certs/client.pem \
  -key /etc/calico/certs/client-key.pem \
  </dev/null 2>/dev/null | grep "Verify return code"
```

## Troubleshooting

- **"tls: bad certificate"**: The etcd server is rejecting the client certificate. Verify the certificate was signed by the correct CA and has not expired.
- **"permission denied" accessing cert files**: File permissions are too restrictive for the user running calicoctl. Adjust ownership or add the user to the appropriate group.
- **etcd role denies access**: Verify the role has `readwrite` permission on the `/calico` prefix. Use `etcdctl role get calico-role` to inspect.
- **Certificate rotation breaks connectivity**: Always test the new certificate before replacing the old one. Keep backups of the previous certificates.

## Conclusion

Securing your calicoctl etcd configuration protects network policy data from unauthorized access and tampering. Mutual TLS, strict file permissions, dedicated client certificates, etcd RBAC, and regular certificate rotation form a defense-in-depth strategy for production Calico deployments.
