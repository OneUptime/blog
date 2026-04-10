# How to Enable and Configure the Ceph Dashboard Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Dashboard, Monitoring, Kubernetes

Description: Enable and configure the Ceph Manager dashboard module to get a web-based UI for monitoring cluster health, pools, OSDs, and RGW in Rook deployments.

---

The Ceph Manager (MGR) dashboard module provides a built-in web UI for monitoring and managing a Ceph cluster. In Rook-managed clusters, the dashboard is enabled by default but requires additional configuration for external access.

## Enabling the Dashboard Module

Check if the dashboard module is active:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- ceph mgr module ls | grep dashboard
```

Enable if not already active:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- ceph mgr module enable dashboard
```

## Enabling in Rook CephCluster

In Rook, enable the dashboard in the `CephCluster` spec:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  dashboard:
    enabled: true
    port: 8443
    ssl: true
```

Apply:

```bash
kubectl apply -f cluster.yaml
kubectl -n rook-ceph rollout status deployment rook-ceph-mgr-a
```

## Accessing the Dashboard

Get the dashboard service URL:

```bash
kubectl -n rook-ceph get svc rook-ceph-mgr-dashboard

# Port-forward for local access
kubectl -n rook-ceph port-forward svc/rook-ceph-mgr-dashboard 8443:8443
```

Access at: `https://localhost:8443`

## Retrieving the Default Admin Credentials

Rook creates a dashboard secret automatically:

```bash
# Get the admin password
kubectl -n rook-ceph get secret rook-ceph-dashboard-password \
  -o jsonpath="{['data']['password']}" | base64 --decode
```

Login with username `admin` and the retrieved password.

## Setting a Custom Admin Password

```bash
kubectl -n rook-ceph exec -i deploy/rook-ceph-mgr-a -- \
  ceph dashboard ac-user-set-password admin --force-password -i - <<< "NewPassword123!"
```

## Dashboard Module Configuration

```bash
# Set SSL certificate
kubectl -n rook-ceph exec -i deploy/rook-ceph-mgr-a -- \
  ceph dashboard set-ssl-certificate -i - < /etc/ceph/dashboard.crt

kubectl -n rook-ceph exec -i deploy/rook-ceph-mgr-a -- \
  ceph dashboard set-ssl-certificate-key -i - < /etc/ceph/dashboard.key

# Disable SSL for internal-only access
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph config set mgr mgr/dashboard/ssl false
```

## Summary

The Ceph dashboard module is enabled by default in Rook via the `spec.dashboard.enabled` field in `CephCluster`. Access it by port-forwarding or exposing the service via an Ingress. Retrieve the auto-generated admin password from the `rook-ceph-dashboard-password` secret and configure SSL certificates for production deployments.
