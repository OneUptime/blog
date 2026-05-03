# How to Deploy Consul Connect via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Consul, Service Mesh, HashiCorp, Docker

Description: Deploy HashiCorp Consul Connect service mesh using Portainer for secure service-to-service communication with automatic mTLS.

## Introduction

Consul Connect is HashiCorp's service mesh solution that provides service discovery, health checking, and secure service-to-service communication via sidecar proxies. It integrates natively with both Docker environments and Kubernetes clusters, making it an ideal choice when you're already using the HashiCorp ecosystem. Portainer simplifies the deployment and management of Consul Connect.

## Prerequisites

- Portainer installed (Docker Swarm or Kubernetes)
- At least 2 GB RAM available per Consul node
- A network accessible to all services
- Basic understanding of service mesh concepts

## Step 1: Deploy Consul Server via Portainer Stack

Create a new stack in Portainer for the Consul server cluster:

1. Go to **Stacks** > **Add Stack**
2. Name it `consul-server`
3. Paste the following docker-compose.yml:

```yaml
# docker-compose.yml for Consul Server

version: "3.8"

services:
  consul-server1:
    image: hashicorp/consul:1.17.0
    container_name: consul-server1
    restart: always
    # Run Consul in server mode with UI enabled
    command: >
      consul agent
      -server
      -bootstrap-expect=3
      -ui
      -data-dir=/consul/data
      -config-dir=/consul/config
      -advertise={{ GetInterfaceIP "eth0" }}
      -bind=0.0.0.0
      -client=0.0.0.0
      -node=consul-server1
      -dns-port=8600
    volumes:
      - consul-server1-data:/consul/data
      - ./consul-config:/consul/config
    ports:
      - "8500:8500"   # HTTP API and UI
      - "8600:8600/udp"  # DNS
    networks:
      - consul-mesh

  consul-server2:
    image: hashicorp/consul:1.17.0
    container_name: consul-server2
    restart: always
    command: >
      consul agent
      -server
      -bootstrap-expect=3
      -data-dir=/consul/data
      -config-dir=/consul/config
      -advertise={{ GetInterfaceIP "eth0" }}
      -bind=0.0.0.0
      -client=0.0.0.0
      -node=consul-server2
      -retry-join=consul-server1
    volumes:
      - consul-server2-data:/consul/data
      - ./consul-config:/consul/config
    networks:
      - consul-mesh

  consul-server3:
    image: hashicorp/consul:1.17.0
    container_name: consul-server3
    restart: always
    command: >
      consul agent
      -server
      -bootstrap-expect=3
      -data-dir=/consul/data
      -config-dir=/consul/config
      -advertise={{ GetInterfaceIP "eth0" }}
      -bind=0.0.0.0
      -client=0.0.0.0
      -node=consul-server3
      -retry-join=consul-server1
    volumes:
      - consul-server3-data:/consul/data
      - ./consul-config:/consul/config
    networks:
      - consul-mesh

volumes:
  consul-server1-data:
  consul-server2-data:
  consul-server3-data:

networks:
  consul-mesh:
    driver: overlay
    attachable: true
```

## Step 2: Configure Consul Connect

Create a Consul configuration file for enabling Connect:

```json
// consul-config/connect.json
{
  "connect": {
    "enabled": true,
    "ca_config": {
      "leaf_cert_ttl": "72h",
      "rotation_period": "2160h"
    }
  },
  "ports": {
    "grpc": 8502
  },
  "enable_central_service_config": true,
  "config_entries": {
    "bootstrap": [
      {
        "kind": "proxy-defaults",
        "name": "global",
        "config": {
          "protocol": "http"
        }
      }
    ]
  }
}
```

## Step 3: Deploy a Service with Consul Connect Sidecar

The official `envoyproxy/envoy` image does not ship the `consul` binary, and the `hashicorp/consul` image does not ship Envoy. To run `consul connect envoy` you need an image that contains both. Build one with a multi-stage Dockerfile and push it to your registry:

```dockerfile
# Dockerfile for a combined consul + envoy sidecar image
FROM hashicorp/consul:1.17.0 AS consul
FROM envoyproxy/envoy:v1.27.0
COPY --from=consul /bin/consul /bin/consul
ENTRYPOINT ["consul", "connect", "envoy"]
```

