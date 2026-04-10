# How to Expose the Ceph Dashboard via NodePort in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Dashboard, Kubernetes, Networking

Description: Learn how to expose the Ceph Dashboard externally using a Kubernetes NodePort service in a Rook-managed Ceph cluster.

---

## Overview

The Ceph Dashboard provides a web UI for monitoring and managing your Ceph cluster. By default, Rook creates a ClusterIP service for the dashboard, making it accessible only within the cluster. Exposing it via NodePort allows direct browser access from outside the cluster without an Ingress controller.

## Check the Current Dashboard Service

First, confirm the dashboard service exists:

```bash
kubectl get svc -n rook-ceph | grep dashboard
```

You should see `rook-ceph-mgr-dashboard` with type `ClusterIP`.

## Option 1 - Patch the Existing Service

The quickest way is to patch the service type directly:

```bash
kubectl patch svc rook-ceph-mgr-dashboard -n rook-ceph \
  -p '{"spec": {"type": "NodePort"}}'
```

Check the assigned NodePort:

```bash
kubectl get svc rook-ceph-mgr-dashboard -n rook-ceph
```

The dashboard will be accessible at `https://<node-ip>:<nodeport>`.

**Note:** The Rook operator reconciles this service periodically and will revert the type back to ClusterIP. This approach is useful for quick testing but will not persist. For a durable solution, use Option 2.

## Option 2 - Create a Dedicated NodePort Service

For more control, create a separate NodePort service that maps to the dashboard pods:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: rook-ceph-mgr-dashboard-nodeport
  namespace: rook-ceph
spec:
  type: NodePort
  selector:
    app: rook-ceph-mgr
    mgr_role: active
    rook_cluster: rook-ceph
  ports:
  - name: https-dashboard
    port: 8443
    targetPort: 8443
    nodePort: 30700
    protocol: TCP
```

```bash
kubectl apply -f dashboard-nodeport-svc.yaml
```

The dashboard is now accessible at `https://<node-ip>:30700`.

## Option 3 - Configure via CephCluster CRD

You can configure the dashboard service type through the CephCluster resource to make it persistent across reconciliations:

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

Note: The CephCluster CRD does not natively support NodePort type - use a supplementary Service manifest as shown in Option 2.

## Retrieve Dashboard Credentials

Get the admin password to log in:

```bash
kubectl -n rook-ceph get secret rook-ceph-dashboard-password \
  -o jsonpath="{['data']['password']}" | base64 --decode && echo
```

Access the dashboard at `https://<node-ip>:<nodeport>` using username `admin`.

## Allow NodePort in Firewall

Ensure the NodePort is accessible through your firewall rules:

```bash
# For iptables
iptables -A INPUT -p tcp --dport 30700 -j ACCEPT

# For firewalld
firewall-cmd --permanent --add-port=30700/tcp
firewall-cmd --reload
```

## Summary

Exposing the Ceph Dashboard via NodePort in Rook is a simple way to enable external browser access without requiring an Ingress controller. You can patch the existing ClusterIP service, create a dedicated NodePort service with a fixed port, or combine both approaches for flexibility. Remember to retrieve the auto-generated admin credentials before logging in.
