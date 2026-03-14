# Install Calico on Self-Managed GCE Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, GCE, Google Compute Engine, Kubernetes, Networking, CNI, Self-Managed

Description: Guide to installing Calico on self-managed Kubernetes clusters running on Google Compute Engine instances for advanced networking and policy enforcement.

---

## Introduction

While GKE is the recommended way to run Kubernetes on Google Cloud, some teams run self-managed Kubernetes on GCE instances for greater control or specific configurations. On GCE, Calico can use either VXLAN overlay or BGP routing — GCE's flat VPC allows BGP to work well, making it a viable option for high-performance networking.

This guide covers installing Calico on a kubeadm Kubernetes cluster on GCE, using both VXLAN and BGP configuration options.

## Prerequisites

- GCE VM instances with Kubernetes installed via kubeadm
- `gcloud` CLI configured with appropriate permissions
- `kubectl` cluster-admin access
- `calicoctl` installed: `curl -L https://github.com/projectcalico/calico/releases/latest/download/calicoctl-linux-amd64 -o /usr/local/bin/calicoctl && chmod +x /usr/local/bin/calicoctl`

## Step 1: Configure GCP Firewall Rules

```bash
# Set your project and cluster network variables
PROJECT_ID="my-gcp-project"
CLUSTER_NETWORK="default"
CLUSTER_TAG="k8s-node"

# Allow VXLAN traffic between cluster nodes
gcloud compute firewall-rules create allow-calico-vxlan \
  --project=$PROJECT_ID \
  --network=$CLUSTER_NETWORK \
  --allow=udp:4789 \
  --source-tags=$CLUSTER_TAG \
  --target-tags=$CLUSTER_TAG \
  --description="Allow Calico VXLAN traffic between cluster nodes"

# Allow Calico Typha
gcloud compute firewall-rules create allow-calico-typha \
  --project=$PROJECT_ID \
  --network=$CLUSTER_NETWORK \
  --allow=tcp:5473 \
  --source-tags=$CLUSTER_TAG \
  --target-tags=$CLUSTER_TAG

# If using BGP mode, also allow BGP traffic
gcloud compute firewall-rules create allow-bgp \
  --project=$PROJECT_ID \
  --network=$CLUSTER_NETWORK \
  --allow=tcp:179 \
  --source-tags=$CLUSTER_TAG \
  --target-tags=$CLUSTER_TAG
```

## Step 2: Configure GCE Instances for Calico

On GCE, disable source/destination check if using BGP routing:

```bash
# Get all instance names in the cluster
INSTANCES=$(gcloud compute instances list \
  --filter="tags.items=$CLUSTER_TAG" \
  --format="value(name)")

# For BGP mode: disable can-ip-forward restriction
# This is already enabled on GCE instances by default
for INSTANCE in $INSTANCES; do
  gcloud compute instances add-metadata $INSTANCE \
    --metadata=can-ip-forward=true
done
```

## Step 3: Install Kubernetes and Calico

Initialize the cluster:

```bash
# On the control plane GCE instance
sudo kubeadm init \
  --pod-network-cidr=192.168.0.0/16 \
  --apiserver-advertise-address=<INTERNAL_IP>

# Set up kubectl
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
```

Install Calico:

```bash
# Install Tigera Operator
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml
kubectl wait --for=condition=Available deployment/tigera-operator \
  -n tigera-operator --timeout=120s
```

Create Calico installation for GCE:

```yaml
# calico-installation-gce.yaml - Calico with VXLAN for GCE
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  cni:
    type: Calico
  calicoNetwork:
    ipPools:
      - name: default-ipv4-ippool
        cidr: 192.168.0.0/16
        # Use VXLAN for simplicity - no GCP route changes needed
        encapsulation: VXLAN
        natOutgoing: Enabled
        nodeSelector: all()
    # GCE has 1460 byte MTU on standard network
    mtu: 1410
```

Apply and verify:

```bash
kubectl apply -f calico-installation-gce.yaml
kubectl wait --for=condition=Ready tigerastatus/calico --timeout=300s
kubectl get nodes
```

## Step 4: Apply Network Policies

```yaml
# gce-network-policies.yaml - Network isolation for GCE cluster
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: baseline-deny
spec:
  selector: projectcalico.org/namespace not in {'kube-system', 'calico-system', 'calico-apiserver', 'tigera-operator'}
  types:
    - Ingress
  ingress: []
---
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-app-traffic
  namespace: production
spec:
  selector: all()
  ingress:
    - action: Allow
      source:
        namespaceSelector: kubernetes.io/metadata.name == 'production'
  egress:
    - action: Allow
      destination:
        namespaceSelector: kubernetes.io/metadata.name == 'production'
    - action: Allow
      protocol: UDP
      destination:
        ports:
          - 53
  types:
    - Ingress
    - Egress
```

## Best Practices

- Set MTU to 1410 for GCE (GCE uses 1460 MTU, subtract 50 for VXLAN overhead)
- For high-performance workloads, consider BGP mode which avoids encapsulation overhead on GCE's flat network
- Use GCP VPC native routing with Calico in "no encapsulation" mode by adding GCP static routes for pod CIDRs
- Tag all cluster instances consistently for firewall rule management
- Use Google Cloud Monitoring to forward Calico metrics alongside standard GKE-style cluster metrics

## Conclusion

Self-managed Kubernetes on GCE with Calico is a powerful combination for teams needing fine-grained network control. GCE's flat VPC architecture actually makes Calico's BGP mode more viable than on other clouds, though VXLAN remains simpler to configure. For most teams, VXLAN with the Tigera Operator provides a production-ready networking layer with minimal operational overhead.
