# How to Deploy a Multi-Container Group with a Sidecar in Azure Container Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Container Instances, Sidecar Pattern, Multi-Container, Containers, DevOps, Cloud Computing

Description: How to deploy a multi-container group in Azure Container Instances using the sidecar pattern for logging, monitoring, proxying, and other cross-cutting concerns.

---

The sidecar pattern is one of the most useful container design patterns. Instead of cramming everything into a single container, you run your main application in one container and attach helper containers alongside it. These sidecars handle cross-cutting concerns like logging, metrics collection, proxying, or configuration management.

Azure Container Instances supports multi-container groups where all containers share the same network and can share volumes, making it a natural fit for the sidecar pattern. This post walks through practical sidecar deployments with real-world examples.

## What is the Sidecar Pattern?

In a sidecar deployment, you have:

- **Main container** - Your application (web server, API, worker)
- **Sidecar container(s)** - Helper processes that augment the main container

All containers in the group:
- Share the same network namespace (same IP, can communicate via localhost)
- Can share mounted volumes
- Start and stop together
- Share the same lifecycle

Common sidecar use cases:
- **Logging** - Collect and forward logs from the main container
- **Monitoring** - Scrape metrics and send them to a monitoring system
- **Reverse proxy** - Handle TLS termination or request routing
- **Configuration** - Dynamically update configuration files

## Example 1: Application with a Log Forwarder Sidecar

A common scenario is running your application alongside a Fluentd or Fluent Bit sidecar that forwards logs to a centralized logging system.

```yaml
# log-sidecar.yaml - Application with Fluent Bit log forwarder
apiVersion: '2021-09-01'
location: eastus
name: app-with-logging
properties:
  containers:
    # Main application container
    - name: web-app
      properties:
        image: myregistry.azurecr.io/web-app:latest
        resources:
          requests:
            cpu: 1.0
            memoryInGb: 2.0
        ports:
          - port: 8080
            protocol: TCP
        environmentVariables:
          - name: LOG_PATH
            value: '/var/log/app'
        # Write logs to a shared volume
        volumeMounts:
          - name: log-volume
            mountPath: /var/log/app

    # Sidecar: Fluent Bit log forwarder
    - name: log-forwarder
      properties:
        image: fluent/fluent-bit:latest
        resources:
          requests:
            cpu: 0.25
            memoryInGb: 0.5
        # Read logs from the shared volume
        volumeMounts:
          - name: log-volume
            mountPath: /var/log/app
            readOnly: true
          - name: fluent-config
            mountPath: /fluent-bit/etc
            readOnly: true
        environmentVariables:
          - name: WORKSPACE_ID
            secureValue: 'your-log-analytics-workspace-id'
          - name: WORKSPACE_KEY
            secureValue: 'your-log-analytics-key'

  # Shared volumes
  volumes:
    # Shared log directory between app and log forwarder
    - name: log-volume
      emptyDir: {}
    # Fluent Bit configuration
    - name: fluent-config
      secret:
        # Base64 encoded Fluent Bit configuration
        fluent-bit.conf: 'W1NFUlZJQ0VdCiAgICBGbHVzaCAgICAgICAgMQogICAgTG9nX0xldmVsICAgIGluZm8KCltJTlBVVF0KICAgIE5hbWUgICAgICAgICB0YWlsCiAgICBQYXRoICAgICAgICAgL3Zhci9sb2cvYXBwLyoubG9nCiAgICBUYWcgICAgICAgICAgYXBwLioKCltPVVRQVVRdCiAgICBOYW1lICAgICAgICAgc3Rkb3V0CiAgICBNYXRjaCAgICAgICAgKg=='

  osType: Linux
  ipAddress:
    type: Public
    ports:
      - port: 8080
        protocol: TCP
type: Microsoft.ContainerInstance/containerGroups
```

In this setup, the web app writes logs to `/var/log/app`, and the Fluent Bit sidecar reads from the same directory and forwards the logs to your logging backend. The `emptyDir` volume is shared between both containers but does not persist after the container group is deleted.

## Example 2: Application with an Nginx Reverse Proxy

Using Nginx as a sidecar to handle TLS termination, rate limiting, or request routing:

```yaml
# nginx-sidecar.yaml - Application with Nginx reverse proxy
apiVersion: '2021-09-01'
location: eastus
name: app-with-proxy
properties:
  containers:
    # Main application - only accessible via localhost
    - name: api
      properties:
        image: myregistry.azurecr.io/api-server:latest
        resources:
          requests:
            cpu: 1.0
            memoryInGb: 2.0
        # App listens on 3000, but this port is not exposed externally
        ports:
          - port: 3000
            protocol: TCP
        environmentVariables:
          - name: PORT
            value: '3000'

    # Sidecar: Nginx reverse proxy
    - name: nginx
      properties:
        image: nginx:alpine
        resources:
          requests:
            cpu: 0.5
            memoryInGb: 0.5
        # Nginx listens on port 80 - this is the externally exposed port
        ports:
          - port: 80
            protocol: TCP
        volumeMounts:
          - name: nginx-config
            mountPath: /etc/nginx/conf.d
            readOnly: true

  volumes:
    - name: nginx-config
      secret:
        # Nginx configuration that proxies to the app on localhost:3000
        default.conf: 'c2VydmVyIHsKICAgIGxpc3RlbiA4MDsKICAgIAogICAgbG9jYXRpb24gLyB7CiAgICAgICAgcHJveHlfcGFzcyBodHRwOi8vbG9jYWxob3N0OjMwMDA7CiAgICAgICAgcHJveHlfc2V0X2hlYWRlciBIb3N0ICRob3N0OwogICAgICAgIHByb3h5X3NldF9oZWFkZXIgWC1SZWFsLUlQICRyZW1vdGVfYWRkcjsKICAgICAgICBwcm94eV9zZXRfaGVhZGVyIFgtRm9yd2FyZGVkLUZvciAkcHJveHlfYWRkX3hfZm9yd2FyZGVkX2ZvcjsKICAgIH0KfQ=='

  osType: Linux
  ipAddress:
    type: Public
    ports:
      - port: 80
        protocol: TCP
type: Microsoft.ContainerInstance/containerGroups
```

