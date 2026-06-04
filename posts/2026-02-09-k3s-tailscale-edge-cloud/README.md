# Configure K3s Cluster with Tailscale for Secure Edge-to-Cloud Connectivity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, k3s, Tailscale

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
- Automatic key management

Each K3s node joins the Tailscale network (tailnet), enabling direct encrypted communication between edge and cloud clusters.

## Installing Tailscale on K3s Nodes

On each K3s node, install Tailscale:

```bash
# Install Tailscale

curl -fsSL https://tailscale.com/install.sh | sh

# Authenticate and join tailnet
sudo tailscale up --auth-key=<your-auth-key> \
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

Create an OAuth client with Devices Core, Auth Keys, and Services write scopes, tagged with `tag:k8s-operator`, then install the operator:

```bash
helm repo add tailscale https://pkgs.tailscale.com/helmcharts
helm repo update

helm upgrade \
  --install \
  tailscale-operator \
  tailscale/tailscale-operator \
  --namespace=tailscale \
  --create-namespace \
  --set-string oauth.clientId="<your-client-id>" \
  --set-string oauth.clientSecret="<your-client-secret>" \
  --wait
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
sudo tailscale up --auth-key=<auth-key> \
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
        forward . <cloud-coredns-tailscale-ip>
    }
```

Restart CoreDNS:

```bash
kubectl rollout restart -n kube-system deployment/coredns
```

Now edge pods can resolve `nginx.default.svc.cloud.local` if the cloud cluster is configured with `cloud.local` as its cluster domain and its CoreDNS endpoint is reachable over Tailscale.

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
            image: tailscale/tailscale:stable
            command:
            - sh
            - -c
            - |
              tailscale status
              if ! tailscale ping --timeout=10s cloud-node-01; then
                echo "WARNING: cloud-node-01 is not reachable over Tailscale"
                exit 1
              fi
            volumeMounts:
            - name: tailscale-socket
              mountPath: /var/run/tailscale/tailscaled.sock
          restartPolicy: OnFailure
          volumes:
          - name: tailscale-socket
            hostPath:
              path: /var/run/tailscale/tailscaled.sock
              type: Socket
```

## Creating Tailscale Subnet Router

Route entire K3s cluster network through Tailscale:

```bash
# Enable IP forwarding
echo 'net.ipv4.ip_forward = 1' | sudo tee -a /etc/sysctl.conf
echo 'net.ipv6.conf.all.forwarding = 1' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Advertise the default K3s Pod and Service CIDRs
sudo tailscale set --advertise-routes=10.42.0.0/16,10.43.0.0/16
```

Approve the advertised routes in the Tailscale admin console, or configure `autoApprovers` in the tailnet policy file. Pod and Service IPs are then reachable via Tailscale, assuming Kubernetes NetworkPolicies and host firewall rules allow the traffic.

## Implementing Failover

Configure multiple edge nodes as subnet routers:

```bash
# On edge-node-01
sudo tailscale set --advertise-routes=10.42.0.0/16,10.43.0.0/16

# On edge-node-02 (backup)
sudo tailscale set --advertise-routes=10.42.0.0/16,10.43.0.0/16
```

Tailscale automatically fails over between subnet routers that advertise the exact same route prefixes if the primary route becomes unavailable.

## Deploying Tailscale Sidecar

Run Tailscale as sidecar for individual pods after creating the `tailscale-auth` Secret and RBAC needed for Tailscale state storage:

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
    image: tailscale/tailscale:stable
    env:
    - name: TS_KUBE_SECRET
      value: tailscale-auth
    - name: TS_AUTHKEY
      valueFrom:
        secretKeyRef:
          name: tailscale-auth
          key: TS_AUTHKEY
    - name: TS_HOSTNAME
      value: "my-app-pod"
    - name: TS_USERSPACE
      value: "false"
    securityContext:
      capabilities:
        add: ["NET_ADMIN"]
```

## Conclusion

Tailscale transforms K3s edge networking by eliminating complex VPN configurations and firewall rules. The combination of zero-configuration setup and built-in zero-trust security makes Tailscale ideal for connecting distributed edge clusters to central cloud infrastructure securely and reliably.
