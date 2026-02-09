# How to Configure NGINX Ingress Controller with Custom ConfigMap Tuning Parameters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, NGINX Ingress, Performance, Configuration, Tuning

Description: Optimize NGINX Ingress Controller performance using ConfigMap tuning parameters for connection handling, buffer sizes, timeouts, and worker processes to handle high-traffic workloads on Kubernetes.

---

NGINX Ingress Controller performance depends heavily on proper configuration. The ConfigMap allows global tuning of NGINX parameters without rebuilding container images, enabling optimization for specific workload characteristics and traffic patterns.

## Understanding NGINX Ingress ConfigMap

The NGINX Ingress Controller reads configuration from a ConfigMap that controls global NGINX behavior. Changes to this ConfigMap automatically reload NGINX configuration without dropping connections. This makes tuning safe in production environments.

Configuration parameters fall into categories including worker processes, connection limits, buffer sizes, timeouts, and logging. Each parameter affects different aspects of performance and resource utilization. Understanding these relationships helps optimize for your specific use case.

Worker processes handle incoming connections. More workers enable better CPU utilization on multi-core systems but consume more memory. Connection limits prevent resource exhaustion during traffic spikes. Buffer sizes affect memory usage and the ability to handle large requests or responses.

## Creating Base Ingress Controller Configuration

Install NGINX Ingress Controller with Helm:

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

kubectl create namespace ingress-nginx

helm install nginx-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --set controller.metrics.enabled=true \
  --set controller.podAnnotations."prometheus\.io/scrape"=true \
  --set controller.podAnnotations."prometheus\.io/port"="10254"
```

## Configuring Worker Processes and Connections

Create a ConfigMap with worker tuning:

```yaml
# nginx-ingress-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-ingress-controller
  namespace: ingress-nginx
data:
  # Worker process configuration
  worker-processes: "auto"  # One per CPU core
  worker-shutdown-timeout: "240s"
  
  # Connection settings
  max-worker-connections: "16384"
  max-worker-open-files: "32768"
  
  # Keep-alive settings
  keep-alive: "75"
  keep-alive-requests: "1000"
  upstream-keepalive-connections: "320"
  upstream-keepalive-timeout: "60"
  upstream-keepalive-requests: "10000"
```

Apply the configuration:

```bash
kubectl apply -f nginx-ingress-config.yaml
```

## Tuning Buffer Sizes

Configure buffers for optimal memory usage and request handling:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-ingress-controller
  namespace: ingress-nginx
data:
  # Client request buffers
  client-body-buffer-size: "128k"
  client-header-buffer-size: "4k"
  large-client-header-buffers: "4 8k"
  
  # Proxy buffers
  proxy-buffer-size: "16k"
  proxy-buffers-number: "8"
  proxy-buffering: "on"
  
  # FastCGI buffers (if using PHP)
  fastcgi-buffers-number: "16"
  fastcgi-buffer-size: "16k"
```

Large buffers enable handling of big headers or request bodies but consume more memory. Start conservative and increase if you see buffer overflow errors in logs.

## Configuring Timeout Values

Set appropriate timeouts for your application:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-ingress-controller
  namespace: ingress-nginx
data:
  # Client timeouts
  client-body-timeout: "60"
  client-header-timeout: "60"
  
  # Proxy timeouts
  proxy-connect-timeout: "5"
  proxy-read-timeout: "60"
  proxy-send-timeout: "60"
  
  # Keepalive timeout
  keep-alive: "75"
  
  # SSL handshake timeout
  ssl-session-timeout: "10m"
```

Shorter timeouts free resources quickly but may terminate legitimate slow requests. Match timeouts to application behavior.

## Enabling Connection Pooling

Configure upstream connection pooling for better backend performance:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-ingress-controller
  namespace: ingress-nginx
data:
  # Upstream keepalive
  upstream-keepalive-connections: "320"
  upstream-keepalive-timeout: "60"
  upstream-keepalive-requests: "10000"
  
  # Connection limits
  limit-conn-zone-variable: "$binary_remote_addr"
  limit-conn-status-code: "429"
```

## Configuring Request Limits

Protect against large requests:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-ingress-controller
  namespace: ingress-nginx
