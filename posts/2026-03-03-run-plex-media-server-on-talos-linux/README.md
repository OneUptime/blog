# How to Run Plex Media Server on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Plex, Media Server, Home Lab, Self-Hosting

Description: Deploy and configure Plex Media Server on a Talos Linux Kubernetes cluster with hardware transcoding, persistent storage, and reliable operation.

---

Plex Media Server is one of the most popular self-hosted media platforms. It organizes your movies, TV shows, music, and photos into a beautiful interface accessible from any device. Running Plex on a Talos Linux Kubernetes cluster means it benefits from automatic restarts, persistent storage management, and the general reliability of Kubernetes orchestration.

This guide walks through deploying Plex on Talos Linux with all the trimmings, including hardware transcoding and proper storage configuration.

## Prerequisites

You need a Talos Linux cluster with:

- At least one node with 4GB+ RAM (8GB recommended)
- Storage for media files (NFS from a NAS is ideal)
- Storage for Plex configuration and metadata
- MetalLB or similar for LoadBalancer services
- Optional: Intel CPU with Quick Sync for hardware transcoding

You also need a Plex account and a claim token from https://plex.tv/claim (tokens expire after 4 minutes, so get it right before deploying).

## Storage Setup

Plex needs two types of storage: a large volume for your media library and a smaller volume for configuration, metadata, and transcoding cache.

### Media Library via NFS

If your media lives on a NAS, set up an NFS PersistentVolume:

```yaml
# plex-media-pv.yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: plex-media
spec:
  capacity:
    storage: 8Ti
  accessModes:
    - ReadOnlyMany
  nfs:
    server: 192.168.1.200
    path: /volume1/media
  persistentVolumeReclaimPolicy: Retain
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: plex-media
  namespace: media
spec:
  accessModes:
    - ReadOnlyMany
  resources:
    requests:
      storage: 8Ti
  volumeName: plex-media
  storageClassName: ""
```

### Configuration Storage

Plex metadata and database should live on fast local or replicated storage:

```yaml
# plex-config-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: plex-config
  namespace: media
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi  # Plex metadata can get large
  storageClassName: longhorn  # Or your preferred storage class
```

## Deploying Plex

```yaml
# plex-deployment.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: media
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: plex
  namespace: media
spec:
  replicas: 1
  strategy:
    type: Recreate  # Only one Plex instance at a time
  selector:
    matchLabels:
      app: plex
  template:
    metadata:
      labels:
        app: plex
    spec:
      containers:
        - name: plex
          image: plexinc/pms-docker:latest
          ports:
            - containerPort: 32400
              name: pms
              protocol: TCP
            - containerPort: 1900
              name: dlna-udp
              protocol: UDP
            - containerPort: 32469
              name: dlna-tcp
              protocol: TCP
            - containerPort: 3005
              name: plex-companion
              protocol: TCP
            - containerPort: 8324
              name: plex-roku
              protocol: TCP
            - containerPort: 32410
              name: gdm1
              protocol: UDP
            - containerPort: 32412
              name: gdm2
              protocol: UDP
            - containerPort: 32413
              name: gdm3
              protocol: UDP
            - containerPort: 32414
              name: gdm4
              protocol: UDP
          env:
            - name: TZ
              value: "America/New_York"
            - name: PLEX_CLAIM
              value: "claim-xxxxxxxxxxxx"  # Get from plex.tv/claim
            - name: ADVERTISE_IP
              value: "http://192.168.1.210:32400/"  # MetalLB IP
          volumeMounts:
            - name: config
              mountPath: /config
            - name: media
              mountPath: /media
              readOnly: true
            - name: transcode
              mountPath: /transcode
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
            claimName: plex-config
        - name: media
          persistentVolumeClaim:
            claimName: plex-media
        - name: transcode
          emptyDir:
            medium: Memory
            sizeLimit: 4Gi  # RAM-based transcode for speed
```

The transcode volume uses `emptyDir` with `medium: Memory`, which creates a tmpfs mount. This gives the fastest possible transcoding performance since everything happens in RAM. Adjust the size limit based on your available memory.

## Service Configuration

```yaml
# plex-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: plex
  namespace: media
  annotations:
    metallb.universe.tf/loadBalancerIPs: "192.168.1.210"
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local  # Preserves client IP
  selector:
    app: plex
  ports:
    - port: 32400
      targetPort: 32400
      name: pms
      protocol: TCP
    - port: 1900
      targetPort: 1900
      name: dlna-udp
      protocol: UDP
    - port: 32469
      targetPort: 32469
      name: dlna-tcp
      protocol: TCP
    - port: 3005
      targetPort: 3005
      name: plex-companion
      protocol: TCP
    - port: 8324
      targetPort: 8324
      name: plex-roku
      protocol: TCP
    - port: 32410
      targetPort: 32410
      name: gdm1
      protocol: UDP
    - port: 32412
      targetPort: 32412
      name: gdm2
      protocol: UDP
    - port: 32413
      targetPort: 32413
      name: gdm3
      protocol: UDP
    - port: 32414
      targetPort: 32414
      name: gdm4
      protocol: UDP
```

