# How to Automate Maintenance Tasks on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Automation, Kubernetes, Maintenance, DevOps, Infrastructure

Description: Discover how to automate routine maintenance tasks on Talos Linux clusters using scripts, CronJobs, and GitOps workflows for reliable operations.

---

One of the biggest advantages of Talos Linux is that it was built from the ground up for automation. There is no SSH, no interactive shell, and no manual package management. Everything is driven through an API. This means that every maintenance task you perform manually can, and should, be automated. This guide walks through practical approaches to automating the most common maintenance tasks on Talos Linux clusters.

## Why Automate Maintenance?

Manual maintenance is slow, error-prone, and does not scale. When you have 5 nodes, doing things by hand is annoying but manageable. When you have 50 or 500 nodes, it becomes impossible. Even at small scale, automation gives you:

- Consistency - the same steps are followed every time
- Speed - tasks complete faster without human delays
- Auditability - automated systems produce logs
- Reliability - no steps are accidentally skipped

Talos Linux is already more automatable than traditional Linux distributions, so you are starting from a good place.

## Automating etcd Backups

etcd is the heart of your Kubernetes cluster. Losing etcd data means losing your cluster state. Automated backups are non-negotiable.

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: etcd-backup
  namespace: kube-system
spec:
  schedule: "0 */6 * * *"  # Every 6 hours
  successfulJobsHistoryLimit: 5
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          hostNetwork: true
          nodeSelector:
            node-role.kubernetes.io/control-plane: ""
          tolerations:
            - operator: Exists
          containers:
          - name: backup
            image: ghcr.io/siderolabs/talosctl:v1.9.0
            command:
            - /bin/sh
            - -c
            - |
              set -e
              BACKUP_FILE="/backup/etcd-$(date +%Y%m%d-%H%M%S).db"
              talosctl etcd snapshot "$BACKUP_FILE" -n 127.0.0.1

              # Upload to S3
              aws s3 cp "$BACKUP_FILE" "s3://my-cluster-backups/etcd/"

              # Clean up local backups older than 7 days
              find /backup -name "etcd-*.db" -mtime +7 -delete

              echo "Backup completed: $BACKUP_FILE"
            volumeMounts:
            - name: backup
              mountPath: /backup
          volumes:
          - name: backup
            hostPath:
              path: /var/backup
          restartPolicy: OnFailure
```

## Automating Health Checks

Regular health checks catch problems before they become outages. Set up a CronJob that runs health checks and alerts when something is wrong.

```bash
#!/bin/bash
# health-check.sh - Automated cluster health verification

CONTROL_PLANE_IPS=("10.0.0.1" "10.0.0.2" "10.0.0.3")
ALERT_WEBHOOK="${SLACK_WEBHOOK_URL}"

check_failed=false

# Check node readiness
NOT_READY=$(kubectl get nodes --no-headers | grep -cv "Ready")
if [ "$NOT_READY" -gt 0 ]; then
    echo "WARNING: $NOT_READY nodes are not Ready"
    check_failed=true
fi

# Check etcd health
for ip in "${CONTROL_PLANE_IPS[@]}"; do
    if ! talosctl etcd status -n "$ip" > /dev/null 2>&1; then
        echo "WARNING: etcd unhealthy on $ip"
        check_failed=true
    fi
done

