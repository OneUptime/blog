# How to Configure RKE2 Networking with Cilium

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Cilium, eBPF, CNI, Kubernetes, Network Policy, Observability, SUSE Rancher

Description: Learn how to configure Cilium as the CNI plugin in RKE2 to leverage eBPF for high-performance networking, L7 network policies, and built-in Hubble observability.

---

Cilium uses eBPF to implement Kubernetes networking at the kernel level, which can reduce iptables-based service handling overhead and enables L7-aware network policies and deep observability via Hubble.

---

## Step 1: Configure RKE2 to Use Cilium

```yaml
# /etc/rancher/rke2/config.yaml

token: my-cluster-token
tls-san:
  - "rke2.example.com"

# Use Cilium as the CNI
cni: cilium

cluster-cidr: 10.42.0.0/16
service-cidr: 10.43.0.0/16

# Disable kube-proxy - Cilium replaces it with eBPF
disable-kube-proxy: true
```

---

## Step 2: Customize Cilium via HelmChartConfig

```yaml
# /var/lib/rancher/rke2/server/manifests/rke2-cilium-config.yaml
apiVersion: helm.cattle.io/v1
kind: HelmChartConfig
metadata:
  name: rke2-cilium
  namespace: kube-system
spec:
  valuesContent: |-
    # Replace kube-proxy with eBPF
    kubeProxyReplacement: true
    k8sServiceHost: "localhost"
    k8sServicePort: "6443"

    # Enable Hubble for network observability
    hubble:
      enabled: true
      relay:
        enabled: true
      ui:
        enabled: true

    # Enable encryption (WireGuard)
    encryption:
      enabled: true
      type: wireguard

    # Enable BPF masquerade for better performance
    bpf:
      masquerade: true
```

---

## Step 3: Install Cilium CLI and Verify

```bash
# Install cilium CLI
curl -L --remote-name-all \
  https://github.com/cilium/cilium-cli/releases/latest/download/cilium-linux-amd64.tar.gz
tar xzvf cilium-linux-amd64.tar.gz
sudo mv cilium /usr/local/bin/

# Check Cilium status
cilium status --wait

# Run connectivity tests
cilium connectivity test
```

---

## Step 4: Configure L7 Network Policies

Cilium's `CiliumNetworkPolicy` extends Kubernetes NetworkPolicy with L7-aware rules:

```yaml
# Allow only GET requests to /api from the frontend
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-frontend-api-get
  namespace: my-app
spec:
  endpointSelector:
    matchLabels:
      tier: backend
  ingress:
    - fromEndpoints:
        - matchLabels:
            tier: frontend
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
          rules:
            http:
              # Only allow HTTP GET to the /api path
              - method: GET
                path: /api
```

---

## Step 5: Access Hubble UI

Hubble provides real-time network flow visibility:

```bash
# Port-forward the Hubble UI
kubectl port-forward -n kube-system svc/hubble-ui 12000:80

# Open in browser
xdg-open http://localhost:12000

# Or use the Cilium CLI to open the web UI
cilium hubble ui   # opens the web UI

# In another terminal, forward Hubble Relay for local Hubble CLI access
cilium hubble port-forward &

# Observe dropped flows from the CLI
hubble observe \
  --namespace my-app \
  --verdict DROPPED \
  --output json
```

---

## Best Practices

- Use `disable-kube-proxy: true` with `kubeProxyReplacement: true` for Cilium's eBPF kube-proxy replacement; RKE2 will not run kube-proxy in this mode.
- Use **WireGuard encryption** for node-to-node traffic if your infrastructure crosses untrusted networks.
- Check kernel support before deploying: Cilium's current documented baseline is Linux kernel 5.10+ or an equivalent distribution kernel, and RKE2 recommends kernel 5.8+ before enabling Cilium kube-proxy replacement.
- Use Hubble flows as input to your SIEM for real-time network anomaly detection.
