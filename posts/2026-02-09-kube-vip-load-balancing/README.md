# How to Set Up kube-vip for Control Plane and Service Load Balancing Without Cloud Provider

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Load Balancing, High Availability

Description: Learn how to deploy kube-vip for high availability control plane load balancing and LoadBalancer service type support in bare-metal and edge Kubernetes clusters without cloud provider integration.

---

Running Kubernetes outside of cloud environments presents challenges for high availability and load balancing. Cloud providers offer managed load balancers that automatically distribute traffic and provide virtual IPs, but on-premises and bare-metal clusters need alternative solutions. kube-vip fills this gap by providing both control plane high availability and LoadBalancer service support using Virtual IPs and BGP routing.

This guide walks you through setting up kube-vip in various configurations, from basic control plane HA to advanced BGP-based service load balancing.

## What is kube-vip?

kube-vip is a lightweight load balancing solution that provides:

1. **Control Plane High Availability**: A floating virtual IP that moves between control plane nodes
2. **LoadBalancer Services**: Allocates external IPs to services of type LoadBalancer
3. **ARP and BGP Support**: Works in Layer 2 (ARP) or Layer 3 (BGP) mode
4. **No External Dependencies**: Runs entirely within Kubernetes as a DaemonSet or static pod

Unlike MetalLB or other solutions, kube-vip can serve both control plane and service load balancing needs with a single component.

## Control Plane High Availability Setup

For a highly available control plane, kube-vip provides a virtual IP that always points to a healthy control plane node. This allows worker nodes and external clients to use a single endpoint regardless of which control plane node is active.

### Generate the kube-vip Manifest

Before cluster initialization, generate the static pod manifest:

```bash
# Set your desired virtual IP
export VIP=192.168.1.100

# Set the network interface (usually eth0)
export INTERFACE=eth0

# Pull the kube-vip image
export KVVERSION=v0.7.0

# Generate the manifest
docker run --network host --rm ghcr.io/kube-vip/kube-vip:$KVVERSION manifest pod \
    --interface $INTERFACE \
    --address $VIP \
    --controlplane \
    --services \
    --arp \
    --leaderElection | tee /etc/kubernetes/manifests/kube-vip.yaml
```

This creates a static pod manifest that kubelet will automatically start.

### Initialize the Cluster with the Virtual IP

Now initialize your Kubernetes cluster using the virtual IP as the control plane endpoint:

```bash
# Initialize with kubeadm using the VIP
kubeadm init \
  --control-plane-endpoint=$VIP:6443 \
  --upload-certs \
  --pod-network-cidr=10.244.0.0/16
```

The `--control-plane-endpoint` tells all components to connect to the virtual IP instead of a specific node IP.

### Deploy kube-vip on Additional Control Plane Nodes

When joining additional control plane nodes, place the same kube-vip manifest on each node:

```bash
# On each new control plane node
scp /etc/kubernetes/manifests/kube-vip.yaml node2:/etc/kubernetes/manifests/

# Join the node to the cluster
kubeadm join $VIP:6443 \
  --token <token> \
  --discovery-token-ca-cert-hash sha256:<hash> \
  --control-plane \
  --certificate-key <cert-key>
```

kube-vip uses leader election to determine which node holds the virtual IP at any time. If the active node fails, another takes over automatically.

## Service Load Balancing with ARP Mode

After establishing control plane HA, configure kube-vip to provide LoadBalancer services using Layer 2 ARP.

### Deploy kube-vip as a DaemonSet

