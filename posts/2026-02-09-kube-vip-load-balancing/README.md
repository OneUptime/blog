# How to Set Up kube-vip for Control Plane and Service Load Balancing Without

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

> **Prerequisites - read this first.** The steps below assume a *greenfield* cluster: nothing has been initialized yet. kube-vip must be present as a static pod on the first control plane node **before** you run `kubeadm init`, and on each additional control plane node **before** you run `kubeadm join --control-plane`. You cannot simply drop the manifest into a cluster that kubespray, RKE, or `kubeadm init` has already stood up - the existing control-plane components will still be bound to the original node IP on ports `6443`, `2379`, `2380`, `10257`, `10259`, and `10250`, and `kubeadm init` will fail the preflight checks. If you already have a running cluster, jump to the section **Adding kube-vip to an Existing Cluster** below.

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

### Using containerd Instead of Docker

If your hosts don't have Docker - for example on modern Ubuntu or on nodes where containerd is the only runtime - swap the `docker run` command with `ctr`:

```bash
sudo ctr image pull ghcr.io/kube-vip/kube-vip:$KVVERSION
sudo ctr run --rm --net-host ghcr.io/kube-vip/kube-vip:$KVVERSION vip \
    /kube-vip manifest pod \
    --interface $INTERFACE \
    --address $VIP \
    --controlplane \
    --arp \
    --leaderElection \
    --services \
  | sudo tee /etc/kubernetes/manifests/kube-vip.yaml
```

The manifest output is identical; only the way you invoke the kube-vip binary inside the container changes.

## Adding kube-vip to an Existing Cluster

If your cluster is already up - for example it was bootstrapped by **kubespray**, RKE2, k3s, or a previous `kubeadm init` - do **not** run `kubeadm init` again. Doing so will fail with errors like:

```text
[ERROR Port-6443]: Port 6443 is in use
[ERROR Port-2379]: Port 2379 is in use
[ERROR FileAvailable--etc-kubernetes-manifests-kube-apiserver.yaml]: ... already exists
[ERROR DirAvailable--var-lib-etcd]: /var/lib/etcd is not empty
```

Those errors mean the cluster is already running and `kubeadm init` is refusing to overwrite it. You have two choices:

### Option A (Recommended): Use Your Installer's Built-in kube-vip Support

Most installers ship first-class kube-vip integration. Use it instead of reaching for `kubeadm` manually.

- **kubespray** - set the following in your inventory group vars and re-run the playbook. Kubespray will generate the manifests, wire the control-plane endpoint to the VIP, and roll the change out cleanly across all control plane nodes:

  ```yaml
  # group_vars/k8s_cluster/k8s-cluster.yml
  kube_vip_enabled: true
  kube_vip_arp_enabled: true               # or kube_vip_bgp_enabled for BGP
  kube_vip_controlplane_enabled: true
  kube_vip_services_enabled: false         # enable later once CP is stable
  kube_vip_interface: eth0
  kube_vip_address: 192.168.1.100
  loadbalancer_apiserver:
    address: 192.168.1.100
    port: 6443
  ```

  Then run `ansible-playbook -i inventory/mycluster/hosts.yaml cluster.yml`. Kubespray will handle the manifest placement and the `kube-apiserver` reconfiguration for you.

- **RKE2 / k3s** - pass the VIP via `--tls-san` and deploy kube-vip as a static pod under `/var/lib/rancher/rke2/server/manifests/` (RKE2) or `/var/lib/rancher/k3s/server/manifests/` (k3s).

### Option B: Place the Static Pod on Existing Nodes Manually

You can add the kube-vip static pod to an already-initialized control plane without running `kubeadm init` again. kubelet will pick the manifest up on its own. This works, but it does **not** retroactively change the API server certificate SANs or the cluster's `controlPlaneEndpoint` - clients that use the VIP must trust a cert that includes it.

1. On each control plane node, drop the manifest:

    ```bash
    # Generate as shown above, but DO NOT run kubeadm init afterwards
    sudo cp kube-vip.yaml /etc/kubernetes/manifests/
    ```

