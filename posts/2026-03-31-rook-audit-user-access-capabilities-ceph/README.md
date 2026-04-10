# How to Audit User Access and Capabilities in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Audit, Security, Access Control, Kubernetes

Description: Learn how to audit Ceph user access and capability assignments to detect over-privileged accounts, track changes, and maintain a least-privilege security posture.

---

Auditing user access and capabilities in Ceph is essential for maintaining security compliance and detecting unauthorized privilege escalation. Ceph provides tools to list all authenticated entities and their assigned capabilities, making regular audits straightforward.

## Listing All Auth Entities

Get a complete list of all users and their capabilities:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph auth list
```

The output shows every entity (client, osd, mds, mgr, mon) and their capability strings. Look for any entity with `allow *` that should not have full access.

## Checking Specific Entity Capabilities

Inspect an individual user's permissions:

```bash
# Get full details including the key
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get client.myapp

# Get just the capability string
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get client.myapp | grep caps
```

## Exporting All Capabilities for Review

Export all auth data to a file for offline review:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth export > /tmp/ceph-auth-export.txt

# Count entities with wildcard access
grep "allow \*" /tmp/ceph-auth-export.txt | wc -l
```

## Finding Over-Privileged Accounts

Check for entities with more access than they need:

```bash
# List all clients with admin-level access
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth list | grep -A2 "client\." | grep "allow \*"

# Check for clients with mon write access
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth list | grep -B1 "mon.*allow w\|mon.*allow rw\|mon.*allow \*"
```

## Reducing Capabilities to Least Privilege

If you find over-privileged accounts, restrict their capabilities:

```bash
# Example: Restrict a client to read-only on a specific pool
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth caps client.myapp \
    mon 'allow r' \
    osd 'allow r pool=mypool'

# Verify the change
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get client.myapp
```

## Enabling RGW Access Logging

For object store access auditing, enable RGW usage tracking:

```bash
# Enable usage logging in RGW
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_enable_usage_log true

# Show recent usage by user
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin usage show --uid=myuser --show-log-entries=true
```

## Tracking Capability Changes

Set up a regular audit job to detect changes:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ceph-auth-audit
  namespace: rook-ceph
spec:
  schedule: "0 6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: audit
              image: rook/ceph:latest
              command:
                - /bin/bash
                - -c
                - |
                  ceph auth list
                  echo "--- Entities with wildcard access ---"
                  ceph auth list | grep -B2 "allow \*"
              volumeMounts:
                - name: ceph-config
                  mountPath: /etc/ceph/ceph.conf
                  subPath: ceph.conf
                  readOnly: true
                - name: ceph-admin-keyring
                  mountPath: /etc/ceph/keyring
                  subPath: keyring
                  readOnly: true
          volumes:
            - name: ceph-config
              configMap:
                name: rook-ceph-config
            - name: ceph-admin-keyring
              secret:
                secretName: rook-ceph-admin-keyring
          restartPolicy: OnFailure
```

## Summary

Ceph user access auditing involves regularly reviewing all auth entities via `ceph auth list`, identifying over-privileged accounts, and restricting capabilities to the minimum required. RGW provides additional usage logging for object store access patterns. Automating these checks with a Kubernetes CronJob ensures continuous visibility into capability assignments and helps maintain a least-privilege security posture.
