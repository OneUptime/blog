# How to Configure User Management in the Ceph Dashboard

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Dashboard, User Management, Security

Description: Create and manage Ceph Dashboard users, roles, and permissions to enable team-based access control for Rook-managed cluster administration.

---

## Overview

The Ceph Dashboard supports multi-user access with role-based access control (RBAC). You can create users with specific roles (read-only, block-manager, etc.) to enable different team members to access only the sections they need.

## Default Admin User

The initial admin user is created by Rook during cluster bootstrap. Access credentials:

```bash
# Get the admin password
kubectl -n rook-ceph get secret rook-ceph-dashboard-password \
  -o jsonpath='{.data.password}' | base64 --decode

# The default username is "admin"
```

## Built-in Dashboard Roles

The Dashboard ships with these built-in roles:

| Role | Permissions |
|---|---|
| administrator | Full access to all security scopes |
| read-only | Read access to all security scopes except dashboard settings |
| block-manager | Full access to the rbd-image, rbd-mirroring, and iscsi scopes |
| rgw-manager | Full access to the rgw scope |
| cluster-manager | Full access to the hosts, osd, monitor, manager, and config-opt scopes |
| pool-manager | Full access to the pool scope |
| cephfs-manager | Full access to the cephfs scope |

## Creating a New Dashboard User

Navigate to Administration > User Management > Users, click "Create":

CLI equivalent (these commands assume the `rook-ceph-tools` toolbox deployment is running):

```bash
# Write the password to a temporary file inside the toolbox pod
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- bash -lc \
  "printf '%s' 'SecurePassword123!' > /tmp/alice-password"

kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph dashboard ac-user-create \
  --enabled \
  alice \
  -i /tmp/alice-password \
  administrator

# Change the password later if needed
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- bash -lc \
  "printf '%s' 'EvenMoreSecurePassword123!' > /tmp/alice-password"

kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph dashboard ac-user-set-password \
  alice \
  -i /tmp/alice-password

# List users
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph dashboard ac-user-show

# Clean up the temporary password file
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  rm -f /tmp/alice-password
```

## Creating Custom Roles

Define granular permissions with custom roles:

```bash
# Create a role that can only view pools and RBD
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph dashboard ac-role-create dev-readonly

# Add read scopes to the role
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph dashboard ac-role-add-scope-perms dev-readonly pool read

kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph dashboard ac-role-add-scope-perms dev-readonly rbd-image read

# Assign role to a user
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph dashboard ac-user-set-roles bob dev-readonly
```

Available scopes for permissions include `hosts`, `config-opt`, `pool`, `osd`, `monitor`, `rbd-image`, `rbd-mirroring`, `iscsi`, `rgw`, `cephfs`, `nfs-ganesha`, `manager`, `log`, `grafana`, `prometheus`, and `dashboard-settings`.

## Disable, Re-enable, or Delete a User

```bash
# Disable user (prevent login)
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph dashboard ac-user-disable alice

# Re-enable
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph dashboard ac-user-enable alice

# Delete user
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph dashboard ac-user-delete alice
```

## Force Password Change on Next Login

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph dashboard ac-user-create \
  --enabled \
  --pwd_update_required \
  alice \
  -i /tmp/alice-password \
  administrator
```

## Summary

Ceph Dashboard RBAC allows assigning built-in roles (administrator, read-only, block-manager, etc.) or custom roles with granular scope-level permissions to each user. Using the `ac-user-create` and `ac-role-add-scope-perms` commands, you can implement least-privilege access for development, operations, and monitoring teams on the same dashboard.
