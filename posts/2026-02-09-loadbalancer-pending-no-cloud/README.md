# How to Fix Kubernetes LoadBalancer Service Stuck in Pending Without Cloud Provider

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, LoadBalancer

Description: Learn how to diagnose and fix LoadBalancer services stuck in pending state on bare metal or on-premises clusters without cloud provider integration.

---

LoadBalancer services provide external access to Kubernetes applications, but they require cloud provider integration or alternative solutions. When you create a LoadBalancer service on a cluster without proper configuration, it remains stuck in the pending state indefinitely.

## Understanding LoadBalancer Services

LoadBalancer is a Kubernetes service type that provisions an external load balancer. On cloud platforms like AWS, GCP, or Azure, the cloud controller manager automatically creates cloud load balancers (ELB, Cloud Load Balancing, Azure Load Balancer) and assigns external IPs.

On bare metal clusters, self-hosted environments, or development clusters without cloud integration, LoadBalancer services have no controller to fulfill the request. They remain pending forever because nothing allocates an external IP.

## Identifying Stuck LoadBalancer Services

Check service status to see if external IPs are pending.

```bash
# List services showing external IPs
kubectl get svc -A

# Example output showing pending LoadBalancer
NAMESPACE   NAME         TYPE           CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE
default     web-app      LoadBalancer   10.96.45.123    <pending>     80:31234/TCP   5m

# Describe the service for more details
kubectl describe svc web-app

# Check service events
kubectl get events --field-selector involvedObject.name=web-app
```

The EXTERNAL-IP column shows `<pending>` indefinitely. No errors appear because this isn't technically an error, just an unfulfilled request.

## Why LoadBalancers Fail Without Cloud Providers

Kubernetes doesn't include a built-in load balancer implementation. It delegates to cloud providers or requires third-party solutions like MetalLB, Kube-VIP, or Porter.

Without any load balancer implementation, the service controller creates the Service object but can't progress further. It waits for something to assign an external IP, but nothing ever will.

## Solution 1: Use MetalLB

MetalLB is the most popular solution for bare metal LoadBalancer services. It operates in Layer 2 mode or BGP mode to assign and announce IP addresses.

```bash
# Install MetalLB using manifest
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.12/config/manifests/metallb-native.yaml

# Or install with Helm
helm repo add metallb https://metallb.github.io/metallb
helm install metallb metallb/metallb -n metallb-system --create-namespace

# Wait for MetalLB pods to be ready
kubectl wait --namespace metallb-system \
  --for=condition=ready pod \
  --selector=app=metallb \
  --timeout=90s
```

Configure an IP address pool that MetalLB can allocate from.

```yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: production-pool
  namespace: metallb-system
spec:
  addresses:
  - 192.168.1.240-192.168.1.250  # Range of available IPs
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: l2-advert
  namespace: metallb-system
spec:
  ipAddressPools:
  - production-pool
```

Apply the configuration and MetalLB will assign IPs to pending LoadBalancer services.

```bash
kubectl apply -f metallb-config.yaml

# Check that MetalLB assigned an IP
kubectl get svc web-app

# Should now show:
NAMESPACE   NAME      TYPE           CLUSTER-IP      EXTERNAL-IP     PORT(S)        AGE
default     web-app   LoadBalancer   10.96.45.123    192.168.1.240   80:31234/TCP   8m
```

## Solution 2: Use NodePort Instead

If you don't need true load balancing, convert the service to NodePort. This exposes the service on a port on every node.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app
  namespace: default
spec:
  type: NodePort
  selector:
    app: web
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
    nodePort: 30080  # Optional: specify port, otherwise auto-assigned
```

Access the service via any node IP and the NodePort.

```bash
# Get node IPs
kubectl get nodes -o wide

# Access service
curl http://node-ip:30080
```

NodePort doesn't provide load balancing or a single entry point, but it works without additional infrastructure.

## Solution 3: Use Ingress Controller

For HTTP/HTTPS services, an Ingress controller provides better external access than LoadBalancer services.

```bash
# Install nginx-ingress
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=NodePort

# Or use MetalLB to give the Ingress controller a LoadBalancer
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer
```

Create an Ingress resource instead of a LoadBalancer service.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app
spec:
  type: ClusterIP  # Internal service only
  selector:
    app: web
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-app-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
  - host: web.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-app
            port:
              number: 80
```

The Ingress controller handles external access, and you only need one LoadBalancer service for the Ingress controller itself.

## Solution 4: External Load Balancer

Use an external hardware load balancer or software load balancer (HAProxy, Nginx) pointing to node ports.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app
spec:
  type: NodePort
  selector:
    app: web
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
    nodePort: 30080
```

Configure your external load balancer to distribute traffic across all nodes on port 30080. This approach works well in enterprise environments with existing load balancer infrastructure.

## Solution 5: Kube-VIP for High Availability

Kube-VIP provides virtual IP addresses for services without external dependencies. It's particularly useful for control plane load balancing.

```bash
# Install kube-vip as DaemonSet
kubectl apply -f https://kube-vip.io/manifests/rbac.yaml

