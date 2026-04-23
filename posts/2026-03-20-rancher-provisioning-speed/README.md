# How to Optimize Cluster Provisioning Speed in Rancher - Speed

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Provisioning, Performance, RKE2

Description: Speed up Kubernetes cluster provisioning in Rancher by optimizing node images, container registry mirrors, and provisioning configuration for faster deployments.

## Introduction

Slow cluster provisioning frustrates operators and slows down development workflows. Rancher cluster provisioning time varies significantly depending on image preparation, registry proximity, and cluster configuration. This guide covers the key optimizations that can materially reduce provisioning time.

## Prerequisites

- Rancher with cloud provisioner access (AWS, Azure, GCP, vSphere)
- Container registry mirror available
- Pre-baked node images (optional but recommended)

## Step 1: Use Pre-Baked Node Images

```bash
# Create a base AMI with RKE2 artifacts pre-staged

# This avoids downloading RKE2 artifacts during provisioning

# On a base EC2 instance, run:
# Install the exact RKE2 version you plan to run
curl -sfL https://get.rke2.io | INSTALL_RKE2_VERSION=v1.33.1+rke2r1 sh -

# Stage the matching RKE2 image tarball so nodes import from local disk
mkdir -p /var/lib/rancher/rke2/agent/images
curl -L "https://github.com/rancher/rke2/releases/download/v1.33.1%2Brke2r1/rke2-images.linux-amd64.tar.zst" \
  -o /var/lib/rancher/rke2/agent/images/rke2-images.linux-amd64.tar.zst

# Do not start rke2-server on the golden image; Rancher will configure and start it during provisioning

# Create AMI from this instance
aws ec2 create-image \
  --instance-id i-xxxxxxxx \
  --name "rke2-base-$(date +%Y%m%d)" \
  --description "Pre-baked RKE2 node with local image cache"
```

## Step 2: Configure Registry Mirror for Faster Pulls

```yaml
# registries.yaml - Pre-configure registry mirror in node image
# Place at /etc/rancher/rke2/registries.yaml before AMI creation

mirrors:
  docker.io:
    endpoint:
      - "https://mirror.registry.internal"
  registry.k8s.io:
    endpoint:
      - "https://mirror.registry.internal"
  ghcr.io:
    endpoint:
      - "https://mirror.registry.internal"

configs:
  "mirror.registry.internal":
    tls:
      ca_file: /etc/ssl/certs/internal-ca.crt
```

## Step 3: Optimize Rancher Machine Config (AWS)

```yaml
# machine-config-fast.yaml - Optimized AWS machine configuration
apiVersion: rke-machine-config.cattle.io/v1
kind: Amazonec2Config
metadata:
  name: fast-worker-config
  namespace: fleet-default
spec:
  # Use a current-generation instance type
  instanceType: m6i.xlarge

  # Use pre-baked AMI
  ami: ami-xxxxxxxxxxxxxxxxx

  # Attach the IAM instance profile needed by the nodes
  iamInstanceProfile: K8sWorkerRole

  # Pre-attached security groups
  securityGroup:
    - k8s-workers-sg

  # Use GP3 for the root volume
  rootSize: "50"
  volumeType: gp3

  # Userdata - minimal since using pre-baked AMI
  userdata: |
    #!/bin/bash
    # Set hostname
    TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
      -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
    hostnamectl set-hostname "$(curl -s \
      -H "X-aws-ec2-metadata-token: ${TOKEN}" \
      http://169.254.169.254/latest/meta-data/local-hostname)"
```

## Step 4: Parallelize Node Provisioning

```yaml
# cluster-template-fast.yaml - Parallel node provisioning
apiVersion: provisioning.cattle.io/v1
kind: Cluster
metadata:
  name: production-cluster
  namespace: fleet-default
spec:
  rkeConfig:
    machinePools:
      # Control plane nodes
      - name: control-plane
        quantity: 3
        controlPlaneRole: true
        etcdRole: true
        machineConfigRef:
          kind: Amazonec2Config
          name: fast-cp-config

      # Worker nodes
      - name: workers
        quantity: 10
        workerRole: true
        machineConfigRef:
          kind: Amazonec2Config
          name: fast-worker-config
    upgradeStrategy:
      controlPlaneConcurrency: "1"
      workerConcurrency: "2"
```

## Step 5: Pre-stage Rancher Agent Images

```bash
# On a registry seed host, mirror the Rancher agent image
# This avoids pulling it from the public registry during provisioning

# Match the tag to your Rancher server version
RANCHER_VERSION=v2.13.1
docker pull rancher/rancher-agent:${RANCHER_VERSION}
docker tag rancher/rancher-agent:${RANCHER_VERSION} \
  mirror.registry.internal/rancher/rancher-agent:${RANCHER_VERSION}
docker push mirror.registry.internal/rancher/rancher-agent:${RANCHER_VERSION}

# On the AMI, use RKE2's supported pre-import file for extra images you always need
cat > /var/lib/rancher/rke2/agent/images/custom-images.txt << 'EOF'
ghcr.io/your-org/platform-agent:stable
EOF
```

## Step 6: Optimize DNS Resolution

```bash
# Slow DNS can significantly slow provisioning
# Ensure proper DNS search domains in cloud provider

# Test DNS resolution speed on a node
time nslookup rancher.example.com

# Configure faster DNS on nodes
# If /etc/resolv.conf is managed dynamically, make the equivalent change
# through systemd-resolved, NetworkManager, or DHCP options instead.
cat >> /etc/resolv.conf << EOF
options timeout:1 attempts:3 rotate
EOF

# For EC2 instances, use Amazon Route 53 Resolver
# Ensure your VPC has DNS hostnames and DNS resolution enabled
aws ec2 modify-vpc-attribute --vpc-id vpc-xxxxx --enable-dns-support '{"Value":true}'
aws ec2 modify-vpc-attribute --vpc-id vpc-xxxxx --enable-dns-hostnames '{"Value":true}'
```

## Step 7: Monitor Provisioning Time

```bash
# Track provisioning time for clusters
kubectl get clusters.provisioning.cattle.io \
  -n fleet-default \
  -o json | jq -r '
    .items[] |
    {
      name: .metadata.name,
      created: .metadata.creationTimestamp,
      ready: ([.status.conditions[]? | select(.type=="Ready") | .lastTransitionTime] | first)
    }'

# Alert on slow provisioning
# Create a PrometheusRule to alert if provisioning takes > 15 minutes
```

## Conclusion

Cluster provisioning speed in Rancher is primarily determined by three factors: node image preparation time, container image pull speed, and Rancher agent connection latency. By using pre-baked AMIs with RKE2 artifacts and images pre-staged, combined with internal registry mirrors, you can reduce provisioning time significantly. For organizations that frequently provision new clusters-such as in CI/CD workflows or burst scaling scenarios-these optimizations are essential for operational efficiency.