data:
  # Body size limits
  proxy-body-size: "10m"
  client-max-body-size: "10m"
  
  # Request rate limiting (global defaults)
  limit-req-status-code: "429"
  limit-rate: "0"  # No limit by default
  limit-rate-after: "0"
```

## Enabling Compression

Configure gzip compression to reduce bandwidth:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-ingress-controller
  namespace: ingress-nginx
data:
  # Gzip compression
  use-gzip: "true"
  gzip-level: "5"
  gzip-min-length: "256"
  gzip-types: "application/json application/javascript text/css text/plain text/xml application/xml application/xml+rss text/javascript"
  
  # Brotli compression (if module available)
  enable-brotli: "true"
  brotli-level: "6"
  brotli-types: "application/json application/javascript text/css text/plain text/xml"
```

## Tuning SSL/TLS Settings

Optimize SSL performance and security:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-ingress-controller
  namespace: ingress-nginx
data:
  # SSL protocols
  ssl-protocols: "TLSv1.2 TLSv1.3"
  ssl-ciphers: "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384"
  ssl-prefer-server-ciphers: "true"
  
  # SSL session cache
  ssl-session-cache: "true"
  ssl-session-cache-size: "10m"
  ssl-session-timeout: "10m"
  ssl-session-tickets: "true"
  
  # OCSP stapling
  enable-ocsp: "true"
  
  # HTTP/2 settings
  use-http2: "true"
  http2-max-field-size: "8k"
  http2-max-header-size: "32k"
```

## Complete Production ConfigMap

Here's a comprehensive production configuration:

```yaml
# nginx-ingress-production-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-ingress-controller
  namespace: ingress-nginx
data:
  # Worker configuration
  worker-processes: "auto"
  worker-shutdown-timeout: "240s"
  max-worker-connections: "16384"
  max-worker-open-files: "32768"
  
  # Connection settings
  keep-alive: "75"
  keep-alive-requests: "1000"
  upstream-keepalive-connections: "320"
  upstream-keepalive-timeout: "60"
  
  # Buffer sizes
  client-body-buffer-size: "128k"
  proxy-buffer-size: "16k"
  proxy-buffers-number: "8"
  
  # Timeouts
  client-body-timeout: "60"
  proxy-connect-timeout: "5"
  proxy-read-timeout: "60"
  proxy-send-timeout: "60"
  
  # Request limits
  proxy-body-size: "10m"
  limit-req-status-code: "429"
  
  # Compression
  use-gzip: "true"
  gzip-level: "5"
  gzip-types: "application/json application/javascript text/css text/plain"
  
  # SSL/TLS
  ssl-protocols: "TLSv1.2 TLSv1.3"
  ssl-session-cache: "true"
  ssl-session-cache-size: "10m"
  use-http2: "true"
  
  # Logging
  log-format-upstream: '$remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent" $request_length $request_time [$proxy_upstream_name] [$proxy_alternative_upstream_name] $upstream_addr $upstream_response_length $upstream_response_time $upstream_status $req_id'
  access-log-path: "/var/log/nginx/access.log"
  error-log-path: "/var/log/nginx/error.log"
  error-log-level: "notice"
  
  # Monitoring
  enable-vts-status: "false"
  vts-status-zone-size: "10m"
```

## Monitoring Configuration Performance

Check NGINX metrics:

```bash
kubectl port-forward -n ingress-nginx svc/nginx-ingress-controller-metrics 10254:10254

curl http://localhost:10254/metrics
```

Key metrics to monitor:
- nginx_ingress_controller_requests_total
- nginx_ingress_controller_request_duration_seconds
- nginx_ingress_controller_response_size
- nginx_connections_active
- nginx_connections_reading/writing/waiting

## Testing Configuration Changes

Validate configuration before applying:

```bash
# Check controller logs for configuration reload
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx -f

# Test with load
kubectl run -it --rm load-test --image=williamyeh/hey --restart=Never -- \
  -z 30s -c 50 -q 10 https://your-app.example.com/
```

Proper ConfigMap tuning transforms NGINX Ingress Controller from default settings to a high-performance gateway capable of handling production traffic efficiently. Start with conservative settings and tune based on observed metrics and application behavior.
