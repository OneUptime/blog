# How to Configure GCP Cloud Provider with Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, GCP, Google Cloud, Cloud Provider, Kubernetes

Description: Complete walkthrough of setting up the GCP external cloud provider with Talos Linux for native Google Cloud integration.

---

Google Cloud Platform offers a mature set of infrastructure services for running Kubernetes, and Talos Linux brings an immutable, security-focused OS to the table. When you combine them, you get a cluster that is both operationally clean and deeply integrated with GCP's networking and storage services. The GCP cloud provider is what makes this integration happen, and this guide walks you through setting it up from scratch.

## What the GCP Cloud Provider Handles

The external GCP cloud provider connects your Kubernetes cluster to Google Cloud APIs. It manages several things:

- Node initialization with GCP metadata (zone, region, instance type)
- LoadBalancer Service provisioning through Google Cloud Load Balancing
- Route management for pod-to-pod communication across nodes
- Node lifecycle management (detecting when instances are deleted)

Without it, your Kubernetes cluster runs independently of GCP. Nodes will not have zone labels, LoadBalancer services will stay in Pending forever, and you lose the ability to leverage GCP-native networking.

## Prerequisites

Make sure you have:

- A GCP project with billing enabled
- A VPC network and subnet configured
- `gcloud` CLI installed and authenticated
- `talosctl` and `kubectl` installed
- A service account with appropriate permissions

## Creating the Service Account

The cloud provider needs a GCP service account with specific roles. Create one:

```bash
# Create the service account
gcloud iam service-accounts create talos-cloud-provider \
  --display-name="Talos Cloud Provider" \
  --project=my-project

# Grant the necessary roles
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:talos-cloud-provider@my-project.iam.gserviceaccount.com" \
  --role="roles/compute.admin"

gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:talos-cloud-provider@my-project.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Generate a key file
gcloud iam service-accounts keys create gcp-cloud-provider-key.json \
  --iam-account=talos-cloud-provider@my-project.iam.gserviceaccount.com
```

In production, consider using Workload Identity instead of key files for better security.

## Configuring Talos Machine Config

Generate your Talos configuration with the external cloud provider enabled:

```bash
# Generate config with GCP cloud provider enabled
talosctl gen config my-cluster https://my-cluster-endpoint:6443 \
  --config-patch='[
    {"op": "add", "path": "/cluster/externalCloudProvider", "value": {
      "enabled": true
    }},
    {"op": "add", "path": "/machine/kubelet/extraArgs", "value": {
      "cloud-provider": "external"
    }}
  ]'
```

This configuration tells the kubelet to use the external cloud provider, which means it will not try to initialize itself and will wait for the cloud controller manager to do it.

## Creating GCP Infrastructure

Set up the necessary GCP resources for your cluster:

```bash
# Create a VPC network
gcloud compute networks create talos-vpc \
  --subnet-mode=custom \
  --project=my-project

# Create a subnet
gcloud compute networks subnets create talos-subnet \
  --network=talos-vpc \
  --region=us-central1 \
  --range=10.0.0.0/24 \
  --project=my-project

# Create firewall rules for internal communication
gcloud compute firewall-rules create talos-internal \
  --network=talos-vpc \
  --allow=tcp,udp,icmp \
  --source-ranges=10.0.0.0/24 \
  --project=my-project

# Create firewall rules for the Kubernetes API
gcloud compute firewall-rules create talos-api \
  --network=talos-vpc \
  --allow=tcp:6443,tcp:50000 \
  --source-ranges=0.0.0.0/0 \
  --project=my-project

# Create firewall rules for NodePort services
gcloud compute firewall-rules create talos-nodeports \
  --network=talos-vpc \
  --allow=tcp:30000-32767 \
  --source-ranges=0.0.0.0/0 \
  --project=my-project
```

## Launching Instances

Create your Talos instances with the service account attached:

```bash
# Create a control plane instance
gcloud compute instances create talos-cp-1 \
  --zone=us-central1-a \
  --machine-type=e2-standard-4 \
  --image=talos-v1-7-0 \
  --image-project=my-project \
  --subnet=talos-subnet \
  --service-account=talos-cloud-provider@my-project.iam.gserviceaccount.com \
  --scopes=cloud-platform \
  --metadata-from-file=user-data=controlplane.yaml \
  --tags=talos-cp \
  --project=my-project
```

