# How to Expose Portainer on Kubernetes via LoadBalancer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, LoadBalancer, Networking, Cloud

Description: Learn how to expose Portainer on Kubernetes using a LoadBalancer service for cloud-based cluster deployments.

## When to Use LoadBalancer

A Kubernetes LoadBalancer service provisions an external load balancer (e.g., AWS ELB, GCP Load Balancer, Azure Load Balancer) that routes traffic to Portainer. This is the preferred method for cloud-hosted Kubernetes clusters (EKS, GKE, AKS).

For on-premises clusters, you need MetalLB or a similar bare-metal load balancer implementation.

## Installing Portainer with LoadBalancer via Helm

```bash
# Install Portainer with LoadBalancer service type

helm repo add portainer https://portainer.github.io/k8s/
helm repo update

helm install portainer portainer/portainer \
  --namespace portainer \
  --create-namespace \
  --set service.type=LoadBalancer
```

## Portainer LoadBalancer Service Manifest

```yaml
# portainer-loadbalancer-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: portainer
  namespace: portainer
  annotations:
    # AWS: Use an internal load balancer (within VPC only)
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internal"
    # GKE 1.29+: Use a reserved static IP address resource
    # networking.gke.io/load-balancer-ip-addresses: "PORTAINER_IP_RESOURCE_NAME"
spec:
  type: LoadBalancer
  selector:
    app.kubernetes.io/name: portainer
    app.kubernetes.io/instance: portainer
  ports:
    - name: http
      port: 9000
      targetPort: 9000
    - name: https
      port: 9443
      targetPort: 9443
    - name: edge
      port: 8000
      targetPort: 8000
```

## Getting the External IP

```bash
# Watch for the external IP to be assigned (may take 1-3 minutes)
kubectl get service portainer --namespace portainer --watch

# Once EXTERNAL-IP is populated, access Portainer at:
# https://<EXTERNAL-IP>:9443
# If HTTP is enabled, you can also use:
# http://<EXTERNAL-IP>:9000
```

## Restricting Access with loadBalancerSourceRanges

Limit which IPs can reach the load balancer:

```yaml
spec:
  type: LoadBalancer
  # Only allow traffic from your office IP range
  loadBalancerSourceRanges:
    - "203.0.113.0/24"
    - "198.51.100.0/24"
```

## Setting Up MetalLB for On-Premises Clusters

For bare-metal Kubernetes clusters, use MetalLB to enable LoadBalancer services:

```bash
# Install MetalLB
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.15.3/config/manifests/metallb-native.yaml

# Create an IP address pool
cat <<EOF | kubectl apply -f -
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: portainer-pool
  namespace: metallb-system
spec:
  addresses:
    - 192.168.1.200-192.168.1.210  # Available IPs in your network
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: portainer-l2
  namespace: metallb-system
EOF
```

## HTTPS with a Pre-Issued Certificate

To add a TLS certificate to the LoadBalancer:

```bash
# Create a TLS secret from your certificate files
kubectl create secret tls portainer-tls \
  --cert=fullchain.pem \
  --key=privkey.pem \
  --namespace portainer

# Configure Portainer to use the existing TLS secret
helm upgrade portainer portainer/portainer \
  --namespace portainer \
  --reuse-values \
  --set tls.existingSecret=portainer-tls \
  --set tls.force=true
```

## Conclusion

LoadBalancer is the production-grade way to expose Portainer on cloud Kubernetes clusters. It provides a stable, cloud-managed endpoint with built-in redundancy. For on-premises setups, MetalLB fills the gap.