# Check for pod restarts
HIGH_RESTART_PODS=$(kubectl get pods --all-namespaces -o json | \
    jq -r '.items[] | select(.status.containerStatuses[]?.restartCount > 10) |
    "\(.metadata.namespace)/\(.metadata.name): \(.status.containerStatuses[0].restartCount) restarts"')

if [ -n "$HIGH_RESTART_PODS" ]; then
    echo "WARNING: Pods with high restart counts:"
    echo "$HIGH_RESTART_PODS"
    check_failed=true
fi

# Check certificate expiration
for ip in "${CONTROL_PLANE_IPS[@]}"; do
    CERT_INFO=$(talosctl get certificate -n "$ip" -o json 2>/dev/null)
    # Parse and check expiration dates
done

# Send alert if any check failed
if [ "$check_failed" = true ]; then
    curl -X POST "$ALERT_WEBHOOK" \
        -H 'Content-Type: application/json' \
        -d '{"text": "Cluster health check failed. Review the health check logs."}'
fi
```

## Automating Certificate Renewals

Talos Linux handles most certificate management internally, but you should still monitor and automate the process:

```bash
#!/bin/bash
# cert-renewal-check.sh

CONTROL_PLANE_IP="10.0.0.1"
WARNING_DAYS=30

# Get certificate information
CERTS=$(talosctl get certificate -n "$CONTROL_PLANE_IP" -o json)

# Check each certificate's expiration
echo "$CERTS" | jq -r '.[] | "\(.metadata.id) \(.spec.notAfter)"' | while read -r cert_id expiry; do
    EXPIRY_EPOCH=$(date -d "$expiry" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$expiry" +%s)
    NOW_EPOCH=$(date +%s)
    DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

    if [ "$DAYS_LEFT" -lt "$WARNING_DAYS" ]; then
        echo "Certificate $cert_id expires in $DAYS_LEFT days"

        # Trigger renewal if within warning period
        if [ "$DAYS_LEFT" -lt 7 ]; then
            echo "Triggering automatic renewal..."
            talosctl config rotate-certs -n "$CONTROL_PLANE_IP"
        fi
    fi
done
```

## Automating Node Upgrades with GitOps

Use a GitOps workflow to manage Talos upgrades declaratively. Define the desired version in a Git repository, and let a controller apply it.

```yaml
# talos-upgrade-config.yaml
# Store this in your GitOps repository
apiVersion: v1
kind: ConfigMap
metadata:
  name: talos-upgrade-config
  namespace: maintenance
data:
  target-version: "v1.9.1"
  upgrade-strategy: "rolling"
  max-unavailable: "1"
  control-plane-first: "false"
```

Then create a controller that watches this configuration and applies upgrades:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: talos-upgrade-controller
  namespace: maintenance
spec:
  schedule: "0 3 * * 2"  # Every Tuesday at 3 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: talos-upgrader
          containers:
          - name: upgrader
            image: ghcr.io/siderolabs/talosctl:v1.9.0
            command:
            - /bin/sh
            - -c
            - |
              # Read the target version from ConfigMap
              TARGET_VERSION=$(kubectl get configmap talos-upgrade-config \
                -n maintenance -o jsonpath='{.data.target-version}')

              # Get all worker nodes
              NODES=$(kubectl get nodes -l '!node-role.kubernetes.io/control-plane' \
                -o jsonpath='{.items[*].status.addresses[?(@.type=="InternalIP")].address}')

              for NODE_IP in $NODES; do
                CURRENT=$(talosctl version -n "$NODE_IP" --short 2>/dev/null | grep Tag | awk '{print $2}')

                if [ "$CURRENT" != "$TARGET_VERSION" ]; then
                  NODE_NAME=$(kubectl get nodes -o wide --no-headers | grep "$NODE_IP" | awk '{print $1}')
                  echo "Upgrading $NODE_NAME from $CURRENT to $TARGET_VERSION"

                  kubectl drain "$NODE_NAME" --ignore-daemonsets --delete-emptydir-data --timeout=300s
                  talosctl upgrade --image "ghcr.io/siderolabs/installer:$TARGET_VERSION" -n "$NODE_IP"

                  # Wait for node to be ready
                  sleep 60
                  kubectl wait --for=condition=Ready "node/$NODE_NAME" --timeout=600s
                  kubectl uncordon "$NODE_NAME"

                  echo "Successfully upgraded $NODE_NAME to $TARGET_VERSION"
                  sleep 30  # Pause between nodes
                fi
              done
          restartPolicy: OnFailure
```

## Automating Log Rotation and Cleanup

Talos Linux handles most log rotation internally, but you may need to clean up Kubernetes-level resources:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: resource-cleanup
  namespace: maintenance
spec:
  schedule: "0 4 * * *"  # Daily at 4 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: maintenance-sa
          containers:
          - name: cleanup
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              # Delete completed jobs older than 3 days
              kubectl get jobs --all-namespaces -o json | \
                jq -r '.items[] | select(.status.succeeded==1) |
                select(.status.completionTime < (now - 259200 | strftime("%Y-%m-%dT%H:%M:%SZ"))) |
                "\(.metadata.namespace) \(.metadata.name)"' | \
                while read ns name; do
                  kubectl delete job "$name" -n "$ns"
                done

              # Delete failed pods older than 1 day
              kubectl get pods --all-namespaces --field-selector=status.phase=Failed -o json | \
                jq -r '.items[] | "\(.metadata.namespace) \(.metadata.name)"' | \
                while read ns name; do
                  kubectl delete pod "$name" -n "$ns"
                done

              # Delete evicted pods
              kubectl get pods --all-namespaces -o json | \
                jq -r '.items[] | select(.status.reason=="Evicted") |
                "\(.metadata.namespace) \(.metadata.name)"' | \
                while read ns name; do
                  kubectl delete pod "$name" -n "$ns"
                done

              echo "Cleanup completed"
          restartPolicy: OnFailure
```

## Automating Configuration Drift Detection

Even with Talos Linux's immutable design, configuration drift can happen when nodes get different machine configs. Automate drift detection:

```bash
#!/bin/bash
# config-drift-check.sh

NODES=$(kubectl get nodes -o jsonpath='{.items[*].status.addresses[?(@.type=="InternalIP")].address}')
REFERENCE_NODE=$(echo "$NODES" | awk '{print $1}')

# Get reference configuration
REFERENCE_CONFIG=$(talosctl get machineconfig -n "$REFERENCE_NODE" -o yaml 2>/dev/null | sha256sum | awk '{print $1}')

DRIFT_DETECTED=false
for NODE_IP in $NODES; do
    NODE_CONFIG=$(talosctl get machineconfig -n "$NODE_IP" -o yaml 2>/dev/null | sha256sum | awk '{print $1}')

    if [ "$NODE_CONFIG" != "$REFERENCE_CONFIG" ]; then
        echo "Configuration drift detected on node $NODE_IP"
        DRIFT_DETECTED=true
    fi
done

if [ "$DRIFT_DETECTED" = true ]; then
    echo "Configuration drift detected. Review and remediate."
fi
```

## Building a Maintenance Automation Pipeline

Tie all these individual automations together into a pipeline:

```yaml
# maintenance-pipeline.yaml
stages:
  - name: pre-checks
    tasks:
      - health-check
      - cert-expiry-check
      - config-drift-check
  - name: backups
    tasks:
      - etcd-backup
    depends_on: pre-checks
  - name: upgrades
    tasks:
      - node-upgrades
    depends_on: backups
  - name: cleanup
    tasks:
      - resource-cleanup
    depends_on: upgrades
  - name: verification
    tasks:
      - post-maintenance-health-check
    depends_on: cleanup
```

## Conclusion

Automating maintenance on Talos Linux is both practical and necessary. The API-driven nature of Talos means that everything you can do manually can also be scripted. Start with the basics like etcd backups and health checks, then gradually add more automation for upgrades, cleanup, and drift detection. The goal is to reach a point where routine maintenance requires zero manual intervention, and you only need to step in for exceptional situations.
