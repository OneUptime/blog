# How to Upgrade Rancher with Zero Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Upgrade, High Availability

Description: Learn how to upgrade Rancher without any downtime using a high-availability setup and rolling update strategy.

Upgrading Rancher in a production environment requires careful planning to avoid disrupting teams that depend on the management plane. This guide shows you how to perform a zero-downtime upgrade of Rancher by leveraging a high-availability deployment, rolling updates, and proper health checks.

## Prerequisites

- Rancher deployed in high-availability mode with at least 3 replicas
- Helm 3 installed
- `kubectl` access to the Rancher management cluster
- A load balancer or ingress controller in front of Rancher
- A recent backup of the cluster running Rancher; if the management cluster uses embedded etcd, take a recent etcd snapshot

## Understanding Zero-Downtime Upgrades

Zero-downtime upgrades rely on Kubernetes rolling update strategy. When you upgrade Rancher via Helm, Kubernetes replaces pods one at a time, ensuring that at least some pods are always available to handle requests. For this to work, you need multiple Rancher replicas and a properly configured deployment strategy.

## Step 1: Verify High Availability Setup

Check that your Rancher deployment has multiple replicas:

```bash
kubectl get deployment rancher -n cattle-system -o jsonpath='{.spec.replicas}'
```

If the output is `1`, you need to scale up before proceeding:

```bash
helm get values rancher -n cattle-system -o yaml > current-values.yaml
```

Get the currently deployed Rancher chart version:

```bash
helm ls -n cattle-system
```

Edit `current-values.yaml` and set `replicas: 3`, then apply the change without upgrading Rancher yet:

```bash
helm upgrade rancher rancher-stable/rancher \
  --namespace cattle-system \
  --values current-values.yaml \
  --version <current-rancher-version>
```

Wait for all replicas to be ready:

```bash
kubectl rollout status deployment rancher -n cattle-system
```

## Step 2: Configure the Rolling Update Strategy

Verify that the deployment uses a rolling update strategy with proper settings:

```bash
kubectl get deployment rancher -n cattle-system -o jsonpath='{.spec.strategy}'
```

For Rancher installed from the official Helm chart, you should see a rolling update strategy. With more than one replica, the chart uses:

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 1
    maxSurge: 1
```

With three replicas, this still leaves remaining Rancher pods serving traffic while the rollout proceeds. Because Rancher is Helm-managed, a one-off `kubectl patch` to the deployment will be overwritten by the next `helm upgrade`.

## Step 3: Verify Pod Disruption Budget

Create or verify a PodDisruptionBudget to protect against voluntary disruptions such as node drains during the upgrade:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: rancher-pdb
  namespace: cattle-system
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: rancher
```

Apply it:

```bash
kubectl apply -f rancher-pdb.yaml
```

## Step 4: Back Up Before Upgrading

Back up the cluster running Rancher before upgrading. For an RKE2 management cluster with embedded etcd, you can take an etcd snapshot:

```bash
# For RKE2

rke2 etcd-snapshot save --name pre-upgrade-$(date +%Y%m%d%H%M%S)
```

Export current Helm values:

```bash
helm get values rancher -n cattle-system -o yaml > current-values.yaml
```

## Step 5: Update the Helm Repository

```bash
helm repo update
helm search repo rancher-stable/rancher --versions | head -5
```

## Step 6: Perform the Rolling Upgrade

Run the Helm upgrade with your existing values and the specific target version you selected:

```bash
helm upgrade rancher rancher-stable/rancher \
  --namespace cattle-system \
  --values current-values.yaml \
  --version <target-version> \
  --wait \
  --timeout 10m
```

The `--wait` flag ensures Helm waits until all pods are ready before marking the upgrade as complete.

## Step 7: Monitor the Rolling Update

Open a separate terminal and watch the pod rollout in real time:

```bash
kubectl get pods -n cattle-system -w
```

You should see new pods being created one at a time while old pods continue to serve traffic. The sequence looks like this:

1. A new pod is created with the updated image
2. Kubernetes waits for the new pod to pass readiness checks
3. Once the new pod is ready, an old pod is terminated
4. This repeats until all pods are running the new version

Monitor the deployment progress:

```bash
kubectl rollout status deployment rancher -n cattle-system
```

## Step 8: Verify Health During Upgrade

While the upgrade is in progress, verify that Rancher remains accessible:

```bash
curl -sk https://your-rancher-url/healthz
```

You can run this in a loop to continuously check availability:

```bash
while true; do
  STATUS=$(curl -sk -o /dev/null -w "%{http_code}" https://your-rancher-url/healthz)
  echo "$(date): HTTP $STATUS"
  sleep 2
done
```

If you see consistent `200` responses throughout the upgrade, you have achieved zero downtime.

## Step 9: Verify Post-Upgrade

After the rollout completes, confirm the new version:

```bash
kubectl get settings.management.cattle.io server-version -o jsonpath='{.value}'
```

Check that all components are healthy:

```bash
kubectl get pods -n cattle-system
kubectl get deployments -n cattle-system
```

Log in to the Rancher UI and verify that all managed clusters are active and agents are connected.

## Step 10: Verify Downstream Cluster Agents

After upgrading Rancher, confirm that the cluster agent is healthy on each downstream cluster:

```bash
kubectl --context <downstream-cluster-context> -n cattle-system get deployment cattle-cluster-agent
```

## Handling Issues During the Upgrade

If a new pod fails to become ready, the rollout will stop making progress until the readiness issue is fixed. Check the failing pod:

```bash
kubectl describe pod <pod-name> -n cattle-system
kubectl logs <pod-name> -n cattle-system
```

If you need to abort, roll back immediately:

```bash
helm rollback rancher -n cattle-system
```

The rollback also uses the rolling update strategy, so it will be zero-downtime as well.

## Best Practices for Zero-Downtime Upgrades

- Always run at least 3 Rancher replicas in production.
- Use multiple replicas and verify the Rancher deployment is using a `RollingUpdate` strategy before upgrading.
- Set up a PodDisruptionBudget to protect against node drains during the upgrade.
- Configure proper readiness probes on the Rancher deployment.
- Use the `--wait` flag with Helm to catch failures early.
- Monitor health endpoints continuously during the upgrade.
- Schedule upgrades during lower-traffic periods even though downtime is not expected.

## Conclusion

Zero-downtime Rancher upgrades are achievable with a high-availability deployment, a proper rolling update strategy, and careful monitoring. By running multiple replicas, using the Helm chart's rolling update behavior, and using pod disruption budgets, you can upgrade Rancher without any interruption to your teams or managed clusters.
