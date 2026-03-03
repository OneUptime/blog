# How to Deploy Home Assistant on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Home Assistant, Home Automation, Kubernetes, IoT, Smart Home

Description: Complete guide to running Home Assistant on a Talos Linux Kubernetes cluster for a reliable and secure smart home automation platform.

---

Home Assistant is the most popular open-source home automation platform, supporting thousands of devices and integrations. While it is typically run on a Raspberry Pi or a dedicated VM, deploying it on Talos Linux inside Kubernetes gives you better reliability, easier backups, and the security benefits of an immutable operating system. If you are already running a Talos Linux cluster at home or in a lab environment, adding Home Assistant to it is a logical step.

This guide covers deploying Home Assistant on Talos Linux, handling device access for USB dongles, configuring persistent storage, and exposing the web interface.

## Prerequisites

Before starting, ensure you have:

- A Talos Linux cluster (even a single-node cluster works for home use)
- kubectl configured for your cluster
- A storage provisioner for persistent volumes
- An ingress controller or the ability to use NodePort services
- Optionally, a USB Zigbee or Z-Wave dongle if you plan to use those protocols

## Handling USB Device Access

One of the challenges of running Home Assistant on Kubernetes is that many smart home setups rely on USB devices like Zigbee coordinators (such as Sonoff Zigbee 3.0 dongles) or Z-Wave sticks. On Talos Linux, you need to configure the machine to pass these devices through to pods.

First, identify your USB device on the Talos node:

```bash
# List USB devices on a Talos node
talosctl -n <node-ip> ls /dev/serial/by-id/
```

You should see something like `/dev/serial/by-id/usb-Silicon_Labs_Sonoff_Zigbee_3.0_USB_Dongle_Plus-if00-port0`.

To make this device available to pods, you need to use a device plugin or mount it directly. The simplest approach uses a privileged container with a host device mount. Add this to your Talos machine config:

```yaml
# talos-usb-patch.yaml
machine:
  kernel:
    modules:
      - name: cp210x
      - name: ch341
  udev:
    rules:
      - SUBSYSTEM=="tty", ATTRS{idVendor}=="10c4", ATTRS{idProduct}=="ea60", SYMLINK+="zigbee"
```

Apply it to the node where your USB device is connected:

```bash
talosctl apply-config --patch @talos-usb-patch.yaml --nodes <node-ip>
```

## Creating the Namespace and Storage

```bash
# Create namespace for Home Assistant
kubectl create namespace home-assistant
```

Create a PersistentVolumeClaim for Home Assistant's configuration data:

```yaml
# home-assistant-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: home-assistant-config
  namespace: home-assistant
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: local-path
  resources:
    requests:
      storage: 10Gi
```

```bash
kubectl apply -f home-assistant-pvc.yaml
```

## Deploying Home Assistant

Create the main deployment. Note the security context settings needed for USB device access:

```yaml
# home-assistant-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: home-assistant
  namespace: home-assistant
  labels:
    app: home-assistant
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: home-assistant
  template:
    metadata:
      labels:
        app: home-assistant
    spec:
      hostNetwork: true
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
            - name: zigbee-device
              mountPath: /dev/ttyUSB0
          securityContext:
            privileged: true
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: "2"
              memory: 2Gi
      volumes:
        - name: config
          persistentVolumeClaim:
            claimName: home-assistant-config
        - name: zigbee-device
          hostPath:
            path: /dev/ttyUSB0
            type: CharDevice
      nodeSelector:
        # Pin to the node with the USB device
        kubernetes.io/hostname: talos-worker-1
```

If you do not need USB device access, you can remove the privileged security context, the zigbee-device volume, and the nodeSelector. Many Home Assistant integrations work over the network (WiFi devices, Hue bridges, etc.) and do not require USB.

Here is a simpler version without USB:

```yaml
# home-assistant-simple.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: home-assistant
  namespace: home-assistant
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: home-assistant
  template:
    metadata:
      labels:
        app: home-assistant
    spec:
      containers:
        - name: home-assistant
          image: ghcr.io/home-assistant/home-assistant:stable
          ports:
            - containerPort: 8123
          env:
            - name: TZ
              value: "America/New_York"
          volumeMounts:
            - name: config
              mountPath: /config
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: "1"
              memory: 1Gi
      volumes:
        - name: config
          persistentVolumeClaim:
            claimName: home-assistant-config
```

Apply the deployment:

```bash
kubectl apply -f home-assistant-deployment.yaml
```

## Exposing Home Assistant

Create a service and ingress:

```yaml
# home-assistant-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: home-assistant
  namespace: home-assistant
spec:
  ports:
    - port: 8123
      targetPort: 8123
      protocol: TCP
  selector:
    app: home-assistant
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: home-assistant
  namespace: home-assistant
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - home.example.com
      secretName: home-assistant-tls
  rules:
    - host: home.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: home-assistant
                port:
                  number: 8123
```

If you used `hostNetwork: true`, Home Assistant will also be directly accessible on port 8123 of the host node.

## Configuring Home Assistant

After the pod starts, access the web interface to complete initial setup. If using port-forward for testing:

```bash
kubectl port-forward -n home-assistant svc/home-assistant 8123:8123
```

Navigate to http://localhost:8123 and follow the onboarding wizard to create your user account and set your location.

For Zigbee devices, configure the Zigbee Home Automation (ZHA) integration and point it to the serial device at `/dev/ttyUSB0`. Alternatively, you can run Zigbee2MQTT as a separate deployment:

```yaml
# zigbee2mqtt-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zigbee2mqtt
  namespace: home-assistant
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
          env:
            - name: TZ
              value: "America/New_York"
          volumeMounts:
            - name: data
              mountPath: /app/data
            - name: zigbee-device
              mountPath: /dev/ttyUSB0
          securityContext:
            privileged: true
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: zigbee2mqtt-data
        - name: zigbee-device
          hostPath:
            path: /dev/ttyUSB0
      nodeSelector:
        kubernetes.io/hostname: talos-worker-1
```

## Backing Up Home Assistant

Home Assistant stores all its configuration in the `/config` directory, which lives on your persistent volume. Set up regular backups:

```bash
# Create a CronJob to back up the config directory
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ha-backup
  namespace: home-assistant
spec:
  schedule: "0 3 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: alpine:latest
              command:
                - sh
                - -c
                - |
                  apk add --no-cache tar
                  tar czf /backup/ha-backup-\$(date +%Y%m%d).tar.gz -C /config .
              volumeMounts:
                - name: config
                  mountPath: /config
                  readOnly: true
                - name: backup
                  mountPath: /backup
          volumes:
            - name: config
              persistentVolumeClaim:
                claimName: home-assistant-config
            - name: backup
              persistentVolumeClaim:
                claimName: ha-backup-storage
          restartPolicy: OnFailure
EOF
```

## Conclusion

Running Home Assistant on Talos Linux combines the flexibility of the most popular home automation platform with the security and reliability of an immutable Kubernetes-native OS. Whether you have a simple setup with WiFi devices or a complex one with Zigbee and Z-Wave dongles, Talos Linux handles it all while keeping your infrastructure locked down and maintainable. The Kubernetes layer gives you straightforward backup, monitoring, and upgrade paths that are much more robust than running Home Assistant directly on a Raspberry Pi.
