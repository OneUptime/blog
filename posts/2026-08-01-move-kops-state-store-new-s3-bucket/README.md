# Moving a kOps State Store to a New S3 Bucket Without Stranding Existing Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: kOps, Kubernetes, Amazon S3, State Store Migration, AWS IAM, Disaster Recovery

Description: Move a kOps cluster to a new S3 state bucket by copying its complete prefix, changing `configBase`, updating cloud resources, and retaining a tested rollback path.

---

Changing `KOPS_STATE_STORE` on an administrator’s laptop is not a complete state-store migration. It only changes where that invocation of the kOps CLI looks.

A kOps cluster spec also contains `spec.configBase`. That location tells newly launched nodes where to retrieve cluster-dependent files. If you copy objects and switch only the shell variable, operators may see the new bucket while replacement or autoscaled nodes still bootstrap from the old one. If you change `configBase` before the copy and permissions are ready, new nodes can fail in the opposite direction.

The official kOps sequence is:

1. recursively copy the cluster’s complete path to the new bucket;
2. point the CLI at the new state store;
3. change `spec.configBase` to the new location;
4. run `kops update cluster --yes`;
5. only then retire the old copy.

Build verification and a rollback window around those steps.

## Define a One-Cluster Migration

Use explicit, validated variables. The guards below stop the shell if a value is empty:

```bash
CLUSTER_NAME=prod.example.com
OLD_KOPS_STATE_STORE=s3://old-company-kops-state
NEW_KOPS_STATE_STORE=s3://new-company-kops-state

: "${CLUSTER_NAME:?set CLUSTER_NAME}"
: "${OLD_KOPS_STATE_STORE:?set OLD_KOPS_STATE_STORE}"
: "${NEW_KOPS_STATE_STORE:?set NEW_KOPS_STATE_STORE}"
```

Migrate one cluster prefix at a time even when the source bucket is shared. That limits the freeze window and makes rollback ownership clear.

Before copying, confirm the source object and destination bucket under the intended AWS role:

```bash
aws sts get-caller-identity
kops get cluster "${CLUSTER_NAME}" \
  --state "${OLD_KOPS_STATE_STORE}" \
  -o yaml

aws s3api get-bucket-versioning \
  --bucket "${NEW_KOPS_STATE_STORE#s3://}"
aws s3api get-bucket-encryption \
  --bucket "${NEW_KOPS_STATE_STORE#s3://}"
```

Also verify destination S3 and, if applicable, KMS permissions for both the operator and the cluster’s node/bootstrap roles. Cross-account SSE-KMS requires a customer-managed key whose key policy and the external principals’ IAM policies both allow the required KMS operations.

## Pause Configuration Changes

Choose a short maintenance window in which no pipeline, autoscaler change, or operator writes kOps state. The Kubernetes workloads can continue running; the freeze is on desired-state mutation.

Record the starting configuration and the currently generated cloud change preview in a protected location:

```bash
kops get cluster "${CLUSTER_NAME}" \
  --state "${OLD_KOPS_STATE_STORE}" \
  -o yaml > "${CLUSTER_NAME}.before-state-move.yaml"

kops update cluster "${CLUSTER_NAME}" \
  --state "${OLD_KOPS_STATE_STORE}"
```

The redirected YAML is sensitive operational material. Store it securely and delete it according to your runbook after the rollback window.

## Copy the Complete Cluster Prefix

Copy recursively without `--delete`:

```bash
aws s3 sync \
  "${OLD_KOPS_STATE_STORE}/${CLUSTER_NAME}/" \
  "${NEW_KOPS_STATE_STORE}/${CLUSTER_NAME}/"
```

If the buckets are in different AWS Regions, add `--source-region us-east-1 --region us-west-2` to both sync commands, substituting the actual source and destination Regions. Without `--source-region`, the AWS CLI assumes that the source bucket is in the destination Region.

Do not copy only a visible `config` object. kOps keeps additional cluster state below the cluster path, including instance groups and security-sensitive material.

Do not use `--delete` during migration. It makes an incorrect source, destination, or prefix much more damaging.

Run the same source-to-destination sync as a dry run:

```bash
aws s3 sync \
  "${OLD_KOPS_STATE_STORE}/${CLUSTER_NAME}/" \
  "${NEW_KOPS_STATE_STORE}/${CLUSTER_NAME}/" \
  --dryrun
```

No proposed copies is a useful first check. For a high-assurance migration, also compare S3 Inventory or an independently generated key-and-checksum manifest. Multipart ETags are not always plain MD5 checksums.

