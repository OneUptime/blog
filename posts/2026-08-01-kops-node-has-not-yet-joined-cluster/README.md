# kOps “Node Has Not Yet Joined Cluster”: A Layer-by-Layer Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: kOps, Kubernetes, Kubelet, Node Bootstrap, AWS EC2, Troubleshooting

Description: Trace a kOps node that has not joined from cloud instance creation through nodeup, API connectivity, kubelet authentication, registration, and CNI readiness.

---

The validation error `machine "<instance-id>" has not yet joined cluster` describes a specific mismatch: kOps sees a cloud instance that is expected to join, but cannot associate it with a Kubernetes Node object.

It does not identify why registration has not happened. nodeup may not have finished, the kubelet may not reach the API, or authentication may fail. A missing cloud instance and a registered but `NotReady` Node produce different validation errors, but belong in the same dependency-ordered workflow below.

Restarting services at random destroys useful evidence. First establish the last successful layer.

## Capture the Expected and Observed Inventories

Use explicit cluster and state-store values:

```bash
CLUSTER_NAME=prod.example.com
STATE_STORE=s3://company-kops-state

kops validate cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}" \
  --wait 2m

kops get instances "${CLUSTER_NAME}" \
  --state "${STATE_STORE}"

kubectl get nodes -o wide
```

`kops get instances` shows cloud instances associated with the cluster. `kubectl get nodes` shows objects that kubelets have registered with the API. Preserve instance IDs, instance-group names, private addresses, launch times, and Node names.

Branch immediately:

- **No expected cloud instance:** investigate the instance group and cloud provisioning.
- **Instance exists, no Node object:** investigate bootstrap, API reachability, and kubelet authentication.
- **Node object exists but is `NotReady`:** inspect its conditions and kubelet/CNI health.
- **Old Node object and new instance disagree:** investigate identity reuse or stale Node state before deleting anything.

Kubernetes assumes that a reused Node name represents the same machine. Do not casually create or delete Node objects to make the table look right.

## Layer 1: Did the Cloud Instance Launch Correctly?

On AWS, compare the kOps instance-group minimum and maximum sizes with the Auto Scaling Group's limits and desired capacity, then inspect EC2 state. Check:

- launch-template version;
- AMI and CPU architecture;
- subnet and Availability Zone capacity;
- instance profile attachment;
- root-volume creation and attachment;
- EC2 status checks;
- Auto Scaling activity failures;
- spot interruptions or capacity errors, if applicable.

Read-only AWS commands can establish the instance state:

```bash
aws ec2 describe-instances \
  --instance-ids i-0123456789abcdef0 \
  --query 'Reservations[].Instances[].{State:State.Name,PrivateIp:PrivateIpAddress,Profile:IamInstanceProfile.Arn,LaunchTime:LaunchTime}'

aws ec2 describe-instance-status \
  --include-all-instances \
  --instance-ids i-0123456789abcdef0
```

If no instance can launch, Kubernetes is not yet involved. Fix quota, capacity, image, subnet, or IAM attachment errors before inspecting kubelet logs.

## Layer 2: Did nodeup Finish?

kOps uses nodeup to provision the operating system for Kubernetes. The kOps troubleshooting guide identifies its one-shot systemd unit as `kops-configuration.service`.

On the affected host, collect status and logs before restarting it:

```bash
sudo systemctl status kops-configuration.service --no-pager
sudo journalctl -u kops-configuration.service --no-pager
```

A successful run includes nodeup success and a finished `kops-configuration.service`. If it is still running, note the task on which it waits. If it failed, work from the first meaningful error, not the final generic service failure.

Common dependency categories include:

- S3 state-store access denied or wrong `configBase`;
- KMS decrypt denial for an encrypted state bucket;
- DNS resolution or outbound HTTPS failure;
- package or image download failure;
- invalid hook or additional user data;
- disk full, read-only filesystem, or incompatible image;
- wrong system time causing TLS certificates to appear not yet valid or expired.

Useful non-destructive checks are:

```bash
timedatectl status
df -h
getent hosts api.internal.prod.example.com
```

Do not solve an S3 denial by attaching broad administrator access to the node. Compare the new launch template and instance profile with a healthy instance in the same group, then grant only the documented bucket and KMS access.

## Layer 3: Are the Runtime and Kubelet Running?

After nodeup succeeds, inspect the services that must keep the node alive:

```bash
sudo systemctl status containerd kubelet --no-pager
sudo journalctl -u containerd --no-pager --since '-30 minutes'
sudo journalctl -u kubelet --no-pager --since '-30 minutes'
```

Use the runtime configured by your cluster; do not assume every older kOps installation uses containerd. The kOps version, Kubernetes version, and image must be a supported combination.

Classify kubelet log messages:

| Message pattern | Investigate |
| --- | --- |
| DNS lookup failure | Internal API DNS, resolver, DHCP options, VPC DNS |
| Connection timeout | Routes, network ACLs, security groups, proxy, API load balancer |
| Connection refused | API target health or wrong endpoint |
| `x509` trust/name/time error | CA bundle, endpoint hostname, rotation state, system clock |
| `Unauthorized` | Bootstrap or kubelet client credential is invalid or untrusted |
| `Forbidden` | Identity authenticated but registration/update is not authorized |
| Runtime unavailable | container runtime configuration, socket, disk, cgroups |

