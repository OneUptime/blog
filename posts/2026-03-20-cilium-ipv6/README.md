# How to Configure Cilium CNI for IPv6 in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IPv6, Cilium, CNI, eBPF, Dual-Stack, Networking

Description: Configure Cilium CNI for IPv6 and dual-stack Kubernetes clusters, enable IPv6 support in Cilium's eBPF data plane, and use CiliumNetworkPolicy for IPv6 network policy enforcement.

## Introduction

Cilium is a high-performance CNI plugin using eBPF for packet processing in the Linux kernel. Cilium has excellent dual-stack support with native IPv6 routing, load balancing, and network policy enforcement. In dual-stack mode, Cilium's eBPF programs handle both IPv4 and IPv6 traffic simultaneously. Cilium also supports replacing kube-proxy entirely using eBPF for Service load balancing over IPv6.
These examples assume the Kubernetes cluster is already configured with IPv6 or dual-stack Pod and Service CIDRs.

## Install Cilium with IPv6 Support

```bash
# Install Cilium CLI

CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
curl -L --fail --remote-name-all \
    "https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-amd64.tar.gz"
sudo tar xzvf cilium-linux-amd64.tar.gz -C /usr/local/bin

# Install Cilium with dual-stack and kube-proxy replacement
API_SERVER=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
API_SERVER=${API_SERVER#https://}
API_SERVER=${API_SERVER#http://}
API_SERVER=${API_SERVER%%/*}
if [[ "$API_SERVER" == \[*\]:* ]]; then
    K8S_SERVICE_HOST="${API_SERVER%%]*}"
    K8S_SERVICE_HOST="${K8S_SERVICE_HOST#[}"
    K8S_SERVICE_PORT="${API_SERVER##*:}"
elif [[ "$API_SERVER" == \[*\] ]]; then
    K8S_SERVICE_HOST="${API_SERVER#[}"
    K8S_SERVICE_HOST="${K8S_SERVICE_HOST%]}"
    K8S_SERVICE_PORT=443
elif [[ "$API_SERVER" == *:* ]]; then
    K8S_SERVICE_HOST="${API_SERVER%%:*}"
    K8S_SERVICE_PORT="${API_SERVER##*:}"
else
    K8S_SERVICE_HOST="$API_SERVER"
    K8S_SERVICE_PORT=443
fi

cilium install \
    --set ipv4.enabled=true \
    --set ipv6.enabled=true \
    --set ipam.mode=kubernetes \
    --set routingMode=tunnel \
    --set tunnelProtocol=vxlan \
    --set bpf.masquerade=true \
    --set enableIPv6Masquerade=true \
    --set kubeProxyReplacement=true \
    --set k8sServiceHost="$K8S_SERVICE_HOST" \
    --set k8sServicePort="$K8S_SERVICE_PORT"

# Verify installation
cilium status --wait
```

## Helm Chart Installation for IPv6

```yaml
# cilium-values.yaml - dual-stack Helm values

# Enable both IP families
ipv4:
  enabled: true
ipv6:
  enabled: true

# IPAM configuration
ipam:
  mode: kubernetes

# Disable kube-proxy and use Cilium's eBPF replacement
kubeProxyReplacement: true

# Tunnel encapsulation
routingMode: tunnel
tunnelProtocol: vxlan

# Enable IPv6 masquerade for outbound traffic
enableIPv6Masquerade: true

# Enable BPF masquerade (more efficient than iptables)
bpf:
  masquerade: true

# Enable Hubble observability
hubble:
  relay:
    enabled: true
  ui:
    enabled: true
```

```bash
API_SERVER=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
API_SERVER=${API_SERVER#https://}
API_SERVER=${API_SERVER#http://}
API_SERVER=${API_SERVER%%/*}
if [[ "$API_SERVER" == \[*\]:* ]]; then
    K8S_SERVICE_HOST="${API_SERVER%%]*}"
    K8S_SERVICE_HOST="${K8S_SERVICE_HOST#[}"
    K8S_SERVICE_PORT="${API_SERVER##*:}"
elif [[ "$API_SERVER" == \[*\] ]]; then
    K8S_SERVICE_HOST="${API_SERVER#[}"
    K8S_SERVICE_HOST="${K8S_SERVICE_HOST%]}"
    K8S_SERVICE_PORT=443
elif [[ "$API_SERVER" == *:* ]]; then
    K8S_SERVICE_HOST="${API_SERVER%%:*}"
    K8S_SERVICE_PORT="${API_SERVER##*:}"
else
    K8S_SERVICE_HOST="$API_SERVER"
    K8S_SERVICE_PORT=443
fi

helm repo add cilium https://helm.cilium.io/
helm install cilium cilium/cilium \
    --namespace kube-system \
    --values cilium-values.yaml \
    --set k8sServiceHost="$K8S_SERVICE_HOST" \
    --set k8sServicePort="$K8S_SERVICE_PORT"
```

## IPv6 Network Policy with Cilium

```yaml
# CiliumNetworkPolicy for IPv6
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-web-ipv6
spec:
  endpointSelector:
    matchLabels:
      app: web
  # Allow inbound IPv6 from any
  ingress:
    - fromCIDR:
        - "::/0"
      toPorts:
        - ports:
            - port: "80"
              protocol: TCP
            - port: "443"
              protocol: TCP
  # Allow outbound to specific IPv6 range
  egress:
    - toCIDR:
        - "2001:db8:100::/64"  # Example external IPv6 range
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: kube-system
      toPorts:
        - ports:
            - port: "53"
              protocol: UDP
```

## Verify Cilium IPv6 Operation

```bash
# Check Cilium status
cilium status

# View endpoints with dual-stack IPs
kubectl -n kube-system exec ds/cilium -- \
    cilium-dbg endpoint list

# Check BPF IPv6 load balancing
kubectl -n kube-system exec ds/cilium -- \
    cilium-dbg bpf lb list | grep -i "ipv6\|\[::"

# Monitor IPv6 traffic with Hubble
hubble observe --namespace default --type trace --ipv6

# Run connectivity test for IPv6
cilium connectivity test --test-namespace cilium-test

# Check IPv6 masquerade rules
kubectl -n kube-system exec ds/cilium -- \
    cilium-dbg bpf nat list | head -20
```

## Hubble for IPv6 Observability

```bash
# Install Hubble CLI
HUBBLE_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/hubble/main/stable.txt)
curl -L --fail --remote-name-all \
    "https://github.com/cilium/hubble/releases/download/${HUBBLE_VERSION}/hubble-linux-amd64.tar.gz"
sudo tar xzvf hubble-linux-amd64.tar.gz -C /usr/local/bin

# Port-forward Hubble relay
kubectl port-forward -n kube-system svc/hubble-relay 4245:80 &

# Observe IPv6 traffic
hubble observe --last 100 --ipv6

# Observe specific pod IPv6 traffic
hubble observe --pod default/mypod --ipv6 --follow
```

## Conclusion

Cilium provides native IPv6 support through its eBPF data plane with `ipv6.enabled=true`. In dual-stack mode, Cilium manages both IPv4 and IPv6 pod addresses, service load balancing, and network policy enforcement. The eBPF masquerade feature handles IPv6 SNAT more efficiently than ip6tables. Use CiliumNetworkPolicy with IPv6 CIDRs (`::/0` for all IPv6) for fine-grained network policy. Hubble provides deep observability into IPv6 traffic flows between pods and services.
