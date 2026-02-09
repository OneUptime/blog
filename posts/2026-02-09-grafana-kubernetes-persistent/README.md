# How to Deploy Grafana on Kubernetes with Persistent Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Grafana, Monitoring

Description: Learn how to deploy Grafana on Kubernetes with persistent storage using StatefulSets and PersistentVolumeClaims to preserve dashboards, data sources, and configurations across pod restarts.

---

Deploying Grafana on Kubernetes is straightforward, but making it production-ready requires persistent storage. Without persistence, every time your Grafana pod restarts, you lose dashboards, data sources, and user configurations. That's not acceptable for a monitoring system.

The solution is using Kubernetes persistent volumes to store Grafana's database and configuration files. This ensures your Grafana setup survives pod restarts, node failures, and cluster upgrades.

## Understanding Grafana Storage Needs

Grafana stores several types of data:

- **SQLite database**: Contains dashboards, users, organizations, and settings (default location: /var/lib/grafana/grafana.db)
- **Plugins**: Custom plugins installed in /var/lib/grafana/plugins
- **Provisioning files**: Data sources and dashboards defined as code in /etc/grafana/provisioning
- **Session data**: User sessions and temporary data

The most critical is the SQLite database. If you lose it, you lose everything.

## Creating a PersistentVolumeClaim

Start by creating storage for Grafana:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: grafana-storage
  namespace: monitoring
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard  # Use your cluster's storage class
```

This creates a 10GB volume. Adjust size based on your needs. A typical Grafana instance with hundreds of dashboards uses 1-2GB.

## Deploying Grafana with Persistent Storage

Deploy Grafana using a Deployment with a volume mount:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      securityContext:
        fsGroup: 472  # Grafana user ID
        runAsUser: 472
        runAsNonRoot: true
      containers:
      - name: grafana
        image: grafana/grafana:10.2.0
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: GF_SECURITY_ADMIN_USER
          value: admin
        - name: GF_SECURITY_ADMIN_PASSWORD
          valueFrom:
            secretKeyRef:
              name: grafana-credentials
              key: admin-password
        - name: GF_INSTALL_PLUGINS
          value: "grafana-piechart-panel,grafana-worldmap-panel"
        volumeMounts:
        - name: storage
          mountPath: /var/lib/grafana
        - name: config
          mountPath: /etc/grafana/grafana.ini
          subPath: grafana.ini
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
      volumes:
      - name: storage
        persistentVolumeClaim:
          claimName: grafana-storage
      - name: config
        configMap:
          name: grafana-config
```

Create the admin password secret:

```bash
# Create namespace
kubectl create namespace monitoring

# Create secret
kubectl create secret generic grafana-credentials \
  -n monitoring \
  --from-literal=admin-password='YourSecurePassword123!'
```

Create a basic configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-config
  namespace: monitoring
data:
  grafana.ini: |
    [server]
    root_url = http://grafana.example.com

    [database]
    type = sqlite3
    path = /var/lib/grafana/grafana.db

    [session]
    provider = file
    provider_config = sessions

    [analytics]
    reporting_enabled = false
    check_for_updates = false

    [log]
    mode = console
    level = info
```

## Exposing Grafana with a Service

Create a Service to access Grafana:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: grafana
  namespace: monitoring
spec:
  type: ClusterIP
  ports:
  - port: 3000
    targetPort: 3000
    protocol: TCP
    name: http
  selector:
    app: grafana
```

For external access, create an Ingress:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: grafana
  namespace: monitoring
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - grafana.example.com
    secretName: grafana-tls
  rules:
  - host: grafana.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: grafana
            port:
              number: 3000
```

## Using StatefulSet for Better Reliability

For production, use a StatefulSet instead of Deployment:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: grafana
  namespace: monitoring
spec:
  serviceName: grafana
  replicas: 1
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      securityContext:
        fsGroup: 472
        runAsUser: 472
        runAsNonRoot: true
      containers:
      - name: grafana
        image: grafana/grafana:10.2.0
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: GF_SECURITY_ADMIN_USER
          value: admin
        - name: GF_SECURITY_ADMIN_PASSWORD
          valueFrom:
            secretKeyRef:
              name: grafana-credentials
              key: admin-password
        - name: GF_PATHS_DATA
          value: /var/lib/grafana
        - name: GF_PATHS_LOGS
          value: /var/log/grafana
        - name: GF_PATHS_PLUGINS
          value: /var/lib/grafana/plugins
        volumeMounts:
        - name: storage
          mountPath: /var/lib/grafana
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 1000m
            memory: 1Gi
  volumeClaimTemplates:
  - metadata:
      name: storage
    spec:
      accessModes:
      - ReadWriteOnce
      resources:
        requests:
          storage: 10Gi
```

StatefulSets provide stable pod names and persistent volume attachments, making them ideal for stateful applications like Grafana.

## Configuring External Database

For high availability, use an external database instead of SQLite:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: grafana-db-credentials
  namespace: monitoring
type: Opaque
stringData:
  GF_DATABASE_TYPE: "postgres"
  GF_DATABASE_HOST: "postgres.monitoring.svc.cluster.local:5432"
  GF_DATABASE_NAME: "grafana"
  GF_DATABASE_USER: "grafana"
  GF_DATABASE_PASSWORD: "SecureDBPassword123!"
  GF_DATABASE_SSL_MODE: "require"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: monitoring
