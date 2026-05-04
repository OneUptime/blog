# How to Configure Consul Connect with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Consul, Connect, IPv6, Service Mesh, HashiCorp, mTLS

Description: A guide to configuring HashiCorp Consul Connect service mesh with IPv6 networking, including agent configuration, service registration, and Envoy sidecar proxy setup for IPv6.

Consul Connect provides service mesh functionality with automatic mTLS between services. With proper configuration, Consul agents can bind to IPv6 addresses and Envoy sidecar proxies can handle IPv6 traffic.

## Consul Agent IPv6 Configuration

```hcl
# /etc/consul.d/consul.hcl

datacenter = "dc1"
data_dir   = "/opt/consul"

# Bind to all interfaces including IPv6

bind_addr = "::"

# Advertise specific IPv6 address
advertise_addr = "2001:db8::1"

# Also advertise the IPv4 address
advertise_addr_wan = "203.0.113.10"

# Client address - bind to all
client_addr = "::"

# Enable Connect (service mesh)
connect {
  enabled = true
}

# Ports
ports {
  dns      = 8600
  http     = 8500
  https    = 8501
  grpc     = 8502
  serf_lan = 8301
  serf_wan = 8302
  server   = 8300
}
```

## Service Registration with IPv6

```hcl
# /etc/consul.d/web-service.hcl

service {
  name    = "web"
  id      = "web-1"
  address = "2001:db8::10"   # Service listens on IPv6
  port    = 8080

  connect {
    sidecar_service {
      port = 21000  # Envoy sidecar proxy port
      proxy {
        upstreams = [
          {
            destination_name = "backend"
            local_bind_port  = 9191
            # Connect automatically handles IPv6 for upstream
          }
        ]
      }
    }
  }

  check {
    http     = "http://[2001:db8::10]:8080/health"
    interval = "10s"
    timeout  = "3s"
  }
}
```

## Starting Envoy Sidecar for IPv6

```bash
# Register the service
consul reload

# Start Envoy sidecar proxy for the web service
consul connect envoy \
  -sidecar-for web-1 \
  -- --log-level warning

# The sidecar will get the correct IPv6 address from Consul
# and configure Envoy listeners accordingly

# Verify the sidecar is running
ps aux | grep envoy
netstat -tlnp | grep 21000
```

## Consul DNS for IPv6

Consul provides AAAA records for services registered with IPv6 addresses:

```bash
# Query for IPv6 address of a service
dig @::1 -p 8600 AAAA web.service.consul

# Query with additional SRV record
dig @::1 -p 8600 SRV _web._tcp.service.consul

# Using consul CLI
consul catalog services
consul catalog nodes -service=web

# Look up specific service address
consul health service web | python3 -m json.tool | grep Address
```

## Intentions for IPv6 Services

```bash
# Create an intention allowing frontend to connect to backend
consul intention create frontend backend

# Or using config entry
cat > /etc/consul.d/intention.hcl << 'EOF'
kind = "service-intentions"
name = "backend"
sources = [
  {
    name   = "frontend"
    action = "allow"
  }
]
EOF

consul config write /etc/consul.d/intention.hcl

# Verify intention
consul intention list
```

## Consul on Kubernetes with IPv6

```yaml
# values.yaml for Consul Helm chart on dual-stack cluster

global:
  name: consul
  datacenter: dc1

server:
  replicas: 3
  # Server will use pod's IPv6 address for cluster communication

connectInject:
  enabled: true
  default: false  # Opt-in per namespace/service
  # Transparent proxy enables automatic traffic interception
  # including IPv6 via ip6tables rules
  transparentProxy:
    defaultEnabled: true
```

```bash
# Install Consul via Helm
helm repo add hashicorp https://helm.releases.hashicorp.com
helm install consul hashicorp/consul -f values.yaml -n consul --create-namespace

# Verify pods have dual-stack IPs
kubectl get pods -n consul -o wide
kubectl get pod -n consul -l component=server \
  -o jsonpath='{.items[0].status.podIPs}'
```

## Enabling Connect Inject on a Service

```yaml
# Kubernetes Deployment with Consul Connect sidecar
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  template:
    metadata:
      annotations:
        consul.hashicorp.com/connect-inject: "true"   # Inject Envoy sidecar
        consul.hashicorp.com/transparent-proxy: "true"  # Intercept all traffic
    spec:
      containers:
        - name: web
          image: nginx:alpine
```

```bash
kubectl apply -f deployment.yaml

# Check sidecar was injected
kubectl get pod -l app=web-app
# NAME                READY   STATUS
# web-app-xxx-yyy     2/2     Running

# Check transparent proxy ip6tables rules
kubectl exec $(kubectl get pod -l app=web-app -o name | head -1) \
  -c consul-dataplane -- ip6tables -t nat -L -n
```

## Verifying IPv6 Service Mesh Traffic

```bash
# Test service-to-service communication over IPv6
# From frontend pod to backend via Connect proxy
kubectl exec $(kubectl get pod -l app=frontend -o name | head -1) \
  -- curl http://localhost:9191/   # via Envoy upstream

# Check Envoy cluster health for IPv6 endpoints
kubectl exec $(kubectl get pod -l app=web-app -o name | head -1) \
  -c consul-dataplane -- \
  wget -qO- http://localhost:19000/clusters | grep -A 5 "fd00:"

# Check Consul UI for service health
kubectl port-forward -n consul svc/consul-ui 8500:80
# Browse http://localhost:8500
```

Consul Connect IPv6 support requires binding the Consul agent to `::` and registering services with their IPv6 addresses. The Envoy sidecar proxies configured by Consul handle IPv6 traffic transparently, and transparent proxy mode on Kubernetes ensures all pod traffic (IPv4 and IPv6) flows through the service mesh.
