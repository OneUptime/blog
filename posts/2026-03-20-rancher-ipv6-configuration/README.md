# How to Configure Rancher with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, IPv6, Kubernetes, Dual-Stack, RKE2, Networking

Description: A guide to configuring Rancher and downstream Kubernetes clusters for IPv6 and dual-stack networking, covering RKE2 cluster provisioning, network plugin selection, and Rancher server IPv6 access.

Rancher supports IPv6 through its managed Kubernetes distributions (RKE2, K3s) and via custom cluster provisioning. Dual-stack is the recommended approach, providing both IPv4 and IPv6 connectivity.

## Rancher Server with IPv6 Access

```bash
# Run Rancher server in Docker for development or testing.
# On Linux hosts with Docker IPv6 enabled, published ports can be reachable over IPv4 and IPv6.

docker run -d \
  --restart=unless-stopped \
  -p 80:80 \
  -p 443:443 \
  --privileged \
  rancher/rancher:latest

# Access via IPv6: https://[2001:db8::10]
```

For production, deploy Rancher on an RKE2 or K3s cluster. Rancher is typically installed with the Helm chart, which creates the Rancher ingress; ensure the Rancher hostname resolves to an IPv6-capable load balancer or ingress endpoint, and expose TCP/80 and TCP/443 over IPv6. When provisioning IPv6-only downstream clusters, the Rancher Server URL must be reachable over IPv6.

## Provisioning an RKE2 Dual-Stack Cluster via Rancher

In the Rancher UI, navigate to Cluster Management > Create > Custom:

```yaml
# Rancher provisioning YAML for an RKE2 cluster
apiVersion: provisioning.cattle.io/v1
kind: Cluster
spec:
  rkeConfig:
    machineGlobalConfig:
      cni: calico
      cluster-cidr: "10.42.0.0/16,fd00:42::/56"
      service-cidr: "10.43.0.0/16,fd00:43::/112"
```

Using the Rancher UI:
1. Cluster Management > Create > Custom
2. Select RKE2 and choose Calico as the Container Network Provider
3. Under "Networking", set Cluster CIDR to `10.42.0.0/16,fd00:42::/56`, Service CIDR to `10.43.0.0/16,fd00:43::/112`, and Stack Preference to `dual`

## RKE2 Cluster Config File (Manual)

```yaml
# /etc/rancher/rke2/config.yaml on the first server node

# Dual-stack pod and service CIDRs
cluster-cidr: "10.42.0.0/16,fd00:42::/56"
service-cidr: "10.43.0.0/16,fd00:43::/112"

# CNI that supports dual-stack
cni: calico
```

```bash
# Start RKE2 server
systemctl enable --now rke2-server

# Check cluster dual-stack
export KUBECONFIG=/etc/rancher/rke2/rke2.yaml
kubectl get nodes -o wide

# Verify pod CIDR includes IPv6
kubectl get node <node-name> -o jsonpath='{.spec.podCIDRs}'
```

## K3s Dual-Stack Cluster via Rancher

```bash
# K3s server with dual-stack (for imported cluster or standalone)
curl -sfL https://get.k3s.io | sh -s - server \
  --cluster-cidr=10.42.0.0/16,fd00:42::/56 \
  --service-cidr=10.43.0.0/16,fd00:43::/112 \
  --flannel-ipv6-masq \
  --disable=traefik   # Optional: use own ingress

# Import the K3s cluster into Rancher
# Rancher UI: Cluster Management > Import Existing > Generic
# Apply the generated kubectl apply command on the K3s cluster
```

## Calico IPv6 Configuration in Rancher-Managed Cluster

```bash
# In RKE2 dual-stack mode, Calico detects the configuration automatically.
# Verify that both IP pools were created:
kubectl get ippools
```

## Verifying IPv6 in Rancher-Managed Cluster

```bash
# Check nodes have dual-stack CIDRs
kubectl get nodes -o custom-columns=NAME:.metadata.name,CIDRS:.spec.podCIDRs

# Deploy a test pod and verify it receives IPv4 and IPv6 addresses
kubectl run test-ipv6 --image=nicolaka/netshoot --labels=app=test-ipv6 --restart=Never -- sleep 3600
kubectl wait --for=condition=Ready pod/test-ipv6 --timeout=120s
kubectl get pod test-ipv6 -o jsonpath='{.status.podIPs}'
kubectl exec test-ipv6 -- ip -6 addr show

# Create a Service that requests dual-stack ClusterIPs
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: Service
metadata:
  name: my-svc
spec:
  selector:
    app: test-ipv6
  ipFamilyPolicy: PreferDualStack
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
EOF
kubectl get svc my-svc -o jsonpath='{.spec.clusterIPs}'

# Cleanup
kubectl delete pod test-ipv6
kubectl delete svc my-svc
```

## Rancher Monitoring with IPv6

```bash
# Install Rancher Monitoring chart (Prometheus + Grafana)

# Verify the monitoring services that were created
kubectl get svc -n cattle-monitoring-system

# Access Grafana from the Rancher UI, or port-forward the Grafana service
kubectl port-forward -n cattle-monitoring-system svc/rancher-monitoring-grafana 3000:80
```

Rancher's support for IPv6 is primarily delivered through RKE2 and K3s. Configure dual-stack CIDRs at cluster creation time, and use a CNI that supports dual-stack for your distribution, because changing cluster or service CIDRs later requires cluster recreation.