For service load balancing on worker nodes, deploy kube-vip as a DaemonSet:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kube-vip
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kube-vip-role
rules:
  - apiGroups: [""]
    resources: ["services", "endpoints", "nodes"]
    verbs: ["list","get","watch"]
  - apiGroups: [""]
    resources: ["services/status"]
    verbs: ["update"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: kube-vip-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: kube-vip-role
subjects:
- kind: ServiceAccount
  name: kube-vip
  namespace: kube-system
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: kube-vip-ds
  namespace: kube-system
spec:
  selector:
    matchLabels:
      name: kube-vip-ds
  template:
    metadata:
      labels:
        name: kube-vip-ds
    spec:
      serviceAccountName: kube-vip
      hostNetwork: true
      containers:
      - name: kube-vip
        image: ghcr.io/kube-vip/kube-vip:v0.7.0
        imagePullPolicy: Always
        args:
        - manager
        env:
        - name: vip_arp
          value: "true"
        - name: vip_interface
          value: "eth0"
        - name: port
          value: "6443"
        - name: vip_cidr
          value: "32"
        - name: svc_enable
          value: "true"
        - name: svc_election
          value: "true"
        - name: vip_leaderelection
          value: "true"
        - name: vip_leaseduration
          value: "5"
        - name: vip_renewdeadline
          value: "3"
        - name: vip_retryperiod
          value: "1"
        securityContext:
          capabilities:
            add:
            - NET_ADMIN
            - NET_RAW
```

Apply this configuration:

```bash
kubectl apply -f kube-vip-daemonset.yaml
```

### Configure IP Address Pool

Create a ConfigMap defining the IP address range for LoadBalancer services:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubevip
  namespace: kube-system
data:
  cidr-global: 192.168.1.200-192.168.1.250
  # Optionally define per-namespace ranges
  cidr-development: 192.168.2.0/24
```

Apply the configuration:

```bash
kubectl apply -f kubevip-config.yaml
```

### Create a LoadBalancer Service

Now create a service of type LoadBalancer:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-lb
spec:
  type: LoadBalancer
  selector:
    app: nginx
  ports:
  - port: 80
    targetPort: 80
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:latest
        ports:
        - containerPort: 80
```

Apply and check the service:

```bash
kubectl apply -f nginx-lb.yaml

# Check the assigned external IP
kubectl get svc nginx-lb
# NAME       TYPE           CLUSTER-IP      EXTERNAL-IP     PORT(S)        AGE
# nginx-lb   LoadBalancer   10.96.100.123   192.168.1.200   80:30123/TCP   10s
```

kube-vip automatically assigns an IP from the configured range and advertises it using ARP.

## BGP Mode for Layer 3 Load Balancing

For larger networks or integration with existing BGP infrastructure, use BGP mode instead of ARP.

### Configure BGP Peers

Define BGP configuration in the kube-vip DaemonSet:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: kube-vip-ds
  namespace: kube-system
spec:
  selector:
    matchLabels:
      name: kube-vip-ds
  template:
    metadata:
      labels:
        name: kube-vip-ds
    spec:
      serviceAccountName: kube-vip
      hostNetwork: true
      containers:
      - name: kube-vip
        image: ghcr.io/kube-vip/kube-vip:v0.7.0
        args:
        - manager
        env:
        - name: vip_interface
          value: "eth0"
        - name: port
          value: "6443"
        - name: svc_enable
          value: "true"
        - name: svc_election
          value: "true"
        # Enable BGP
        - name: bgp_enable
          value: "true"
        - name: bgp_routerid
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
        # BGP peer configuration
        - name: bgp_as
          value: "65000"
        - name: bgp_peeraddress
          value: "192.168.1.1"  # Your router IP
        - name: bgp_peeras
          value: "65001"
        - name: bgp_peers
          value: "192.168.1.1:65001:false"  # Multiple peers separated by commas
        securityContext:
          capabilities:
            add:
            - NET_ADMIN
            - NET_RAW
```

### Multi-Peer BGP Configuration

For redundancy, configure multiple BGP peers:

```yaml
        - name: bgp_peers
          value: "192.168.1.1:65001:false,192.168.1.2:65001:false"
```

Each kube-vip instance establishes BGP sessions with all configured peers and advertises service IPs.

### Verify BGP Sessions

Check BGP status using your router's management interface or CLI. On the Kubernetes side, check kube-vip logs:

```bash
kubectl logs -n kube-system -l name=kube-vip-ds

# Look for messages like:
# INFO[0010] Starting BGP
# INFO[0010] BGP Server started, listening on 0.0.0.0:179
# INFO[0011] Peer 192.168.1.1 is added
# INFO[0012] Peer 192.168.1.1 Up
```

## Advanced Configuration Options

### IP Address Allocation Strategies

Control how kube-vip assigns IPs to services:

**Request specific IP**:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
  annotations:
    kube-vip.io/loadbalancerIPs: "192.168.1.220"
spec:
  type: LoadBalancer
  # ...
```

**Use specific IP pool**:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: dev-service
  annotations:
    kube-vip.io/ipam-address-pool: "development"
spec:
  type: LoadBalancer
  # ...
```

### DHCP-Based IP Allocation

Instead of static ranges, use DHCP to obtain IPs:

```yaml
        - name: svc_enable
          value: "true"
        - name: enable_dhcp
          value: "true"
```

This is useful for dynamic environments where IP management is handled externally.

### Service Annotations

Customize load balancer behavior per service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: custom-lb
  annotations:
    # Set VIP to a specific interface
    kube-vip.io/vip-interface: "eth1"
    # Disable leader election for this service
    kube-vip.io/vip-svc-election: "false"
    # Hwaddr for ARP (advanced)
    kube-vip.io/hwaddr: "00:00:00:00:00:01"
spec:
  type: LoadBalancer
  # ...
```

## Monitoring and Troubleshooting

### Check kube-vip Pod Status

```bash
# Control plane static pods
kubectl get pods -n kube-system -l component=kube-vip

# Service DaemonSet
kubectl get pods -n kube-system -l name=kube-vip-ds
```

### View kube-vip Logs

```bash
# For DaemonSet
kubectl logs -n kube-system -l name=kube-vip-ds --tail=50

# For static pod
kubectl logs -n kube-system kube-vip-<node-name>
```

### Test Virtual IP Reachability

```bash
# Ping the control plane VIP
ping 192.168.1.100

# Check which node holds the VIP
ip addr show dev eth0 | grep 192.168.1.100
```

### Verify ARP Announcements

Use tcpdump to see ARP traffic:

```bash
# On a node
sudo tcpdump -i eth0 arp

# You should see Gratuitous ARP when VIP moves:
# ARP, Reply 192.168.1.100 is-at aa:bb:cc:dd:ee:ff, length 28
```

### Common Issues and Solutions

**Services stuck in pending**:
- Check if IP pool is exhausted
- Verify kube-vip DaemonSet is running
- Check ConfigMap for correct IP ranges

**VIP not accessible**:
- Verify network interface matches configuration
- Check firewall rules allow ARP or BGP traffic
- Ensure no IP conflicts exist on the network

**BGP peering fails**:
- Verify BGP peer AS numbers are correct
- Check network connectivity to BGP peers
- Ensure firewall allows TCP port 179

## Performance Considerations

kube-vip is lightweight but has performance characteristics to consider:

- **ARP mode**: Simple but creates broadcast traffic. Works well for small clusters.
- **BGP mode**: Scales better for larger deployments and integrates with existing routing infrastructure.
- **Leader election**: Only one node actively handles each VIP. For high throughput, distribute services across multiple VIPs.

### Resource Usage

kube-vip has minimal resource requirements:

```yaml
        resources:
          requests:
            cpu: 50m
            memory: 32Mi
          limits:
            cpu: 100m
            memory: 64Mi
```

## Integration with Ingress Controllers

Combine kube-vip with ingress controllers for complete edge routing:

```yaml
# kube-vip provides the LoadBalancer IP
apiVersion: v1
kind: Service
metadata:
  name: ingress-nginx
  namespace: ingress-nginx
spec:
  type: LoadBalancer
  selector:
    app.kubernetes.io/name: ingress-nginx
  ports:
  - name: http
    port: 80
    targetPort: 80
  - name: https
    port: 443
    targetPort: 443
---
# Ingress routes traffic to backend services
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: example-ingress
spec:
  ingressClassName: nginx
  rules:
  - host: example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: example-service
            port:
              number: 80
```

Users connect to the kube-vip LoadBalancer IP, which routes to the ingress controller, which then routes to backend pods.

## Conclusion

kube-vip provides a powerful solution for Kubernetes networking outside cloud environments. By combining control plane high availability with LoadBalancer service support in a single lightweight component, it simplifies bare-metal and edge deployments.

Whether you're running Kubernetes in your data center, at edge locations, or in air-gapped environments, kube-vip delivers the load balancing capabilities you need without depending on external infrastructure or cloud provider integrations. Start with ARP mode for simple setups, then graduate to BGP for enterprise-scale deployments with full routing integration.
