# How to Stop `efs-proxy` OOMKills by Sizing EFS CSI Node Memory for Volume Count and Concurrent Mounts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EFS, EKS, Kubernetes, CSI Driver, Performance

Description: Size the EFS CSI node container for mounted volumes and simultaneous mounts, then confirm limits and load tests prevent proxy OOMKills.

An EFS workload can lose storage connectivity while the application container still has plenty of memory. The TLS proxy runs under the EFS CSI node plugin's resource boundary. If that container is too small for the mounts and writes on the node, the proxy can be killed or the plugin can restart.

Treat this as a node storage-service capacity problem. Measure the failing container, bound the number of volumes and simultaneous mounts, and test the resource budget against the busiest node rather than the cluster average.

## Confirm the process and failure mode

Locate the CSI node pod on the affected worker and inspect its status:

```bash
kubectl get pods -n kube-system -o wide | grep efs-csi-node
kubectl describe pod efs-csi-node-example -n kube-system
kubectl logs efs-csi-node-example -n kube-system \
  -c efs-plugin --previous
kubectl top pod efs-csi-node-example -n kube-system --containers
```

Check `lastState`, restart counts, events, and node memory pressure. Exit code 137 alone is not a complete diagnosis; correlate it with OOM status or kernel/container-runtime evidence. A child proxy may be killed without the whole plugin container restarting, so also examine node-level OOM records and mount-helper logs when the pod status is inconclusive.

A point-in-time `kubectl top` sample can miss the peak during a deployment. Retain a time series of container memory and correlate it with pod scheduling, mounts, and NFS write activity.

## Start with the driver's sizing model

For released v3.5.0, the driver documents an estimate of about 12 MiB per EFS volume plus 30 MiB per concurrent mount, with a 1.5 multiplier:

```text
memory limit in MiB = (12 × volume limit + 30 × concurrent mounts) × 1.5
```

For 50 volumes and 10 simultaneous mounts, that is 1,350 MiB. Rounding the limit to 1,536 MiB leaves additional room beyond the estimate. These numbers are a starting budget, not a hard upper bound for every write workload. [Driver memory guidance](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/docs/parameters.md).

Count actual mount/proxy activity too. PVC count alone can misrepresent a node's process footprint, especially when a volume is mounted for multiple pods. Use the formula as a planning tool and measured peak memory as the acceptance criterion.

## Configure the bounds and the memory together

The example below targets Helm chart 4.5.0, whose application version is driver 3.5.0:

```yaml
node:
  maxInflightMountCallsOptIn: true
  maxInflightMountCalls: 10
  volumeAttachLimitOptIn: true
  volumeAttachLimit: 50
  resources:
    requests:
      memory: 1536Mi
    limits:
      memory: 1536Mi
```

Both opt-in booleans matter. Supplying numeric limits without enabling their switches does not activate the controls. The released DaemonSet template maps these fields to the plugin's arguments. [Node template](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/charts/aws-efs-csi-driver/templates/node-daemonset.yaml).

The mount limit throttles concurrent `NodePublishVolume` work. The volume limit is reported through CSI for scheduling; despite the argument's name, EFS does not behave like an attached block disk. Lower limits can leave pods waiting for capacity, so confirm the node group has enough room to spread the workload.

Merge these settings into the installation's reviewed values and render the manifest before deployment. For an EKS-managed add-on, inspect the supported add-on configuration schema for your version rather than assuming Helm values are accepted there.

A larger request reserves more scheduler capacity on every node running the DaemonSet. Check node allocatable memory and the combined application requests before rolling out the change.

## Verify the effective configuration

After rollout, inspect the live image, arguments, and resources:

```bash
kubectl get daemonset efs-csi-node -n kube-system \
  -o jsonpath='{.spec.template.spec.containers[?(@.name=="efs-plugin")]}{"\n"}'
kubectl get csinode WORKER_NODE_NAME -o yaml
```

Check that the expected EFS driver entry reports the intended allocatable volume count. A values file containing the right number is not evidence that an older chart rendered or deployed it.

Run a controlled canary rollout that creates the expected simultaneous mounts, then exercise representative writes. Observe time to mount, peak memory, restart counts, node pressure, and application I/O errors. Keep the test dataset disposable while making its file sizes and write concurrency realistic.

## Handle sustained writes and retry backlogs

The driver's FAQ describes repeated OOMKills under heavy writes when a kernel write backlog reaches a restarted proxy. Raising the limit can be necessary even after mount concurrency is controlled. [Proxy OOM guidance](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/docs/faq.md).

Reduce workload concurrency or distribute writers across more nodes while measuring the required headroom. If volume metrics are enabled, account for their additional traversal and memory cost. Avoid changing to a `soft` NFS mount merely to make retry symptoms disappear: storage error semantics can affect application data integrity. Keep recovery changes tied to an application-tested procedure.

The successful fix is a stable plugin under both deployment bursts and steady writes, with scheduling behavior that remains acceptable. Preserve the measured peak and chosen limits in the deployment configuration so later increases in per-node workload density trigger a fresh capacity review.