Apply everything:

```bash
kubectl apply -f plex-media-pv.yaml
kubectl apply -f plex-config-pvc.yaml
kubectl apply -f plex-deployment.yaml
kubectl apply -f plex-service.yaml
```

## Hardware Transcoding

Hardware transcoding offloads video conversion from the CPU to the GPU. Intel Quick Sync (available on most Intel CPUs from 2013 onward) is the most common option for home labs.

### Intel Quick Sync Setup

On Talos Linux, you need to make the Intel GPU device available to the Plex container:

```yaml
# Update the Plex deployment for hardware transcoding
spec:
  template:
    spec:
      containers:
        - name: plex
          image: plexinc/pms-docker:latest
          securityContext:
            privileged: false
          volumeMounts:
            # Add the GPU device
            - name: dev-dri
              mountPath: /dev/dri
            # ... other volume mounts
      volumes:
        - name: dev-dri
          hostPath:
            path: /dev/dri
            type: Directory
        # ... other volumes
```

For a cleaner approach without privileged mode, use the Intel device plugin for Kubernetes:

```bash
# Deploy Intel GPU device plugin
kubectl apply -k https://github.com/intel/intel-device-plugins-for-kubernetes/deployments/gpu_plugin/overlays/nfd_managed
```

Then request the GPU in your container resources:

```yaml
resources:
  limits:
    gpu.intel.com/i915: "1"
```

Make sure you have a Plex Pass subscription - hardware transcoding requires it.

## Plex Configuration

After deployment, access Plex at `http://192.168.1.210:32400/web`. On first launch:

1. Sign in with your Plex account
2. Name your server
3. Add library folders:
   - Movies: `/media/movies`
   - TV Shows: `/media/tv`
   - Music: `/media/music`
4. Enable hardware transcoding in Settings > Transcoder > "Use hardware acceleration when available"

## Network Discovery

Plex uses GDM (G'Day Mate) protocol for local network discovery. The GDM ports in the service configuration above handle this. If clients on your network cannot find the Plex server automatically, make sure:

- The GDM UDP ports (32410, 32412, 32413, 32414) are accessible
- `externalTrafficPolicy: Local` is set on the service
- Your firewall (router) is not blocking multicast on the local network

## Remote Access

For accessing Plex outside your home network:

1. In Plex settings, enable Remote Access
2. Set the custom port to 32400
3. Forward port 32400 on your router to the MetalLB IP (192.168.1.210)
4. Set the `ADVERTISE_IP` environment variable to include your public IP

## Monitoring Plex

Monitor Plex resource usage with Prometheus:

```yaml
# Tautulli - Plex monitoring dashboard
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tautulli
  namespace: media
spec:
  replicas: 1
  selector:
    matchLabels:
      app: tautulli
  template:
    metadata:
      labels:
        app: tautulli
    spec:
      containers:
        - name: tautulli
          image: ghcr.io/tautulli/tautulli:latest
          ports:
            - containerPort: 8181
          volumeMounts:
            - name: config
              mountPath: /config
          resources:
            requests:
              cpu: 50m
              memory: 128Mi
      volumes:
        - name: config
          persistentVolumeClaim:
            claimName: tautulli-config
```

## Backup Strategy

Back up your Plex configuration regularly. The database and metadata are the most important - rebuilding them from scratch means re-matching all your media and losing watch history:

```bash
# Backup Plex database (most important)
kubectl exec -n media deployment/plex -- \
  tar czf /tmp/plex-backup.tar.gz \
  /config/Library/Application\ Support/Plex\ Media\ Server/Plug-in\ Support/Databases/

# Copy to your workstation
kubectl cp media/plex-xxx:/tmp/plex-backup.tar.gz ./plex-backup.tar.gz
```

## Summary

Running Plex on Talos Linux gives you a reliable media server that restarts automatically, handles storage through Kubernetes abstractions, and can take advantage of hardware transcoding. The initial setup takes a bit more effort than installing Plex on a bare Linux machine, but the long-term operational benefits are worth it. Kubernetes handles the lifecycle management while Plex handles the media. Just make sure to back up that Plex database - your carefully curated library metadata is irreplaceable.
