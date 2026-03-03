# How to Set Up Cilium LoadBalancer on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Cilium, LoadBalancer, Kubernetes, Bare Metal

Description: Learn how to configure Cilium as a LoadBalancer replacement on Talos Linux for bare-metal Kubernetes environments.

---

On cloud Kubernetes platforms, creating a Service with type LoadBalancer automatically provisions a cloud load balancer. On bare-metal clusters running Talos Linux, there is no cloud provider to do this. Services of type LoadBalancer just sit in Pending state forever. Cilium solves this problem with its built-in LoadBalancer IP Address Management (LB-IPAM) feature, which assigns external IPs to services and makes them reachable from outside the cluster.

## The Problem with Bare Metal LoadBalancers

When you create a LoadBalancer service on a bare-metal cluster without any special configuration, Kubernetes does not know how to assign an external IP:

```bash
kubectl create service loadbalancer my-svc --tcp=80:80

kubectl get svc my-svc
# NAME     TYPE           CLUSTER-IP    EXTERNAL-IP   PORT(S)        AGE
# my-svc   LoadBalancer   10.96.1.100   <pending>     80:31234/TCP   5m
```

Historically, people used MetalLB to solve this. But if you are already running Cilium, you do not need a separate tool. Cilium has its own LoadBalancer implementation that works natively.

## Prerequisites

- Talos Linux cluster with Cilium installed as the CNI
- Cilium version 1.13 or newer (LB-IPAM was introduced in 1.13)
- kube-proxy replacement enabled in Cilium
- A range of IP addresses available for LoadBalancer services

## Step 1: Enable LB-IPAM in Cilium

If Cilium is already installed, enable LB-IPAM:

```bash
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set kubeProxyReplacement=true \
  --set l2announcements.enabled=true \
  --set externalIPs.enabled=true
```

For a fresh installation:

```bash
helm install cilium cilium/cilium \
  --namespace kube-system \
  --set ipam.mode=kubernetes \
  --set kubeProxyReplacement=true \
  --set securityContext.capabilities.ciliumAgent="{CHOWN,KILL,NET_ADMIN,NET_RAW,IPC_LOCK,SYS_ADMIN,SYS_RESOURCE,DAC_OVERRIDE,FOWNER,SETGID,SETUID}" \
  --set securityContext.capabilities.cleanCiliumState="{NET_ADMIN,SYS_ADMIN,SYS_RESOURCE}" \
  --set cgroup.autoMount.enabled=false \
  --set cgroup.hostRoot=/sys/fs/cgroup \
  --set k8sServiceHost=localhost \
  --set k8sServicePort=7445 \
  --set l2announcements.enabled=true \
  --set externalIPs.enabled=true
```

The `l2announcements.enabled=true` flag enables Layer 2 service announcement, which uses ARP/NDP to make LoadBalancer IPs reachable on the local network.

## Step 2: Create an IP Pool

Define the range of IPs that Cilium can assign to LoadBalancer services:

```yaml
# lb-ip-pool.yaml
apiVersion: cilium.io/v2alpha1
kind: CiliumLoadBalancerIPPool
metadata:
  name: main-pool
spec:
  blocks:
  - start: "192.168.1.200"
    stop: "192.168.1.250"
```

You can also use CIDR notation:

```yaml
# lb-ip-pool-cidr.yaml
apiVersion: cilium.io/v2alpha1
kind: CiliumLoadBalancerIPPool
metadata:
  name: secondary-pool
spec:
  blocks:
  - cidr: "10.0.100.0/28"
```

For multiple pools with service selection:

```yaml
# multi-pool.yaml
apiVersion: cilium.io/v2alpha1
kind: CiliumLoadBalancerIPPool
metadata:
  name: production-pool
spec:
  blocks:
  - start: "192.168.1.200"
    stop: "192.168.1.220"
  serviceSelector:
    matchLabels:
      env: production
---
apiVersion: cilium.io/v2alpha1
kind: CiliumLoadBalancerIPPool
metadata:
  name: staging-pool
spec:
  blocks:
  - start: "192.168.1.221"
    stop: "192.168.1.240"
  serviceSelector:
    matchLabels:
      env: staging
```

```bash
kubectl apply -f lb-ip-pool.yaml

# Verify the pool was created
kubectl get ciliumloadbalancerippool
```

## Step 3: Configure L2 Announcements

Create an L2 announcement policy to tell Cilium how to announce LoadBalancer IPs on the network:

```yaml
# l2-announcement.yaml
apiVersion: cilium.io/v2alpha1
kind: CiliumL2AnnouncementPolicy
metadata:
  name: default-l2-policy
spec:
  # Which nodes can announce LoadBalancer IPs
  nodeSelector:
    matchExpressions:
    - key: node-role.kubernetes.io/control-plane
      operator: DoesNotExist
  # Which interfaces to use for ARP announcements
  interfaces:
  - ^eth[0-9]+
  externalIPs: true
  loadBalancerIPs: true
```

