# How to Deploy Applications on OpenShift

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenShift, Kubernetes, DevOps, Containers, Red Hat, Deployment, CI/CD

Description: A practical guide to deploying applications on OpenShift, covering the oc CLI, deployment strategies, source-to-image builds, routes, configuration management, health checks, and scaling.

---

> OpenShift adds developer-friendly abstractions on top of Kubernetes, but understanding what happens beneath those abstractions is the key to production-ready deployments.

Red Hat OpenShift is an enterprise Kubernetes platform that streamlines application deployment with built-in CI/CD, enhanced security, and developer-friendly tooling. While it runs standard Kubernetes workloads, OpenShift provides additional resources like DeploymentConfigs, BuildConfigs, and Routes that simplify common patterns. This guide walks you through deploying applications on OpenShift from CLI basics to production-ready configurations.

## The oc CLI Basics

The `oc` command-line tool extends `kubectl` with OpenShift-specific features. If you know kubectl, you already know most of oc.

### Installation and Login

Download the oc CLI from your OpenShift cluster's web console or the Red Hat website. Once installed, authenticate to your cluster:

```bash
# Log in to an OpenShift cluster
oc login https://api.your-cluster.example.com:6443 --username=developer --password=secret

# Or use token-based authentication (common for CI/CD)
oc login --token=sha256~your-token --server=https://api.your-cluster.example.com:6443

# Verify your connection
oc whoami
oc cluster-info
```

### Project Management

OpenShift uses projects (namespaced Kubernetes namespaces with additional metadata) to organize resources:

```bash
# List available projects
oc projects

# Create a new project
oc new-project my-application --description="My production app" --display-name="My Application"

# Switch to a project
oc project my-application

# View resources in the current project
oc get all
```

### Essential Commands

```bash
# Create resources from YAML
oc apply -f deployment.yaml

# View pod logs
oc logs -f pod/my-app-1-abc123

# Execute commands in a running pod
oc exec -it pod/my-app-1-abc123 -- /bin/sh

# Port forward for local debugging
oc port-forward pod/my-app-1-abc123 8080:8080

# View events for troubleshooting
oc get events --sort-by='.lastTimestamp'

# Describe resources for detailed information
oc describe deployment my-app
```

## DeploymentConfig vs Deployment

OpenShift supports both the native Kubernetes `Deployment` resource and the OpenShift-specific `DeploymentConfig`. Understanding when to use each is important.

### Kubernetes Deployment

Use standard Deployments when you want portability across Kubernetes platforms or when you need features like proportional scaling during rollouts:

```yaml
# deployment.yaml
# Standard Kubernetes Deployment - portable across any K8s platform
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  labels:
    app: my-app
    # OpenShift uses app.kubernetes.io labels for console grouping
    app.kubernetes.io/name: my-app
    app.kubernetes.io/component: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  # Strategy controls how updates are rolled out
  strategy:
    type: RollingUpdate
    rollingUpdate:
      # Allow 1 extra pod during updates for zero-downtime
      maxSurge: 1
      # Always keep at least 2 pods running
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          # Use internal registry or external images
          image: image-registry.openshift-image-registry.svc:5000/my-project/my-app:latest
          ports:
            - containerPort: 8080
              protocol: TCP
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
```

### OpenShift DeploymentConfig

DeploymentConfigs offer OpenShift-native features like automatic triggers from ImageStreams and lifecycle hooks:

```yaml
# deploymentconfig.yaml
# OpenShift DeploymentConfig - tighter integration with OpenShift features
apiVersion: apps.openshift.io/v1
kind: DeploymentConfig
metadata:
  name: my-app
  labels:
    app: my-app
spec:
  replicas: 3
  selector:
    app: my-app
  # Triggers automatically redeploy when conditions are met
  triggers:
    # Redeploy when the ImageStream tag changes (after a new build)
    - type: ImageChange
      imageChangeParams:
        automatic: true
        containerNames:
          - my-app
        from:
          kind: ImageStreamTag
          name: my-app:latest
    # Redeploy when the DeploymentConfig itself changes
    - type: ConfigChange
  strategy:
    type: Rolling
    rollingParams:
      intervalSeconds: 1
      maxSurge: 25%
      maxUnavailable: 25%
      timeoutSeconds: 600
      updatePeriodSeconds: 1
    # Lifecycle hooks run commands at deployment stages
    resources: {}
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          # Reference ImageStream instead of direct image URL
          image: ' '
          # The actual image is injected by the ImageChange trigger
          ports:
            - containerPort: 8080
              protocol: TCP
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
```

