# How to Configure K3s Cluster with Tailscale for Secure Edge-to-Cloud Connectivity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, K3s, Tailscale

Description: Learn how to connect K3s edge clusters to cloud infrastructure using Tailscale VPN, enabling secure zero-trust networking without complex firewall rules or public IP requirements.

---

Edge Kubernetes clusters often sit behind NAT and firewalls, making traditional VPN setups complex. Tailscale provides zero-configuration VPN that creates encrypted peer-to-peer connections without requiring public IPs or port forwarding. By integrating Tailscale with K3s, you create secure edge-to-cloud connectivity with minimal operational overhead.

In this guide, you'll configure K3s edge clusters to use Tailscale for secure connectivity, enable cross-cluster service access, and implement zero-trust networking patterns.

## Understanding Tailscale for Edge Clusters

Tailscale builds on WireGuard to create a mesh VPN where each node gets a stable private IP. Benefits for edge K3s:

- No public IPs needed
- Works through NAT and firewalls
- Zero-touch device authentication
- Built-in access controls
- Automatic certificate rotation

Each K3s node joins the Tailscale network (tailnet), enabling direct encrypted communication between edge and cloud clusters.

## Installing Tailscale on K3s Nodes

On each K3s node, install Tailscale:

```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Authenticate and join tailnet
sudo tailscale up --authkey=<your-auth-key> \
  --advertise-tags=tag:k3s,tag:edge \
  --hostname=edge-node-01
```

Generate auth keys at https://login.tailscale.com/admin/settings/keys.

Verify connectivity:

```bash
tailscale status
tailscale ip -4
```

## Configuring K3s to Use Tailscale

Configure K3s API server to listen on Tailscale IP:

```bash
# Get Tailscale IP
TAILSCALE_IP=$(tailscale ip -4)

# Configure K3s
curl -sfL https://get.k3s.io | sh -s - server \
  --node-ip=$TAILSCALE_IP \
  --node-external-ip=$TAILSCALE_IP \
  --advertise-address=$TAILSCALE_IP \
  --tls-san=$TAILSCALE_IP \
  --flannel-iface=tailscale0
```

This makes K3s accessible via Tailscale network.

## Deploying Tailscale Operator

Run Tailscale as Kubernetes operator:

```yaml
# tailscale-operator.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: tailscale
---
apiVersion: v1
kind: Secret
metadata:
  name: operator-oauth
  namespace: tailscale
stringData:
  client_id: <your-client-id>
  client_secret: <your-client-secret>
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: operator
  namespace: tailscale
spec:
  replicas: 1
  selector:
    matchLabels:
      app: operator
  template:
    metadata:
      labels:
        app: operator
    spec:
      serviceAccountName: operator
      containers:
      - name: operator
        image: tailscale/k8s-operator:latest
        env:
        - name: OPERATOR_HOSTNAME
          value: "k3s-operator"
        - name: OPERATOR_SECRET
          value: "operator-oauth"
        - name: OPERATOR_NAMESPACE
          value: "tailscale"
        - name: PROXY_IMAGE
          value: "tailscale/tailscale:latest"
        - name: PROXY_TAGS
          value: "tag:k8s"
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
```

Apply:

```bash
kubectl apply -f tailscale-operator.yaml
```

## Exposing Services via Tailscale

Expose K3s services on Tailscale network:

```yaml
# nginx-tailscale-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx
  annotations:
    tailscale.com/expose: "true"
    tailscale.com/hostname: "edge-nginx"
spec:
  type: LoadBalancer
  loadBalancerClass: tailscale
  selector:
    app: nginx
  ports:
  - port: 80
    targetPort: 80
```

The service gets a stable Tailscale hostname: `edge-nginx.tail-xxxxx.ts.net`.

## Connecting Edge to Cloud Cluster

Join cloud cluster nodes to same tailnet:

```bash
# On cloud nodes
sudo tailscale up --authkey=<auth-key> \
  --advertise-tags=tag:k3s,tag:cloud \
  --hostname=cloud-node-01
```

Now edge and cloud nodes can communicate directly.

## Configuring Cross-Cluster Service Discovery

Use CoreDNS to resolve services across clusters:

```yaml
# coredns-tailscale-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom
  namespace: kube-system
data:
  tailscale.server: |
    cloud.local:53 {
        errors
        cache 30
        forward . 100.64.0.1  # Tailscale DNS
    }
```

Restart CoreDNS:

```bash
kubectl rollout restart -n kube-system deployment/coredns
```

Now edge pods can resolve `nginx.default.svc.cloud.local`.

## Implementing Zero-Trust Access Control

Use Tailscale ACLs to restrict access:

```json
{
  "acls": [
    {
      "action": "accept",
      "src": ["tag:edge"],
      "dst": ["tag:cloud:6443"]
    },
    {
      "action": "accept",
      "src": ["tag:cloud"],
      "dst": ["tag:edge:*"]
    }
  ],
  "tagOwners": {
    "tag:edge": ["admin@example.com"],
    "tag:cloud": ["admin@example.com"]
  }
}
```

Apply via Tailscale admin console.

## Monitoring Tailscale Connectivity

Track Tailscale status:

```yaml
# tailscale-monitor.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: tailscale-health
  namespace: kube-system
spec:
  schedule: "*/5 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          hostNetwork: true
          containers:
          - name: monitor
            image: alpine:latest
            command:
            - sh
            - -c
            - |
              apk add --no-cache curl jq
              STATUS=$(tailscale status --json)
              PEER_COUNT=$(echo "$STATUS" | jq '.Peer | length')
              echo "Tailscale peers: $PEER_COUNT"
              if [ "$PEER_COUNT" -lt 1 ]; then
                echo "WARNING: No Tailscale peers detected"
                exit 1
              fi
          restartPolicy: OnFailure
```

## Creating Tailscale Subnet Router

Route entire K3s cluster network through Tailscale:

```bash
# Enable IP forwarding
echo 'net.ipv4.ip_forward = 1' | sudo tee -a /etc/sysctl.conf
echo 'net.ipv6.conf.all.forwarding = 1' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Advertise cluster CIDR
sudo tailscale up \
  --advertise-routes=10.42.0.0/16 \
  --accept-routes
```

Now all pods are accessible via Tailscale.

## Implementing Failover

Configure multiple edge nodes as subnet routers:

```bash
# On edge-node-01
sudo tailscale up --advertise-routes=10.42.0.0/16

# On edge-node-02 (backup)
sudo tailscale up --advertise-routes=10.42.0.0/16
```

Tailscale automatically fails over if primary route becomes unavailable.

## Deploying Tailscale Sidecar

Run Tailscale as sidecar for individual pods:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-tailscale
spec:
  containers:
  - name: app
    image: my-app:v1
  - name: tailscale
    image: tailscale/tailscale:latest
    env:
    - name: TS_AUTHKEY
      valueFrom:
        secretKeyRef:
          name: tailscale-auth
          key: authkey
    - name: TS_HOSTNAME
      value: "my-app-pod"
    securityContext:
      capabilities:
        add: ["NET_ADMIN"]
```

## Conclusion

Tailscale transforms K3s edge networking by eliminating complex VPN configurations and firewall rules. The combination of zero-configuration setup and built-in zero-trust security makes Tailscale ideal for connecting distributed edge clusters to central cloud infrastructure securely and reliably.
