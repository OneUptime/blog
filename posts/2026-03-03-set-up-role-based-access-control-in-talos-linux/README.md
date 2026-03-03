# How to Set Up Role-Based Access Control in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, RBAC, Access Control, Security, Operations

Description: Learn how to configure role-based access control for the Talos Linux API to limit what different users and services can do on your cluster nodes.

---

By default, anyone with a valid Talos client certificate has full administrative access to every node in the cluster. For small teams this might be acceptable, but as your team and cluster grow, you need finer-grained control. Talos Linux supports role-based access control (RBAC) for its API, allowing you to restrict what different users can do.

This guide covers how to set up and manage Talos RBAC, from understanding the role model to creating certificates for different access levels.

## Understanding Talos RBAC

Talos RBAC is separate from Kubernetes RBAC. While Kubernetes RBAC controls access to the Kubernetes API (port 6443), Talos RBAC controls access to the Talos API (port 50000). The Talos API is where you manage the operating system itself - applying configurations, reading logs, rebooting nodes, upgrading, and more.

Talos defines several built-in roles:

- **os:admin**: Full access to all Talos API endpoints. Can read and write machine configuration, reboot nodes, perform upgrades, and access etcd.
- **os:reader**: Read-only access. Can view logs, machine status, and configuration but cannot make changes.
- **os:etcd:backup**: Limited access specifically for taking etcd snapshots. Useful for backup service accounts.
- **os:operator**: Can perform operational tasks like rebooting and upgrading but cannot modify the machine configuration directly.
- **os:impersonator**: Can impersonate other roles. Used for proxy services.

## Enabling RBAC

RBAC is controlled through the machine configuration. To enable it, set the RBAC flag in the cluster configuration.

```yaml
# Machine configuration with RBAC enabled
machine:
  features:
    rbac: true
```

Apply the configuration to enable RBAC:

```bash
# Apply to all nodes
for node in 10.0.1.10 10.0.1.11 10.0.1.12 10.0.2.10 10.0.2.11; do
  talosctl -n $node apply-config --file config-with-rbac.yaml
done
```

Once RBAC is enabled, the roles embedded in client certificates determine what each user can do.

## Creating Role-Specific Certificates

The role is encoded in the client certificate's Organization (O) field. When you generate a client certificate, you specify the role as the organization.

### Generate an Admin Certificate

```bash
# Generate a key pair for the admin user
openssl genrsa -out admin.key 4096

# Create a CSR with the admin role
openssl req -new \
  -key admin.key \
  -out admin.csr \
  -subj "/O=os:admin/CN=admin-user"

# Sign the CSR with the Talos CA
openssl x509 -req \
  -in admin.csr \
  -CA talos-ca.crt \
  -CAkey talos-ca.key \
  -CAcreateserial \
  -out admin.crt \
  -days 365 \
  -sha256

# Verify the certificate
openssl x509 -in admin.crt -text -noout | grep -A1 "Subject:"
```

### Generate a Reader Certificate

```bash
# Generate a read-only certificate
openssl genrsa -out reader.key 4096

openssl req -new \
  -key reader.key \
  -out reader.csr \
  -subj "/O=os:reader/CN=monitoring-service"

openssl x509 -req \
  -in reader.csr \
  -CA talos-ca.crt \
  -CAkey talos-ca.key \
  -CAcreateserial \
  -out reader.crt \
  -days 365 \
  -sha256
```

### Generate an etcd Backup Certificate

```bash
# Generate a certificate for backup services
openssl genrsa -out backup.key 4096

openssl req -new \
  -key backup.key \
  -out backup.csr \
  -subj "/O=os:etcd:backup/CN=backup-service"

openssl x509 -req \
  -in backup.csr \
  -CA talos-ca.crt \
  -CAkey talos-ca.key \
  -CAcreateserial \
  -out backup.crt \
  -days 365 \
  -sha256
```

### Generate an Operator Certificate

```bash
# Generate a certificate for operations team members
openssl genrsa -out operator.key 4096

openssl req -new \
  -key operator.key \
  -out operator.csr \
  -subj "/O=os:operator/CN=ops-team"

openssl x509 -req \
  -in operator.csr \
  -CA talos-ca.crt \
  -CAkey talos-ca.key \
  -CAcreateserial \
  -out operator.crt \
  -days 365 \
  -sha256
```

## Configuring talosctl with Role-Specific Credentials

Create separate talosconfig files for each role.

```bash
# Create an admin talosconfig
cat > talosconfig-admin.yaml <<EOF
context: admin
contexts:
  admin:
    endpoints:
      - 10.0.1.10
      - 10.0.1.11
      - 10.0.1.12
    nodes:
      - 10.0.1.10
    ca: $(base64 -w0 talos-ca.crt)
    crt: $(base64 -w0 admin.crt)
    key: $(base64 -w0 admin.key)
EOF

# Create a reader talosconfig
cat > talosconfig-reader.yaml <<EOF
context: reader
contexts:
  reader:
    endpoints:
      - 10.0.1.10
      - 10.0.1.11
      - 10.0.1.12
    nodes:
      - 10.0.1.10
    ca: $(base64 -w0 talos-ca.crt)
    crt: $(base64 -w0 reader.crt)
    key: $(base64 -w0 reader.key)
EOF

# Create a backup service talosconfig
cat > talosconfig-backup.yaml <<EOF
context: backup
contexts:
  backup:
    endpoints:
      - 10.0.1.10
    nodes:
      - 10.0.1.10
    ca: $(base64 -w0 talos-ca.crt)
    crt: $(base64 -w0 backup.crt)
    key: $(base64 -w0 backup.key)
EOF
```