### When to Choose Each

Use **Deployment** when:
- You need portability to other Kubernetes platforms
- You want to use newer features like proportional pod scaling
- You are following GitOps practices with tools like ArgoCD

Use **DeploymentConfig** when:
- You want automatic redeployment when ImageStreams update
- You need lifecycle hooks (pre/post deployment commands)
- You are using OpenShift's built-in build system exclusively

## Source-to-Image Builds

Source-to-Image (S2I) is OpenShift's mechanism for building container images directly from source code without writing Dockerfiles. It combines source code with builder images to produce runnable images.

### Creating a Build from Source

```bash
# Create an application from a Git repository using S2I
# OpenShift detects the language and selects an appropriate builder
oc new-app https://github.com/your-org/your-nodejs-app.git --name=my-node-app

# Specify a builder image explicitly
oc new-app nodejs:18-ubi8~https://github.com/your-org/your-nodejs-app.git --name=my-node-app

# Build from a private repository
oc new-app nodejs:18-ubi8~git@github.com:your-org/private-repo.git \
  --source-secret=my-git-secret \
  --name=my-node-app
```

### BuildConfig Resource

For more control, define a BuildConfig:

```yaml
# buildconfig.yaml
# BuildConfig defines how source code becomes a container image
apiVersion: build.openshift.io/v1
kind: BuildConfig
metadata:
  name: my-app
  labels:
    app: my-app
spec:
  # How many builds to retain for history
  successfulBuildsHistoryLimit: 5
  failedBuildsHistoryLimit: 3
  # Where to push the resulting image
  output:
    to:
      kind: ImageStreamTag
      name: my-app:latest
  # What triggers a new build
  triggers:
    # Build when source code changes (via webhook)
    - type: GitHub
      github:
        secret: my-webhook-secret
    # Build when the builder image updates
    - type: ImageChange
      imageChange: {}
    # Allow manual builds
    - type: ConfigChange
  # Build strategy: Source, Docker, or Custom
  strategy:
    type: Source
    sourceStrategy:
      from:
        kind: ImageStreamTag
        # Use Red Hat's Node.js 18 UBI image as the builder
        name: nodejs:18-ubi8
        namespace: openshift
      # Environment variables available during build
      env:
        - name: NPM_RUN
          value: build
        - name: NODE_ENV
          value: production
  # Where to get the source code
  source:
    type: Git
    git:
      uri: https://github.com/your-org/your-app.git
      ref: main
    # Path within repo if not at root
    contextDir: /
  # Resource limits for the build pod
  resources:
    limits:
      cpu: '1'
      memory: 2Gi
    requests:
      cpu: 500m
      memory: 1Gi
```

### ImageStream

ImageStreams track image versions and enable automatic deployments:

```yaml
# imagestream.yaml
# ImageStream tracks image tags and triggers deployments on changes
apiVersion: image.openshift.io/v1
kind: ImageStream
metadata:
  name: my-app
  labels:
    app: my-app
spec:
  # Optional: configure lookup policy for local resolution
  lookupPolicy:
    # When true, pods can reference this ImageStream by name
    local: true
  # Tags can point to external registries or be populated by builds
  tags:
    - name: latest
      # Optionally import from an external registry
      from:
        kind: DockerImage
        name: docker.io/library/nginx:latest
      # How often to check for updates
      importPolicy:
        scheduled: true
      # Reference policy controls how the image is resolved
      referencePolicy:
        type: Local
```

### Triggering and Monitoring Builds

```bash
# Start a build manually
oc start-build my-app

# Start a build and follow the logs
oc start-build my-app --follow

# View build logs
oc logs -f build/my-app-1

# List builds
oc get builds

# Cancel a running build
oc cancel-build my-app-1
```

## Routes and Ingress

Routes expose your applications to external traffic. They are OpenShift's native ingress mechanism.

### Basic Route

