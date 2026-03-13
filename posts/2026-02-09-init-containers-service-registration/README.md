# How to Use Init Containers to Register Service with External Discovery Systems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Init Containers, Service Discovery

Description: Learn how to use init containers to register pods with external service discovery systems like Consul, etcd, or custom registries before application startup.

---

Service discovery is critical in microservices architectures, but not all discovery systems are Kubernetes-native. When you need to integrate with external service registries like HashiCorp Consul, etcd, or custom discovery platforms, init containers provide an elegant solution for registration before your application starts serving traffic.

Init containers run before main application containers and can perform essential setup tasks like registering service endpoints, validating connectivity, and ensuring the discovery system has current information. This ensures your service is properly registered before it begins processing requests.

## Why Use Init Containers for Service Registration

Traditional approaches often handle registration inside the application or through separate deployment steps. Embedding registration logic in the application couples service discovery to business logic. Using init containers separates these concerns and ensures registration happens consistently across all services.

Init containers guarantee that registration completes before the application starts. If registration fails, Kubernetes won't start your application containers. This prevents scenarios where applications run without being discoverable, which can cause traffic routing issues.

The pattern also supports hybrid architectures where some services run in Kubernetes while others exist outside the cluster. External discovery systems bridge these environments, and init container registration ensures consistent service visibility.

## Registering with HashiCorp Consul

Consul is a popular service mesh and discovery platform. This example shows how to register a Kubernetes service with Consul before the application starts.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: consul-registration-script
  namespace: default
data:
  register.sh: |
    #!/bin/sh
    set -e

    # Service registration payload
    cat > /tmp/service.json << EOF
    {
      "ID": "${POD_NAME}",
      "Name": "${SERVICE_NAME}",
      "Address": "${POD_IP}",
      "Port": ${SERVICE_PORT},
      "Tags": ["${ENVIRONMENT}", "kubernetes"],
      "Meta": {
        "namespace": "${POD_NAMESPACE}",
        "pod": "${POD_NAME}",
        "version": "${SERVICE_VERSION}"
      },
      "Check": {
        "HTTP": "http://${POD_IP}:${SERVICE_PORT}/health",
        "Interval": "10s",
        "Timeout": "5s"
      }
    }
    EOF

    # Register with Consul
    echo "Registering service with Consul..."
    response=$(curl -s -w "%{http_code}" -o /tmp/response.txt \
      -X PUT \
      -d @/tmp/service.json \
      ${CONSUL_HTTP_ADDR}/v1/agent/service/register)

    if [ "$response" = "200" ]; then
      echo "Successfully registered service: ${SERVICE_NAME}"
      cat /tmp/response.txt
    else
      echo "Failed to register service. HTTP status: $response"
      cat /tmp/response.txt
      exit 1
    fi

    # Verify registration
    echo "Verifying service registration..."
    curl -s ${CONSUL_HTTP_ADDR}/v1/agent/services | grep -q "${POD_NAME}" || exit 1
    echo "Service registration verified"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-service
  template:
    metadata:
      labels:
        app: api-service
    spec:
      initContainers:
      - name: consul-registration
        image: alpine:3.18
        command:
        - sh
        - /scripts/register.sh
        env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: POD_IP
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
        - name: SERVICE_NAME
          value: "api-service"
        - name: SERVICE_PORT
          value: "8080"
        - name: SERVICE_VERSION
          value: "v1.2.0"
        - name: ENVIRONMENT
          value: "production"
        - name: CONSUL_HTTP_ADDR
          value: "http://consul.service-mesh.svc.cluster.local:8500"
        volumeMounts:
        - name: registration-script
          mountPath: /scripts

      containers:
      - name: api
        image: myorg/api-service:v1.2.0
        ports:
        - containerPort: 8080
          name: http
        lifecycle:
          preStop:
            exec:
              command:
              - sh
              - -c
              - |
                # Deregister from Consul on shutdown
                curl -X PUT \
                  ${CONSUL_HTTP_ADDR}/v1/agent/service/deregister/${POD_NAME}
        env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: CONSUL_HTTP_ADDR
          value: "http://consul.service-mesh.svc.cluster.local:8500"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

      volumes:
      - name: registration-script
        configMap:
          name: consul-registration-script
          defaultMode: 0755
