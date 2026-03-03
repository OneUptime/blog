# How to Run Unifi Controller on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Unifi, Network Management, Home Lab, Self-Hosting

Description: Deploy the Ubiquiti Unifi Network Controller on a Talos Linux Kubernetes cluster to manage your Unifi network devices from your home lab.

---

If you run Ubiquiti Unifi network equipment at home - access points, switches, gateways, or cameras - you need the Unifi Network Controller to manage them. While Ubiquiti sells dedicated hardware (the Cloud Key) for this, running the controller on your Talos Linux cluster makes more sense if you already have a cluster running. You get automatic backups, container management, and one less single-purpose device to maintain.

This guide covers deploying the Unifi Network Controller on Talos Linux with all the ports and settings needed for proper device management.

## Understanding Unifi Controller Requirements

The Unifi Controller is a Java-based application backed by MongoDB. It needs several specific ports for device discovery, management, and guest portal functions. Getting these ports right is critical - if devices cannot reach the controller on the expected ports, they will not adopt or update properly.

Key ports:
- 8443/TCP - Controller web UI and API (HTTPS)
- 8080/TCP - Device communication
- 3478/UDP - STUN (for NAT traversal)
- 10001/UDP - Device discovery
- 6789/TCP - Speed test (optional)
- 1900/UDP - Device discovery via L2 (optional)
- 8843/TCP - Guest portal HTTPS (optional)
- 8880/TCP - Guest portal HTTP (optional)

## Storage Requirements

The Unifi Controller stores device configurations, statistics, and backup files in MongoDB. Plan for adequate storage:

```yaml
# unifi-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: unifi-data
  namespace: unifi
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
  storageClassName: longhorn  # Or your preferred storage class
```

## Deploying the Unifi Controller

The `linuxserver/unifi-network-application` image is the most maintained community image. It separates the controller from MongoDB, giving you more control:

```yaml
# unifi-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: unifi
---
# mongodb for unifi
apiVersion: apps/v1
kind: Deployment
metadata:
  name: unifi-mongo
  namespace: unifi
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: unifi-mongo
  template:
    metadata:
      labels:
        app: unifi-mongo
    spec:
      containers:
        - name: mongo
          image: mongo:4.4
          ports:
            - containerPort: 27017
          env:
            - name: MONGO_INITDB_ROOT_USERNAME
              value: "unifi"
            - name: MONGO_INITDB_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: unifi-mongo-secret
                  key: password
          volumeMounts:
            - name: data
              mountPath: /data/db
          resources:
            requests:
              cpu: 200m
              memory: 512Mi
            limits:
              cpu: "1"
              memory: 1Gi
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: unifi-mongo-data
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: unifi-mongo-data
  namespace: unifi
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: unifi-mongo
  namespace: unifi
spec:
  selector:
    app: unifi-mongo
  ports:
    - port: 27017
      targetPort: 27017
```

Create the MongoDB secret:

```bash
kubectl create namespace unifi
kubectl create secret generic unifi-mongo-secret \
  --namespace unifi \
  --from-literal=password='your-secure-password'
```

Now deploy the Unifi Controller itself:

```yaml
# unifi-controller.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: unifi-controller
  namespace: unifi
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: unifi-controller
  template:
    metadata:
      labels:
        app: unifi-controller
    spec:
      containers:
        - name: unifi
          image: lscr.io/linuxserver/unifi-network-application:latest
          ports:
            - containerPort: 8443
              name: web-https
            - containerPort: 8080
              name: device-comm
            - containerPort: 3478
              name: stun
              protocol: UDP
            - containerPort: 10001
              name: discovery
              protocol: UDP
            - containerPort: 6789
              name: speedtest
            - containerPort: 8843
              name: guest-https
            - containerPort: 8880
              name: guest-http
          env:
            - name: PUID
              value: "1000"
            - name: PGID
              value: "1000"
            - name: TZ
              value: "America/New_York"
            - name: MONGO_USER
              value: "unifi"
            - name: MONGO_PASS
              valueFrom:
                secretKeyRef:
                  name: unifi-mongo-secret
                  key: password
            - name: MONGO_HOST
              value: "unifi-mongo"
            - name: MONGO_PORT
              value: "27017"
            - name: MONGO_DBNAME
              value: "unifi"
          volumeMounts:
            - name: config
              mountPath: /config
          resources:
            requests:
              cpu: 300m
              memory: 1Gi
            limits:
              cpu: "2"
              memory: 2Gi
          livenessProbe:
            httpGet:
              path: /status
              port: 8443
              scheme: HTTPS
            initialDelaySeconds: 120
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /status
              port: 8443
              scheme: HTTPS
            initialDelaySeconds: 60
            periodSeconds: 10
      volumes:
        - name: config
          persistentVolumeClaim:
            claimName: unifi-data
```

