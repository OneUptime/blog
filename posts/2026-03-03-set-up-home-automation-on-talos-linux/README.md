# How to Set Up Home Automation on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Home Automation, Home Assistant, Self-Hosting, IoT

Description: Deploy Home Assistant and other home automation tools on a Talos Linux Kubernetes cluster for reliable smart home management in your home lab.

---

Home automation platforms like Home Assistant need to run reliably around the clock. If your smart home controller goes down, lights stop responding, automations fail, and the family gets frustrated. Running Home Assistant on a Talos Linux Kubernetes cluster gives you automatic restarts, rolling updates, and the reliability that Kubernetes brings to stateful applications.

This guide covers deploying Home Assistant and supporting services on Talos Linux.

## Why Kubernetes for Home Automation

Running Home Assistant on a dedicated Raspberry Pi or VM works fine until it does not. The SD card corrupts. The VM host needs a reboot. An update goes wrong and you have no easy rollback. On Kubernetes, your home automation stack gets:

- Automatic pod restarts if anything crashes
- Persistent storage with optional replication
- Easy rollbacks through Kubernetes deployments
- Resource isolation from other workloads
- Centralized logging and monitoring

## USB Device Passthrough

Many home automation setups use USB devices for communication with Zigbee or Z-Wave networks. On Talos Linux, you need to pass these USB devices through to your pods.

First, identify the USB device on the Talos node:

```bash
# Check USB devices on the node
talosctl get usbdevices --nodes 192.168.1.101
```

For Zigbee sticks (like the Sonoff Zigbee 3.0 or ConBee II), the device typically appears as `/dev/ttyUSB0` or `/dev/ttyACM0`.

Configure Talos to expose the device:

```yaml
# Talos machine config patch for the node with the USB stick
machine:
  udev:
    rules:
      # Create a consistent device name for the Zigbee stick
      - SUBSYSTEM=="tty", ATTRS{idVendor}=="10c4", ATTRS{idProduct}=="ea60", SYMLINK+="zigbee"
  kernel:
    modules:
      - name: cp210x  # Common for Zigbee USB sticks
      - name: ch341   # Common for Z-Wave sticks
```

## Deploying Home Assistant

Create a namespace and deploy Home Assistant:

```yaml
# home-assistant.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: home-automation
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: home-assistant
  namespace: home-automation
spec:
  replicas: 1
  strategy:
    type: Recreate  # Important for single-instance stateful apps
  selector:
    matchLabels:
      app: home-assistant
  template:
    metadata:
      labels:
        app: home-assistant
    spec:
      hostNetwork: true  # Needed for mDNS device discovery
      dnsPolicy: ClusterFirstWithHostNet
      containers:
        - name: home-assistant
          image: ghcr.io/home-assistant/home-assistant:stable
          ports:
            - containerPort: 8123
              name: http
          env:
            - name: TZ
              value: "America/New_York"
          volumeMounts:
            - name: config
              mountPath: /config
            - name: zigbee
              mountPath: /dev/ttyUSB0
          securityContext:
            privileged: true  # Required for USB device access
          resources:
            requests:
              cpu: 200m
              memory: 512Mi
            limits:
              cpu: "2"
              memory: 2Gi
      volumes:
        - name: config
          persistentVolumeClaim:
            claimName: home-assistant-config
        - name: zigbee
          hostPath:
            path: /dev/ttyUSB0
            type: CharDevice
      nodeSelector:
        # Pin to the node with the USB stick
        kubernetes.io/hostname: talos-worker-1
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: home-assistant-config
  namespace: home-automation
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
  name: home-assistant
  namespace: home-automation
spec:
  type: LoadBalancer
  selector:
    app: home-assistant
  ports:
    - port: 8123
      targetPort: 8123
```

```bash
kubectl apply -f home-assistant.yaml
```

A few important notes about this configuration:

- `hostNetwork: true` is needed so Home Assistant can use mDNS to discover devices on your local network
- `strategy.type: Recreate` prevents two instances from running simultaneously, which would cause database corruption
- `privileged: true` and the hostPath volume give the container access to the USB device
- `nodeSelector` pins the pod to the specific node with the USB stick

## Deploying Zigbee2MQTT

Rather than connecting the Zigbee stick directly to Home Assistant, many users prefer running Zigbee2MQTT as a separate service. It converts Zigbee device messages to MQTT, which Home Assistant consumes.

First, deploy an MQTT broker:

```yaml
# mosquitto.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mosquitto
  namespace: home-automation
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mosquitto
  template:
    metadata:
      labels:
        app: mosquitto
    spec:
      containers:
        - name: mosquitto
          image: eclipse-mosquitto:2
          ports:
            - containerPort: 1883
          volumeMounts:
            - name: config
              mountPath: /mosquitto/config
            - name: data
              mountPath: /mosquitto/data
      volumes:
        - name: config
          configMap:
            name: mosquitto-config
        - name: data
          persistentVolumeClaim:
            claimName: mosquitto-data
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: mosquitto-config
  namespace: home-automation
data:
  mosquitto.conf: |
    listener 1883
    allow_anonymous true
    persistence true
    persistence_location /mosquitto/data/
---
apiVersion: v1
kind: Service
metadata:
  name: mosquitto
  namespace: home-automation
spec:
  selector:
    app: mosquitto
  ports:
    - port: 1883
      targetPort: 1883
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mosquitto-data
  namespace: home-automation
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
```

Then deploy Zigbee2MQTT:

```yaml
# zigbee2mqtt.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zigbee2mqtt
  namespace: home-automation
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: zigbee2mqtt
  template:
    metadata:
      labels:
        app: zigbee2mqtt
    spec:
      containers:
        - name: zigbee2mqtt
          image: koenkk/zigbee2mqtt:latest
          ports:
            - containerPort: 8080
          env:
            - name: TZ
              value: "America/New_York"
            - name: ZIGBEE2MQTT_CONFIG_MQTT_SERVER
              value: "mqtt://mosquitto.home-automation.svc:1883"
            - name: ZIGBEE2MQTT_CONFIG_SERIAL_PORT
              value: "/dev/ttyUSB0"
            - name: ZIGBEE2MQTT_CONFIG_FRONTEND
              value: "true"
          volumeMounts:
            - name: data
              mountPath: /app/data
            - name: zigbee
              mountPath: /dev/ttyUSB0
          securityContext:
            privileged: true
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: zigbee2mqtt-data
        - name: zigbee
          hostPath:
            path: /dev/ttyUSB0
            type: CharDevice
      nodeSelector:
        kubernetes.io/hostname: talos-worker-1
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: zigbee2mqtt-data
  namespace: home-automation
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
---
apiVersion: v1
kind: Service
metadata:
  name: zigbee2mqtt
  namespace: home-automation
spec:
  type: ClusterIP
  selector:
    app: zigbee2mqtt
  ports:
    - port: 8080
      targetPort: 8080
```

## Deploying Node-RED

Node-RED is a visual automation tool that complements Home Assistant. It is especially useful for complex automations:

```yaml
# node-red.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: node-red
  namespace: home-automation
spec:
  replicas: 1
  selector:
    matchLabels:
      app: node-red
  template:
    metadata:
      labels:
        app: node-red
    spec:
      containers:
        - name: node-red
          image: nodered/node-red:latest
          ports:
            - containerPort: 1880
          volumeMounts:
            - name: data
              mountPath: /data
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
            claimName: node-red-data
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: node-red-data
  namespace: home-automation
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
  name: node-red
  namespace: home-automation
spec:
  type: LoadBalancer
  selector:
    app: node-red
  ports:
    - port: 1880
      targetPort: 1880
```

## Backup Strategy

Home Assistant configurations take time to set up. Losing them means recreating all your automations, dashboards, and device configurations from scratch. Set up automated backups:

```bash
# Create a CronJob that backs up the Home Assistant config PVC
# This example copies to an NFS share
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ha-backup
  namespace: home-automation
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
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
                - "cp -r /source/* /backup/ha-\$(date +%Y%m%d)/"
              volumeMounts:
                - name: source
                  mountPath: /source
                  readOnly: true
                - name: backup
                  mountPath: /backup
          volumes:
            - name: source
              persistentVolumeClaim:
                claimName: home-assistant-config
            - name: backup
              nfs:
                server: 192.168.1.200
                path: /volume1/backups/homeassistant
          restartPolicy: OnFailure
EOF
```

## Summary

Running home automation on Talos Linux gives you a reliable platform that recovers from failures automatically. Home Assistant, Zigbee2MQTT, Mosquitto, and Node-RED all work well in Kubernetes containers. The main consideration is USB device passthrough for Zigbee and Z-Wave sticks, which requires privileged containers and node pinning. Once set up, the system runs hands-free. Updates are just a matter of changing the container image tag, and rollbacks are a single kubectl command away. Your smart home stays smart even when individual nodes need maintenance.
