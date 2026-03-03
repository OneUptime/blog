# How to Automate Talos Linux Upgrades with GitOps

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, GitOps, Upgrades, Kubernetes, Automation, Flux CD, ArgoCD

Description: Automate Talos Linux and Kubernetes version upgrades using GitOps workflows with proper rollback and health validation.

---

Upgrading a Talos Linux cluster manually is tedious and risky. You need to upgrade each node one at a time, verify health after each step, and handle rollbacks if something goes wrong. With GitOps, the upgrade process becomes a pull request. You change the desired version in your configuration repository, the change gets reviewed, and automation handles the rolling upgrade across your cluster. This guide shows how to set up automated upgrades for Talos Linux using GitOps principles.

## The Upgrade Challenge

A Talos Linux cluster upgrade involves two separate components:

1. **Talos OS upgrade**: Updating the Talos Linux installation on each node
2. **Kubernetes upgrade**: Updating the control plane and kubelet versions

Both need to happen in a specific order - control plane nodes first, then workers - and each node needs a health check before proceeding to the next. Doing this manually across a 20-node cluster is time-consuming and error-prone.

## Architecture

Our GitOps upgrade automation consists of:

- A Git repository containing the desired Talos and Kubernetes versions
- A controller running in the cluster that watches for version changes
- An upgrade operator that performs rolling upgrades node by node
- Health checks that gate progression between nodes

## Option 1: Using the Talos System Upgrade Controller

Talos provides a system upgrade controller that can be managed through Kubernetes resources:

```yaml
# Install the system upgrade controller
# upgrade-controller.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: talos-upgrade-controller
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: talos-upgrade-controller
  template:
    metadata:
      labels:
        app: talos-upgrade-controller
    spec:
      serviceAccountName: talos-upgrade-controller
      containers:
        - name: controller
          image: ghcr.io/siderolabs/talos-cloud-controller-manager:latest
```

However, the most GitOps-native approach is to use a custom upgrade workflow tied to your Git repository.

## Option 2: GitOps with Flux CD and Custom Controllers

### Step 1: Define the Desired State in Git

Create a configuration file that declares the desired versions:

```yaml
# clusters/production/versions.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-versions
  namespace: kube-system
data:
  talos_version: "v1.6.1"
  kubernetes_version: "v1.29.1"
  previous_talos_version: "v1.6.0"
  previous_kubernetes_version: "v1.29.0"
```

### Step 2: Create the Upgrade CronJob

Build a Kubernetes CronJob that checks the desired version against the current version and triggers upgrades:

```yaml
# clusters/production/upgrade-job.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: talos-upgrade-checker
  namespace: kube-system
spec:
  schedule: "*/10 * * * *"  # Check every 10 minutes
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: talos-upgrade-controller
          containers:
            - name: upgrade-checker
              image: ghcr.io/siderolabs/talosctl:v1.6.1
              command:
                - /bin/sh
                - -c
                - |
                  # Get desired version from ConfigMap
                  DESIRED_VERSION=$(kubectl get configmap cluster-versions \
                    -n kube-system -o jsonpath='{.data.talos_version}')

                  echo "Desired Talos version: ${DESIRED_VERSION}"

                  # Get current version from a node
                  CURRENT_VERSION=$(talosctl version --nodes ${NODE_IP} \
                    --talosconfig /etc/talos/talosconfig -o json | \
                    jq -r '.messages[0].version.tag')

                  echo "Current Talos version: ${CURRENT_VERSION}"

                  if [ "${DESIRED_VERSION}" = "${CURRENT_VERSION}" ]; then
                    echo "Cluster is at desired version. No upgrade needed."
                    exit 0
                  fi

                  echo "Upgrade needed: ${CURRENT_VERSION} -> ${DESIRED_VERSION}"

                  # Trigger the upgrade job
                  kubectl create job talos-upgrade-$(date +%s) \
                    --from=cronjob/talos-rolling-upgrade \
                    -n kube-system
              env:
                - name: NODE_IP
                  valueFrom:
                    fieldRef:
                      fieldPath: status.hostIP
              volumeMounts:
                - name: talosconfig
                  mountPath: /etc/talos
                  readOnly: true
          volumes:
            - name: talosconfig
              secret:
                secretName: talos-api-credentials
          restartPolicy: OnFailure
```