```yaml
# route.yaml
# Route exposes a Service to external traffic via the OpenShift router
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: my-app
  labels:
    app: my-app
spec:
  # Hostname for the route (optional - auto-generated if omitted)
  host: my-app.apps.your-cluster.example.com
  # Which Service to route traffic to
  to:
    kind: Service
    name: my-app
    weight: 100
  # Which port on the Service
  port:
    targetPort: 8080
  # TLS configuration for HTTPS
  tls:
    # edge: TLS terminates at the router
    # passthrough: TLS passes through to the pod
    # reencrypt: router decrypts and re-encrypts to pod
    termination: edge
    # Redirect HTTP to HTTPS
    insecureEdgeTerminationPolicy: Redirect
  # Optional: use a wildcard policy
  wildcardPolicy: None
```

### Route with Custom Certificates

```yaml
# route-custom-tls.yaml
# Route with custom TLS certificate
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: my-app-secure
  labels:
    app: my-app
spec:
  host: secure.example.com
  to:
    kind: Service
    name: my-app
    weight: 100
  port:
    targetPort: 8080
  tls:
    termination: edge
    insecureEdgeTerminationPolicy: Redirect
    # Inline certificate and key (or use secrets)
    certificate: |
      -----BEGIN CERTIFICATE-----
      your-certificate-here
      -----END CERTIFICATE-----
    key: |
      -----BEGIN RSA PRIVATE KEY-----
      your-private-key-here
      -----END RSA PRIVATE KEY-----
    # Optional: CA certificate for chain
    caCertificate: |
      -----BEGIN CERTIFICATE-----
      ca-certificate-here
      -----END CERTIFICATE-----
```

### A/B Testing with Routes

```yaml
# route-ab-testing.yaml
# Route traffic between two services for A/B testing
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: my-app-ab
  labels:
    app: my-app
  annotations:
    # Optional annotations for router behavior
    haproxy.router.openshift.io/balance: roundrobin
spec:
  host: my-app.apps.your-cluster.example.com
  to:
    kind: Service
    name: my-app-v1
    # 90% of traffic goes to v1
    weight: 90
  # Additional backends for traffic splitting
  alternateBackends:
    - kind: Service
      name: my-app-v2
      # 10% of traffic goes to v2
      weight: 10
  port:
    targetPort: 8080
  tls:
    termination: edge
    insecureEdgeTerminationPolicy: Redirect
```

## ConfigMaps and Secrets

ConfigMaps and Secrets externalize configuration from your container images, enabling the same image to run in different environments.

### ConfigMap

```yaml
# configmap.yaml
# ConfigMap stores non-sensitive configuration data
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-app-config
  labels:
    app: my-app
data:
  # Simple key-value pairs
  LOG_LEVEL: info
  MAX_CONNECTIONS: '100'
  FEATURE_FLAGS: 'dark-mode,beta-api'

  # Entire configuration files
  app.properties: |
    server.port=8080
    server.context-path=/api
    logging.level.root=INFO
    spring.datasource.hikari.maximum-pool-size=10

  nginx.conf: |
    worker_processes auto;
    events {
        worker_connections 1024;
    }
    http {
        server {
            listen 8080;
            location / {
                proxy_pass http://localhost:3000;
            }
        }
    }
```

### Secret

```yaml
# secret.yaml
# Secret stores sensitive data (encoded in base64)
apiVersion: v1
kind: Secret
metadata:
  name: my-app-secrets
  labels:
    app: my-app
# Opaque is the default type for arbitrary secrets
type: Opaque
# stringData accepts plain text (converted to base64 automatically)
stringData:
  DATABASE_URL: postgresql://user:password@db.example.com:5432/myapp
  API_KEY: your-api-key-here
  JWT_SECRET: your-jwt-secret-here
# data accepts pre-encoded base64 values
# data:
#   DATABASE_URL: cG9zdGdyZXNxbDovL3VzZXI6cGFzc3dvcmRAZGIuZXhhbXBsZS5jb206NTQzMi9teWFwcA==
```

### Using ConfigMaps and Secrets in Deployments

