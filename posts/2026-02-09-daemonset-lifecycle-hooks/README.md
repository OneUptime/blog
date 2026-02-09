# How to configure DaemonSet lifecycle hooks for graceful updates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DaemonSets, Lifecycle

Description: Learn how to use PostStart and PreStop lifecycle hooks in DaemonSets to ensure graceful startup and shutdown during rolling updates.

---

Lifecycle hooks in DaemonSets allow you to execute custom logic during container startup and shutdown. These hooks are critical for node-level services that need to register with external systems, drain connections gracefully, or clean up resources before termination. Proper lifecycle hook configuration ensures zero-downtime updates and clean state transitions.

## Understanding container lifecycle hooks

Kubernetes provides two lifecycle hooks: PostStart runs immediately after a container starts, and PreStop runs before a container terminates. These hooks execute synchronously, blocking the container's main process until they complete. For DaemonSets managing critical node services, lifecycle hooks ensure proper coordination with the rest of your infrastructure.

PostStart hooks are useful for service registration, waiting for dependencies, or performing initialization that cannot happen in init containers. PreStop hooks enable graceful shutdown, connection draining, and cleanup operations before the pod terminates.

## Basic DaemonSet with PostStart hook

Here's a DaemonSet using a PostStart hook for service registration:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: api-gateway
  namespace: edge
spec:
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: gateway
        image: example/api-gateway:v2.0
        ports:
        - containerPort: 8080
          hostPort: 8080
        lifecycle:
          postStart:
            exec:
              command:
              - /bin/sh
              - -c
              - |
                # Wait for service to be ready
                until curl -f http://localhost:8080/health; do
                  echo "Waiting for gateway to start..."
                  sleep 2
                done

                # Register with service mesh
                curl -X POST http://service-mesh-control-plane/api/register \
                  -d "{\"node\": \"$NODE_NAME\", \"port\": 8080}"

                echo "Gateway registered successfully"
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
```

This PostStart hook ensures the gateway registers with the service mesh only after it's ready to accept traffic.

## DaemonSet with PreStop hook for graceful shutdown

Use PreStop hooks to drain connections before termination:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: load-balancer
  namespace: ingress
spec:
  selector:
    matchLabels:
      app: load-balancer
  template:
    metadata:
      labels:
        app: load-balancer
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: lb
        image: haproxy:2.9
        ports:
        - containerPort: 80
          hostPort: 80
        - containerPort: 443
          hostPort: 443
        lifecycle:
          preStop:
            exec:
              command:
              - /bin/sh
              - -c
              - |
                # Disable new connections
                echo "disable frontend http-in" | socat stdio /var/run/haproxy.sock

                # Wait for existing connections to complete
                echo "Draining connections..."
                for i in $(seq 1 30); do
                  SESSIONS=$(echo "show sess" | socat stdio /var/run/haproxy.sock | wc -l)
                  if [ $SESSIONS -eq 0 ]; then
                    echo "All connections drained"
                    break
                  fi
                  echo "Waiting for $SESSIONS connections to close..."
                  sleep 2
                done

                # Graceful shutdown
                echo "Shutting down HAProxy gracefully"
                kill -SIGUSR1 1
        volumeMounts:
        - name: haproxy-socket
          mountPath: /var/run
      volumes:
      - name: haproxy-socket
        emptyDir: {}
```

This PreStop hook ensures HAProxy stops accepting new connections and waits for existing ones to complete.

## HTTP-based lifecycle hooks

You can also use HTTP requests for lifecycle hooks:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: cache-proxy
  namespace: caching
spec:
  selector:
    matchLabels:
      app: cache-proxy
  template:
    metadata:
      labels:
        app: cache-proxy
    spec:
      containers:
      - name: proxy
        image: nginx:1.25
        ports:
        - containerPort: 8080
        lifecycle:
          postStart:
            httpGet:
              path: /admin/warmup
              port: 8080
              scheme: HTTP
          preStop:
            httpGet:
              path: /admin/shutdown
              port: 8080
              scheme: HTTP
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 3
```

HTTP-based hooks are cleaner when your application already exposes management endpoints.

## Complex PostStart for dependency waiting

Wait for multiple dependencies before considering the pod ready:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: monitoring-agent
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: monitoring-agent
  template:
    metadata:
      labels:
        app: monitoring-agent
    spec:
      containers:
      - name: agent
        image: example/monitoring-agent:v3.0
        lifecycle:
          postStart:
            exec:
              command:
              - /bin/bash
              - -c
              - |
                set -e

                # Wait for Prometheus to be reachable
                echo "Checking Prometheus connectivity..."
                until curl -f http://prometheus.monitoring.svc:9090/-/healthy; do
                  echo "Waiting for Prometheus..."
                  sleep 5
                done

                # Wait for node-exporter socket
                echo "Checking node-exporter socket..."
                until [ -S /var/run/node-exporter.sock ]; do
                  echo "Waiting for node-exporter..."
                  sleep 2
                done

                # Register with monitoring backend
                echo "Registering with monitoring backend..."
                curl -X POST http://monitoring-api.monitoring.svc/agents \
                  -H "Content-Type: application/json" \
                  -d "{
                    \"node\": \"$NODE_NAME\",
                    \"agent_id\": \"$HOSTNAME\",
                    \"version\": \"v3.0\"
                  }"

                echo "Agent initialized successfully"
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        - name: HOSTNAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        volumeMounts:
        - name: node-exporter-socket
          mountPath: /var/run
      volumes:
      - name: node-exporter-socket
        hostPath:
          path: /var/run
```

