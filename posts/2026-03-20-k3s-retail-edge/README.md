# How to Configure K3s for Retail Store Edge Computing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Edge Computing, Retail, IoT, DevOps

Description: Learn how to deploy K3s in retail environments to manage point-of-sale systems, inventory management, and in-store analytics at the edge.

## Introduction

Modern retail stores generate massive amounts of data from POS systems, inventory sensors, digital signage, cameras, and customer analytics. Running K3s at each store location enables containerized management of these systems, offline operation during connectivity outages, and centralized updates from headquarters. This guide covers a reference architecture for retail edge computing with K3s.

## Retail Edge Architecture

A typical retail store K3s deployment includes:
- **POS Application**: Transaction processing
- **Inventory Service**: Real-time stock tracking
- **Digital Signage**: Price displays and promotions
- **Analytics Engine**: Customer behavior and sales analytics
- **Camera AI**: Loss prevention and occupancy analytics
- **Local Database**: Offline transaction storage

## Step 1: Install K3s for Retail Environment

```yaml
# /etc/rancher/k3s/config.yaml

# Retail store edge configuration

disable:
  - metrics-server  # Use custom monitoring

kubelet-arg:
  - "max-pods=40"
  - "system-reserved=cpu=200m,memory=512Mi"
  - "kube-reserved=cpu=100m,memory=256Mi"
  - "eviction-hard=memory.available<256Mi,nodefs.available<10%"

node-label:
  - "role=retail-edge"
  - "store-id=store-1001"
  - "region=us-east"
  - "store-type=flagship"
```

```bash
# Install K3s
curl -sfL https://get.k3s.io | sh -

# Create application namespaces
kubectl create namespace retail
kubectl create namespace analytics
```

## Step 2: Deploy POS Application with Offline Support

```yaml
# pos-system.yaml
---
apiVersion: v1
kind: Secret
metadata:
  name: pos-db-secret
  namespace: retail
type: Opaque
stringData:
  password: "change-me"
---
apiVersion: v1
kind: Service
metadata:
  name: pos-database
  namespace: retail
spec:
  clusterIP: None
  selector:
    app: pos-database
  ports:
    - name: postgres
      port: 5432
      targetPort: 5432
---
# Local PostgreSQL for offline transaction storage
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: pos-database
  namespace: retail
spec:
  replicas: 1
  serviceName: pos-database
  selector:
    matchLabels:
      app: pos-database
  template:
    metadata:
      labels:
        app: pos-database
    spec:
      nodeSelector:
        role: retail-edge
      containers:
        - name: postgres
          image: postgres:15-alpine
          imagePullPolicy: IfNotPresent
          env:
            - name: POSTGRES_DB
              value: pos_db
            - name: POSTGRES_USER
              value: pos_user
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: pos-db-secret
                  key: password
          ports:
            - containerPort: 5432
          resources:
            requests:
              memory: 256Mi
            limits:
              memory: 512Mi
          volumeMounts:
            - name: pos-data
              mountPath: /var/lib/postgresql/data
      volumes:
        - name: pos-data
          hostPath:
            path: /data/pos-database
            type: DirectoryOrCreate
---
# POS Application
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pos-application
  namespace: retail
spec:
  replicas: 1
  selector:
    matchLabels:
      app: pos
  template:
    metadata:
      labels:
        app: pos
    spec:
      nodeSelector:
        role: retail-edge
      containers:
        - name: pos
          image: myregistry/retail-pos:v3.2
          imagePullPolicy: IfNotPresent
          env:
            - name: POS_DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: pos-db-secret
                  key: password
            - name: DATABASE_URL
              value: "postgresql://pos_user:$(POS_DB_PASSWORD)@pos-database:5432/pos_db"
            - name: STORE_ID
              valueFrom:
                configMapKeyRef:
                  name: store-config
                  key: store-id
            - name: OFFLINE_MODE_ENABLED
              value: "true"
            - name: HQ_SYNC_ENDPOINT
              value: "https://hq.retailcorp.com/api/pos-sync"
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
            limits:
              cpu: 1000m
              memory: 512Mi
          ports:
            - containerPort: 8080
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            periodSeconds: 30
```

## Step 3: Deploy Digital Signage Management

```yaml
# digital-signage.yaml
---
apiVersion: v1
kind: Service
metadata:
  name: local-pricing-db
  namespace: retail
spec:
  clusterIP: None
  selector:
    app: local-pricing-db
  ports:
    - name: postgres
      port: 5432
      targetPort: 5432
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: local-pricing-db
  namespace: retail
spec:
  replicas: 1
  serviceName: local-pricing-db
  selector:
    matchLabels:
      app: local-pricing-db
  template:
    metadata:
      labels:
        app: local-pricing-db
    spec:
      nodeSelector:
        role: retail-edge
      containers:
        - name: postgres
          image: postgres:15-alpine
          imagePullPolicy: IfNotPresent
          env:
            - name: POSTGRES_DB
              value: prices
            - name: POSTGRES_USER
              value: pricing_user
            - name: POSTGRES_PASSWORD
              value: password
          ports:
            - containerPort: 5432
          volumeMounts:
            - name: pricing-data
              mountPath: /var/lib/postgresql/data
      volumes:
        - name: pricing-data
          hostPath:
            path: /data/pricing-database
            type: DirectoryOrCreate
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: signage-controller
  namespace: retail
spec:
  replicas: 1
  selector:
    matchLabels:
      app: signage-controller
  template:
    metadata:
      labels:
        app: signage-controller
    spec:
      nodeSelector:
        role: retail-edge
      containers:
        - name: signage
          image: myregistry/digital-signage:v2.0
          imagePullPolicy: IfNotPresent
          env:
            - name: STORE_ID
              valueFrom:
                configMapKeyRef:
                  name: store-config
                  key: store-id
            # Local price database updated from HQ
            - name: PRICE_DB_URL
              value: "postgresql://pricing_user:password@local-pricing-db:5432/prices"
            # Display update interval
            - name: REFRESH_INTERVAL_SECONDS
              value: "300"
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
          volumeMounts:
            - name: media-cache
              mountPath: /app/media
      volumes:
        - name: media-cache
          hostPath:
            path: /data/signage-media
            type: DirectoryOrCreate
```

