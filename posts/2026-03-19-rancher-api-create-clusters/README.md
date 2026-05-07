# How to Create Clusters Using the Rancher API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, API, REST API, Cluster Management, Automation

Description: Learn how to provision and create Kubernetes clusters programmatically using the Rancher API with practical examples for RKE2, K3s, and imported clusters.

Creating clusters through the Rancher API is essential for infrastructure automation. Instead of clicking through the UI, you can define cluster configurations as code, version them, and provision clusters on demand. This guide walks you through creating different types of clusters using the Rancher API.

## Prerequisites

You need the following before you begin:

- A running Rancher server (v2.6+)
- An API token with cluster creation permissions
- curl, jq, and kubectl installed on your machine

Set up your environment variables:

```bash
export RANCHER_URL="https://rancher.example.com"
export RANCHER_TOKEN="token-xxxxx:yyyyyyyyyyyyyyyy"
```

For each example below, replace the hardcoded `kubernetesVersion` with a version supported by your Rancher release.

## Creating a Custom Cluster (RKE2)

Custom clusters allow you to bring your own infrastructure. You register existing nodes with Rancher, and it installs the Kubernetes distribution on them.

### Step 1: Create the Cluster Resource

```bash
curl -s -k -X POST \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "provisioning.cattle.io.cluster",
    "metadata": {
      "name": "my-rke2-cluster",
      "namespace": "fleet-default"
    },
    "spec": {
      "kubernetesVersion": "v1.28.9+rke2r1",
      "localClusterAuthEndpoint": {
        "enabled": true
      },
      "rkeConfig": {
        "machineGlobalConfig": {
          "cni": "calico",
          "disable-kube-proxy": false,
          "etcd-expose-metrics": false
        },
        "registries": {},
        "upgradeStrategy": {
          "controlPlaneConcurrency": "1",
          "controlPlaneDrainOptions": {},
          "workerConcurrency": "1",
          "workerDrainOptions": {}
        }
      }
    }
  }' \
  "${RANCHER_URL}/v1/provisioning.cattle.io.clusters"
```

### Step 2: Generate Registration Commands

After the cluster is created, generate the node registration command:

```bash
CLUSTER_NAME="my-rke2-cluster"
MGMT_CLUSTER_ID=""
REGISTRATION_JSON=""

while [ -z "${MGMT_CLUSTER_ID}" ]; do
  MGMT_CLUSTER_ID=$(curl -s -k \
    -H "Authorization: Bearer ${RANCHER_TOKEN}" \
    "${RANCHER_URL}/v1/provisioning.cattle.io.clusters/fleet-default/${CLUSTER_NAME}" \
    | jq -r '.status.clusterName // empty')
  sleep 2
done

while [ -z "${REGISTRATION_JSON}" ]; do
  REGISTRATION_JSON=$(curl -s -k \
    -H "Authorization: Bearer ${RANCHER_TOKEN}" \
    "${RANCHER_URL}/v3/clusterregistrationtokens?clusterId=${MGMT_CLUSTER_ID}" | jq -c '[.data[] | select(.name=="default-token")][0] | select(.nodeCommand != null and .nodeCommand != "") | {
      nodeCommand: .nodeCommand,
      insecureNodeCommand: .insecureNodeCommand,
      manifestUrl: .manifestUrl
    }')
  sleep 2
done

echo "${REGISTRATION_JSON}" | jq
```

### Step 3: Register Nodes

Run the registration command on each node. For control plane nodes:

```bash
NODE_COMMAND=$(echo "${REGISTRATION_JSON}" | jq -r '.nodeCommand')

sh -c "${NODE_COMMAND} --etcd --controlplane"
```

For worker nodes:

```bash
sh -c "${NODE_COMMAND} --worker"
```

If your Rancher server uses self-signed certificates and you have not configured `cacerts`, use `insecureNodeCommand` instead of `nodeCommand`.

## Creating a K3s Cluster

K3s clusters are lightweight and ideal for edge or development use cases:

```bash
curl -s -k -X POST \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "provisioning.cattle.io.cluster",
    "metadata": {
      "name": "my-k3s-cluster",
      "namespace": "fleet-default"
    },
    "spec": {
      "kubernetesVersion": "v1.28.9+k3s1",
      "rkeConfig": {
        "upgradeStrategy": {
          "controlPlaneConcurrency": "1",
          "workerConcurrency": "1"
        }
      }
    }
  }' \
  "${RANCHER_URL}/v1/provisioning.cattle.io.clusters"
```

## Importing an Existing Cluster

If you already have a running Kubernetes cluster, you can import it into Rancher:

### Step 1: Create the Import Resource

```bash
curl -s -k -X POST \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "provisioning.cattle.io.cluster",
    "metadata": {
      "name": "imported-cluster",
      "namespace": "fleet-default"
    },
    "spec": {}
  }' \
  "${RANCHER_URL}/v1/provisioning.cattle.io.clusters"
```

