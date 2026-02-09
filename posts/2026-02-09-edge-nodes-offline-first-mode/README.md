# How to Deploy Applications to Edge Nodes That Operate in Offline-First Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Edge Computing, Offline

Description: Learn how to design and deploy Kubernetes applications for edge nodes that operate primarily offline, ensuring critical services continue functioning during extended network outages while syncing when connectivity returns.

---

Edge locations like ships, remote mines, or disaster response sites often operate with intermittent or no internet connectivity. Traditional cloud-dependent applications fail in these environments. Offline-first architecture assumes disconnection is the norm, designing applications to function autonomously and sync opportunistically.

In this guide, you'll deploy Kubernetes applications built for offline operation, implement local data persistence, and configure intelligent synchronization when connectivity returns.

## Understanding Offline-First Edge Architecture

Offline-first design principles:

- **Local-first data**: All data stored locally, synced to cloud as backup
- **Autonomous operation**: Full functionality without cloud access
- **Conflict resolution**: Handle data conflicts from concurrent offline edits
- **Opportunistic sync**: Push/pull data when connectivity is available
- **Graceful degradation**: Core features work offline, nice-to-haves require connectivity

This differs from online-first apps that cache data temporarily. Offline-first assumes disconnection is permanent until proven otherwise.

## Prerequisites

You need:

- K3s or KubeEdge cluster at edge location
- Local persistent storage (local SSDs or NAS)
- Applications designed with offline capabilities
- Message queue for async synchronization

## Configuring Edge Node for Offline Operation

Install K3s with offline-optimized settings:

```bash
curl -sfL https://get.k3s.io | sh -s - server \
  --write-kubeconfig-mode 644 \
  --disable servicelb \
  --disable traefik \
  --node-taint CriticalAddonsOnly=true:NoExecute \
  --kubelet-arg="image-gc-high-threshold=85" \
  --kubelet-arg="image-gc-low-threshold=80"
```

Configure pod eviction policies for resilience:

```yaml
# kubelet-config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
evictionHard:
  memory.available: "100Mi"
  nodefs.available: "5%"
evictionSoft:
  memory.available: "200Mi"
  nodefs.available: "10%"
evictionSoftGracePeriod:
  memory.available: "1m"
  nodefs.available: "2m"
imageGCHighThresholdPercent: 85
imageGCLowThresholdPercent: 80
```

## Deploying Local Database for Offline Storage

Deploy PostgreSQL for local data storage:

```yaml
# local-postgres.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-local
  namespace: default
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:15-alpine
          env:
            - name: POSTGRES_DB
              value: edge_data
            - name: POSTGRES_USER
              value: edge_user
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: password
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          ports:
            - containerPort: 5432
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
          resources:
            requests:
              cpu: "500m"
              memory: "512Mi"
            limits:
              cpu: "1"
              memory: "1Gi"
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: local-path
        resources:
          requests:
            storage: 20Gi
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
spec:
  selector:
    app: postgres
  ports:
    - port: 5432
  clusterIP: None
```

Apply the database:

```bash
kubectl apply -f local-postgres.yaml
```

## Building an Offline-First Application

Create a Python application with offline capabilities:

```python
# app.py
import os
import psycopg2
import requests
import json
from datetime import datetime
from flask import Flask, request, jsonify

app = Flask(__name__)

# Local database connection
def get_db():
    return psycopg2.connect(
        host=os.environ.get('DB_HOST', 'postgres'),
        database=os.environ.get('DB_NAME', 'edge_data'),
        user=os.environ.get('DB_USER', 'edge_user'),
        password=os.environ.get('DB_PASSWORD', 'password')
    )

# Initialize database schema
def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS sensor_readings (
            id SERIAL PRIMARY KEY,
            sensor_id VARCHAR(50),
            temperature FLOAT,
            humidity FLOAT,
            timestamp TIMESTAMP,
            synced BOOLEAN DEFAULT FALSE,
            sync_attempts INTEGER DEFAULT 0
        )
    ''')
    conn.commit()
    cur.close()
    conn.close()

# Store reading locally
@app.route('/api/readings', methods=['POST'])
def store_reading():
    data = request.json
    conn = get_db()
    cur = conn.cursor()

    cur.execute('''
        INSERT INTO sensor_readings (sensor_id, temperature, humidity, timestamp)
        VALUES (%s, %s, %s, %s)
        RETURNING id
    ''', (
        data['sensor_id'],
        data['temperature'],
        data['humidity'],
        datetime.now()
    ))

    reading_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()

    # Try to sync immediately if online
    try_sync_reading(reading_id)

    return jsonify({'id': reading_id, 'status': 'stored'}), 201

# Retrieve local readings
@app.route('/api/readings', methods=['GET'])
def get_readings():
    conn = get_db()
    cur = conn.cursor()

    cur.execute('''
        SELECT id, sensor_id, temperature, humidity, timestamp, synced
        FROM sensor_readings
        ORDER BY timestamp DESC
        LIMIT 100
    ''')

    readings = []
    for row in cur.fetchall():
        readings.append({
            'id': row[0],
            'sensor_id': row[1],
            'temperature': row[2],
            'humidity': row[3],
            'timestamp': row[4].isoformat(),
            'synced': row[5]
        })

    cur.close()
    conn.close()

    return jsonify(readings)

# Try to sync a reading to cloud
def try_sync_reading(reading_id):
    try:
        conn = get_db()
        cur = conn.cursor()

        cur.execute('''
            SELECT sensor_id, temperature, humidity, timestamp
            FROM sensor_readings
            WHERE id = %s AND synced = FALSE
        ''', (reading_id,))

        row = cur.fetchone()
        if not row:
            return

        # Attempt cloud sync with 2-second timeout
        cloud_url = os.environ.get('CLOUD_API_URL')
        if cloud_url:
            response = requests.post(
                f'{cloud_url}/api/readings',
                json={
                    'sensor_id': row[0],
                    'temperature': row[1],
                    'humidity': row[2],
                    'timestamp': row[3].isoformat()
                },
                timeout=2
            )

            if response.status_code == 201:
                # Mark as synced
                cur.execute('''
                    UPDATE sensor_readings
                    SET synced = TRUE
                    WHERE id = %s
                ''', (reading_id,))
                conn.commit()

        cur.close()
        conn.close()

    except Exception as e:
        # Sync failed, will retry later
        print(f"Sync failed: {e}")
        conn = get_db()
        cur = conn.cursor()
        cur.execute('''
            UPDATE sensor_readings
            SET sync_attempts = sync_attempts + 1
            WHERE id = %s
        ''', (reading_id,))
        conn.commit()
        cur.close()
        conn.close()

# Background sync job
@app.route('/api/sync', methods=['POST'])
def sync_unsynced():
    conn = get_db()
    cur = conn.cursor()

    cur.execute('''
        SELECT id FROM sensor_readings
        WHERE synced = FALSE AND sync_attempts < 10
        ORDER BY timestamp ASC
        LIMIT 100
    ''')

    unsynced_ids = [row[0] for row in cur.fetchall()]
    cur.close()
    conn.close()

    synced_count = 0
    for reading_id in unsynced_ids:
        try_sync_reading(reading_id)
        synced_count += 1

    return jsonify({
        'unsynced_found': len(unsynced_ids),
        'sync_attempted': synced_count
    })

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=8080)
```

Build and deploy:

```dockerfile
# Dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN pip install flask psycopg2-binary requests
COPY app.py .
CMD ["python", "app.py"]
```

```yaml
# offline-app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: offline-sensor-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: sensor-app
  template:
    metadata:
      labels:
        app: sensor-app
    spec:
      containers:
        - name: app
          image: your-registry/offline-sensor-app:v1
          env:
            - name: DB_HOST
              value: postgres
            - name: DB_NAME
              value: edge_data
            - name: DB_USER
              value: edge_user
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: password
            - name: CLOUD_API_URL
              value: "https://cloud-api.example.com"
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: "200m"
              memory: "256Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: sensor-app
spec:
  selector:
    app: sensor-app
  ports:
    - port: 80
      targetPort: 8080
```