The `--scopes=cloud-platform` flag gives the instance broad API access. The actual permissions are controlled by the service account's IAM roles.

## Deploying the Cloud Controller Manager

Store the service account key as a Kubernetes secret and deploy the cloud controller manager:

```bash
# Create the secret with the GCP credentials
kubectl create secret generic gcp-cloud-provider-creds \
  --namespace kube-system \
  --from-file=cloud-config=gcp-cloud-provider-key.json
```

Deploy the cloud controller manager using the official manifests:

```yaml
# gcp-ccm.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: cloud-controller-manager
  namespace: kube-system
  labels:
    component: cloud-controller-manager
spec:
  selector:
    matchLabels:
      component: cloud-controller-manager
  template:
    metadata:
      labels:
        component: cloud-controller-manager
    spec:
      nodeSelector:
        node-role.kubernetes.io/control-plane: ""
      tolerations:
        - key: node-role.kubernetes.io/control-plane
          effect: NoSchedule
        - key: node.cloudprovider.kubernetes.io/uninitialized
          value: "true"
          effect: NoSchedule
      serviceAccountName: cloud-controller-manager
      containers:
        - name: cloud-controller-manager
          image: registry.k8s.io/cloud-provider-gcp/cloud-controller-manager:v29.0.0
          command:
            - /cloud-controller-manager
            - --cloud-provider=gce
            - --leader-elect=true
            - --use-service-account-credentials=true
            - --controllers=*,-nodeipam
            - --cloud-config=/etc/kubernetes/cloud-config
          volumeMounts:
            - name: cloud-config
              mountPath: /etc/kubernetes/cloud-config
              readOnly: true
      volumes:
        - name: cloud-config
          secret:
            secretName: gcp-cloud-provider-creds
```

```bash
# Apply the cloud controller manager
kubectl apply -f gcp-ccm.yaml
```

## Setting Up RBAC

The cloud controller manager needs RBAC permissions to manage nodes and services:

```yaml
# ccm-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cloud-controller-manager
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cloud-controller-manager
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
  - kind: ServiceAccount
    name: cloud-controller-manager
    namespace: kube-system
```

In production, create a more restrictive ClusterRole instead of using `cluster-admin`.

## Verifying the Setup

Check that everything is working:

```bash
# Verify the cloud controller manager is running
kubectl get pods -n kube-system -l component=cloud-controller-manager

# Check node labels for GCP metadata
kubectl get nodes --show-labels | grep topology.kubernetes.io

# Verify providerID is set on nodes
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.providerID}{"\n"}{end}'
```

Nodes should have a `providerID` starting with `gce://` and labels for the zone and region.

## Testing Load Balancer Integration

Create a test LoadBalancer service:

```yaml
# test-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: test-lb
spec:
  type: LoadBalancer
  selector:
    app: test
  ports:
    - port: 80
      targetPort: 8080
```

```bash
# Apply and watch for the external IP
kubectl apply -f test-service.yaml
kubectl get svc test-lb --watch
```

The GCP cloud provider will create a Google Cloud Network Load Balancer and assign an external IP to the service.

## Internal Load Balancers

For internal services, use the annotation:

```yaml
metadata:
  annotations:
    cloud.google.com/load-balancer-type: "Internal"
```

This creates an internal TCP/UDP load balancer that is only accessible within your VPC network.

## Troubleshooting

If nodes stay uninitialized or load balancers are not created, start with the logs:

```bash
# Check cloud controller manager logs
kubectl logs -n kube-system -l component=cloud-controller-manager --tail=100
```

Common problems include incorrect service account permissions, missing firewall rules, and mismatched project or network names in the configuration. Also verify that the instance metadata service is accessible from the cloud controller manager pods.

## Conclusion

The GCP cloud provider on Talos Linux connects your cluster to Google Cloud's native infrastructure services. Once configured, you get automatic load balancer provisioning, node metadata enrichment, and lifecycle management. The setup involves creating a service account, configuring Talos for external cloud provider mode, and deploying the cloud controller manager. From there, your Kubernetes resources map directly to GCP infrastructure.
