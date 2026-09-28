# Debug EKS EFS CSI Exit Status 32: Node Plugin, Watchdog, and efs-utils

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, EFS, EKS, Kubernetes

Description: Trace EFS CSI exit status 32 to the failed node mount and distinguish watchdog messages from DNS, network, authorization, and helper failures.

An EKS pod stuck in `ContainerCreating` may report an EFS mount failure with exit status 32. That status tells you the mount operation failed; the useful diagnosis is in the surrounding helper output and the CSI node logs. A warning about the mount watchdog is especially easy to overinterpret when a later line contains the actual NFS error.

The procedure below targets EKS worker nodes on EC2. Fargate has a different managed mount path and supports static EFS provisioning; do not assume an EC2 node DaemonSet investigation applies to a Fargate pod. [EKS EFS considerations](https://docs.aws.amazon.com/eks/latest/userguide/efs-csi.html)

## Separate provisioning from mounting

```bash
kubectl -n reports describe pod worker-0
kubectl -n reports get pvc
kubectl get pv
```

If the PVC is `Pending` and there is no provisioned PV, investigate the controller's provisioning operation first. If the claim is `Bound` and the pod reports `FailedMount`, follow the node path. Successful access-point creation does not prove a worker can reach the NFS endpoint.

Record the pod's `Node` field, claim name, PV name, and full event text. The same volume can mount on one node and fail on another because their zones, security groups, or plugin versions differ.

## Read the plugin on the affected node

```bash
kubectl -n kube-system get pods -o wide
kubectl -n kube-system logs efs-csi-node-EXAMPLE \
  -c efs-plugin --since=30m
kubectl -n kube-system describe pod efs-csi-node-EXAMPLE
```

Choose the `efs-csi-node` pod scheduled on the workload's node. If it restarted, also read `kubectl logs ... --previous`. The registration sidecar's logs answer a different question from the `efs-plugin` mount logs.

Inspect the PV's `spec.csi.volumeHandle`, `volumeAttributes`, and `mountOptions`. A common access-point handle has the form `fs-...::fsap-...`; compare it to the filesystem and access point that actually exist. Use the format documented for the installed driver release rather than rewriting a bound PV spec experimentally. [Driver overview and volume handling](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/master/docs/README.md)

## Classify the underlying error

| Helper evidence | Next investigation |
| --- | --- |
| Name cannot be resolved | Node DNS configuration and same-zone mount-target coverage |
| TCP connection or mount attempt times out | Node-to-target TCP 2049, routes, and ACLs |
| Server denies the mount | IAM identity, filesystem policy, access-point root |
| Missing executable or unsupported option | Driver image, bundled helper, and release compatibility |
| Plugin restarts or `OOMKilled` | Node-plugin resources and concurrent mount pressure |

An `unrecognized init system` watchdog warning is not sufficient proof of the root cause. An upstream issue with that warning was resolved by correcting mount-target security groups. Use it as evidence to inspect supervision, then continue reading through the final mount error. [Upstream watchdog incident](https://github.com/kubernetes-sigs/aws-efs-csi-driver/issues/637)

The CSI driver has its own container lifecycle and helper integration. Running `systemctl enable` inside an application container cannot repair that integration.

## Verify network and authorization from the mounting context

Use your approved node diagnostic method to resolve the EFS name and test its target on TCP 2049. Check the source ENI used by the node mount. A successful lookup inside an ordinary application pod does not necessarily prove that the node plugin has the same resolver configuration or network path.

If the filesystem policy requires IAM authentication, check the `iam` mount option and the identity available to the CSI node plugin. The application's service-account role does not automatically become the identity used for every node-level storage mount. The upstream parameter reference describes `iam` as using the CSI node pod's identity. [CSI mount parameters](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/master/docs/parameters.md)

Confirm access-point readiness and directory permissions only after reaching the target. Keep the failing filesystem and access-point IDs together in the investigation notes.

## Repair the installed driver coherently

```bash
kubectl -n kube-system get daemonset efs-csi-node \
  -o jsonpath='{.spec.template.spec.containers[*].image}'

aws eks describe-addon \
  --cluster-name production \
  --addon-name aws-efs-csi-driver
```

The second command applies to an EKS-managed add-on. For a Helm installation, inspect the installed chart and image overrides. Check release compatibility and avoid overlapping self-managed and managed installations.

The driver packages `efs-utils` in its containers. Installing another copy on the worker node is not a general repair and can introduce conflicting behavior. Roll out a supported driver revision through its existing installation mechanism. [Driver packaging guidance](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/master/docs/README.md)

Verify a new test pod mounts the existing claim and performs its intended file operation. Repeat on a previously failing node or zone, then roll through the fleet. Preserve logs before restarting plugins so a successful retry does not erase the evidence explaining the original failure.
