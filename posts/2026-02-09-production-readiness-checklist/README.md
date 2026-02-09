# How to Build a Kubernetes Production Readiness Checklist for Application Teams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Production, Best Practices

Description: Learn how to create a comprehensive production readiness checklist for Kubernetes applications covering reliability, security, observability, and operational requirements.

---

Moving applications to production requires more than making them work in development. Production readiness ensures applications can handle real-world load, failures, and operational requirements. A comprehensive checklist helps teams consistently deploy reliable, secure, and maintainable applications.

## Core Application Requirements

Applications must meet basic functional requirements before production deployment. Define clear service level objectives for availability, latency, and throughput. Document dependencies on other services, databases, and external APIs. Establish resource requirements based on load testing.

Test the application under realistic production scenarios. Synthetic development load doesn't reveal issues that appear under actual user patterns. Run sustained load tests for hours or days to catch memory leaks and performance degradation.

## Resource Configuration

Set appropriate resource requests and limits for all containers. Requests reserve capacity for your workload, while limits prevent resource overconsumption.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: production-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: app
        image: myapp:2.0
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            # No CPU limit to allow bursting
        ports:
        - containerPort: 8080
          name: http
```

Base resource requests on profiled usage under load. Add 20-30% headroom for growth and traffic spikes. Set memory limits but consider omitting CPU limits to allow bursting.

## Health Checks and Probes

Implement proper health checks so Kubernetes can manage your application lifecycle.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: production-app
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:2.0
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
        startupProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 0
          periodSeconds: 5
          failureThreshold: 30  # 150 seconds total
```

Liveness probes detect crashed or deadlocked applications. Readiness probes determine if the application can handle traffic. Startup probes handle slow-starting applications without making liveness probe too lenient.

## Graceful Shutdown

Handle termination signals properly to complete in-flight requests before shutdown.

```javascript
// Node.js graceful shutdown example
const express = require('express');
const app = express();

const server = app.listen(8080, () => {
  console.log('Server started on port 8080');
});

// Handle termination signals
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');

  server.close(() => {
    console.log('HTTP server closed');

    // Close database connections
    closeDatabase();

    // Exit after cleanup
    process.exit(0);
  });

  // Force shutdown after timeout
  setTimeout(() => {
    console.error('Forceful shutdown after timeout');
    process.exit(1);
  }, 30000);
});
```

Set appropriate termination grace period in pod spec.

```yaml
spec:
  terminationGracePeriodSeconds: 60
  containers:
  - name: app
    image: myapp:2.0
    lifecycle:
      preStop:
        exec:
          command: ["/bin/sh", "-c", "sleep 5"]
```

The preStop hook gives time for load balancer deregistration before shutdown begins.

## High Availability Configuration

Run multiple replicas and configure pod disruption budgets.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: production-app
spec:
  replicas: 3  # Minimum 2 for HA, 3 recommended
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0  # Ensure capacity during updates
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: production-app-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: web
```

Pod disruption budgets prevent too many pods from being disrupted simultaneously during maintenance.

## Pod Anti-Affinity

Spread pods across nodes and availability zones for fault tolerance.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: production-app
spec:
  template:
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - web
              topologyKey: kubernetes.io/hostname
          - weight: 90
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - web
              topologyKey: topology.kubernetes.io/zone
```

This spreads pods across nodes and availability zones for better resilience.

## Security Hardening

Follow security best practices for production workloads.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: production-app
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: app
        image: myapp:2.0
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: cache
          mountPath: /app/cache
      volumes:
      - name: tmp
        emptyDir: {}
      - name: cache
        emptyDir: {}
```

Run as non-root, use read-only filesystems, and drop unnecessary capabilities.

## Observability Requirements

Implement comprehensive logging, metrics, and tracing.

```yaml
# Prometheus metrics example
apiVersion: v1
kind: Service
metadata:
  name: production-app
  labels:
    app: web
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8080"
    prometheus.io/path: "/metrics"