This ensures all dependencies are available before the agent starts processing.

## PreStop hook with external cleanup

Perform external cleanup operations before shutdown:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: log-forwarder
  namespace: logging
spec:
  selector:
    matchLabels:
      app: log-forwarder
  template:
    metadata:
      labels:
        app: log-forwarder
    spec:
      terminationGracePeriodSeconds: 90
      containers:
      - name: forwarder
        image: fluent/fluent-bit:2.2
        lifecycle:
          preStop:
            exec:
              command:
              - /bin/sh
              - -c
              - |
                # Flush all buffers
                echo "Flushing log buffers..."
                kill -SIGUSR1 $(pidof fluent-bit)
                sleep 5

                # Upload any pending files
                echo "Uploading pending logs..."
                if [ -d /var/log/fluent-bit-buffer ]; then
                  for file in /var/log/fluent-bit-buffer/*; do
                    if [ -f "$file" ]; then
                      curl -X POST http://log-aggregator.logging.svc/upload \
                        --data-binary @"$file"
                      rm -f "$file"
                    fi
                  done
                fi

                # Deregister from log aggregator
                echo "Deregistering from aggregator..."
                curl -X DELETE http://log-aggregator.logging.svc/forwarders/$HOSTNAME

                echo "Cleanup complete"
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: buffer
          mountPath: /var/log/fluent-bit-buffer
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: buffer
        emptyDir: {}
```

This ensures no logs are lost during pod termination.

## Combined lifecycle hooks with state management

Use both hooks to manage state across restarts:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: stateful-node-service
  namespace: services
spec:
  selector:
    matchLabels:
      app: stateful-service
  template:
    metadata:
      labels:
        app: stateful-service
    spec:
      containers:
      - name: service
        image: example/stateful-service:v1.0
        lifecycle:
          postStart:
            exec:
              command:
              - /bin/bash
              - -c
              - |
                # Restore state from persistent storage
                if [ -f /data/state.json ]; then
                  echo "Restoring previous state..."
                  cp /data/state.json /tmp/current-state.json
                  curl -X POST http://localhost:8080/admin/restore \
                    -H "Content-Type: application/json" \
                    -d @/tmp/current-state.json
                  echo "State restored"
                else
                  echo "No previous state found, starting fresh"
                fi

          preStop:
            exec:
              command:
              - /bin/bash
              - -c
              - |
                # Save current state
                echo "Saving current state..."
                curl -s http://localhost:8080/admin/state > /data/state.json

                # Checkpoint any in-progress work
                curl -X POST http://localhost:8080/admin/checkpoint

                echo "State saved successfully"
        volumeMounts:
        - name: state-data
          mountPath: /data
      volumes:
      - name: state-data
        hostPath:
          path: /var/lib/stateful-service
          type: DirectoryOrCreate
```

This pattern enables stateful services to survive pod restarts.

## Lifecycle hooks with timeout handling

Handle timeouts gracefully in lifecycle hooks:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: database-agent
  namespace: databases
spec:
  selector:
    matchLabels:
      app: db-agent
  template:
    metadata:
      labels:
        app: db-agent
    spec:
      terminationGracePeriodSeconds: 120
      containers:
      - name: agent
        image: example/db-agent:v2.0
        lifecycle:
          postStart:
            exec:
              command:
              - /bin/bash
              - -c
              - |
                timeout 30 bash -c '
                  until pg_isready -h localhost -U postgres; do
                    echo "Waiting for PostgreSQL..."
                    sleep 2
                  done
                ' || {
                  echo "WARNING: PostgreSQL not ready after 30s, continuing anyway"
                  exit 0
                }

                echo "Database agent ready"

          preStop:
            exec:
              command:
              - /bin/bash
              - -c
              - |
                echo "Starting graceful shutdown..."

                # Give connections 60 seconds to close
                timeout 60 bash -c '
                  while [ $(netstat -an | grep :5432 | grep ESTABLISHED | wc -l) -gt 0 ]; do
                    echo "Waiting for connections to close..."
                    sleep 3
                  done
                ' || echo "WARNING: Forced shutdown after timeout"

                echo "Shutdown complete"
```

Timeouts prevent lifecycle hooks from blocking indefinitely.

## Monitoring lifecycle hook execution

Track lifecycle hook behavior:

```bash
# Check pod events for lifecycle hook failures
kubectl get events --field-selector involvedObject.kind=Pod --sort-by='.lastTimestamp' | grep -i "poststart\|prestop"

# View container logs during startup
kubectl logs -n monitoring daemonset/monitoring-agent -c agent --timestamps

# Check termination logs
kubectl logs -n monitoring <pod-name> -c agent --previous

# Monitor termination grace period violations
kubectl get pods -A -o json | jq -r '.items[] | select(.status.reason=="DeadlineExceeded") | "\(.metadata.namespace)/\(.metadata.name)"'
```

## Conclusion

Lifecycle hooks in DaemonSets enable sophisticated startup and shutdown behavior for node-level services. PostStart hooks ensure proper initialization and service registration, while PreStop hooks guarantee graceful shutdown and cleanup. By combining these hooks with appropriate termination grace periods and timeout handling, you create robust DaemonSets that maintain service availability during rolling updates and handle failures gracefully.