```

The init container constructs a service registration payload with pod metadata and health check configuration. It registers with Consul and verifies the registration succeeded before allowing the application to start. The preStop hook ensures deregistration when the pod terminates.

## Registering with etcd for Custom Discovery

For custom service discovery systems built on etcd, init containers can write service metadata to specific keys.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: etcd-registration-script
  namespace: default
data:
  register.sh: |
    #!/bin/sh
    set -e

    # Install etcdctl
    apk add --no-cache curl
    ETCD_VER=v3.5.10
    curl -L https://github.com/etcd-io/etcd/releases/download/${ETCD_VER}/etcd-${ETCD_VER}-linux-amd64.tar.gz \
      | tar xz --strip-components=1 -C /usr/local/bin etcd-${ETCD_VER}-linux-amd64/etcdctl

    # Service key path
    SERVICE_KEY="/services/${SERVICE_NAME}/${POD_NAME}"

    # Service metadata
    SERVICE_DATA=$(cat <<EOF
    {
      "id": "${POD_NAME}",
      "name": "${SERVICE_NAME}",
      "address": "${POD_IP}",
      "port": ${SERVICE_PORT},
      "tags": ["${ENVIRONMENT}"],
      "metadata": {
        "namespace": "${POD_NAMESPACE}",
        "cluster": "${CLUSTER_NAME}",
        "version": "${SERVICE_VERSION}"
      },
      "health_check_url": "http://${POD_IP}:${SERVICE_PORT}/health",
      "registered_at": "$(date -Iseconds)"
    }
    EOF
    )

    echo "Registering service in etcd..."
    echo "Key: ${SERVICE_KEY}"

    # Write service data to etcd with TTL
    etcdctl \
      --endpoints=${ETCD_ENDPOINTS} \
      --user=${ETCD_USER}:${ETCD_PASSWORD} \
      put ${SERVICE_KEY} "${SERVICE_DATA}" \
      --lease=$(etcdctl --endpoints=${ETCD_ENDPOINTS} --user=${ETCD_USER}:${ETCD_PASSWORD} lease grant 60 | cut -d' ' -f2)

    # Verify registration
    echo "Verifying registration..."
    registered=$(etcdctl \
      --endpoints=${ETCD_ENDPOINTS} \
      --user=${ETCD_USER}:${ETCD_PASSWORD} \
      get ${SERVICE_KEY} --print-value-only)

    if [ -z "$registered" ]; then
      echo "Failed to verify registration"
      exit 1
    fi

    echo "Service registered successfully"
    echo "$registered"
---
apiVersion: v1
kind: Secret
metadata:
  name: etcd-credentials
  namespace: default
type: Opaque
stringData:
  username: "service-registry"
  password: "secure-password-here"
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: worker-service
  namespace: default
spec:
  serviceName: worker-service
  replicas: 3
  selector:
    matchLabels:
      app: worker-service
  template:
    metadata:
      labels:
        app: worker-service
    spec:
      initContainers:
      - name: etcd-registration
        image: alpine:3.18
        command:
        - sh
        - /scripts/register.sh
        env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: POD_IP
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
        - name: SERVICE_NAME
          value: "worker-service"
        - name: SERVICE_PORT
          value: "8080"
        - name: SERVICE_VERSION
          value: "v2.0.0"
        - name: ENVIRONMENT
          value: "production"
        - name: CLUSTER_NAME
          value: "us-east-1-prod"
        - name: ETCD_ENDPOINTS
          value: "http://etcd-0.etcd.default.svc.cluster.local:2379,http://etcd-1.etcd.default.svc.cluster.local:2379,http://etcd-2.etcd.default.svc.cluster.local:2379"
        - name: ETCD_USER
          valueFrom:
            secretKeyRef:
              name: etcd-credentials
              key: username
        - name: ETCD_PASSWORD
          valueFrom:
            secretKeyRef:
              name: etcd-credentials
              key: password
        volumeMounts:
        - name: registration-script
          mountPath: /scripts

      containers:
      - name: worker
        image: myorg/worker-service:v2.0.0
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"

      volumes:
      - name: registration-script
        configMap:
          name: etcd-registration-script
          defaultMode: 0755
```