```bash
kubectl apply -f l2-announcement.yaml
```

The `interfaces` field uses a regex pattern to match network interfaces. Adjust this to match your Talos Linux network interface names.

## Step 4: Enable Device Detection on Talos

For L2 announcements to work, Cilium needs to detect the host network devices. Configure this in Cilium:

```bash
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set devices='{eth0,eth1}'
```

Or use auto-detection:

```bash
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set devices=""
```

## Step 5: Test LoadBalancer Services

Create a service and verify it gets an IP:

```yaml
# test-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: web-app-lb
spec:
  type: LoadBalancer
  selector:
    app: web-app
  ports:
  - port: 80
    targetPort: 80
```

```bash
kubectl apply -f test-service.yaml

# Check the service - it should now have an EXTERNAL-IP
kubectl get svc web-app-lb

# NAME         TYPE           CLUSTER-IP    EXTERNAL-IP      PORT(S)        AGE
# web-app-lb   LoadBalancer   10.96.2.100   192.168.1.200    80:30123/TCP   10s
```

Test access from another machine on the same network:

```bash
# From any machine on the same L2 network
curl http://192.168.1.200

# You should get the nginx welcome page
```

## Requesting a Specific IP

You can request a specific IP address for your service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-server-lb
spec:
  type: LoadBalancer
  # Request a specific IP from the pool
  loadBalancerIP: 192.168.1.210
  selector:
    app: api-server
  ports:
  - port: 443
    targetPort: 8443
```

The IP must be within one of your configured pools, or the assignment will fail.

## Multiple Services Example

```yaml
# production-services.yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend-lb
  labels:
    env: production
spec:
  type: LoadBalancer
  selector:
    app: frontend
  ports:
  - port: 80
    targetPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: api-lb
  labels:
    env: production
spec:
  type: LoadBalancer
  selector:
    app: api
  ports:
  - port: 443
    targetPort: 8443
---
apiVersion: v1
kind: Service
metadata:
  name: grpc-lb
  labels:
    env: production
spec:
  type: LoadBalancer
  selector:
    app: grpc-service
  ports:
  - port: 9090
    targetPort: 9090
```

Each service gets its own IP from the pool automatically.

## High Availability with L2

In L2 mode, only one node responds to ARP requests for a given LoadBalancer IP at any time. If that node goes down, another node takes over. You can configure the leader election behavior:

```yaml
# l2-ha-policy.yaml
apiVersion: cilium.io/v2alpha1
kind: CiliumL2AnnouncementPolicy
metadata:
  name: ha-l2-policy
spec:
  nodeSelector:
    matchExpressions:
    - key: node-role.kubernetes.io/control-plane
      operator: DoesNotExist
  interfaces:
  - ^eth[0-9]+
  externalIPs: true
  loadBalancerIPs: true
```

For true load balancing across multiple nodes (not just failover), use BGP mode instead of L2 mode. BGP with ECMP distributes traffic across all advertising nodes.

## Monitoring LoadBalancer Status

```bash
# Check IP pool utilization
kubectl get ciliumloadbalancerippool -o wide

# Check which services have IPs assigned
kubectl get svc -A --field-selector spec.type=LoadBalancer

# Check L2 announcement status
kubectl get ciliuml2announcementpolicy

# View Cilium's service state
kubectl exec -n kube-system ds/cilium -- cilium service list

# Check which node is handling a specific service IP
kubectl exec -n kube-system ds/cilium -- cilium bpf lb list
```

## Troubleshooting

If services stay in Pending:

```bash
# Check if the IP pool has available addresses
kubectl describe ciliumloadbalancerippool main-pool

# Check Cilium operator logs
kubectl logs -n kube-system -l app.kubernetes.io/name=cilium-operator --tail=50

# Verify L2 announcement policy exists
kubectl get ciliuml2announcementpolicy

# Check Cilium agent logs for LB-related messages
kubectl logs -n kube-system -l k8s-app=cilium --tail=50 | grep -i "lb\|loadbalancer\|l2"
```

Common issues:

- **No IP pool defined** - Create a CiliumLoadBalancerIPPool
- **IP range conflict** - Make sure your pool IPs are not used by other devices
- **L2 not working** - Verify interface regex matches your network interfaces
- **Service selector mismatch** - Check pool serviceSelector matches your service labels

## Summary

Cilium's built-in LoadBalancer on Talos Linux eliminates the need for external tools like MetalLB. Define IP pools, configure L2 announcements, and your LoadBalancer services get real external IPs that are reachable from the local network. For more advanced setups, combine with BGP for multi-node load distribution. The result is a clean, integrated solution that works naturally within the Cilium and Talos Linux ecosystem.
