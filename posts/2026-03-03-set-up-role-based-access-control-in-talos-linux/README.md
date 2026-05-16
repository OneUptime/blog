# How to Set Up Role-Based Access Control in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, RBAC, Access Control, Security, Operation

Description: Learn how to configure role-based access control for the Talos Linux API to limit what different users and services can do on your cluster nodes.

---

By default, the generated Talos client configuration has the `os:admin` role and full administrative access to every node in the cluster. For small teams this might be acceptable, but as your team and cluster grow, you need finer-grained control. Talos Linux supports role-based access control (RBAC) for its API, allowing you to restrict what different users can do.

This guide covers how to set up and manage Talos RBAC, from understanding the role model to creating certificates for different access levels.

## Understanding Talos RBAC

Talos RBAC is separate from Kubernetes RBAC. While Kubernetes RBAC controls access to the Kubernetes API (port 6443), Talos RBAC controls access to the Talos API (port 50000). The Talos API is where you manage the operating system itself - applying configurations, reading logs, rebooting nodes, upgrading, and more.

Talos defines several built-in roles:

- **os:admin**: Full access to all Talos API endpoints. Can read and write machine configuration, reboot nodes, perform upgrades, and access etcd.
- **os:reader**: Access to safe read-only API methods. Can view logs and machine status, but cannot read sensitive file contents or machine configuration.
- **os:etcd:backup**: Limited access specifically for taking etcd snapshots. Useful for backup service accounts.
- **os:operator**: Includes reader access plus operational tasks like rebooting, shutting down, restarting services, and taking etcd snapshots, but cannot modify machine configuration or perform upgrades.
- **os:impersonator**: Can impersonate other roles. Used internally and for proxy services.

## Enabling RBAC

RBAC is controlled through the machine configuration. New clusters created with `talosctl` v0.11 and later enable RBAC by default, but clusters upgraded from earlier versions may need it enabled explicitly. Before enabling RBAC on an upgraded cluster, generate an `os:admin` talosconfig so you do not lose access.

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

The role is encoded in the client certificate's Organization (O) field. The supported way to generate role-specific client certificates and talosconfig files is `talosctl config new`.

### Generate an Admin Certificate

```bash
# Generate an admin talosconfig from an existing admin talosconfig
talosctl -n 10.0.1.10 config new talosconfig-admin.yaml \
  --roles=os:admin \
  --crt-ttl=8760h

# Verify the role in the generated config
TALOSCONFIG=talosconfig-admin.yaml talosctl config info
```

### Generate a Reader Certificate

```bash
# Generate a read-only talosconfig
talosctl -n 10.0.1.10 config new talosconfig-reader.yaml \
  --roles=os:reader \
  --crt-ttl=8760h
```

### Generate an etcd Backup Certificate

```bash
# Generate a talosconfig for backup services
talosctl -n 10.0.1.10 config new talosconfig-backup.yaml \
  --roles=os:etcd:backup \
  --crt-ttl=8760h
```

### Generate an Operator Certificate

```bash
# Generate a talosconfig for operations team members
talosctl -n 10.0.1.10 config new talosconfig-operator.yaml \
  --roles=os:operator \
  --crt-ttl=8760h
```

## Configuring talosctl with Role-Specific Credentials

The `talosctl config new` commands above create separate talosconfig files for each role. You can check the embedded role in any generated config:

```bash
TALOSCONFIG=talosconfig-reader.yaml talosctl config info
```

## Testing Role Permissions

Verify that each role has the expected permissions.

```bash
# Test admin access - should work for everything
TALOSCONFIG=talosconfig-admin.yaml talosctl -n 10.0.1.10 version
TALOSCONFIG=talosconfig-admin.yaml talosctl -n 10.0.1.10 get machineconfig
TALOSCONFIG=talosconfig-admin.yaml talosctl -n 10.0.1.10 etcd snapshot test.db
TALOSCONFIG=talosconfig-admin.yaml talosctl -n 10.0.1.10 reboot

# Test reader access - should only allow safe read operations
TALOSCONFIG=talosconfig-reader.yaml talosctl -n 10.0.1.10 version     # OK
TALOSCONFIG=talosconfig-reader.yaml talosctl -n 10.0.1.10 logs kubelet # OK
TALOSCONFIG=talosconfig-reader.yaml talosctl -n 10.0.1.10 reboot       # DENIED
TALOSCONFIG=talosconfig-reader.yaml talosctl -n 10.0.1.10 apply-config --file config-with-rbac.yaml # DENIED

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
# Generates a Talos client configuration with a specific role

set -euo pipefail

USERNAME=${1:-}
ROLE=${2:-}
VALIDITY_DAYS=${3:-365}

if [ -z "$USERNAME" ] || [ -z "$ROLE" ]; then
  echo "Usage: generate-user-cert.sh <username> <role> [validity-days]"
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

# Generate talosconfig
talosctl -n 10.0.1.10 config new "${OUTPUT_DIR}/talosconfig.yaml" \
  --roles="$ROLE" \
  --crt-ttl="$((VALIDITY_DAYS * 24))h"

echo "Certificate generated for ${USERNAME} with role ${ROLE}"
echo "Files: ${OUTPUT_DIR}/"
TALOSCONFIG="${OUTPUT_DIR}/talosconfig.yaml" talosctl config info
```

Usage:

```bash
./generate-user-cert.sh alice os:admin
./generate-user-cert.sh bob os:reader
./generate-user-cert.sh backup-svc os:etcd:backup 730
```

## Revoking Access

Since Talos uses certificate-based authentication, revoking access means either:

1. **Rotating the CA**: Issue new certificates to everyone except the user being revoked. This is the nuclear option.
2. **Using short-lived certificates**: Issue certificates with short validity (e.g., 24 hours) and use an automated system to renew them. When you stop renewing, access is effectively revoked.

```bash
# Issue a short-lived certificate (24 hours)
talosctl -n 10.0.1.10 config new talosconfig-user.yaml \
  --roles=os:reader \
  --crt-ttl=24h
```

## Conclusion

Talos Linux RBAC gives you granular control over who can do what on your cluster nodes. By generating role-specific certificates and distributing them to the appropriate users and services, you can enforce the principle of least privilege. Enable RBAC in your machine configuration, create certificates for each role, test the permissions, and establish a process for certificate lifecycle management. This setup is especially important as your team grows and more people need access to the cluster infrastructure.