## Service Configuration

The Unifi Controller needs a LoadBalancer service with specific ports. Getting this right is essential for device adoption:

```yaml
# unifi-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: unifi
  namespace: unifi
  annotations:
    metallb.universe.tf/loadBalancerIPs: "192.168.1.220"
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  selector:
    app: unifi-controller
  ports:
    - port: 8443
      targetPort: 8443
      name: web-https
      protocol: TCP
    - port: 8080
      targetPort: 8080
      name: device-comm
      protocol: TCP
    - port: 3478
      targetPort: 3478
      name: stun
      protocol: UDP
    - port: 10001
      targetPort: 10001
      name: discovery
      protocol: UDP
    - port: 6789
      targetPort: 6789
      name: speedtest
      protocol: TCP
    - port: 8843
      targetPort: 8843
      name: guest-https
      protocol: TCP
    - port: 8880
      targetPort: 8880
      name: guest-http
      protocol: TCP
```

Deploy everything:

```bash
kubectl apply -f unifi-namespace.yaml
kubectl apply -f unifi-pvc.yaml
kubectl apply -f unifi-controller.yaml
kubectl apply -f unifi-service.yaml
```

## Device Adoption

After the controller is running (give it 2-3 minutes to start up), access the web UI at `https://192.168.1.220:8443`.

### Setting the Inform URL

Unifi devices need to know the controller's address. Set the inform URL in the controller settings:

1. Go to Settings > System > Advanced
2. Set the Inform Host to `192.168.1.220`

For devices that are already trying to connect to a different controller (like a Cloud Key you are replacing), SSH into the device and set the inform URL manually:

```bash
# SSH into a Unifi device (default credentials: ubnt/ubnt for new devices)
ssh ubnt@<device-ip>

# Set the inform URL
set-inform http://192.168.1.220:8080/inform
```

### DHCP Option 43

For automatic device discovery, configure DHCP Option 43 on your router to point to the controller IP. The format varies by router, but the value should be the hex-encoded inform URL.

## Configuring the Controller Override

When running in Kubernetes, the controller may not correctly detect its own IP. Override it in the controller's system.properties:

```yaml
# Add to the ConfigMap or mount as a file
apiVersion: v1
kind: ConfigMap
metadata:
  name: unifi-system-properties
  namespace: unifi
data:
  system.properties: |
    # Override controller hostname for device communication
    system_ip=192.168.1.220
    is_default=true
```

Mount this in the controller container:

```yaml
volumeMounts:
  - name: system-properties
    mountPath: /config/data/system.properties
    subPath: system.properties
volumes:
  - name: system-properties
    configMap:
      name: unifi-system-properties
```

## Automated Backups

The Unifi Controller has built-in backup functionality, but you should also back up the Kubernetes resources:

```bash
# The controller stores auto-backups in /config/data/backup/
# Copy them to external storage
kubectl exec -n unifi deployment/unifi-controller -- \
  ls /config/data/backup/autobackup/

# Copy the latest backup
kubectl cp unifi/unifi-controller-xxx:/config/data/backup/autobackup/ ./unifi-backups/
```

For automated external backups:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: unifi-backup
  namespace: unifi
spec:
  schedule: "0 3 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: busybox
              command:
                - sh
                - -c
                - "cp -r /source/data/backup/autobackup/* /backup/"
              volumeMounts:
                - name: source
                  mountPath: /source
                  readOnly: true
                - name: backup
                  mountPath: /backup
          volumes:
            - name: source
              persistentVolumeClaim:
                claimName: unifi-data
            - name: backup
              nfs:
                server: 192.168.1.200
                path: /volume1/backups/unifi
          restartPolicy: OnFailure
```

## Resource Monitoring

The Unifi Controller with MongoDB can be memory-hungry. Monitor resource usage:

```bash
# Check resource consumption
kubectl top pods -n unifi

# Watch for OOM kills
kubectl describe pod -n unifi -l app=unifi-controller | grep -A5 "Last State"
```

If the controller runs out of memory, it will crash and restart. The 2Gi limit in our deployment is usually sufficient for a home network with up to 50 devices. For larger networks, increase the memory limit.

## Summary

Running the Unifi Controller on Talos Linux works well for home lab users who already have a Kubernetes cluster. It eliminates the need for a dedicated Cloud Key, gives you proper backup and recovery through Kubernetes, and keeps all your home lab services managed in one place. The main things to get right are the network ports for device communication and the inform URL configuration. Once devices can reach the controller on port 8080, everything else falls into place. The initial setup takes about 30 minutes, after which your Unifi network management is fully containerized and resilient.
