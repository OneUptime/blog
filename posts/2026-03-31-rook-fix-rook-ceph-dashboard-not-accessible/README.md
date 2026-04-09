# How to Fix Rook-Ceph Dashboard Not Accessible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Troubleshooting, Dashboard, Kubernetes

Description: Learn how to fix the Rook-Ceph dashboard not accessible issue by checking MGR pod status, service configuration, port forwarding, and Ingress or NodePort setup.

---

## Understanding the Ceph Dashboard

The Ceph dashboard is served by the Ceph Manager (MGR) daemon and provides a web UI for monitoring cluster health, managing pools, and viewing performance metrics. In Rook, it is exposed as a Kubernetes Service in the rook-ceph namespace.

## Step 1: Check if the Dashboard is Enabled

Verify dashboard is enabled in the CephCluster spec:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  dashboard:
    enabled: true
  mgr:
    count: 1
```

Apply the update if it was disabled:

```bash
kubectl apply -f cluster.yaml
```

## Step 2: Check MGR Pod Status

The dashboard runs inside the MGR pod:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-mgr
kubectl -n rook-ceph logs -l app=rook-ceph-mgr --tail=50 | grep -i "dashboard\|error"
```

## Step 3: Check the Dashboard Service

Rook creates a Service for the dashboard:

```bash
kubectl -n rook-ceph get service | grep dashboard

# Expected output (SSL enabled by default):
# rook-ceph-mgr-dashboard   ClusterIP   10.96.x.x   <none>   8443/TCP
```

If the service does not exist:

```bash
kubectl -n rook-ceph describe cephcluster rook-ceph | grep -i dashboard
```

## Step 4: Access via Port-Forward

For immediate access without changing the Service type:

```bash
# HTTPS dashboard (port 8443, default)
kubectl -n rook-ceph port-forward svc/rook-ceph-mgr-dashboard 8443:8443 &

# Open in browser
open https://localhost:8443
```

## Step 5: Retrieve Dashboard Credentials

The dashboard admin password is stored in a Kubernetes Secret:

```bash
kubectl -n rook-ceph get secret rook-ceph-dashboard-password -o jsonpath='{.data.password}' | base64 --decode
echo ""
# Username: admin
```

## Step 6: Expose via NodePort

For persistent external access, change the Service to NodePort:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: rook-ceph-mgr-dashboard-external
  namespace: rook-ceph
spec:
  type: NodePort
  selector:
    app: rook-ceph-mgr
  ports:
    - name: dashboard
      port: 8443
      targetPort: 8443
      nodePort: 30700
      protocol: TCP
```

```bash
kubectl apply -f dashboard-service.yaml
# Access at https://<node-ip>:30700
```

## Step 7: Expose via Ingress

For production access with TLS termination:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rook-ceph-dashboard
  namespace: rook-ceph
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
spec:
  tls:
    - hosts:
        - ceph-dashboard.example.com
      secretName: ceph-dashboard-tls
  rules:
    - host: ceph-dashboard.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: rook-ceph-mgr-dashboard
                port:
                  number: 8443
```

## Step 8: Reset Admin Password

If the password secret is missing or you need to reset it:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  ceph dashboard ac-user-set-password admin NewPassword123!
"
```

## Summary

Fixing Rook-Ceph dashboard accessibility involves verifying the dashboard module is enabled in the CephCluster spec, confirming the MGR pod is running, locating the dashboard Service, and choosing an appropriate access method - port-forward for development, NodePort or Ingress for persistent access. The admin password is stored in the `rook-ceph-dashboard-password` Secret and can be reset via the Ceph tools pod.