### Step 3: Create the Rolling Upgrade Job

```yaml
# clusters/production/rolling-upgrade-job.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: talos-rolling-upgrade
  namespace: kube-system
spec:
  schedule: "0 0 31 2 *"  # Never runs on schedule, only triggered manually
  suspend: true
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      backoffLimit: 3
      template:
        spec:
          serviceAccountName: talos-upgrade-controller
          containers:
            - name: upgrader
              image: ghcr.io/siderolabs/talosctl:v1.6.1
              command:
                - /bin/sh
                - -c
                - |
                  set -e

                  DESIRED=$(kubectl get configmap cluster-versions \
                    -n kube-system -o jsonpath='{.data.talos_version}')

                  INSTALLER_IMAGE="ghcr.io/siderolabs/installer:${DESIRED}"
                  TALOSCONFIG="/etc/talos/talosconfig"

                  echo "Starting rolling upgrade to ${DESIRED}"

                  # Get all control plane nodes
                  CP_NODES=$(kubectl get nodes \
                    -l node-role.kubernetes.io/control-plane="" \
                    -o jsonpath='{.items[*].status.addresses[?(@.type=="InternalIP")].address}')

                  # Upgrade control plane nodes first
                  for node in ${CP_NODES}; do
                    echo "=== Upgrading control plane node: ${node} ==="

                    # Check if already upgraded
                    NODE_VERSION=$(talosctl version --nodes ${node} \
                      --talosconfig ${TALOSCONFIG} -o json | \
                      jq -r '.messages[0].version.tag')

                    if [ "${NODE_VERSION}" = "${DESIRED}" ]; then
                      echo "Node ${node} already at ${DESIRED}, skipping"
                      continue
                    fi

                    # Perform the upgrade
                    echo "Upgrading ${node} from ${NODE_VERSION} to ${DESIRED}"
                    talosctl upgrade \
                      --nodes ${node} \
                      --talosconfig ${TALOSCONFIG} \
                      --image ${INSTALLER_IMAGE} \
                      --wait \
                      --timeout 10m

                    # Wait for node to be healthy
                    echo "Waiting for ${node} to be healthy..."
                    sleep 60
                    talosctl health \
                      --nodes ${node} \
                      --talosconfig ${TALOSCONFIG} \
                      --wait-timeout 300s

                    # Verify Kubernetes node is Ready
                    kubectl wait --for=condition=Ready node/${node} --timeout=300s

                    echo "Node ${node} upgraded successfully"
                  done

                  echo "=== Control plane upgrade complete ==="

                  # Get all worker nodes
                  WORKER_NODES=$(kubectl get nodes \
                    -l '!node-role.kubernetes.io/control-plane' \
                    -o jsonpath='{.items[*].status.addresses[?(@.type=="InternalIP")].address}')

                  # Upgrade worker nodes
                  for node in ${WORKER_NODES}; do
                    echo "=== Upgrading worker node: ${node} ==="

                    NODE_VERSION=$(talosctl version --nodes ${node} \
                      --talosconfig ${TALOSCONFIG} -o json | \
                      jq -r '.messages[0].version.tag')

                    if [ "${NODE_VERSION}" = "${DESIRED}" ]; then
                      echo "Node ${node} already at ${DESIRED}, skipping"
                      continue
                    fi

                    # Get the node name for drain
                    NODE_NAME=$(kubectl get nodes -o json | \
                      jq -r ".items[] | select(.status.addresses[] | select(.type==\"InternalIP\" and .address==\"${node}\")) | .metadata.name")

                    # Drain the node
                    echo "Draining ${NODE_NAME}..."
                    kubectl drain ${NODE_NAME} \
                      --ignore-daemonsets \
                      --delete-emptydir-data \
                      --timeout=120s

                    # Upgrade
                    talosctl upgrade \
                      --nodes ${node} \
                      --talosconfig ${TALOSCONFIG} \
                      --image ${INSTALLER_IMAGE} \
                      --wait \
                      --timeout 10m

                    # Uncordon after upgrade
                    sleep 60
                    kubectl uncordon ${NODE_NAME}
                    kubectl wait --for=condition=Ready node/${NODE_NAME} --timeout=300s

                    echo "Node ${node} upgraded successfully"
                  done

                  echo "=== Rolling upgrade complete ==="
                  kubectl get nodes -o wide
              volumeMounts:
                - name: talosconfig
                  mountPath: /etc/talos
                  readOnly: true
          volumes:
            - name: talosconfig
              secret:
                secretName: talos-api-credentials
          restartPolicy: OnFailure
```