## Implementing Background Sync CronJob

Create a job that periodically syncs unsynced data:

```yaml
# sync-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cloud-sync-job
spec:
  schedule: "*/5 * * * *"  # Every 5 minutes
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: sync
              image: curlimages/curl:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Check connectivity
                  if curl -s --connect-timeout 2 https://cloud-api.example.com/health > /dev/null; then
                    echo "Cloud reachable, triggering sync"
                    curl -X POST http://sensor-app/api/sync
                  else
                    echo "Cloud unreachable, skipping sync"
                  fi
          restartPolicy: OnFailure
```

## Deploying Local Message Queue

Use NATS for reliable message delivery:

```yaml
# nats-deployment.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: nats
spec:
  serviceName: nats
  replicas: 1
  selector:
    matchLabels:
      app: nats
  template:
    metadata:
      labels:
        app: nats
    spec:
      containers:
        - name: nats
          image: nats:2.10-alpine
          args:
            - "-js"  # Enable JetStream for persistence
            - "--store_dir=/data"
          ports:
            - containerPort: 4222
              name: client
            - containerPort: 8222
              name: monitoring
          volumeMounts:
            - name: data
              mountPath: /data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 5Gi
---
apiVersion: v1
kind: Service
metadata:
  name: nats
spec:
  selector:
    app: nats
  ports:
    - port: 4222
      name: client
    - port: 8222
      name: monitoring
```

## Implementing Conflict Resolution

Handle conflicts when syncing offline changes:

```python
# conflict_resolution.py
def sync_with_conflict_resolution(local_reading, cloud_reading):
    """
    Resolve conflicts between local and cloud data.
    Strategy: Last-write-wins based on timestamp.
    """
    local_ts = local_reading['timestamp']
    cloud_ts = cloud_reading['timestamp']

    if local_ts > cloud_ts:
        # Local is newer, push to cloud
        return 'push_local'
    elif cloud_ts > local_ts:
        # Cloud is newer, update local
        return 'pull_cloud'
    else:
        # Same timestamp, use sensor_id as tiebreaker
        if local_reading['sensor_id'] < cloud_reading['sensor_id']:
            return 'push_local'
        else:
            return 'pull_cloud'
```

## Monitoring Offline Operations

Track sync status and offline duration:

```yaml
# monitoring-dashboard.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard-offline
data:
  offline-ops.json: |
    {
      "dashboard": {
        "title": "Offline Operations",
        "panels": [
          {
            "title": "Unsynced Records",
            "targets": [{
              "expr": "SELECT COUNT(*) FROM sensor_readings WHERE synced = FALSE"
            }]
          },
          {
            "title": "Sync Success Rate",
            "targets": [{
              "expr": "rate(sync_success_total[5m]) / rate(sync_attempts_total[5m])"
            }]
          }
        ]
      }
    }
```

## Pre-Caching Critical Images

Ensure images are available offline:

```bash
# pre-cache-images.sh
#!/bin/bash
CRITICAL_IMAGES=(
  "postgres:15-alpine"
  "your-registry/offline-sensor-app:v1"
  "nats:2.10-alpine"
  "curlimages/curl:latest"
)

for image in "${CRITICAL_IMAGES[@]}"; do
  echo "Pulling $image..."
  crictl pull $image
done

echo "All critical images cached"
```

## Conclusion

Offline-first edge applications transform unreliable connectivity from a showstopper into a minor inconvenience. By storing data locally, operating autonomously, and syncing opportunistically, you build resilient systems that work anywhere.

Start with simple local storage and sync patterns, test thoroughly in actual offline scenarios, then add sophistication like conflict resolution and intelligent batching. The ability to operate disconnected unlocks entirely new deployment scenarios for Kubernetes at the edge.
