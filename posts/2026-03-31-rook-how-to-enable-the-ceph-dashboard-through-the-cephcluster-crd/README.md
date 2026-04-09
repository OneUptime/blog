# How to Enable the Ceph Dashboard Through the CephCluster CRD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Dashboard, CephCluster, Monitoring

Description: Learn how to enable and access the Ceph Dashboard through the Rook CephCluster CRD, configure SSL, and expose it via Kubernetes Services or Ingress.

---

## What Is the Ceph Dashboard

The Ceph Dashboard is a built-in web UI for monitoring and managing a Ceph cluster. It provides:
- Real-time cluster health and capacity metrics
- OSD status and performance graphs
- Pool management and storage utilization
- RGW bucket and user management
- Alerting configuration

It runs inside the Ceph MGR daemon as a plugin.

## Enabling the Dashboard in the CephCluster CRD

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  # ... other settings ...
  dashboard:
    enabled: true        # Enable the dashboard
    ssl: true            # Enable HTTPS (recommended)
    port: 8443           # Port for HTTPS (default 8443) or HTTP (default 7000)
```

After applying, Rook creates a Service for the dashboard:

```bash
kubectl -n rook-ceph get service rook-ceph-mgr-dashboard
```

```text
NAME                       TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
rook-ceph-mgr-dashboard    ClusterIP   10.96.234.12    <none>        8443/TCP   5m
```

## Accessing the Dashboard via Port Forward

For quick access during development:

```bash
# Forward the dashboard port to localhost
kubectl -n rook-ceph port-forward service/rook-ceph-mgr-dashboard 8443:8443 &

# Access at https://localhost:8443
# Accept the self-signed certificate warning
```

## Getting the Admin Password

Rook automatically creates admin credentials:

```bash
kubectl -n rook-ceph get secret rook-ceph-dashboard-password -o jsonpath="{['data']['password']}" | base64 --decode
```

The default username is `admin`.

## Exposing via NodePort

For direct node access:

```yaml
# dashboard-nodeport.yaml
apiVersion: v1
kind: Service
metadata:
  name: rook-ceph-mgr-dashboard-nodeport
  namespace: rook-ceph
spec:
  ports:
    - name: dashboard
      port: 8443
      protocol: TCP
      targetPort: 8443
      nodePort: 30443
  selector:
    app: rook-ceph-mgr
  type: NodePort
```

```bash
kubectl apply -f dashboard-nodeport.yaml
# Access at https://<node-ip>:30443
```

## Exposing via Ingress

For production access via a domain name:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rook-ceph-dashboard
  namespace: rook-ceph
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
    nginx.ingress.kubernetes.io/server-snippet: |
      proxy_ssl_verify off;
spec:
  ingressClassName: nginx
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
  tls:
    - hosts:
        - ceph-dashboard.example.com
```

## Disabling SSL

For HTTP-only access (not recommended for production):

```yaml
spec:
  dashboard:
    enabled: true
    ssl: false
    port: 7000
```

## Custom SSL Certificate

To use a custom TLS certificate instead of the auto-generated self-signed one:

```bash
# Set the custom certificate via the Ceph CLI
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph dashboard set-ssl-certificate -i /path/to/dashboard.crt

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph dashboard set-ssl-certificate-key -i /path/to/dashboard.key
```

Ensure the dashboard has SSL enabled in the CRD:

```yaml
spec:
  dashboard:
    enabled: true
    ssl: true
    port: 8443
```

## Dashboard Credentials Management

```bash
# Change the admin password
echo 'newpassword' | kubectl -n rook-ceph exec -i deploy/rook-ceph-tools -- \
  ceph dashboard ac-user-set-password admin -i -

# Create a read-only dashboard user
echo 'monitoringpassword' | kubectl -n rook-ceph exec -i deploy/rook-ceph-tools -- \
  ceph dashboard ac-user-create monitoring -i - read-only
```

## Enabling Dashboard Modules

```bash
# Enable the prometheus module for better metrics
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mgr module enable prometheus

# Configure dashboard to use external Prometheus
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph dashboard set-alertmanager-api-host http://alertmanager:9093
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph dashboard set-prometheus-api-host http://prometheus:9090
```

## Summary

Enable the Ceph Dashboard in the `CephCluster` CRD by setting `dashboard.enabled: true`. Rook automatically configures the MGR dashboard plugin and creates a ClusterIP Service. Access it during development via `kubectl port-forward`, expose it for production via NodePort or Ingress. The admin password is stored in a Kubernetes Secret and can be retrieved with `kubectl get secret`. Always use SSL in production and consider creating read-only accounts for monitoring teams.