An ordinary `aws s3 sync` copies current objects. It does **not** reproduce the source bucket’s historical version graph. Keep the versioned source bucket for the agreed rollback and audit period, or use a separately designed version-preserving backup process when history must be retained.

## Confirm kOps Can Read the Destination

Before changing either store, read the copied cluster explicitly:

```bash
kops get cluster "${CLUSTER_NAME}" \
  --state "${NEW_KOPS_STATE_STORE}" \
  -o yaml

kops get instancegroups \
  --name "${CLUSTER_NAME}" \
  --state "${NEW_KOPS_STATE_STORE}"
```

Compare the destination cluster spec and instance-group inventory with the source. A successful S3 command alone does not prove that the kOps identity, KMS key, and object ownership are all correct.

## Change `spec.configBase` in the New Copy

Point only this shell at the destination and edit the copied cluster:

```bash
export KOPS_STATE_STORE="${NEW_KOPS_STATE_STORE}"
kops edit cluster "${CLUSTER_NAME}"
```

Change the field to the destination cluster path:

```yaml
spec:
  configBase: s3://new-company-kops-state/prod.example.com
```

Then verify the saved value without exposing unnecessary output:

```bash
kops get cluster "${CLUSTER_NAME}" -o yaml
```

The old copy should still contain its old `configBase`. That is useful during the rollback window. Do not run independent updates from both stores after the cutover; they are two divergent desired-state databases, not replicas.

## Preview and Apply the Cloud Update

Generate a destination-backed preview and review it carefully:

```bash
kops update cluster "${CLUSTER_NAME}"
```

These `kops update` commands use the default direct target. For a Terraform-managed cluster, run `kops update cluster "${CLUSTER_NAME}" --target=terraform --out=.` from the existing Terraform directory, then run `terraform plan` and `terraform apply` there instead of applying the direct target with `--yes`. Use the same target-specific workflow for rollback.

The expected change includes references needed for newly launched instances to use the destination state. Investigate unrelated network, IAM, image, or Kubernetes-version changes before applying.

Once the preview is approved:

```bash
kops update cluster "${CLUSTER_NAME}" --yes
```

The kOps state-store documentation says that newly launched nodes will now retrieve their dependent files from the new bucket. A state-store move by itself does not justify forcing every node to rotate. Preview first:

```bash
kops rolling-update cluster "${CLUSTER_NAME}"
kops validate cluster "${CLUSTER_NAME}" --wait 10m
```

If the rolling preview reports no required replacements, do not add `--force` merely to test the migration. Instead, use the organization’s controlled replacement or scale-out test to prove that a new node can bootstrap, then validate it. Account for PodDisruptionBudgets and capacity before intentionally replacing any production node.

## Prove the Cutover

A complete verification covers both management and bootstrap paths:

- `kops get cluster` and `kops get instancegroups` work from the new store;
- the saved cluster has the new `spec.configBase`;
- `kops update cluster` has no unexplained pending changes;
- the Kubernetes API and critical pods validate;
- at least one controlled new instance can join using destination access;
- when S3 read data-event logging is enabled, CloudTrail shows expected reads from the new bucket and no unexplained access denials;
- automation and runbooks now set the new store explicitly.

Keep the old bucket unchanged during the rollback window. Removing write access after cutover can prevent accidental split-brain administration while retaining recovery access.

## Roll Back Before State Diverges

If new nodes cannot read the destination, stop replacements first. While the old store still reflects the pre-cutover state:

1. point the operator back to the old store;
2. confirm its `spec.configBase` still names the old path;
3. preview `kops update cluster` from the old store;
4. apply only after reviewing the rollback changes;
5. validate before resuming node changes.

If administrators have already made legitimate changes in the destination, do not blindly switch back. Reconcile those changes into a reviewed recovery plan first.

For a shared bucket, repeat the documented process for every cluster. Do not decommission the source bucket when only its first prefix has moved. The old bucket is ready for retirement only after all cluster prefixes, automation, node bootstrap paths, retention obligations, and rollback decisions have been accounted for.

## Official Documentation

- [kOps: Moving State Between S3 Buckets](https://kops.sigs.k8s.io/state/#moving-state-between-s3-buckets)
- [kOps CLI: `kops update cluster`](https://kops.sigs.k8s.io/cli/kops_update_cluster/)
- [kOps: Rolling Updates](https://kops.sigs.k8s.io/operations/rolling-update/)
- [kOps: Getting Started on AWS—State Store](https://kops.sigs.k8s.io/getting_started/aws/#cluster-state-store)
- [AWS CLI: `s3 sync`](https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html)
- [Amazon S3: Retaining Multiple Versions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html)
- [Amazon S3: Using SSE-KMS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html)