```yaml
# deployment-with-config.yaml
# Deployment showing various ways to consume ConfigMaps and Secrets
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  labels:
    app: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: image-registry.openshift-image-registry.svc:5000/my-project/my-app:latest
          ports:
            - containerPort: 8080
          # Method 1: Individual environment variables from ConfigMap/Secret
          env:
            - name: LOG_LEVEL
              valueFrom:
                configMapKeyRef:
                  name: my-app-config
                  key: LOG_LEVEL
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: my-app-secrets
                  key: DATABASE_URL
          # Method 2: All keys from ConfigMap/Secret as environment variables
          envFrom:
            - configMapRef:
                name: my-app-config
            - secretRef:
                name: my-app-secrets
          # Method 3: Mount as files
          volumeMounts:
            # Mount configuration file
            - name: config-volume
              mountPath: /etc/config
              readOnly: true
            # Mount secrets as files
            - name: secrets-volume
              mountPath: /etc/secrets
              readOnly: true
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
      volumes:
        # ConfigMap volume
        - name: config-volume
          configMap:
            name: my-app-config
            # Optional: select specific keys
            items:
              - key: app.properties
                path: app.properties
              - key: nginx.conf
                path: nginx.conf
        # Secret volume
        - name: secrets-volume
          secret:
            secretName: my-app-secrets
            # Set file permissions (important for security)
            defaultMode: 0400
```

## Health Checks

Health checks enable OpenShift to detect and recover from application failures automatically. Configure three types of probes for robust deployments.

### Probe Types

```yaml
# deployment-health-checks.yaml
# Deployment with comprehensive health check configuration
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  labels:
    app: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: image-registry.openshift-image-registry.svc:5000/my-project/my-app:latest
          ports:
            - containerPort: 8080

          # LIVENESS PROBE: Is the container running?
          # Failure triggers container restart
          # Use for detecting deadlocks or hung processes
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
              # Optional headers for authenticated endpoints
              httpHeaders:
                - name: X-Health-Check
                  value: liveness
            # Wait before starting probes (give app time to start)
            initialDelaySeconds: 30
            # How often to probe
            periodSeconds: 10
            # Seconds to wait for a response
            timeoutSeconds: 5
            # Consecutive failures before restarting
            failureThreshold: 3
            # Consecutive successes to be considered healthy
            successThreshold: 1

          # READINESS PROBE: Is the container ready to serve traffic?
          # Failure removes pod from Service endpoints
          # Use for checking dependencies (database, cache)
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
            successThreshold: 1

          # STARTUP PROBE: Has the container started successfully?
          # Disables liveness/readiness until success
          # Use for slow-starting applications
          startupProbe:
            httpGet:
              path: /health/started
              port: 8080
            # Allow up to 5 minutes for startup (30 * 10 seconds)
            initialDelaySeconds: 0
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 30
            successThreshold: 1

          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
```

### Alternative Probe Methods

```yaml
# probes-alternatives.yaml
# Different probe methods for various application types
spec:
  containers:
    - name: my-app
      # TCP Socket probe - useful when no HTTP endpoint available
      livenessProbe:
        tcpSocket:
          port: 8080
        initialDelaySeconds: 15
        periodSeconds: 10

      # Exec probe - runs a command inside the container
      readinessProbe:
        exec:
          command:
            - /bin/sh
            - -c
            # Check if a file exists or run a script
            - test -f /tmp/ready && cat /tmp/ready | grep -q "true"
        initialDelaySeconds: 5
        periodSeconds: 5

      # gRPC probe - for gRPC services (Kubernetes 1.24+)
      # livenessProbe:
      #   grpc:
      #     port: 50051
      #     service: my.health.v1.Health
      #   initialDelaySeconds: 10
      #   periodSeconds: 10
```

### Health Check Endpoints Implementation

Your application should implement appropriate health endpoints. Here is a Node.js example:

```javascript
// health.js - Example health check endpoints
const express = require('express');
const router = express.Router();

// Track application state
let isReady = false;
let startupComplete = false;

// Simulate startup tasks
setTimeout(() => {
  startupComplete = true;
  console.log('Startup complete');
}, 5000);

// Simulate readiness (e.g., database connection)
setTimeout(() => {
  isReady = true;
  console.log('Application ready');
}, 10000);

// Liveness - is the process running and not deadlocked?
router.get('/health/live', (req, res) => {
  // Simple check - if we can respond, we are alive
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

// Readiness - can we serve traffic?
router.get('/health/ready', async (req, res) => {
  if (!isReady) {
    return res.status(503).json({ status: 'not ready', reason: 'initializing' });
  }

  // Check dependencies
  try {
    await checkDatabase();
    await checkCache();
    res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'not ready', reason: error.message });
  }
});

// Startup - has initial startup completed?
router.get('/health/started', (req, res) => {
  if (startupComplete) {
    res.status(200).json({ status: 'started' });
  } else {
    res.status(503).json({ status: 'starting' });
  }
});

module.exports = router;
```

## Scaling Applications

