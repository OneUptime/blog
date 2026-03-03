# How to Set Up MQTT Broker on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, MQTT, IoT, Kubernetes, Messaging, Eclipse Mosquitto, DevOps

Description: Deploy an MQTT broker on Talos Linux using Eclipse Mosquitto and EMQX for IoT device communication with persistent sessions and TLS.

---

MQTT (Message Queuing Telemetry Transport) is the standard messaging protocol for IoT devices. It is lightweight, uses minimal bandwidth, and works well on unreliable networks. Running an MQTT broker on Talos Linux lets you manage IoT device communication through Kubernetes while keeping the underlying OS locked down and secure. This is particularly important for IoT gateways that sit at the edge of your network.

This guide covers deploying both Eclipse Mosquitto (lightweight) and EMQX (enterprise-grade) MQTT brokers on Talos Linux.

## Why MQTT on Talos Linux

IoT deployments often face security challenges. Devices connect from untrusted networks, and the broker handles potentially sensitive sensor data. Talos Linux's immutable OS means the broker infrastructure cannot be compromised at the OS level. Combined with MQTT's built-in TLS support and authentication, you get a secure messaging layer for your IoT fleet.

## Prerequisites

- Talos Linux cluster with at least one worker node
- `kubectl` and `talosctl` configured
- A StorageClass for message persistence
- Understanding of MQTT concepts (topics, QoS levels, retained messages)

## Option 1: Deploy Eclipse Mosquitto

Mosquitto is the most popular lightweight MQTT broker, perfect for small to medium IoT deployments.

### Step 1: Create Namespace and Configuration

```yaml
# mosquitto-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mqtt
---
# mosquitto-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mosquitto-config
  namespace: mqtt
data:
  mosquitto.conf: |
    # Listener configuration
    listener 1883
    protocol mqtt

    # WebSocket listener
    listener 9001
    protocol websockets

    # Persistence
    persistence true
    persistence_location /mosquitto/data/
    autosave_interval 60

    # Logging
    log_type all
    log_dest stdout

    # Authentication
    allow_anonymous false
    password_file /mosquitto/config/passwords

    # Connection limits
    max_connections 10000
    max_inflight_messages 100
    max_queued_messages 1000

    # Message size limit
    message_size_limit 1048576
  passwords: |
    device1:$7$101$password-hash-here
    device2:$7$101$password-hash-here
    admin:$7$101$password-hash-here
```

### Step 2: Generate Password File

```bash
# Create a temporary pod to generate the password file
kubectl run mosquitto-passwd --rm -it --restart=Never \
  --image=eclipse-mosquitto:2.0 \
  --namespace=mqtt \
  -- mosquitto_passwd -c -b /dev/stdout device1 device1-password

# Create the secret with hashed passwords
kubectl create secret generic mosquitto-passwords \
  --from-literal=passwords="$(kubectl run mosquitto-passwd --rm -it --restart=Never \
    --image=eclipse-mosquitto:2.0 --namespace=mqtt \
    -- sh -c 'mosquitto_passwd -c -b /dev/stdout device1 device1-pass && \
    mosquitto_passwd -b /dev/stdout admin admin-pass' 2>/dev/null)" \
  --namespace=mqtt
```

### Step 3: Deploy Mosquitto

```yaml
# mosquitto-deployment.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mosquitto
  namespace: mqtt
spec:
  serviceName: mosquitto
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
          image: eclipse-mosquitto:2.0
          ports:
            - containerPort: 1883
              name: mqtt
            - containerPort: 9001
              name: websocket
          volumeMounts:
            - name: mosquitto-config
              mountPath: /mosquitto/config/mosquitto.conf
              subPath: mosquitto.conf
            - name: mosquitto-data
              mountPath: /mosquitto/data
            - name: mosquitto-passwords
              mountPath: /mosquitto/config/passwords
              subPath: passwords
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "500m"
          livenessProbe:
            tcpSocket:
              port: 1883
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            tcpSocket:
              port: 1883
            initialDelaySeconds: 5
            periodSeconds: 5
      volumes:
        - name: mosquitto-config
          configMap:
            name: mosquitto-config
        - name: mosquitto-passwords
          secret:
            secretName: mosquitto-passwords
  volumeClaimTemplates:
    - metadata:
        name: mosquitto-data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: local-path
        resources:
          requests:
            storage: 5Gi
---
apiVersion: v1
kind: Service
metadata:
  name: mosquitto
  namespace: mqtt
spec:
  selector:
    app: mosquitto
  ports:
    - port: 1883
      targetPort: 1883
      name: mqtt
    - port: 9001
      targetPort: 9001
      name: websocket
  type: ClusterIP
```

```bash
kubectl apply -f mosquitto-namespace.yaml
kubectl apply -f mosquitto-config.yaml
kubectl apply -f mosquitto-deployment.yaml
```

### Step 4: Test Mosquitto