Then deploy application services with the combined sidecar image via Portainer:

```yaml
# app-stack.yaml - Application stack with Consul Connect
version: "3.8"

services:
  # Consul client agent
  consul-agent:
    image: hashicorp/consul:1.17.0
    command: >
      consul agent
      -data-dir=/consul/data
      -config-dir=/consul/config
      -retry-join=consul-server1
      -node=app-node
    volumes:
      - consul-agent-data:/consul/data
    networks:
      - consul-mesh

  # Application service (frontend)
  web:
    image: nginx:alpine
    environment:
      - SERVICE_NAME=web
    depends_on:
      - consul-agent
    networks:
      - consul-mesh

  # Envoy sidecar proxy for web service (custom image with consul + envoy)
  web-proxy:
    image: your-registry/consul-envoy:1.17.0-v1.27.0
    command: >
      -sidecar-for=web
      -grpc-addr=consul-agent:8502
    depends_on:
      - consul-agent
      - web
    networks:
      - consul-mesh

  # Backend API service
  api:
    image: hashicorp/http-echo:latest
    command: ["-text=hello from api", "-listen=:5678"]
    networks:
      - consul-mesh

  # Envoy sidecar proxy for api service
  api-proxy:
    image: your-registry/consul-envoy:1.17.0-v1.27.0
    command: >
      -sidecar-for=api
      -grpc-addr=consul-agent:8502
    depends_on:
      - consul-agent
      - api
    networks:
      - consul-mesh

volumes:
  consul-agent-data:

networks:
  consul-mesh:
    external: true
```

## Step 4: Register Services with Consul

Create service definitions for Consul service discovery:

```json
// service-definitions/web.json
{
  "service": {
    "name": "web",
    "port": 80,
    "connect": {
      "sidecar_service": {
        "proxy": {
          "upstreams": [
            {
              "destination_name": "api",
              "local_bind_port": 5001
            }
          ]
        }
      }
    },
    "check": {
      "http": "http://localhost:80/health",
      "interval": "10s",
      "timeout": "1s"
    }
  }
}
```

## Step 5: Configure Intentions (Access Control)

Set up Consul intentions to control which services can communicate. The legacy `consul intention create` CLI was deprecated in Consul 1.9.0 in favor of managing a `service-intentions` config entry. Write the intentions to a file and apply them with `consul config write`:

```hcl
# intentions/api.hcl - allow web -> api, deny everything else by default
Kind = "service-intentions"
Name = "api"
Sources = [
  {
    Name   = "web"
    Action = "allow"
  },
  {
    Name   = "*"
    Action = "deny"
  },
]
```

```bash
consul config write intentions/api.hcl
```

Or via the Consul UI (accessible at port 8500):

1. Navigate to **Intentions**
2. Click **Create**
3. Set Source: `web`, Destination: `api`, Action: `Allow`

## Step 6: Deploy on Kubernetes via Portainer

For Kubernetes environments, use Consul's Helm chart:

```yaml
# consul-kubernetes-values.yaml
global:
  name: consul
  datacenter: dc1

  # Enable TLS for all Consul components
  tls:
    enabled: true
    verify: true

  # Enable metrics
  metrics:
    enabled: true

server:
  replicas: 3
  bootstrapExpect: 3
  storage: 10Gi

connectInject:
  # Enable the service mesh and automatically inject Connect sidecars
  enabled: true
  default: true
  metrics:
    defaultEnabled: true

ingressGateways:
  enabled: true
  defaults:
    replicas: 1

ui:
  enabled: true
  service:
    type: ClusterIP
```

## Monitoring the Mesh

Access the Consul UI through Portainer's port forwarding or via the exposed service:

1. In Portainer, go to **Containers** > `consul-server1`
2. Click **Logs** to view cluster health
3. Access UI at `http://your-host:8500`

## Conclusion

Consul Connect deployed via Portainer provides a robust service mesh solution that integrates seamlessly with both Docker and Kubernetes environments. Its tight integration with the HashiCorp ecosystem, including Vault for secrets management and Terraform for infrastructure, makes it an excellent choice for organizations already invested in HashiCorp tools. Portainer's visual management capabilities complement Consul's powerful CLI and API, giving teams multiple ways to manage their service mesh infrastructure.
