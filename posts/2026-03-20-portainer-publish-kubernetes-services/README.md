# How to Publish Services (ClusterIP, NodePort, LoadBalancer) in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Service, Networking, DevOps

Description: Learn how to create and configure ClusterIP, NodePort, and LoadBalancer services in Portainer to expose Kubernetes applications.

## Introduction

Kubernetes Services provide stable network access to pods. Portainer supports creating common service types through its application deployment form, and you can use manifests for more advanced service definitions. Understanding which service type to use and how to configure it is essential for making your applications accessible. This guide covers the most common service types and related patterns.

## Prerequisites

- Portainer with Kubernetes environment
- A deployed application to expose

## Service Types Comparison

| Type | Access | Use Case |
|------|--------|---------|
| **ClusterIP** | Within cluster only | Internal services, APIs |
| **NodePort** | Via node IP:port | External access without load balancer |
| **LoadBalancer** | Via external LB IP/hostname | Production external services |
| **ExternalName** | DNS alias | DNS alias to an external service |

## Step 1: Create a ClusterIP Service

ClusterIP assigns a virtual IP accessible only within the cluster.

### Via Portainer Form

When deploying an application, under **Publishing**:

```text
Service type:       ClusterIP
Container port:     8080
Protocol:           TCP
```

### Via YAML

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-api
  namespace: production
spec:
  type: ClusterIP        # Default if not specified
  selector:
    app: my-api          # Matches pods with this label
  ports:
    - name: http
      port: 80           # Service port (what clients connect to)
      targetPort: 8080   # Container port
      protocol: TCP
```

Default DNS name within cluster (with the default cluster domain): `my-api.production.svc.cluster.local`

## Step 2: Create a NodePort Service

NodePort exposes the service on a port on every node.

### Via Portainer

```text
Service type:       NodePort
Container port:     8080
NodePort:           30080   (default 30000-32767 range)
```

### Via YAML

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-api-external
  namespace: production
spec:
  type: NodePort
  selector:
    app: my-api
  ports:
    - name: http
      port: 80           # ClusterIP port
      targetPort: 8080   # Container port
      nodePort: 30080    # Node port (optional; auto-assigned if omitted)
      protocol: TCP
```

Access: `http://{any-node-ip}:30080`

## Step 3: Create a LoadBalancer Service

LoadBalancer provisions an external load balancer from your cloud provider or installed load balancer implementation.

### Via Portainer Form

```text
Service type:       LoadBalancer
Container port:     8080
Port:               80        (external port)
```

### Via YAML

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-api-lb
  namespace: production
  annotations:
    # Optional provider-specific annotations go here.
    # Check your cloud provider or load balancer controller documentation
    # before adding them.
spec:
  type: LoadBalancer
  selector:
    app: my-api
  ports:
    - name: http
      port: 80
      targetPort: 8080
    - name: https
      port: 443
      targetPort: 8443
  # Restrict to specific source IPs (security)
  loadBalancerSourceRanges:
    - "203.0.113.0/24"    # Your office IP range
```

```bash
# Get the LoadBalancer external IP

kubectl get svc my-api-lb -n production
# EXTERNAL-IP: 203.0.113.100
```

## Step 4: Multi-Port Services

A service can expose multiple ports:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app
  namespace: production
spec:
  type: ClusterIP
  selector:
    app: my-app
  ports:
    - name: http
      port: 80
      targetPort: 8080
    - name: https
      port: 443
      targetPort: 8443
    - name: grpc
      port: 9090
      targetPort: 9090
      protocol: TCP
    - name: metrics
      port: 9100
      targetPort: 9100
```

## Step 5: Headless Service (For StatefulSets)

A headless service returns individual pod IPs instead of a ClusterIP:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: production
spec:
  clusterIP: None    # Headless
  selector:
    app: postgres
  ports:
    - port: 5432
      targetPort: 5432
```

DNS query for headless service returns all pod IPs - useful for Redis Cluster, PostgreSQL with streaming replication, etc.

## Step 6: Expose Services via Ingress

For HTTP/HTTPS services, an Ingress is often a better fit than exposing each app with its own LoadBalancer:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.example.com
      secretName: api-tls
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-api        # ClusterIP service
                port:
                  number: 80
```

An Ingress resource only works if an Ingress controller is installed in the cluster.

## Step 7: Create Services in Portainer

In Portainer, you can view services under **Networking → Services**.

To create a service independently, use **Applications → Create from code** and deploy a Service manifest.

Or create via the application form, which automatically creates the service.

## Step 8: Check Service Status

```bash
# List all services
kubectl get svc -n production

# Check service EndpointSlices (must have at least one ready endpoint for traffic to flow)
kubectl get endpointslice -n production -l kubernetes.io/service-name=my-api

# If no EndpointSlices appear, check selector matches pod labels
kubectl get pods -n production -l app=my-api
```

## Conclusion

Choosing the right Kubernetes service type depends on your use case: ClusterIP for internal services, NodePort for direct node access, LoadBalancer for cloud-native external access, and Ingress for HTTP/HTTPS traffic with virtual hosting and TLS termination. Portainer makes creating common service types straightforward through the form UI, and you can use manifests for advanced service definitions.