### Step 4: Set Up RBAC

```yaml
# clusters/production/upgrade-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: talos-upgrade-controller
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: talos-upgrade-controller
rules:
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["get", "list", "watch", "patch", "update"]
  - apiGroups: [""]
    resources: ["pods", "pods/eviction"]
    verbs: ["get", "list", "create", "delete"]
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list"]
  - apiGroups: ["batch"]
    resources: ["jobs"]
    verbs: ["create", "get", "list"]
  - apiGroups: ["apps"]
    resources: ["daemonsets"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: talos-upgrade-controller
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: talos-upgrade-controller
subjects:
  - kind: ServiceAccount
    name: talos-upgrade-controller
    namespace: kube-system
```

### Step 5: Store Talos API Credentials

```bash
# Create the talosconfig secret
kubectl create secret generic talos-api-credentials \
  --namespace kube-system \
  --from-file=talosconfig=/path/to/talosconfig
```

## The Upgrade Workflow

With this setup, upgrading your Talos Linux cluster is a Git-driven process:

1. **Create a branch**: `git checkout -b upgrade/talos-v1.6.1`

2. **Update the versions ConfigMap**:
```yaml
data:
  talos_version: "v1.6.1"    # Changed from v1.6.0
  kubernetes_version: "v1.29.1"  # Changed from v1.29.0
  previous_talos_version: "v1.6.0"
  previous_kubernetes_version: "v1.29.0"
```

3. **Update container images** in the upgrade jobs to use the new talosctl version

4. **Create a pull request**: The PR shows exactly what version changes are being made

5. **Review and merge**: Team reviews the changes and approves

6. **Flux syncs the changes**: The ConfigMap is updated in the cluster

7. **The upgrade checker detects the version mismatch** and triggers the rolling upgrade

8. **Rolling upgrade proceeds node by node** with health checks

## Monitoring the Upgrade

Track upgrade progress through:

```bash
# Watch the upgrade job
kubectl logs -f job/talos-upgrade-<timestamp> -n kube-system

# Check node versions
kubectl get nodes -o wide

# Check Talos versions
talosctl version --nodes 10.0.0.10,10.0.0.11,10.0.0.12
```

## Rollback Strategy

If an upgrade goes wrong, revert the Git commit:

```bash
# Revert the version change
git revert HEAD
git push origin main
```

Flux will sync the reverted ConfigMap, and the upgrade checker will detect that the desired version matches the rollback target. You may need to manually trigger a downgrade for nodes that already upgraded:

```bash
# Manual rollback for a specific node
talosctl upgrade --nodes 10.0.0.10 \
  --image ghcr.io/siderolabs/installer:v1.6.0
```

## Conclusion

Automating Talos Linux upgrades with GitOps removes the human error and tedium from one of the most critical cluster operations. Version changes become pull requests that get reviewed, approved, and automatically applied with proper health checks at each step. The rolling upgrade pattern ensures that your cluster stays available throughout the process, and the Git history gives you a clear audit trail of every upgrade. Combined with automatic rollback capabilities, this approach makes Talos Linux upgrades something you can do confidently and frequently rather than dreading.