The key here is that the API container listens on port 3000 but is not exposed externally. Only Nginx on port 80 is exposed. Nginx proxies requests to `localhost:3000` because both containers share the same network namespace.

## Example 3: Application with a Metrics Exporter

Running a Prometheus metrics exporter alongside your application:

```yaml
# metrics-sidecar.yaml - Application with metrics collection sidecar
apiVersion: '2021-09-01'
location: eastus
name: app-with-metrics
properties:
  containers:
    # Main application
    - name: web-app
      properties:
        image: myregistry.azurecr.io/web-app:latest
        resources:
          requests:
            cpu: 1.5
            memoryInGb: 3.0
        ports:
          - port: 8080
            protocol: TCP
        environmentVariables:
          - name: STATSD_HOST
            value: 'localhost'
          - name: STATSD_PORT
            value: '9125'

    # Sidecar: StatsD exporter that converts StatsD metrics to Prometheus format
    - name: statsd-exporter
      properties:
        image: prom/statsd-exporter:latest
        resources:
          requests:
            cpu: 0.25
            memoryInGb: 0.5
        ports:
          # StatsD receiver port
          - port: 9125
            protocol: UDP
          # Prometheus metrics endpoint
          - port: 9102
            protocol: TCP
        command:
          - '--statsd.listen-udp=:9125'
          - '--web.listen-address=:9102'

  osType: Linux
  ipAddress:
    type: Public
    ports:
      - port: 8080
        protocol: TCP
      - port: 9102
        protocol: TCP
type: Microsoft.ContainerInstance/containerGroups
```

The application sends StatsD metrics to `localhost:9125`. The StatsD exporter sidecar receives them and exposes them in Prometheus format on port 9102, which Prometheus can then scrape.

## Inter-Container Communication

Since all containers in a group share the same network namespace, they communicate via `localhost`. This is important to understand:

- Container A listening on port 3000 is reachable from Container B at `localhost:3000`
- Port conflicts are possible - two containers cannot listen on the same port
- Only ports listed in the group's `ipAddress.ports` are externally accessible

Here is a diagram showing how traffic flows:

```mermaid
graph LR
    Internet -->|Port 80| IP[Public IP]
    IP --> Nginx[Nginx Sidecar :80]
    Nginx -->|localhost:3000| App[App Container :3000]
    App -->|localhost:6379| Redis[Redis Sidecar :6379]
```

## Lifecycle Management

All containers in a group start and stop together. This has implications for sidecars:

- If the main container exits, the sidecar continues running (the group stays active)
- If you want the group to stop when the main container finishes, use restart policy `Never` or `OnFailure`
- Sidecars should be designed to handle the main container restarting

For batch jobs, this means your sidecar should handle the case where the main container finishes its work:

```yaml
# For batch jobs, use OnFailure restart policy
restartPolicy: OnFailure
```

## Deploying and Managing

```bash
# Deploy the multi-container group
az container create \
    --resource-group my-resource-group \
    --file log-sidecar.yaml

# Check status of all containers
az container show \
    --resource-group my-resource-group \
    --name app-with-logging \
    --query "containers[].{name:name, state:instanceView.currentState.state}" \
    --output table

# View logs from a specific container
az container logs \
    --resource-group my-resource-group \
    --name app-with-logging \
    --container-name web-app

# View logs from the sidecar
az container logs \
    --resource-group my-resource-group \
    --name app-with-logging \
    --container-name log-forwarder

# Execute a command in the sidecar
az container exec \
    --resource-group my-resource-group \
    --name app-with-logging \
    --container-name log-forwarder \
    --exec-command /bin/sh
```

## Resource Allocation Tips

Keep sidecars lightweight. They should use minimal resources since they are auxiliary to the main application:

- Log forwarders: 0.25 CPU, 256-512 MB memory
- Reverse proxies: 0.25-0.5 CPU, 256-512 MB memory
- Metrics exporters: 0.1-0.25 CPU, 128-256 MB memory

Remember that ACI has a maximum of 4 CPU cores and 16 GB memory per container group, and you are billed for the total requested resources.

## Summary

The sidecar pattern in ACI is a clean way to separate concerns in your containerized applications. Each container does one thing well, and they work together through shared networking and volumes. Log forwarding, reverse proxying, and metrics collection are the most common sidecar use cases, but the pattern applies to any cross-cutting concern that you want to keep separate from your main application code. Start with a simple sidecar alongside your main container and expand from there.
