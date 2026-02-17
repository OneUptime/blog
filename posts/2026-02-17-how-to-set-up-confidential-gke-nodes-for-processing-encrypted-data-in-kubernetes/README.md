# How to Set Up Confidential GKE Nodes for Processing Encrypted Data in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Confidential GKE, Kubernetes, Confidential Computing, Container Security

Description: Step-by-step guide to deploying Confidential GKE nodes that encrypt container memory at the hardware level for processing sensitive data in Kubernetes.

---

Running sensitive workloads in Kubernetes introduces questions about data protection that go beyond standard container isolation. Containers on the same node share the same kernel and, at the hardware level, the same memory. Confidential GKE nodes solve this by running your containers on nodes where memory is encrypted by AMD SEV technology. The hypervisor and other system software cannot read the memory contents of your workloads.

This guide covers how to set up Confidential GKE nodes, configure node pools, schedule workloads onto them, and handle the operational nuances that come with confidential computing in a Kubernetes environment.

## What Confidential GKE Nodes Provide

Confidential GKE nodes are GKE nodes that use Confidential VM technology. All containers running on a Confidential node benefit from hardware-level memory encryption. This means:

- Data being processed in memory is encrypted
- The hypervisor cannot read workload memory
- Other VMs on the same physical host cannot access your memory
- The protection is transparent to your application code - no code changes required

The encryption happens at the hardware level using AMD SEV (Secure Encrypted Virtualization). Each VM gets a unique memory encryption key managed by the AMD processor, not by software.

## Creating a Cluster with Confidential Nodes

You can enable Confidential nodes on a new cluster or add a Confidential node pool to an existing cluster.

This command creates a new GKE cluster where all nodes in the default pool are Confidential.

```bash
# Create a GKE cluster with Confidential nodes
gcloud container clusters create confidential-cluster \
  --region=us-central1 \
  --machine-type=n2d-standard-4 \
  --enable-confidential-nodes \
  --num-nodes=3 \
  --disk-type=pd-ssd \
  --disk-size=100GB \
  --workload-pool=my-project.svc.id.goog \
  --enable-shielded-nodes \
  --project=my-secure-project
```

Key points about this configuration:
- `--enable-confidential-nodes` turns on hardware memory encryption
- N2D machine types are required because they use AMD EPYC processors with SEV
- Shielded nodes should also be enabled for boot integrity verification
- Workload Identity is recommended for secure authentication

## Adding a Confidential Node Pool to an Existing Cluster

If you have an existing cluster and want to run only specific workloads on Confidential nodes, add a separate Confidential node pool.

```bash
# Add a Confidential node pool to an existing cluster
gcloud container node-pools create confidential-pool \
  --cluster=my-existing-cluster \
  --region=us-central1 \
  --machine-type=n2d-standard-8 \
  --enable-confidential-nodes \
  --num-nodes=2 \
  --disk-type=pd-ssd \
  --disk-size=200GB \
  --node-labels=security-tier=confidential \
  --node-taints=confidential=true:NoSchedule \
  --project=my-secure-project
```

The node labels and taints are important. The taint ensures that only workloads explicitly requesting Confidential nodes get scheduled there, while the label lets you target these nodes with node selectors.

## Scheduling Workloads on Confidential Nodes

With a tainted Confidential node pool, you need to add tolerations and node selectors to your pod specs so Kubernetes schedules them correctly.

This deployment configuration ensures pods run exclusively on Confidential nodes.

```yaml
# deployment-confidential.yaml
# Deploys a sensitive workload exclusively on Confidential GKE nodes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sensitive-data-processor
  namespace: secure-workloads
spec:
  replicas: 3
  selector:
    matchLabels:
      app: data-processor
  template:
    metadata:
      labels:
        app: data-processor
    spec:
      # Tolerate the Confidential node taint
      tolerations:
        - key: "confidential"
          operator: "Equal"
          value: "true"
          effect: "NoSchedule"

      # Target Confidential nodes specifically
      nodeSelector:
        security-tier: confidential

      containers:
        - name: processor
          image: gcr.io/my-secure-project/data-processor:v1.2
          resources:
            requests:
              cpu: "1"
              memory: "2Gi"
            limits:
              cpu: "2"
              memory: "4Gi"
          env:
            - name: ENCRYPTION_MODE
              value: "strict"
          volumeMounts:
            - name: sensitive-config
              mountPath: /etc/config
              readOnly: true

      volumes:
        - name: sensitive-config
          secret:
            secretName: processor-config

      # Use Workload Identity for authentication
      serviceAccountName: data-processor-sa
```

## Terraform Configuration

Here is a complete Terraform setup for a cluster with both standard and Confidential node pools.