spec:
  ports:
  - port: 80
    targetPort: 8080
    name: http
  selector:
    app: web
```

Expose metrics, structured logs, and trace context propagation.

```javascript
// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(prometheusRegister.metrics());
});

// Structured logging
const logger = winston.createLogger({
  format: winston.format.json(),
  defaultMeta: { service: 'web-app' },
  transports: [
    new winston.transports.Console()
  ]
});

// Trace context
const { trace } = require('@opentelemetry/api');
app.use((req, res, next) => {
  const span = trace.getActiveSpan();
  logger.info('Request received', {
    path: req.path,
    traceId: span ? span.spanContext().traceId : undefined
  });
  next();
});
```

## Configuration Management

Use ConfigMaps and Secrets for configuration, never hardcode values.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  LOG_LEVEL: "info"
  API_TIMEOUT: "30s"
  CACHE_TTL: "300"
---
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: production
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:pass@db:5432/prod"
  API_KEY: "secret-key-here"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: production-app
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:2.0
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
```

Separate configuration from application code for environment portability.

## Network Policies

Implement network segmentation to limit blast radius.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: production-app-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: ingress-nginx
    ports:
    - protocol: TCP
      port: 8080
  egress:
  # Allow DNS
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
      podSelector:
        matchLabels:
          k8s-app: kube-dns
    ports:
    - protocol: UDP
      port: 53
  # Allow database
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
```

Default deny with explicit allow rules improves security.

## Backup and Disaster Recovery

Plan for data persistence and backup strategies.

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data
  namespace: production
  annotations:
    backup.velero.io/backup-volumes: "data"
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
  storageClassName: fast-ssd
```

Test restore procedures regularly. Backups without tested restores are useless.

## Deployment Strategy

Use rolling updates with proper configuration.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: production-app
spec:
  replicas: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2        # Can have 7 pods during update
      maxUnavailable: 1  # Always have at least 4 running
  minReadySeconds: 30    # Wait 30s before marking pod ready
```

Consider blue-green or canary deployments for critical services.

## Documentation Requirements

Document operational procedures, runbooks, and architecture decisions. Include contact information for on-call teams. Maintain changelog of production changes.

Create runbooks for common issues: high CPU usage, memory leaks, database connection failures, and external API timeouts. Document troubleshooting steps specific to your application.

## Production Readiness Review

Conduct formal production readiness reviews before deployment.

Checklist items:
- Resource requests and limits configured
- Health probes implemented
- Graceful shutdown handling
- Multiple replicas with anti-affinity
- Pod disruption budget configured
- Security contexts set
- Network policies applied
- Metrics and logging implemented
- Configuration externalized
- Backup strategy defined
- Deployment strategy chosen
- Documentation complete
- Load testing performed
- Monitoring and alerts configured
- On-call rotation established

## Gradual Rollout

Roll out to production gradually with feature flags and canary deployments.

```yaml
# Canary deployment example
apiVersion: apps/v1
kind: Deployment
metadata:
  name: production-app-stable
spec:
  replicas: 9  # 90% of traffic
  selector:
    matchLabels:
      app: web
      version: stable
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: production-app-canary
spec:
  replicas: 1  # 10% of traffic
  selector:
    matchLabels:
      app: web
      version: canary
```

Monitor canary metrics before full rollout.

## Continuous Improvement

Production readiness is ongoing. Regularly review and update checklists based on lessons learned from incidents and operational experience.

Run game days and chaos engineering experiments to validate assumptions about resilience and failure handling.

## Conclusion

A comprehensive production readiness checklist ensures consistent, reliable application deployments. Cover resource configuration, health checks, security, observability, and operational requirements. Test thoroughly under realistic conditions and document operational procedures. Review readiness criteria before each production deployment. With disciplined production readiness practices, teams deploy applications confidently knowing they meet operational standards.