## Testing Role Permissions

Verify that each role has the expected permissions.

```bash
# Test admin access - should work for everything
TALOSCONFIG=talosconfig-admin.yaml talosctl -n 10.0.1.10 version
TALOSCONFIG=talosconfig-admin.yaml talosctl -n 10.0.1.10 get machineconfig
TALOSCONFIG=talosconfig-admin.yaml talosctl -n 10.0.1.10 etcd snapshot test.db
TALOSCONFIG=talosconfig-admin.yaml talosctl -n 10.0.1.10 reboot

# Test reader access - should only allow read operations
TALOSCONFIG=talosconfig-reader.yaml talosctl -n 10.0.1.10 version     # OK
TALOSCONFIG=talosconfig-reader.yaml talosctl -n 10.0.1.10 logs kubelet # OK
TALOSCONFIG=talosconfig-reader.yaml talosctl -n 10.0.1.10 reboot       # DENIED
TALOSCONFIG=talosconfig-reader.yaml talosctl -n 10.0.1.10 apply-config # DENIED

# Test backup access - should only allow etcd snapshots
TALOSCONFIG=talosconfig-backup.yaml talosctl -n 10.0.1.10 etcd snapshot test.db  # OK
TALOSCONFIG=talosconfig-backup.yaml talosctl -n 10.0.1.10 get machineconfig      # DENIED
TALOSCONFIG=talosconfig-backup.yaml talosctl -n 10.0.1.10 reboot                 # DENIED
```

## Managing Certificates at Scale

For larger teams, create a script to generate and distribute certificates.

```bash
#!/bin/bash
# generate-user-cert.sh
# Generates a Talos client certificate with a specific role

set -euo pipefail

USERNAME=$1
ROLE=$2
CA_CRT=$3
CA_KEY=$4
VALIDITY_DAYS=${5:-365}

if [ -z "$USERNAME" ] || [ -z "$ROLE" ]; then
  echo "Usage: generate-user-cert.sh <username> <role> <ca-crt> <ca-key> [validity-days]"
  echo "Roles: os:admin, os:reader, os:operator, os:etcd:backup"
  exit 1
fi

# Validate role
case "$ROLE" in
  os:admin|os:reader|os:operator|os:etcd:backup)
    ;;
  *)
    echo "Invalid role: $ROLE"
    exit 1
    ;;
esac

OUTPUT_DIR="certs/${USERNAME}"
mkdir -p "$OUTPUT_DIR"

# Generate key and certificate
openssl genrsa -out "${OUTPUT_DIR}/${USERNAME}.key" 4096
openssl req -new \
  -key "${OUTPUT_DIR}/${USERNAME}.key" \
  -out "${OUTPUT_DIR}/${USERNAME}.csr" \
  -subj "/O=${ROLE}/CN=${USERNAME}"
openssl x509 -req \
  -in "${OUTPUT_DIR}/${USERNAME}.csr" \
  -CA "$CA_CRT" \
  -CAkey "$CA_KEY" \
  -CAcreateserial \
  -out "${OUTPUT_DIR}/${USERNAME}.crt" \
  -days "$VALIDITY_DAYS" \
  -sha256

# Generate talosconfig
cat > "${OUTPUT_DIR}/talosconfig.yaml" <<EOF
context: ${USERNAME}
contexts:
  ${USERNAME}:
    endpoints:
      - 10.0.1.10
      - 10.0.1.11
      - 10.0.1.12
    ca: $(base64 -w0 "$CA_CRT")
    crt: $(base64 -w0 "${OUTPUT_DIR}/${USERNAME}.crt")
    key: $(base64 -w0 "${OUTPUT_DIR}/${USERNAME}.key")
EOF

echo "Certificate generated for ${USERNAME} with role ${ROLE}"
echo "Files: ${OUTPUT_DIR}/"
echo "Expires: $(openssl x509 -in ${OUTPUT_DIR}/${USERNAME}.crt -noout -enddate)"
```

Usage:

```bash
./generate-user-cert.sh alice os:admin talos-ca.crt talos-ca.key
./generate-user-cert.sh bob os:reader talos-ca.crt talos-ca.key
./generate-user-cert.sh backup-svc os:etcd:backup talos-ca.crt talos-ca.key 730
```

## Revoking Access

Since Talos uses certificate-based authentication, revoking access means either:

1. **Rotating the CA**: Issue new certificates to everyone except the user being revoked. This is the nuclear option.
2. **Using short-lived certificates**: Issue certificates with short validity (e.g., 24 hours) and use an automated system to renew them. When you stop renewing, access is effectively revoked.

```bash
# Issue a short-lived certificate (24 hours)
openssl x509 -req \
  -in user.csr \
  -CA talos-ca.crt \
  -CAkey talos-ca.key \
  -CAcreateserial \
  -out user.crt \
  -days 1 \
  -sha256
```

## Conclusion

Talos Linux RBAC gives you granular control over who can do what on your cluster nodes. By generating role-specific certificates and distributing them to the appropriate users and services, you can enforce the principle of least privilege. Enable RBAC in your machine configuration, create certificates for each role, test the permissions, and establish a process for certificate lifecycle management. This setup is especially important as your team grows and more people need access to the cluster infrastructure.