Preserve the exact status code and certificate error. “Cannot connect” is too broad to choose a safe fix.

## Layer 4: Can the Node Reach the Intended API?

In a DNS-based kOps cluster, nodes normally discover the API through `api.internal.<cluster-name>`. Gossip-based and DNS-none clusters use different discovery paths. From the affected node, verify the endpoint configured for this cluster and its TCP reachability:

```bash
getent hosts api.internal.prod.example.com
nc -vz api.internal.prod.example.com 443
```

Then compare the result with a healthy node in the same subnet and security groups. Check that:

- for private DNS, the private hosted zone is associated with the VPC;
- VPC DNS support and hostnames are configured as required;
- custom DNS forwarders can resolve the private zone;
- the node can route to the internal load balancer or control-plane addresses;
- security groups allow the documented API path;
- a configured egress proxy does not intercept or rewrite the connection.

CNI is usually not the explanation when an otherwise bootstrapped node cannot contact the API at all. The kOps troubleshooting guide notes that the control plane can operate without CNI and recommends proving basic API and pod-IP connectivity before blaming DNS or CNI.

## Layer 5: Did Authentication and Registration Succeed?

Kubernetes normally lets the kubelet self-register a Node using its kubeconfig and client identity. The API then authorizes that kubelet to create or update its own Node resource.

Check whether the Node appeared while you were collecting logs:

```bash
kubectl get nodes -o wide
kubectl get events --all-namespaces \
  --sort-by='.metadata.creationTimestamp'
kubectl get certificatesigningrequests
```

Only investigate CertificateSigningRequests if the cluster’s configured bootstrap flow uses them. Never approve an unknown CSR merely because it is pending; verify its signer, requesting username and groups, requested certificate subject and usages, and originating instance.

For `Unauthorized`, compare the node’s client CA and credential-generation path with the cluster’s current CA rotation stage. For `Forbidden`, inspect API audit logs and admission errors. NodeRestriction rejects restricted labels supplied directly by a kubelet, but current kOps releases apply configured instance-group labels through kops-controller. Identify the caller before changing configuration, and do not weaken the admission controller.

## Layer 6: Registered Is Not the Same as Ready

If the Node object exists, the original “not joined” wording may have been transient. Switch to Node conditions:

```bash
kubectl describe node NODE_NAME
kubectl get node NODE_NAME \
  -o jsonpath='{range .status.conditions[*]}{.type}{"="}{.status}{" reason="}{.reason}{" message="}{.message}{"\n"}{end}'
```

Investigate:

- `Ready=False` or `Ready=Unknown` reasons;
- `NetworkUnavailable` and the CNI DaemonSet;
- disk, memory, or PID pressure;
- container-runtime readiness;
- missing PodCIDR or cloud-controller initialization;
- taints that are expected during bootstrap.

For CNI problems, inspect the network add-on pods on that node and the expected files under `/opt/cni/bin` and the configured CNI directory. The kOps troubleshooting guide notes that an entirely empty CNI binary directory can point back to failed nodeup, while a provider-specific missing configuration can point to its DaemonSet.

## Repair Desired State, Then Replace Safely

Make durable fixes in the kOps cluster or instance-group specification, IAM policy, networking, image, or state-store configuration. Then preview the generated cloud changes:

```bash
kops update cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}"
```

After review, apply them with the normal approved process. Preview any required instance replacement:

```bash
kops rolling-update cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}"
```

Do not reach for `--force`, `--cloudonly`, or an unreviewed manual termination as the first fix. Those options can remove healthy capacity or bypass validation without correcting bootstrap.

Finish by requiring consecutive healthy observations:

```bash
kops validate cluster "${CLUSTER_NAME}" \
  --state "${STATE_STORE}" \
  --wait 10m \
  --count 3
```

The durable result is not merely a Node row in `kubectl get nodes`. It is a replacement-capable instance group in which nodeup succeeds, the kubelet authenticates, the Node registers and becomes Ready, critical pods run, and the same path works again for the next autoscaled or rotated instance.

## Official Documentation

- [kOps: Troubleshooting](https://kops.sigs.k8s.io/operations/troubleshoot/)
- [kOps CLI: `kops validate cluster`](https://kops.sigs.k8s.io/cli/kops_validate_cluster/)
- [kOps CLI: `kops get instances`](https://kops.sigs.k8s.io/cli/kops_get_instances/)
- [kOps: Cluster Boot Sequence](https://kops.sigs.k8s.io/boot-sequence/)
- [Kubernetes: Nodes](https://kubernetes.io/docs/concepts/architecture/nodes/)
- [Kubernetes: Troubleshooting Clusters](https://kubernetes.io/docs/tasks/debug/debug-cluster/)
- [AWS EC2: Troubleshoot Instances with Failed Status Checks](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/TroubleshootingInstances.html)