```bash
# Subscribe to a topic
kubectl run mqtt-sub --rm -it --restart=Never \
  --image=eclipse-mosquitto:2.0 --namespace=mqtt \
  -- mosquitto_sub -h mosquitto -t "sensors/#" -u admin -P admin-pass -v

# Publish a message (in another terminal)
kubectl run mqtt-pub --rm -it --restart=Never \
  --image=eclipse-mosquitto:2.0 --namespace=mqtt \
  -- mosquitto_pub -h mosquitto -t "sensors/temperature/room1" \
  -m '{"value": 22.5, "unit": "celsius"}' -u device1 -P device1-pass
```

## Option 2: Deploy EMQX (Enterprise-Grade)

For large-scale IoT deployments, EMQX supports millions of concurrent connections:

```bash
# Install the EMQX Operator
kubectl apply -f https://github.com/emqx/emqx-operator/releases/download/2.2.0/emqx-operator-controller.yaml
```

```yaml
# emqx-cluster.yaml
apiVersion: apps.emqx.io/v2beta1
kind: EMQX
metadata:
  name: emqx-cluster
  namespace: mqtt
spec:
  image: emqx:5.5
  coreTemplate:
    spec:
      replicas: 3
      resources:
        requests:
          memory: "1Gi"
          cpu: "500m"
        limits:
          memory: "2Gi"
      volumeClaimTemplates:
        storageClassName: local-path
        resources:
          requests:
            storage: 20Gi
        accessModes:
          - ReadWriteOnce
  replicantTemplate:
    spec:
      replicas: 2
      resources:
        requests:
          memory: "512Mi"
          cpu: "250m"
  listenersServiceTemplate:
    spec:
      type: ClusterIP
  dashboardServiceTemplate:
    spec:
      type: ClusterIP
```

```bash
kubectl apply -f emqx-cluster.yaml

# Access the EMQX dashboard
kubectl port-forward svc/emqx-cluster-dashboard -n mqtt 18083:18083
# Default credentials: admin / public
```

## Adding TLS to Your MQTT Broker

Secure MQTT communication with TLS:

```yaml
# mqtt-tls-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mosquitto-tls-config
  namespace: mqtt
data:
  mosquitto.conf: |
    # Standard MQTT listener (internal only)
    listener 1883 127.0.0.1
    protocol mqtt

    # TLS-secured MQTT listener
    listener 8883
    protocol mqtt
    certfile /mosquitto/certs/tls.crt
    keyfile /mosquitto/certs/tls.key
    cafile /mosquitto/certs/ca.crt
    tls_version tlsv1.2
    require_certificate false

    # TLS WebSocket listener
    listener 9443
    protocol websockets
    certfile /mosquitto/certs/tls.crt
    keyfile /mosquitto/certs/tls.key

    # Authentication and persistence
    allow_anonymous false
    password_file /mosquitto/config/passwords
    persistence true
    persistence_location /mosquitto/data/
```

Use cert-manager to generate and rotate TLS certificates automatically:

```yaml
# mqtt-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: mqtt-tls
  namespace: mqtt
spec:
  secretName: mqtt-tls-secret
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - mqtt.yourdomain.com
```

## MQTT Bridge to Kafka

For integrating IoT data with your event streaming platform, bridge MQTT to Kafka:

```yaml
# mqtt-kafka-bridge.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mqtt-kafka-bridge
  namespace: mqtt
spec:
  replicas: 2
  selector:
    matchLabels:
      app: mqtt-kafka-bridge
  template:
    metadata:
      labels:
        app: mqtt-kafka-bridge
    spec:
      containers:
        - name: bridge
          image: confluentinc/cp-kafka-connect:7.6.0
          env:
            - name: CONNECT_BOOTSTRAP_SERVERS
              value: "kafka-bootstrap.kafka.svc.cluster.local:9092"
            - name: CONNECT_GROUP_ID
              value: "mqtt-bridge"
```

## Monitoring MQTT

Track MQTT broker health with these metrics:

- Connected clients count
- Message throughput (messages/second)
- Subscription count
- Queue depth for QoS 1 and 2 messages
- Retained message count

```bash
# Mosquitto monitoring
kubectl exec -it mosquitto-0 -n mqtt -- mosquitto_sub \
  -h localhost -t '$SYS/#' -u admin -P admin-pass -v

# View specific system topics
# $SYS/broker/clients/connected - number of connected clients
# $SYS/broker/messages/received - total messages received
# $SYS/broker/uptime - broker uptime
```

## Conclusion

Running an MQTT broker on Talos Linux provides a secure foundation for IoT messaging. Eclipse Mosquitto is the right choice for smaller deployments with up to tens of thousands of connections, while EMQX handles millions of connections for enterprise IoT platforms. The key considerations are enabling TLS for all external connections, using proper authentication, setting appropriate QoS levels based on your data importance, and monitoring broker health. The immutable nature of Talos Linux adds an extra security layer that is particularly valuable for IoT infrastructure, where brokers often handle data from untrusted device networks.