```hcl
# GKE cluster with mixed node pools - standard and confidential
resource "google_container_cluster" "main" {
  name     = "mixed-security-cluster"
  location = "us-central1"
  project  = "my-secure-project"

  # Remove default node pool and manage pools separately
  remove_default_node_pool = true
  initial_node_count       = 1

  # Enable Workload Identity
  workload_identity_config {
    workload_pool = "my-secure-project.svc.id.goog"
  }

  # Enable Shielded Nodes cluster-wide
  enable_shielded_nodes = true

  # Application-layer secret encryption with Cloud KMS
  database_encryption {
    state    = "ENCRYPTED"
    key_name = google_kms_crypto_key.gke_secrets.id
  }
}

# Standard node pool for general workloads
resource "google_container_node_pool" "standard" {
  name     = "standard-pool"
  cluster  = google_container_cluster.main.name
  location = "us-central1"
  project  = "my-secure-project"

  node_count = 3

  node_config {
    machine_type = "e2-standard-4"
    image_type   = "COS_CONTAINERD"

    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }
  }
}

# Confidential node pool for sensitive workloads
resource "google_container_node_pool" "confidential" {
  name     = "confidential-pool"
  cluster  = google_container_cluster.main.name
  location = "us-central1"
  project  = "my-secure-project"

  node_count = 2

  node_config {
    machine_type = "n2d-standard-8"
    image_type   = "COS_CONTAINERD"

    # Enable Confidential Computing
    confidential_nodes {
      enabled = true
    }

    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }

    # Label nodes for workload targeting
    labels = {
      security-tier = "confidential"
    }

    # Taint so only explicit workloads get scheduled here
    taint {
      key    = "confidential"
      value  = "true"
      effect = "NO_SCHEDULE"
    }
  }
}
```

## Verifying Confidential Node Status

After deploying your cluster, verify that Confidential nodes are running with memory encryption enabled.

```bash
# Check node labels to confirm Confidential nodes
kubectl get nodes -l security-tier=confidential -o wide

# Verify Confidential Computing status on a specific node
gcloud compute instances describe \
  $(kubectl get nodes -l security-tier=confidential -o jsonpath='{.items[0].metadata.name}') \
  --zone=us-central1-a \
  --format="yaml(confidentialInstanceConfig)"
```

You can also verify from within a pod running on a Confidential node.

```bash
# Run a debug pod on a Confidential node and check SEV status
kubectl run sev-check \
  --image=ubuntu:22.04 \
  --overrides='{"spec":{"tolerations":[{"key":"confidential","operator":"Equal","value":"true","effect":"NoSchedule"}],"nodeSelector":{"security-tier":"confidential"}}}' \
  --restart=Never \
  --command -- bash -c "dmesg | grep -i sev; sleep 30"

# Check the logs
kubectl logs sev-check
```

## Network Policies for Confidential Workloads

Combine Confidential nodes with network policies to further isolate sensitive workloads.

```yaml
# network-policy-confidential.yaml
# Restrict network access for pods on Confidential nodes
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: confidential-workload-policy
  namespace: secure-workloads
spec:
  podSelector:
    matchLabels:
      app: data-processor
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Only allow traffic from the API gateway
    - from:
        - podSelector:
            matchLabels:
              app: api-gateway
      ports:
        - port: 8080
          protocol: TCP
  egress:
    # Allow access to Cloud SQL
    - to:
        - ipBlock:
            cidr: 10.0.2.0/24
      ports:
        - port: 5432
          protocol: TCP
    # Allow DNS resolution
    - to:
        - namespaceSelector: {}
      ports:
        - port: 53
          protocol: UDP
```

## Auto-Scaling Considerations

Confidential nodes cannot be live migrated, which affects how GKE handles maintenance events. When a host needs maintenance, Confidential nodes are terminated and recreated. Plan for this in your workload design.

```yaml
# Pod Disruption Budget to maintain availability during node maintenance
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: data-processor-pdb
  namespace: secure-workloads
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: data-processor
```

Also configure the node pool autoscaler with appropriate settings.

```bash
# Enable autoscaling on the Confidential node pool
gcloud container clusters update confidential-cluster \
  --region=us-central1 \
  --enable-autoscaling \
  --node-pool=confidential-pool \
  --min-nodes=2 \
  --max-nodes=10 \
  --project=my-secure-project
```

## Monitoring and Observability

Set up monitoring specifically for your Confidential node pool to track performance and integrity.

```bash
# Create a dashboard query for Confidential node performance
gcloud monitoring dashboards create --config-from-file=- <<EOF
{
  "displayName": "Confidential GKE Nodes",
  "mosaicLayout": {
    "tiles": [
      {
        "widget": {
          "title": "CPU Utilization - Confidential Nodes",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"k8s_node\" AND metadata.user_labels.\"security-tier\"=\"confidential\"",
                  "aggregation": {
                    "alignmentPeriod": "300s",
                    "perSeriesAligner": "ALIGN_MEAN"
                  }
                }
              }
            }]
          }
        }
      }
    ]
  }
}
EOF
```

Confidential GKE nodes bring hardware-level memory encryption to Kubernetes without requiring any changes to your container images or application code. The setup is a node pool configuration, the workload targeting uses standard Kubernetes mechanisms, and the security benefit is significant for any team processing sensitive data in containers.
