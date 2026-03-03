# How to Run Media Servers on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Home Lab, Media Server, Jellyfin, Self-Hosting

Description: Learn how to deploy and run media server applications like Jellyfin, Emby, and Navidrome on a Talos Linux Kubernetes cluster in your home lab.

---

One of the most popular reasons to run a home lab is self-hosting media servers. Streaming your own movie collection, managing your music library, or organizing family photos on hardware you control has real appeal. Running these services on Talos Linux and Kubernetes might seem like overkill, but if you already have a Talos cluster, adding media services is straightforward and gives you all the benefits of Kubernetes orchestration.

This guide covers deploying popular media server applications on Talos Linux.

## Prerequisites

Before deploying media servers, you need a few things in place on your Talos cluster:

- A storage solution (NFS from a NAS is ideal for media files)
- An ingress controller (Traefik or nginx)
- MetalLB or similar for LoadBalancer services
- Optionally, GPU passthrough if you want hardware transcoding

## Setting Up Media Storage

Media files are typically large and stored on a NAS. Set up NFS access to your media library:

```yaml
# media-pv.yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: media-library
spec:
  capacity:
    storage: 4Ti
  accessModes:
    - ReadWriteMany
  nfs:
    server: 192.168.1.200  # Your NAS IP
    path: /volume1/media
  persistentVolumeReclaimPolicy: Retain
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: media-library
  namespace: media
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 4Ti
  volumeName: media-library
  storageClassName: ""
```

Create a namespace for your media services:

```bash
kubectl create namespace media
kubectl apply -f media-pv.yaml
```

## Deploying Jellyfin

Jellyfin is a free, open-source media server. It is the most popular choice for self-hosted media because there are no subscriptions or licensing restrictions.

```yaml
# jellyfin.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jellyfin
  namespace: media
spec:
  replicas: 1
  selector:
    matchLabels:
      app: jellyfin
  template:
    metadata:
      labels:
        app: jellyfin
    spec:
      containers:
        - name: jellyfin
          image: jellyfin/jellyfin:latest
          ports:
            - containerPort: 8096
              name: http
          env:
            - name: JELLYFIN_DATA_DIR
              value: /config
            - name: JELLYFIN_CACHE_DIR
              value: /cache
          volumeMounts:
            - name: config
              mountPath: /config
            - name: cache
              mountPath: /cache
            - name: media
              mountPath: /media
              readOnly: true
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: "4"
              memory: 4Gi
      volumes:
        - name: config
          persistentVolumeClaim:
            claimName: jellyfin-config
        - name: cache
          emptyDir:
            sizeLimit: 10Gi
        - name: media
          persistentVolumeClaim:
            claimName: media-library
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: jellyfin-config
  namespace: media
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
---
apiVersion: v1
kind: Service
metadata:
  name: jellyfin
  namespace: media
spec:
  type: LoadBalancer
  selector:
    app: jellyfin
  ports:
    - port: 8096
      targetPort: 8096
      name: http
```

```bash
kubectl apply -f jellyfin.yaml
```

### Enabling Hardware Transcoding

If your mini PC has an Intel CPU with Quick Sync (most modern Intel processors), you can enable hardware transcoding. Talos needs to expose the GPU device to the container:

```yaml
# Update the Jellyfin deployment for hardware transcoding
spec:
  template:
    spec:
      containers:
        - name: jellyfin
          image: jellyfin/jellyfin:latest
          securityContext:
            privileged: false
          resources:
            limits:
              gpu.intel.com/i915: "1"  # Request Intel GPU
          # ... rest of config
```

For Intel GPU access on Talos, you need the Intel GPU device plugin:

```bash
# Install Intel GPU device plugin
kubectl apply -f https://raw.githubusercontent.com/intel/intel-device-plugins-for-kubernetes/main/deployments/nfd/overlays/node-feature-discovery/node-feature-discovery-daemonset.yaml
kubectl apply -f https://raw.githubusercontent.com/intel/intel-device-plugins-for-kubernetes/main/deployments/gpu_plugin/overlays/nfd_managed/kustomization.yaml
```

## Deploying Navidrome for Music

Navidrome is a lightweight music server with a beautiful web interface and support for Subsonic-compatible apps:

```yaml
# navidrome.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: navidrome
  namespace: media
spec:
  replicas: 1
  selector:
    matchLabels:
      app: navidrome
  template:
    metadata:
      labels:
        app: navidrome
    spec:
      containers:
        - name: navidrome
          image: deluan/navidrome:latest
          ports:
            - containerPort: 4533
          env:
            - name: ND_SCANSCHEDULE
              value: "1h"
            - name: ND_LOGLEVEL
              value: "info"
            - name: ND_MUSICFOLDER
              value: "/music"
          volumeMounts:
            - name: data
              mountPath: /data
            - name: music
              mountPath: /music
              readOnly: true
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: "1"
              memory: 512Mi
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: navidrome-data
        - name: music
          nfs:
            server: 192.168.1.200
            path: /volume1/media/music
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: navidrome-data
  namespace: media
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 2Gi
---
apiVersion: v1
kind: Service
metadata:
  name: navidrome
  namespace: media
spec:
  type: LoadBalancer
  selector:
    app: navidrome
  ports:
    - port: 4533
      targetPort: 4533
```

## Deploying Immich for Photos

Immich is a self-hosted photo and video management solution that works like Google Photos:

```yaml
# immich-values.yaml (for Helm installation)
# Install with: helm install immich immich/immich -n media -f immich-values.yaml
env:
  DB_HOSTNAME: immich-postgresql
  DB_USERNAME: immich
  DB_DATABASE_NAME: immich
  REDIS_HOSTNAME: immich-redis

image:
  tag: release

server:
  persistence:
    library:
      existingClaim: media-library

postgresql:
  enabled: true
  auth:
    username: immich
    database: immich

redis:
  enabled: true
  architecture: standalone
```

```bash
helm repo add immich https://immich-app.github.io/immich-charts
helm install immich immich/immich \
  --namespace media \
  --values immich-values.yaml
```

## Setting Up Ingress

Expose your media services through a single ingress controller with proper hostnames:

```yaml
# media-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: media-ingress
  namespace: media
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "0"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
spec:
  ingressClassName: nginx
  rules:
    - host: jellyfin.home.lab
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: jellyfin
                port:
                  number: 8096
    - host: music.home.lab
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: navidrome
                port:
                  number: 4533
    - host: photos.home.lab
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: immich-server
                port:
                  number: 3001
```

Add the hostnames to your local DNS or `/etc/hosts` file on your devices:

```
192.168.1.200  jellyfin.home.lab music.home.lab photos.home.lab
```

## Performance Tips

Media servers can be resource-intensive, especially during transcoding. A few tips:

- Schedule media servers on nodes with the most RAM and best CPU
- Use node affinity to pin media pods to specific hardware
- Set appropriate resource limits to prevent one service from starving others
- Use direct play when possible instead of transcoding to reduce CPU load
- Store transcoded cache on fast local storage, not NFS

```yaml
# Node affinity for GPU-capable node
spec:
  template:
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: kubernetes.io/hostname
                    operator: In
                    values:
                      - mini-worker-1  # Node with Intel GPU
```

## Summary

Running media servers on Talos Linux works well for home lab users who want the management benefits of Kubernetes. Jellyfin handles video and movies, Navidrome covers music, and Immich manages photos. NFS storage from a NAS keeps your media files accessible and separate from the cluster. The main advantage over running these services on bare Linux or Docker is automated recovery - if a node reboots or a container crashes, Kubernetes restarts everything automatically. That matters when your family expects the movie server to be available on a Friday night.