## Step 4: Deploy Inventory Management

```yaml
# inventory-service.yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: inventory-service
  namespace: retail
spec:
  replicas: 1
  selector:
    matchLabels:
      app: inventory
  template:
    metadata:
      labels:
        app: inventory
    spec:
      nodeSelector:
        role: retail-edge
      containers:
        - name: inventory
          image: myregistry/inventory-service:v1.5
          imagePullPolicy: IfNotPresent
          env:
            - name: RFID_READER_HOST
              value: "192.168.10.50"  # Local RFID reader
            - name: BARCODE_SCANNER_SERIAL
              value: "/dev/ttyUSB0"
            - name: SYNC_INTERVAL_SECONDS
              value: "60"
            - name: HQ_API_ENDPOINT
              value: "https://inventory.hq.retailcorp.com"
          resources:
            limits:
              memory: 256Mi
          volumeMounts:
            - name: scanner
              mountPath: /dev/ttyUSB0
      volumes:
        - name: scanner
          hostPath:
            path: /dev/ttyUSB0
            type: CharDevice
```

## Step 5: Store Configuration via ConfigMap

```yaml
# store-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: store-config
  namespace: retail
data:
  store-id: "store-1001"
  store-name: "Downtown Flagship Store"
  region: "us-east"
  timezone: "America/New_York"
  store-open-time: "09:00"
  store-close-time: "21:00"
  hq-endpoint: "https://hq.retailcorp.com"
  pos-terminals: "4"
  signage-displays: "12"
```

## Step 6: HQ Synchronization CronJob

```yaml
# hq-sync-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: hq-price-sync
  namespace: retail
spec:
  # Sync prices from HQ every 15 minutes during business hours
  schedule: "*/15 9-21 * * *"
  timeZone: "America/New_York"
  jobTemplate:
    spec:
      template:
        spec:
          nodeSelector:
            role: retail-edge
          containers:
            - name: price-sync
              image: myregistry/price-syncer:v1
              imagePullPolicy: IfNotPresent
              env:
                - name: HQ_PRICE_API
                  value: "https://pricing.hq.retailcorp.com/api/v1"
                - name: LOCAL_DB_URL
                  value: "postgresql://pricing_user:password@local-pricing-db:5432/prices"
                - name: STORE_ID
                  valueFrom:
                    configMapKeyRef:
                      name: store-config
                      key: store-id
          restartPolicy: OnFailure
```

## Step 7: End-of-Day Batch Processing

```yaml
# eod-batch.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: end-of-day-batch
  namespace: retail
spec:
  # Run at 10 PM every night
  schedule: "0 22 * * *"
  timeZone: "America/New_York"
  jobTemplate:
    spec:
      template:
        spec:
          nodeSelector:
            role: retail-edge
          containers:
            - name: eod-processor
              image: myregistry/eod-batch:v2
              imagePullPolicy: IfNotPresent
              env:
                - name: BATCH_TYPE
                  value: "end-of-day"
                - name: POS_DB_PASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: pos-db-secret
                      key: password
                - name: LOCAL_DB_URL
                  value: "postgresql://pos_user:$(POS_DB_PASSWORD)@pos-database:5432/pos_db"
                - name: HQ_REPORTING_URL
                  value: "https://reporting.hq.retailcorp.com/api/eod"
          restartPolicy: OnFailure
```

## Step 8: Local Monitoring Dashboard

```yaml
# retail-monitoring.yaml
apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: grafana-retail
  namespace: kube-system
spec:
  repo: https://grafana.github.io/helm-charts
  chart: grafana
  version: "7.0.0"
  targetNamespace: monitoring
  createNamespace: true
  valuesContent: |-
    adminPassword: "store1001-admin"
    persistence:
      enabled: true
      size: 5Gi
    resources:
      limits:
        memory: 256Mi
    grafana.ini:
      server:
        root_url: "http://store-1001.internal/grafana"
    dashboardProviders:
      dashboardproviders.yaml:
        apiVersion: 1
        providers:
          - name: retail
            folder: Retail
            type: file
            options:
              path: /var/lib/grafana/dashboards/retail
```

## Conclusion

K3s provides an excellent platform for retail edge computing, enabling centrally managed yet locally autonomous store operations. The key capabilities are offline POS transaction processing with eventual consistency, real-time inventory synchronization, and centralized digital signage management. With K3s, retail chains can deploy consistent application stacks across hundreds of stores while maintaining the ability to run each store autonomously during network outages - a critical requirement for continuous retail operations.