spec:
  replicas: 2  # Can run multiple replicas with external DB
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      containers:
      - name: grafana
        image: grafana/grafana:10.2.0
        envFrom:
        - secretRef:
            name: grafana-db-credentials
        ports:
        - containerPort: 3000
        volumeMounts:
        - name: plugins
          mountPath: /var/lib/grafana/plugins
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
      volumes:
      - name: plugins
        persistentVolumeClaim:
          claimName: grafana-plugins
```

With an external database, you can run multiple Grafana replicas for high availability.

## Backing Up Grafana Data

Create a CronJob to backup the Grafana database:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: grafana-backup
  namespace: monitoring
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              # Get pod name
              POD=$(kubectl get pod -n monitoring -l app=grafana -o jsonpath='{.items[0].metadata.name}')

              # Copy database
              kubectl exec -n monitoring $POD -- \
                sqlite3 /var/lib/grafana/grafana.db ".backup '/tmp/grafana-backup.db'"

              # Copy to backup location
              kubectl cp monitoring/$POD:/tmp/grafana-backup.db \
                ./grafana-backup-$(date +%Y%m%d).db

              # Upload to S3 or backup storage
              aws s3 cp ./grafana-backup-$(date +%Y%m%d).db \
                s3://my-backup-bucket/grafana/
          restartPolicy: OnFailure
          serviceAccountName: grafana-backup
```

Create RBAC for the backup job:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: grafana-backup
  namespace: monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: grafana-backup
  namespace: monitoring
rules:
- apiGroups: [""]
  resources: ["pods", "pods/exec"]
  verbs: ["get", "list", "create"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: grafana-backup
  namespace: monitoring
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: grafana-backup
subjects:
- kind: ServiceAccount
  name: grafana-backup
```

## Migrating Existing Grafana to Kubernetes

If you have an existing Grafana instance, migrate it:

```bash
# Export dashboards from existing Grafana
curl -H "Authorization: Bearer <api-key>" \
  http://old-grafana:3000/api/search?type=dash-db | \
  jq -r '.[] | .uid' | while read uid; do
    curl -H "Authorization: Bearer <api-key>" \
      http://old-grafana:3000/api/dashboards/uid/$uid -o "$uid.json"
  done

# Copy SQLite database
scp user@old-server:/var/lib/grafana/grafana.db ./grafana.db

# Create PVC and copy database
kubectl create -f grafana-pvc.yaml
POD=$(kubectl get pod -l app=grafana -o jsonpath='{.items[0].metadata.name}')
kubectl cp ./grafana.db monitoring/$POD:/var/lib/grafana/grafana.db

# Restart Grafana
kubectl rollout restart deployment grafana -n monitoring
```

## Monitoring Grafana Storage Usage

Track storage usage to prevent issues:

```bash
# Check PVC usage
kubectl exec -n monitoring -it $(kubectl get pod -n monitoring -l app=grafana -o jsonpath='{.items[0].metadata.name}') -- \
  df -h /var/lib/grafana

# Check database size
kubectl exec -n monitoring -it $(kubectl get pod -n monitoring -l app=grafana -o jsonpath='{.items[0].metadata.name}') -- \
  du -sh /var/lib/grafana/grafana.db

# Check total directory size
kubectl exec -n monitoring -it $(kubectl get pod -n monitoring -l app=grafana -o jsonpath='{.items[0].metadata.name}') -- \
  du -sh /var/lib/grafana
```

Set up alerts for storage usage:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-alerts
  namespace: monitoring
data:
  alerts.yaml: |
    groups:
    - name: grafana
      rules:
      - alert: GrafanaStorageNearFull
        expr: kubelet_volume_stats_available_bytes{persistentvolumeclaim="grafana-storage"} / kubelet_volume_stats_capacity_bytes{persistentvolumeclaim="grafana-storage"} < 0.2
        for: 5m
        annotations:
          summary: "Grafana storage is running low"
```

## Troubleshooting Storage Issues

Common issues and solutions:

```bash
# Check PVC status
kubectl get pvc -n monitoring grafana-storage

# If PVC is pending, check events
kubectl describe pvc -n monitoring grafana-storage

# Check pod has volume mounted
kubectl get pod -n monitoring -l app=grafana -o yaml | grep -A 10 volumeMounts

# Verify file permissions
kubectl exec -n monitoring -it $(kubectl get pod -n monitoring -l app=grafana -o jsonpath='{.items[0].metadata.name}') -- \
  ls -la /var/lib/grafana

# If permission denied, check securityContext
kubectl get pod -n monitoring -l app=grafana -o yaml | grep -A 5 securityContext
```

## Best Practices

Follow these guidelines for production Grafana deployments:

1. **Use external database**: PostgreSQL or MySQL for high availability.
2. **Regular backups**: Automate database backups to external storage.
3. **Right-size storage**: Monitor usage and expand before running out.
4. **Use StatefulSets**: Provides stable storage attachments.
5. **Set resource limits**: Prevent Grafana from consuming too many resources.
6. **Enable authentication**: Don't leave admin password as default.
7. **Use provisioning**: Define data sources and dashboards as code for reproducibility.

Persistent storage is essential for production Grafana deployments. By following these patterns, you ensure your monitoring system is reliable and survives infrastructure changes.
