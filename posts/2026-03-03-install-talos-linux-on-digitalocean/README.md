# How to Install Talos Linux on DigitalOcean

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, DigitalOcean, Kubernetes, Cloud, Infrastructure

Description: Deploy Talos Linux on DigitalOcean droplets and bootstrap a secure Kubernetes cluster with step-by-step instructions.

---

DigitalOcean is known for its simplicity and developer-friendly approach, which makes it a natural fit for Talos Linux. While DigitalOcean does not have an official Talos marketplace image, you can upload a custom image and deploy Talos on standard Droplets. This guide covers the complete process from image upload to a running Kubernetes cluster.

## Prerequisites

Get your tools ready:

```bash
# Install talosctl
curl -sL https://talos.dev/install | sh

# Install doctl (DigitalOcean CLI)
# On macOS
brew install doctl
# On Linux
snap install doctl

# Authenticate with DigitalOcean
doctl auth init

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/
```

## Uploading the Talos Image

DigitalOcean supports custom images. You need to provide a URL to the Talos image that DigitalOcean can download:

```bash
# Create a custom image on DigitalOcean using the Talos release URL
IMAGE_ID=$(doctl compute image create talos-v1.7.0 \
  --image-url https://github.com/siderolabs/talos/releases/download/v1.7.0/digital-ocean-amd64.raw.gz \
  --region nyc1 \
  --image-description "Talos Linux v1.7.0" \
  --format ID --no-header)

echo "Image ID: ${IMAGE_ID}"

# Wait for the image to be available (this can take several minutes)
while true; do
  STATUS=$(doctl compute image get ${IMAGE_ID} --format Status --no-header)
  echo "Image status: ${STATUS}"
  if [ "${STATUS}" = "available" ]; then
    break
  fi
  sleep 30
done

echo "Talos image is ready"
```

## Setting Up Networking

Create a VPC for your cluster:

```bash
# Create a VPC
VPC_ID=$(doctl vpcs create \
  --name talos-vpc \
  --region nyc1 \
  --ip-range 10.10.0.0/16 \
  --format ID --no-header)

echo "VPC ID: ${VPC_ID}"
```

## Creating a Load Balancer

Set up a load balancer for the Kubernetes API:

```bash
# Create a load balancer for the Kubernetes API
LB_ID=$(doctl compute load-balancer create \
  --name talos-k8s-api \
  --region nyc1 \
  --vpc-uuid ${VPC_ID} \
  --forwarding-rules "entry_protocol:tcp,entry_port:6443,target_protocol:tcp,target_port:6443" \
  --health-check "protocol:tcp,port:6443,check_interval_seconds:10,response_timeout_seconds:5,healthy_threshold:3,unhealthy_threshold:3" \
  --format ID --no-header)

echo "Load Balancer ID: ${LB_ID}"

# Get the load balancer IP (may take a minute to provision)
sleep 60
LB_IP=$(doctl compute load-balancer get ${LB_ID} --format IP --no-header)
echo "Load Balancer IP: ${LB_IP}"
```

## Generating Talos Configuration

Create the machine configuration:

```bash
# Generate Talos configuration
talosctl gen config talos-do-cluster "https://${LB_IP}:6443" \
  --output-dir _out

# Patch for DigitalOcean-specific settings
cat > do-patch.yaml <<'EOF'
machine:
  install:
    disk: /dev/vda
    image: ghcr.io/siderolabs/installer:v1.7.0
  network:
    interfaces:
      - interface: eth0
        dhcp: true
      - interface: eth1
        dhcp: true
EOF

# Apply patches
talosctl machineconfig patch _out/controlplane.yaml \
  --patch @do-patch.yaml \
  --output _out/controlplane-patched.yaml

talosctl machineconfig patch _out/worker.yaml \
  --patch @do-patch.yaml \
  --output _out/worker-patched.yaml
```

## Launching Control Plane Droplets

Create the control plane nodes:

```bash
# Create control plane droplets
for i in 1 2 3; do
  DROPLET_ID=$(doctl compute droplet create talos-cp-${i} \
    --image ${IMAGE_ID} \
    --size s-4vcpu-8gb \
    --region nyc1 \
    --vpc-uuid ${VPC_ID} \
    --user-data-file _out/controlplane-patched.yaml \
    --tag-name talos-controlplane \
    --format ID --no-header)

  echo "Control plane ${i} created: ${DROPLET_ID}"

  # Add to load balancer
  doctl compute load-balancer add-droplets ${LB_ID} --droplet-ids ${DROPLET_ID}
done
```