2. Verify the pod comes up and the VIP is reachable:

    ```bash
    kubectl -n kube-system get pods | grep kube-vip
    ping 192.168.1.100
    ```

3. Update the API server certificate SANs to include the VIP. On each control plane node, export the kubeadm ClusterConfiguration, edit it so `apiServer.certSANs` includes the VIP, then regenerate the API server serving certificate. `kubeadm init phase certs apiserver` skips generation if the existing certificate and key are still present, so move them aside first:

    ```bash
    kubectl -n kube-system get configmap kubeadm-config \
      -o jsonpath='{.data.ClusterConfiguration}' > kubeadm-config.yaml
    # edit kubeadm-config.yaml so apiServer.certSANs includes 192.168.1.100

    sudo mv /etc/kubernetes/pki/apiserver.crt /etc/kubernetes/pki/apiserver.crt.bak
    sudo mv /etc/kubernetes/pki/apiserver.key /etc/kubernetes/pki/apiserver.key.bak

    sudo kubeadm init phase certs apiserver \
      --config kubeadm-config.yaml
    ```

    Then restart `kube-apiserver` (deleting the static pod forces kubelet to recreate it):

    ```bash
    sudo mv /etc/kubernetes/manifests/kube-apiserver.yaml /tmp/
    sleep 20
    sudo mv /tmp/kube-apiserver.yaml /etc/kubernetes/manifests/
    ```

4. Update `controlPlaneEndpoint` in the `kubeadm-config` ConfigMap so that nodes joining later use the VIP:

    ```bash
    kubectl -n kube-system edit configmap kubeadm-config
    # set: clusterConfiguration.controlPlaneEndpoint: "192.168.1.100:6443"
    ```

### Option C (Destructive - Only If You Genuinely Want to Rebuild)

If you truly want to start over on a node:

```bash
sudo kubeadm reset -f
sudo rm -rf /etc/kubernetes/ /var/lib/etcd/ /var/lib/kubelet/
sudo systemctl restart containerd
```

**Do this only if you understand that it destroys the node's cluster state**, and never on more than one control plane node at a time unless you have a tested backup of etcd. The `[ERROR Port-2379]` / `[ERROR Port-2380]` errors after `kubeadm reset` usually mean etcd is still running from systemd or from leftover pods - the `rm -rf /var/lib/etcd` step clears its data dir, but if etcd is running as a systemd unit (common with kubespray), stop it explicitly: `sudo systemctl stop etcd`.

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
    resources: ["services/status"]
    verbs: ["update"]
  - apiGroups: [""]
    resources: ["services", "endpoints"]
    verbs: ["list","get","watch","update"]
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["list","get","watch","update","patch"]
  - apiGroups: ["coordination.k8s.io"]
    resources: ["leases"]
    verbs: ["list","get","watch","update","create"]
  - apiGroups: ["discovery.k8s.io"]
    resources: ["endpointslices"]
    verbs: ["list","get","watch","update"]
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["list"]
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
        - name: vip_subnet
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

Install the kube-vip cloud provider, which allocates external IPs for `LoadBalancer` Services, then create a ConfigMap defining the IP address range it can use:

```bash
kubectl apply -f https://raw.githubusercontent.com/kube-vip/kube-vip-cloud-provider/main/manifest/kube-vip-cloud-controller.yaml
```

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubevip
  namespace: kube-system
data:
  range-global: 192.168.1.200-192.168.1.250
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

The kube-vip cloud provider assigns an IP from the configured range, and kube-vip advertises it using ARP.

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
          value: "192.168.1.1:65001::false"  # Multiple peers separated by commas
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
          value: "192.168.1.1:65001::false,192.168.1.2:65001::false"
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
apiVersion: v1
kind: Service
metadata:
  name: dhcp-lb
  annotations:
    kube-vip.io/loadbalancerIPs: "0.0.0.0"
spec:
  type: LoadBalancer
  # ...
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
    # Ignore this service during kube-vip reconciliation
    kube-vip.io/ignore: "true"
    # Request a specific DHCP address
    kube-vip.io/requestedIP: "192.168.1.221"
    # Hardware address for DHCP (advanced)
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

Resource Usage

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
