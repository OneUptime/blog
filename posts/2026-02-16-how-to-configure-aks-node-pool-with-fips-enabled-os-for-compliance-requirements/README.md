# How to Configure AKS Node Pool with FIPS-Enabled OS for Compliance Requirements

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, FIPS, Compliance, Security, Kubernetes, Azure, Node Pool

Description: Step-by-step guide to creating AKS node pools with FIPS 140-2 enabled operating systems for meeting government and regulatory compliance requirements.

---

If you work in government, healthcare, finance, or any industry with strict cryptographic requirements, you have probably encountered FIPS 140-2. The Federal Information Processing Standard 140-2 specifies requirements for cryptographic modules used by government agencies and regulated industries. When your compliance team says "we need FIPS," it means all cryptographic operations on your infrastructure must use FIPS-validated modules.

AKS supports creating node pools with FIPS-enabled operating systems out of the box. Deployments running on FIPS-enabled nodes can use the cryptographic modules provided by that OS image to help meet FIPS 140-2 controls. This guide covers how to set it up, what it actually changes, and the practical implications for your workloads.

## What FIPS-Enabled Means in AKS

When you enable FIPS on an AKS node pool, Azure provisions the nodes with a FIPS-enabled OS image. Specifically:

- The Linux kernel is compiled with the FIPS 140-2 validated cryptographic module
- OS-provided cryptographic libraries are configured for the FIPS-enabled image
- The Linux node exposes FIPS mode through `/proc/sys/crypto/fips_enabled`
- Weak, non-FIPS algorithms can be blocked by the FIPS-enabled kernel
- The FIPS-enabled Linux image is a different node image from the default Linux image and is updated through AKS node image upgrades

This applies to the node OS only. Your application containers need their own FIPS compliance if they perform cryptographic operations. The node-level FIPS mode ensures that the infrastructure layer meets the standard.

## Prerequisites

- Azure CLI 2.32.0 or later for creating FIPS-enabled node pools
- An existing AKS cluster (or you can create one with a FIPS node pool from the start)
- Kubernetes 1.19 or later
- Understanding of which OS SKUs and VM architectures support FIPS in your region

## Step 1: Create an AKS Cluster with a FIPS-Enabled Node Pool

You can enable FIPS on the default node pool during cluster creation.

```bash
# Create a new AKS cluster with FIPS enabled on the default node pool

az aks create \
  --resource-group myResourceGroup \
  --name myFIPSCluster \
  --node-count 3 \
  --enable-fips-image \
  --generate-ssh-keys
```

The `--enable-fips-image` flag tells AKS to use the FIPS-enabled OS image for the node pool.

## Step 2: Add a FIPS-Enabled Node Pool to an Existing Cluster

If you already have an AKS cluster and want to add a FIPS node pool alongside your existing non-FIPS pools:

```bash
# Add a FIPS-enabled node pool to an existing cluster
az aks nodepool add \
  --resource-group myResourceGroup \
  --cluster-name myAKSCluster \
  --name fipspool \
  --node-count 3 \
  --enable-fips-image \
  --node-vm-size Standard_D4s_v5
```

You can run FIPS and non-FIPS node pools in the same cluster. This is useful when only some of your workloads require FIPS compliance. Schedule FIPS-requiring workloads on the FIPS pool using node selectors or taints.

## Step 3: Verify FIPS Is Enabled

After the node pool is created, verify that FIPS mode is active on the nodes.

```bash
# Check the node pool configuration
az aks nodepool show \
  --resource-group myResourceGroup \
  --cluster-name myAKSCluster \
  --name fipspool \
  --query enableFips -o tsv
# Expected output: true

# Verify FIPS on a running node by checking the kernel
kubectl debug node/<fips-node-name> -it --image=mcr.microsoft.com/dotnet/runtime-deps:8.0
```

Inside the debug container:

```bash
# Check if FIPS mode is enabled in the kernel
cat /host/proc/sys/crypto/fips_enabled
# Expected output: 1
```

## Step 4: Schedule Workloads on FIPS Nodes

Use node labels and selectors to ensure FIPS-requiring workloads land on FIPS-enabled nodes.

AKS automatically labels FIPS nodes. Check the label:

```bash
# Check labels on FIPS nodes
kubectl get nodes -l kubernetes.azure.com/fips_enabled=true
```

Use this label in your pod specs:

```yaml
# fips-deployment.yaml
# Deploy a workload specifically to FIPS-enabled nodes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-api
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: secure-api
  template:
    metadata:
      labels:
        app: secure-api
    spec:
      # Schedule only on FIPS-enabled nodes
      nodeSelector:
        kubernetes.azure.com/fips_enabled: "true"
      containers:
      - name: secure-api
        image: myregistry.azurecr.io/secure-api:v1
        ports:
        - containerPort: 8443
```

For stronger scheduling guarantees, combine node selectors with taints:

```bash
# Add a taint to the FIPS node pool
az aks nodepool update \
  --resource-group myResourceGroup \
  --cluster-name myAKSCluster \
  --name fipspool \
  --node-taints compliance=fips:NoSchedule
```

Then add tolerations in your pod spec:

```yaml
# fips-toleration-deployment.yaml
# Workload with both node selector and taint toleration for FIPS nodes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: regulated-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: regulated-service
  template:
    metadata:
      labels:
        app: regulated-service
    spec:
      nodeSelector:
        kubernetes.azure.com/fips_enabled: "true"
      # Tolerate the FIPS taint
      tolerations:
      - key: "compliance"
        operator: "Equal"
        value: "fips"
        effect: "NoSchedule"
      containers:
      - name: app
        image: myregistry.azurecr.io/regulated-service:v2
```