This init container registers the service in etcd with a TTL-based lease. A sidecar container (not shown) would need to periodically refresh the lease to maintain registration while the pod runs.

## Registering with Custom REST API Discovery Service

Many organizations build custom service discovery systems. Init containers can register with these via REST APIs.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-registration-script
  namespace: default
data:
  register.sh: |
    #!/bin/sh
    set -e

    echo "Preparing service registration..."

    # Build registration payload
    PAYLOAD=$(cat <<EOF
    {
      "service": {
        "name": "${SERVICE_NAME}",
        "instance_id": "${POD_NAME}",
        "environment": "${ENVIRONMENT}",
        "region": "${REGION}",
        "endpoints": [
          {
            "protocol": "http",
            "address": "${POD_IP}",
            "port": ${SERVICE_PORT},
            "health_check_path": "/health"
          }
        ],
        "metadata": {
          "namespace": "${POD_NAMESPACE}",
          "deployment": "${DEPLOYMENT_NAME}",
          "version": "${SERVICE_VERSION}",
          "team": "${TEAM_NAME}"
        },
        "capabilities": ["api", "grpc"],
        "dependencies": [
          "database-service",
          "cache-service"
        ]
      }
    }
    EOF
    )

    # Register with discovery API
    echo "Registering with discovery service..."
    response=$(curl -s -w "\n%{http_code}" \
      -X POST \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${DISCOVERY_API_TOKEN}" \
      -d "${PAYLOAD}" \
      ${DISCOVERY_API_URL}/api/v1/services/register)

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
      echo "Successfully registered service"
      echo "$body"

      # Store registration ID for deregistration
      registration_id=$(echo "$body" | grep -o '"registration_id":"[^"]*"' | cut -d'"' -f4)
      echo "$registration_id" > /shared/registration-id.txt
    else
      echo "Registration failed with HTTP $http_code"
      echo "$body"
      exit 1
    fi

    # Wait for service to be visible in discovery
    echo "Waiting for service to appear in directory..."
    max_attempts=10
    attempt=0

    while [ $attempt -lt $max_attempts ]; do
      attempt=$((attempt + 1))

      response=$(curl -s -w "%{http_code}" -o /tmp/check.txt \
        -H "Authorization: Bearer ${DISCOVERY_API_TOKEN}" \
        ${DISCOVERY_API_URL}/api/v1/services/${SERVICE_NAME}/instances/${POD_NAME})

      if [ "$response" = "200" ]; then
        echo "Service is now visible in discovery"
        exit 0
      fi

      echo "Attempt $attempt/$max_attempts: Service not yet visible, waiting..."
      sleep 2
    done

    echo "Service did not appear in discovery within timeout"
    exit 1
---
apiVersion: v1
kind: Secret
metadata:
  name: discovery-api-credentials
  namespace: default
type: Opaque
stringData:
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: microservice-app
  namespace: default
spec:
  replicas: 4
  selector:
    matchLabels:
      app: microservice-app
  template:
    metadata:
      labels:
        app: microservice-app
    spec:
      initContainers:
      - name: discovery-registration
        image: alpine:3.18
        command:
        - sh
        - /scripts/register.sh
        env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: POD_IP
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
        - name: SERVICE_NAME
          value: "microservice-app"
        - name: SERVICE_PORT
          value: "8080"
        - name: SERVICE_VERSION
          value: "v3.1.0"
        - name: DEPLOYMENT_NAME
          value: "microservice-app"
        - name: ENVIRONMENT
          value: "production"
        - name: REGION
          value: "us-west-2"
        - name: TEAM_NAME
          value: "platform-team"
        - name: DISCOVERY_API_URL
          value: "https://discovery.internal.example.com"
        - name: DISCOVERY_API_TOKEN
          valueFrom:
            secretKeyRef:
              name: discovery-api-credentials
              key: token
        volumeMounts:
        - name: registration-script
          mountPath: /scripts
        - name: shared-data
          mountPath: /shared

      containers:
      - name: app
        image: myorg/microservice-app:v3.1.0
        ports:
        - containerPort: 8080
        lifecycle:
          preStop:
            exec:
              command:
              - sh
              - -c
              - |
                # Deregister from discovery service
                if [ -f /shared/registration-id.txt ]; then
                  registration_id=$(cat /shared/registration-id.txt)
                  curl -X DELETE \
                    -H "Authorization: Bearer ${DISCOVERY_API_TOKEN}" \
                    ${DISCOVERY_API_URL}/api/v1/services/registrations/${registration_id}
                fi
        env:
        - name: DISCOVERY_API_URL
          value: "https://discovery.internal.example.com"
        - name: DISCOVERY_API_TOKEN
          valueFrom:
            secretKeyRef:
              name: discovery-api-credentials
              key: token
        volumeMounts:
        - name: shared-data
          mountPath: /shared
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

      volumes:
      - name: registration-script
        configMap:
          name: api-registration-script
          defaultMode: 0755
      - name: shared-data
        emptyDir: {}
```

The init container registers with a custom REST API and stores the registration ID in a shared volume. The main container's preStop hook uses this ID for cleanup when the pod terminates.

## Handling Registration Failures and Retries

Init containers should implement robust error handling and retry logic for registration operations.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: resilient-registration-script
  namespace: default
data:
  register.sh: |
    #!/bin/sh
    set -e

    MAX_RETRIES=5
    RETRY_DELAY=5
    attempt=0

    register_service() {
      echo "Attempt $((attempt + 1))/$MAX_RETRIES: Registering service..."

      response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"${SERVICE_NAME}\",\"ip\":\"${POD_IP}\",\"port\":${SERVICE_PORT}}" \
        ${REGISTRY_URL}/register 2>&1)

      http_code=$(echo "$response" | tail -n1)

      if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo "Service registered successfully"
        return 0
      else
        echo "Registration failed with HTTP $http_code"
        echo "$response"
        return 1
      fi
    }

    # Retry loop
    while [ $attempt -lt $MAX_RETRIES ]; do
      attempt=$((attempt + 1))

      if register_service; then
        echo "Registration successful on attempt $attempt"
        exit 0
      fi

      if [ $attempt -lt $MAX_RETRIES ]; then
        echo "Retrying in ${RETRY_DELAY} seconds..."
        sleep $RETRY_DELAY
      fi
    done

    echo "Failed to register service after $MAX_RETRIES attempts"
    exit 1
```

This script implements exponential backoff and multiple retry attempts, making registration more resilient to temporary network issues or registry unavailability.

## Validating Discovery System Connectivity

Before attempting registration, init containers can validate connectivity to the discovery system.

```yaml
initContainers:
- name: validate-discovery-connectivity
  image: busybox:1.36
  command:
  - sh
  - -c
  - |
    echo "Validating connectivity to discovery service..."

    # DNS resolution check
    if ! nslookup ${DISCOVERY_HOST} >/dev/null 2>&1; then
      echo "Failed to resolve ${DISCOVERY_HOST}"
      exit 1
    fi
    echo "DNS resolution successful"

    # TCP connectivity check
    if ! nc -zv ${DISCOVERY_HOST} ${DISCOVERY_PORT} 2>&1; then
      echo "Failed to connect to ${DISCOVERY_HOST}:${DISCOVERY_PORT}"
      exit 1
    fi
    echo "TCP connection successful"

    # HTTP health check
    if ! wget -q -O /dev/null ${DISCOVERY_URL}/health; then
      echo "Discovery service health check failed"
      exit 1
    fi
    echo "Discovery service is healthy"

    echo "All connectivity checks passed"
  env:
  - name: DISCOVERY_HOST
    value: "discovery.example.com"
  - name: DISCOVERY_PORT
    value: "443"
  - name: DISCOVERY_URL
    value: "https://discovery.example.com"

- name: register-service
  image: alpine:3.18
  # Registration logic here
```

This validation init container runs before registration, ensuring the discovery system is reachable before attempting registration operations.

## Conclusion

Using init containers for service registration with external discovery systems provides a clean separation of concerns between registration logic and application code. This pattern ensures services are properly registered before they start serving traffic, supports hybrid architectures, and provides consistent registration behavior across all services. By implementing proper error handling and validation, you can build reliable service registration that integrates seamlessly with existing discovery infrastructure.