## Launching Worker Droplets

Create the worker nodes:

```bash
# Create worker droplets
for i in 1 2 3; do
  doctl compute droplet create talos-worker-${i} \
    --image ${IMAGE_ID} \
    --size s-4vcpu-8gb \
    --region nyc1 \
    --vpc-uuid ${VPC_ID} \
    --user-data-file _out/worker-patched.yaml \
    --tag-name talos-worker \
    --format ID --no-header

  echo "Worker ${i} created"
done
```

## Bootstrapping the Cluster

Bootstrap and verify your cluster:

```bash
# Get the public IP of the first control plane droplet
CP1_IP=$(doctl compute droplet get talos-cp-1 \
  --format PublicIPv4 --no-header | head -1)

echo "Control plane 1 IP: ${CP1_IP}"

# Configure talosctl
talosctl config merge _out/talosconfig
talosctl config endpoint ${CP1_IP}
talosctl config node ${CP1_IP}

# Wait a bit for the nodes to boot
sleep 120

# Bootstrap the cluster
talosctl bootstrap --nodes ${CP1_IP}

# Wait for the cluster to be healthy
talosctl health --wait-timeout 15m

# Get the kubeconfig
talosctl kubeconfig

# Verify the cluster
kubectl get nodes -o wide
kubectl get pods -A
```

## Installing a CNI

Talos does not include a CNI by default. Install one:

```bash
# Install Cilium as the CNI
cilium install --helm-set ipam.mode=kubernetes

# Wait for Cilium to be ready
cilium status --wait

# Verify connectivity
cilium connectivity test
```

## Setting Up DigitalOcean CSI Driver

For persistent storage, install the DigitalOcean CSI driver:

```bash
# Create a secret with your DigitalOcean API token
kubectl create secret generic digitalocean \
  --namespace kube-system \
  --from-literal=access-token=your-digitalocean-api-token

# Install the CSI driver
kubectl apply -f https://raw.githubusercontent.com/digitalocean/csi-digitalocean/master/deploy/kubernetes/releases/csi-digitalocean-latest.yaml
```

Create a storage class:

```yaml
# do-storageclass.yaml
# DigitalOcean Block Storage class
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: do-block-storage
provisioner: dobs.csi.digitalocean.com
parameters:
  fstype: ext4
reclaimPolicy: Delete
volumeBindingMode: Immediate
```

```bash
kubectl apply -f do-storageclass.yaml
```

## Testing the Cluster

Deploy a test application to verify everything works:

```yaml
# test-deployment.yaml
# Test deployment with persistent storage
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: do-block-storage
  resources:
    requests:
      storage: 5Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-nginx
spec:
  replicas: 2
  selector:
    matchLabels:
      app: test-nginx
  template:
    metadata:
      labels:
        app: test-nginx
    spec:
      containers:
        - name: nginx
          image: nginx:latest
          ports:
            - containerPort: 80
          volumeMounts:
            - name: data
              mountPath: /usr/share/nginx/html
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: test-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: test-nginx
spec:
  type: LoadBalancer
  ports:
    - port: 80
      targetPort: 80
  selector:
    app: test-nginx
```

```bash
# Deploy and verify
kubectl apply -f test-deployment.yaml
kubectl get pods -w
kubectl get svc test-nginx

# Clean up when done
kubectl delete -f test-deployment.yaml
```

## Cleaning Up

Remove all resources when you are done:

```bash
# Delete droplets
doctl compute droplet delete talos-cp-1 talos-cp-2 talos-cp-3 \
  talos-worker-1 talos-worker-2 talos-worker-3 --force

# Delete load balancer
doctl compute load-balancer delete ${LB_ID} --force

# Delete the custom image
doctl compute image delete ${IMAGE_ID} --force

# Delete the VPC
doctl vpcs delete ${VPC_ID} --force
```

## Conclusion

Running Talos Linux on DigitalOcean is a cost-effective way to get a secure, immutable Kubernetes cluster. The custom image upload process is the main extra step compared to platforms where Talos has native AMIs, but once the image is in place, the deployment follows the standard Talos workflow. DigitalOcean's simple pricing model and straightforward networking make it especially appealing for smaller teams and projects that want production-grade security without the complexity of the major cloud providers.
