# How to Retrieve Ceph Dashboard Login Credentials in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Dashboard, Security, Kubernetes

Description: Learn how to retrieve, reset, and manage the Ceph Dashboard admin credentials in a Rook-managed Ceph cluster.

---

## Overview

When Rook deploys the Ceph Dashboard, it automatically generates a random admin password and stores it in a Kubernetes Secret. This guide explains how to retrieve that password, how to change it, and how to create additional dashboard users.

## Retrieve the Default Admin Password

The auto-generated password is stored in the `rook-ceph-dashboard-password` secret:

```bash
kubectl -n rook-ceph get secret rook-ceph-dashboard-password \
  -o jsonpath="{['data']['password']}" | base64 --decode && echo
```

The default username is `admin`. Use these credentials to log in at the dashboard URL.

## Change the Admin Password via Rook Toolbox

To change the admin password, use the Rook toolbox to run a ceph CLI command:

```bash
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- bash
```

Inside the toolbox:

```bash
ceph dashboard ac-user-set-password admin -i - --force-password <<< "MyNewSecurePassword123!"
```

Update the Kubernetes secret to match:

```bash
kubectl -n rook-ceph create secret generic rook-ceph-dashboard-password \
  --from-literal=password="MyNewSecurePassword123!" \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Create a Read-Only Dashboard User

For auditors or monitoring teams, create a read-only user with a password:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- bash -c \
  "echo 'ReadOnlyPass!' | ceph dashboard ac-user-create readonly-user -i - read-only --force-password"
```

## List Dashboard Users

View all configured dashboard users:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph dashboard ac-user-show
```

## Enable Single Sign-On (SSO)

For enterprise environments, the Ceph Dashboard supports SAML2-based SSO:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph dashboard sso setup saml2 \
  https://ceph-dashboard.example.com \
  https://idp.example.com/metadata \
  uid
```

Verify SSO status:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph dashboard sso status
```

## Disable the Dashboard (Maintenance)

To temporarily disable the Ceph Dashboard module for maintenance:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph mgr module disable dashboard
```

Re-enable:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph mgr module enable dashboard
```

## Summary

Rook stores the auto-generated Ceph Dashboard admin password in a Kubernetes Secret, making it easy to retrieve with kubectl. You can change the password, create additional users with restricted roles, and even configure SAML2 SSO for enterprise identity integration - all through the Ceph CLI accessible via the Rook toolbox.