### Step 2: Get the Import Command

```bash
CLUSTER_NAME="imported-cluster"
MGMT_CLUSTER_ID=""
IMPORT_MANIFEST_URL=""

while [ -z "${MGMT_CLUSTER_ID}" ]; do
  MGMT_CLUSTER_ID=$(curl -s -k \
    -H "Authorization: Bearer ${RANCHER_TOKEN}" \
    "${RANCHER_URL}/v1/provisioning.cattle.io.clusters/fleet-default/${CLUSTER_NAME}" \
    | jq -r '.status.clusterName // empty')
  sleep 2
done

while [ -z "${IMPORT_MANIFEST_URL}" ]; do
  IMPORT_MANIFEST_URL=$(curl -s -k \
    -H "Authorization: Bearer ${RANCHER_TOKEN}" \
    "${RANCHER_URL}/v3/clusterregistrationtokens?clusterId=${MGMT_CLUSTER_ID}" \
    | jq -r '.data[] | select(.name=="default-token") | .manifestUrl // empty')
  sleep 2
done

echo "${IMPORT_MANIFEST_URL}"
```

### Step 3: Apply the Manifest on the Target Cluster

Run this on the cluster you want to import:

```bash
kubectl apply -f "${IMPORT_MANIFEST_URL}"
```

For clusters with self-signed certificates:

```bash
curl --insecure -sfL "${IMPORT_MANIFEST_URL}" | kubectl apply -f -
```

## Creating Clusters with Node Pools (Cloud Providers)

For cloud-hosted clusters, you first need to create cloud credentials and machine configuration objects, then reference them in the cluster creation.

### Step 1: Create Cloud Credentials

```bash
curl -s -k -X POST \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "cloudCredential",
    "name": "aws-credentials",
    "amazonec2credentialConfig": {
      "accessKey": "AKIAIOSFODNN7EXAMPLE",
      "secretKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      "defaultRegion": "us-east-1"
    }
  }' \
  "${RANCHER_URL}/v3/cloudCredentials"
```

Create the machine config objects for each pool separately in the same namespace as the cluster (typically `fleet-default`), then reference those object names in `machineConfigRef`.

### Step 2: Create the Cluster with Machine Pools

```bash
CREDENTIAL_ID="cattle-global-data:cc-xxxxx"

curl -s -k -X POST \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "provisioning.cattle.io.cluster",
    "metadata": {
      "name": "aws-cluster",
      "namespace": "fleet-default"
    },
    "spec": {
      "cloudCredentialSecretName": "'"${CREDENTIAL_ID}"'",
      "kubernetesVersion": "v1.28.9+rke2r1",
      "rkeConfig": {
        "machinePools": [
          {
            "name": "control-plane",
            "controlPlaneRole": true,
            "etcdRole": true,
            "workerRole": false,
            "quantity": 3,
            "machineConfigRef": {
              "kind": "Amazonec2Config",
              "name": "cp-config"
            }
          },
          {
            "name": "workers",
            "controlPlaneRole": false,
            "etcdRole": false,
            "workerRole": true,
            "quantity": 3,
            "machineConfigRef": {
              "kind": "Amazonec2Config",
              "name": "worker-config"
            }
          }
        ]
      }
    }
  }' \
  "${RANCHER_URL}/v1/provisioning.cattle.io.clusters"
```

## Monitoring Cluster Creation Progress

After creating a cluster, monitor its provisioning status:

```bash
CLUSTER_NAME="my-rke2-cluster"

# Poll until the cluster is active
while true; do
  state=$(curl -s -k \
    -H "Authorization: Bearer ${RANCHER_TOKEN}" \
    "${RANCHER_URL}/v1/provisioning.cattle.io.clusters/fleet-default/${CLUSTER_NAME}" | jq -r '([.status.conditions[]? | select(.type=="Ready") | .status][0]) // "Unknown"')

  echo "Cluster state: ${state}"

  if [ "$state" = "True" ]; then
    echo "Cluster is ready."
    break
  fi

  sleep 30
done
```

## Setting Cluster Labels and Annotations

Add metadata to your cluster for organizational purposes:

```bash
curl -s -k -X PATCH \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/merge-patch+json" \
  -d '{
    "metadata": {
      "labels": {
        "environment": "production",
        "team": "platform",
        "cost-center": "engineering"
      },
      "annotations": {
        "description": "Production workload cluster",
        "owner": "platform-team@example.com"
      }
    }
  }' \
  "${RANCHER_URL}/v1/provisioning.cattle.io.clusters/fleet-default/my-rke2-cluster"
```

## Summary

The Rancher API supports creating custom clusters (RKE2 and K3s), importing existing clusters, and provisioning cloud-hosted clusters with machine pools. By defining cluster configurations as API calls, you can version your infrastructure definitions, integrate with CI/CD pipelines, and provision clusters on demand. Monitor the provisioning process through the API to build fully automated cluster lifecycle management.