OpenShift supports manual scaling, horizontal pod autoscaling, and vertical pod autoscaling.

### Manual Scaling

```bash
# Scale a Deployment
oc scale deployment/my-app --replicas=5

# Scale a DeploymentConfig
oc scale dc/my-app --replicas=5

# Scale to zero (for cost savings or maintenance)
oc scale deployment/my-app --replicas=0
```

### Horizontal Pod Autoscaler

```yaml
# hpa.yaml
# HorizontalPodAutoscaler automatically scales pods based on metrics
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app
  labels:
    app: my-app
spec:
  # Target the Deployment to scale
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  # Scaling boundaries
  minReplicas: 2
  maxReplicas: 10
  # Metrics that trigger scaling
  metrics:
    # Scale based on CPU utilization
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          # Scale up when average CPU exceeds 70%
          averageUtilization: 70
    # Scale based on memory utilization
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  # Behavior controls scaling speed
  behavior:
    scaleDown:
      # Wait 5 minutes before scaling down
      stabilizationWindowSeconds: 300
      policies:
        # Scale down at most 2 pods per minute
        - type: Pods
          value: 2
          periodSeconds: 60
    scaleUp:
      # React quickly to increased load
      stabilizationWindowSeconds: 0
      policies:
        # Scale up at most 4 pods per 15 seconds
        - type: Pods
          value: 4
          periodSeconds: 15
        # Or scale up 100% per 15 seconds
        - type: Percent
          value: 100
          periodSeconds: 15
      # Use the policy that allows the most change
      selectPolicy: Max
```

### Resource Requests and Limits

Proper resource configuration is essential for autoscaling and cluster stability:

```yaml
# deployment-resources.yaml
# Deployment with carefully tuned resource specifications
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  labels:
    app: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: my-app:latest
          ports:
            - containerPort: 8080
          resources:
            # Requests: guaranteed resources for scheduling
            requests:
              # 100 millicores (0.1 CPU core)
              cpu: 100m
              # 256 MiB of memory
              memory: 256Mi
            # Limits: maximum resources the container can use
            limits:
              # 500 millicores (0.5 CPU core)
              cpu: 500m
              # 512 MiB of memory (OOMKilled if exceeded)
              memory: 512Mi
          # Optional: set QoS class to Guaranteed
          # (requires requests == limits)
```

### Monitoring Autoscaling

```bash
# View HPA status
oc get hpa my-app

# Watch HPA metrics in real time
oc get hpa my-app --watch

# Describe HPA for detailed metrics and events
oc describe hpa my-app

# View pod resource usage
oc adm top pods

# View node resource usage
oc adm top nodes
```

## Best Practices Summary

When deploying applications on OpenShift, follow these guidelines for production-ready systems:

**Use Standard Kubernetes Resources When Possible**
- Prefer Deployments over DeploymentConfigs for portability
- Use native Ingress alongside Routes if multi-platform support matters
- Keep configurations compatible with vanilla Kubernetes for flexibility

**Implement Comprehensive Health Checks**
- Always configure liveness and readiness probes
- Use startup probes for slow-starting applications
- Set appropriate timeouts and thresholds to avoid flapping

**Externalize Configuration**
- Store configuration in ConfigMaps, not in images
- Keep secrets in Secrets resources, never in code or ConfigMaps
- Use environment variables for simple values, volume mounts for files

**Set Resource Requests and Limits**
- Always specify both requests and limits
- Base values on actual measured usage, not guesses
- Leave headroom for traffic spikes

**Secure Your Routes**
- Use TLS termination (edge or reencrypt)
- Redirect HTTP to HTTPS
- Use custom certificates for production domains

**Plan for Scaling**
- Configure HPA for variable workloads
- Set appropriate min/max replica counts
- Use Pod Disruption Budgets to maintain availability during updates

**Leverage OpenShift Features**
- Use ImageStreams for automatic deployment on build completion
- Configure build triggers for CI/CD workflows
- Take advantage of the integrated registry

**Monitor and Observe**
- Export metrics to monitoring systems
- Set up alerts for health check failures and resource exhaustion
- Use structured logging for easier troubleshooting

For monitoring your OpenShift deployments with comprehensive observability, including uptime monitoring, incident management, and status pages, explore [OneUptime](https://oneuptime.com). OneUptime integrates with Kubernetes and OpenShift to provide real-time visibility into your application health and performance.