# Create kube-vip config
kubectl create configmap -n kube-system kubevip \
  --from-literal=range-global=192.168.1.200-192.168.1.210
```

Create a DaemonSet for kube-vip.

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: kube-vip
  namespace: kube-system
spec:
  selector:
    matchLabels:
      name: kube-vip
  template:
    metadata:
      labels:
        name: kube-vip
    spec:
      hostNetwork: true
      serviceAccountName: kube-vip
      containers:
      - name: kube-vip
        image: ghcr.io/kube-vip/kube-vip:v0.6.4
        args:
        - manager
        env:
        - name: vip_interface
          value: eth0
        - name: vip_arp
          value: "true"
        - name: vip_cidr
          value: "32"
        - name: svc_enable
          value: "true"
        - name: lb_enable
          value: "true"
        - name: lb_port
          value: "6443"
        securityContext:
          capabilities:
            add:
            - NET_ADMIN
            - NET_RAW
```

Kube-VIP will now assign IPs to LoadBalancer services from the configured range.

## Checking Load Balancer Controller Status

If you've installed a solution but services still show pending, verify the controller is running.

```bash
# For MetalLB
kubectl get pods -n metallb-system
kubectl logs -n metallb-system -l component=controller

# For kube-vip
kubectl get pods -n kube-system -l name=kube-vip
kubectl logs -n kube-system -l name=kube-vip

# Check controller logs for errors
kubectl logs -n metallb-system deploy/controller --tail=100
```

Common issues include misconfigured IP ranges, network interface problems, or RBAC permission errors.

## Verifying IP Assignment

Once a solution is installed, verify that IPs are actually assigned and accessible.

```bash
# Check service status
kubectl get svc web-app -o wide

# Test connectivity to assigned IP
curl http://192.168.1.240

# Check if IP responds to ping
ping 192.168.1.240

# For Layer 2 mode, check ARP entries
arp -a | grep 192.168.1.240

# Verify pods are receiving traffic
kubectl logs -l app=web --tail=10
```

## Common Configuration Mistakes

MetalLB IP ranges must be available and routable in your network. Using IPs outside your subnet or already assigned to other devices causes problems.

```yaml
# Wrong: IPs from different subnet than nodes
addresses:
- 10.0.0.1-10.0.0.10  # Node network is 192.168.1.0/24

# Correct: IPs from same subnet as nodes
addresses:
- 192.168.1.240-192.168.1.250
```

Firewall rules might block traffic to the assigned IPs. Ensure your network allows traffic to the IP range.

## Mixing Service Types

You might want some services as LoadBalancer and others as ClusterIP. This works fine once a load balancer solution is installed.

```yaml
# Internal service - ClusterIP
apiVersion: v1
kind: Service
metadata:
  name: internal-api
spec:
  type: ClusterIP
  selector:
    app: internal
  ports:
  - port: 8080
---
# External service - LoadBalancer
apiVersion: v1
kind: Service
metadata:
  name: public-api
spec:
  type: LoadBalancer
  selector:
    app: public
  ports:
  - port: 80
    targetPort: 8080
```

Only the LoadBalancer service gets an external IP.

## Monitoring Load Balancer Health

Track LoadBalancer service health and IP allocation.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-rules
  namespace: monitoring
data:
  loadbalancer-rules.yml: |
    groups:
    - name: loadbalancer_services
      interval: 30s
      rules:
      - alert: LoadBalancerPending
        expr: |
          kube_service_status_load_balancer_ingress == 0
          and
          kube_service_spec_type{type="LoadBalancer"} == 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "LoadBalancer service has no external IP"
          description: "Service {{ $labels.service }} in namespace {{ $labels.namespace }} pending for 5+ minutes"
```

## Converting Existing LoadBalancer Services

If you have existing pending LoadBalancer services, they'll automatically get IPs once you install a solution. No need to recreate them.

```bash
# List all pending LoadBalancers
kubectl get svc -A -o json | \
  jq -r '.items[] | select(.spec.type=="LoadBalancer" and .status.loadBalancer.ingress==null) | "\(.metadata.namespace)/\(.metadata.name)"'

# After installing MetalLB, check again
kubectl get svc -A -o wide | grep LoadBalancer
```

All previously pending services should now have external IPs assigned.

## Best Practices

Choose the right solution for your environment. MetalLB works well for bare metal and on-premises. Use cloud provider load balancers when available.

Centralize external access through an Ingress controller rather than creating many LoadBalancer services. This reduces external IP usage and simplifies management.

Document your IP allocation strategy. Track which IPs are assigned to which services to avoid conflicts.

Test failover behavior. Verify that load balancers correctly handle node failures and pod restarts.

## Conclusion

LoadBalancer services stuck in pending state on non-cloud clusters require additional infrastructure. Install MetalLB, kube-vip, or use an Ingress controller to provide external access. Each solution has tradeoffs in complexity, features, and operational overhead. Choose based on your environment's networking capabilities and operational preferences. With the right solution in place, LoadBalancer services work seamlessly whether you're on cloud platforms or bare metal infrastructure.