## Step 5: Ensure Container-Level FIPS Compliance

Node-level FIPS covers the infrastructure, but your application containers also need FIPS-compliant crypto libraries if they handle sensitive data directly. Here are approaches for common runtimes.

### .NET Applications

.NET uses the cryptographic libraries provided by the operating system. On a FIPS-configured OS image, .NET applications can use FIPS-validated OS algorithms, but .NET does not enforce FIPS-approved algorithms or key sizes for your application code. Avoid non-FIPS algorithms in your code and use an image whose OS crypto libraries are validated for your compliance target.

```yaml
# dotnet-fips-pod.yaml
# .NET application scheduled on FIPS-enabled nodes
apiVersion: v1
kind: Pod
metadata:
  name: dotnet-fips-app
spec:
  nodeSelector:
    kubernetes.azure.com/fips_enabled: "true"
  containers:
  - name: app
    image: myregistry.azurecr.io/dotnet-app:v1
```

### Go Applications

Starting with Go 1.24, Go includes native FIPS 140-3 support through the `GOFIPS140` build setting. Build against a validated FIPS module snapshot instead of using the older `GOEXPERIMENT=boringcrypto` path:

```dockerfile
# Dockerfile for FIPS-compliant Go application
FROM golang:1.24 AS builder

# Build with the Go FIPS 140-3 module snapshot
ENV GOFIPS140=v1.0.0
WORKDIR /app
COPY . .
RUN go build -o /server ./cmd/server

FROM mcr.microsoft.com/azurelinux/distroless/base:3.0
COPY --from=builder /server /server
ENTRYPOINT ["/server"]
```

### Java Applications

Java applications can use the BouncyCastle FIPS provider:

```yaml
# java-fips-pod.yaml
# Java application with FIPS-compliant security provider
apiVersion: v1
kind: Pod
metadata:
  name: java-fips-app
spec:
  nodeSelector:
    kubernetes.azure.com/fips_enabled: "true"
  containers:
  - name: app
    image: myregistry.azurecr.io/java-app:v1
    env:
    # Configure Java to use FIPS-compliant security provider
    - name: JAVA_OPTS
      value: "-Djava.security.properties=/app/fips-java.security"
```

## Step 6: Audit FIPS Compliance

For compliance audits, you need evidence that FIPS is enabled and operating correctly.

```bash
# Generate a compliance report showing FIPS status across all nodes
kubectl get nodes -o json | jq -r '
  .items[] |
  {
    name: .metadata.name,
    fips_enabled: .metadata.labels["kubernetes.azure.com/fips_enabled"],
    os_image: .status.nodeInfo.osImage,
    kernel: .status.nodeInfo.kernelVersion
  }'
```

You can also create a DaemonSet that continuously monitors FIPS status:

```yaml
# fips-monitor.yaml
# DaemonSet that verifies FIPS mode on all nodes
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fips-monitor
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: fips-monitor
  template:
    metadata:
      labels:
        app: fips-monitor
    spec:
      # Only run on FIPS nodes
      nodeSelector:
        kubernetes.azure.com/fips_enabled: "true"
      containers:
      - name: monitor
        image: busybox
        command:
        - /bin/sh
        - -c
        # Check FIPS status every 5 minutes and log it
        - |
          while true; do
            FIPS_STATUS=$(cat /host-proc/sys/crypto/fips_enabled)
            if [ "$FIPS_STATUS" = "1" ]; then
              echo "$(date): FIPS mode ACTIVE on $(hostname)"
            else
              echo "$(date): WARNING - FIPS mode NOT active on $(hostname)"
            fi
            sleep 300
          done
        volumeMounts:
        - name: host-proc
          mountPath: /host-proc
          readOnly: true
      volumes:
      - name: host-proc
        hostPath:
          path: /proc
```

## Limitations and Considerations

**Updating existing pools reimages nodes**: You can enable or disable FIPS on an existing Linux node pool with `az aks nodepool update --enable-fips-image` or `--disable-fips-image` when using Azure CLI 2.64.0 or later. The update changes the node image and triggers a reimage, so validate workloads in a test environment before changing a production pool.

**Performance impact**: FIPS-validated crypto modules may be slightly slower than non-FIPS alternatives because they use specific, validated implementations. For most workloads, the difference is negligible.

**Container images matter**: The node-level FIPS mode does not magically make your container applications FIPS-compliant. If your application uses its own crypto libraries (OpenSSL compiled into the container, for example), those libraries need their own FIPS configuration.

**Some software breaks**: Applications that depend on non-FIPS ciphers (like certain older TLS configurations or custom crypto) may fail on FIPS nodes. Test your applications thoroughly before migrating.

**Windows node pools**: FIPS is also supported on Windows Server 2022 and Windows Server 2025 node pools in AKS, though the implementation uses Windows' built-in FIPS mode rather than Linux kernel modules. Windows Server 2022 and later node pools enable FIPS by default, and Windows Server 2025 and later node pools do not support disabling it.

FIPS compliance in AKS is straightforward to enable at the node level. The real work is ensuring your entire stack - from node OS to container runtime to application code - uses FIPS-validated cryptographic modules. Start with the node pool configuration, verify it is working, then work your way up the stack to your application code.
