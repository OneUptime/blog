# How to Configure LoadBalancer Services in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, LoadBalancer

Description: A practical guide to configuring LoadBalancer services in Rancher for exposing applications with external IP addresses.

LoadBalancer is a Kubernetes service type that provisions an external load balancer to route traffic to your application. In cloud environments, this automatically creates a cloud-provider load balancer (AWS ELB/NLB, Azure LB, GCP LB). This guide covers how to configure LoadBalancer services in Rancher across different environments.

## Prerequisites

- A running Rancher instance (v2.6 or later)
- A managed Kubernetes cluster (cloud-hosted or with MetalLB for bare-metal)
- kubectl access to your cluster
- A deployed application

## Step 1: Create a Basic LoadBalancer Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: app-loadbalancer
  namespace: default
spec:
  type: LoadBalancer
  selector:
    app: my-app
  ports:
  - name: http
    port: 80
    targetPort: 8080
    protocol: TCP
```

```bash
kubectl apply -f app-lb.yaml
```

Watch for the external IP assignment:

```bash
kubectl get svc app-loadbalancer -w
```

## Step 2: Create via the Rancher UI

1. In the Rancher dashboard, click **☰ > Cluster Management**.
2. Open your cluster and click **Explore**.
3. Go to **Service Discovery** > **Services**.
4. Click **Create**.
5. Select **LoadBalancer** as the service type.
6. Configure:
   - **Name**: `app-loadbalancer`
   - **Namespace**: `default`
   - **Selectors**: `app = my-app`
   - **Port**: `80` -> `8080`
7. Click **Create**.

## Step 3: Configure AWS-Specific Load Balancer

For EKS clusters managed by Rancher that use the AWS Load Balancer Controller, use annotations like these to provision a Network Load Balancer (NLB):

```yaml
apiVersion: v1
kind: Service
metadata:
  name: aws-nlb-service
  namespace: default
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "external"
    service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: "instance"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
spec:
  type: LoadBalancer
  selector:
    app: my-app
  ports:
  - port: 80
    targetPort: 8080
```

For an internal load balancer:

```yaml
metadata:
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internal"
```

## Step 4: Configure Azure-Specific Load Balancer

For AKS clusters:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: azure-lb-service
  namespace: default
  annotations:
    service.beta.kubernetes.io/azure-load-balancer-internal: "false"
    service.beta.kubernetes.io/azure-dns-label-name: myapp
spec:
  type: LoadBalancer
  selector:
    app: my-app
  ports:
  - port: 80
    targetPort: 8080
```

For internal Azure load balancer:

```yaml
metadata:
  annotations:
    service.beta.kubernetes.io/azure-load-balancer-internal: "true"
    service.beta.kubernetes.io/azure-load-balancer-internal-subnet: my-subnet
```

## Step 5: Configure GCP-Specific Load Balancer

For GKE clusters, a `LoadBalancer` Service is external by default. To create a backend service-based external load balancer:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: gcp-lb-service
  namespace: default
  annotations:
    cloud.google.com/l4-rbs: "enabled"
spec:
  type: LoadBalancer
  selector:
    app: my-app
  ports:
  - port: 80
    targetPort: 8080
```

For an internal load balancer:

```yaml
metadata:
  annotations:
    networking.gke.io/load-balancer-type: "Internal"
```

## Step 6: Restrict Source IP Ranges

Limit access to the load balancer by specifying allowed source ranges:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: restricted-lb
  namespace: default
spec:
  type: LoadBalancer
  loadBalancerSourceRanges:
  - 10.0.0.0/8
  - 192.168.1.0/24
  - 203.0.113.50/32
  selector:
    app: my-app
  ports:
  - port: 80
    targetPort: 8080
```

## Step 7: Configure External Traffic Policy

Control how external traffic is routed to pods:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: local-traffic-lb
  namespace: default
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  healthCheckNodePort: 30100
  selector:
    app: my-app
  ports:
  - port: 80
    targetPort: 8080
```

`externalTrafficPolicy: Local` preserves the client source IP but only sends traffic to nodes with running pods. `Cluster` (default) distributes evenly but may lose the original client IP.

## Step 8: Assign a Static IP

Static IP assignment is provider-specific. The legacy `spec.loadBalancerIP` field was deprecated in Kubernetes v1.24, so prefer your cloud provider's supported annotations. For example, in AKS you can reference a pre-created Public IP by name:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: static-ip-lb
  namespace: default
  annotations:
    service.beta.kubernetes.io/azure-load-balancer-resource-group: my-node-resource-group
    service.beta.kubernetes.io/azure-pip-name: myAKSPublicIP
spec:
  type: LoadBalancer
  selector:
    app: my-app
  ports:
  - port: 80
    targetPort: 8080
```

## Step 9: Configure Multiple Ports

Expose multiple ports through a single load balancer:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: multi-port-lb
  namespace: default
spec:
  type: LoadBalancer
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
```

## Step 10: Monitor LoadBalancer Services

Check the service status and external IP:

```bash
kubectl get svc app-loadbalancer -n default
kubectl describe svc app-loadbalancer -n default
kubectl get events -n default --field-selector involvedObject.name=app-loadbalancer
```

Test external access:

```bash
curl http://<EXTERNAL-IP>/
```

## Troubleshooting

- **Pending external IP**: Check cloud provider quotas and permissions; ensure the cloud controller manager is running
- **Connection timeout**: Verify security groups and firewall rules allow traffic on the service ports
- **Source IP not preserved**: Set `externalTrafficPolicy: Local`
- **Cost concerns**: Each LoadBalancer service creates a cloud load balancer; consider using Ingress to consolidate
- **Bare-metal clusters**: Install MetalLB to provide LoadBalancer functionality without a cloud provider

## Summary

LoadBalancer services in Rancher provide the most straightforward way to expose applications with external IP addresses. Cloud providers automatically provision and manage the underlying load balancer infrastructure. By using provider-specific annotations, you can fine-tune the load balancer behavior for your specific environment, whether it is AWS, Azure, GCP, or bare-metal with MetalLB.
