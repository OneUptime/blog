# How to Back Up and Restore kOps etcd with `etcd-manager-ctl`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: kOps, Kubernetes, etcd, Backup, Disaster Recovery, AWS S3

Description: Verify kOps-managed etcd backups and perform a controlled, downtime-requiring restore by queueing matching restore commands with etcd-manager-ctl.

---

kOps uses `etcd-manager` to take periodic etcd backups and store them with the cluster configuration in object storage. `etcd-manager-ctl` is the companion recovery tool: it lists available backups and writes a restore command into the backup store for etcd-manager to execute.

The tool does **not** start the restore when `restore-backup` returns. The restore begins only after etcd-manager is restarted on all control-plane nodes and the required peer set can form. This distinction is essential during a disaster.

An etcd restore causes Kubernetes API downtime, discards Kubernetes changes made after the chosen backup, and is not undone except by performing another restore.

## Understand What kOps Backs Up

Kubernetes stores API state in etcd. A typical kOps AWS cluster has separate etcd clusters and backup prefixes for:

- `main`: Kubernetes objects and primary state;
- `events`: Kubernetes Events.

The Cluster spec is authoritative—inspect `spec.etcdClusters` rather than assuming there are exactly two stores forever. Repeat the recovery process for every configured etcd cluster that must be restored.

etcd backup does not include:

- data inside PersistentVolumes;
- external databases and object stores;
- container images or registry data;
- the kOps state-store bucket itself;
- DNS zones, IAM configuration, or arbitrary AWS resources;
- application secrets held outside Kubernetes.

Build separate backup and recovery controls for those systems.

## Verify Backup Policy Before an Incident

kOps documentation says etcd-manager takes backups periodically and before cluster modifications. By default, backups are taken every 15 minutes; hourly backups are retained for one week and daily backups for 90 days in current documented defaults.

Retention and interval can be configured per etcd cluster:

```yaml
spec:
  etcdClusters:
    - name: main
      manager:
        backupInterval: 15m
        backupRetentionDays: 90
      etcdMembers:
        - name: a
          instanceGroup: control-plane-eu-west-2a
        - name: b
          instanceGroup: control-plane-eu-west-2b
        - name: c
          instanceGroup: control-plane-eu-west-2c
```

Apply equivalent policy to `events` and any additional etcd cluster. Choose retention from the required recovery-point objective, compliance window, bucket cost, and risk of silent corruption being discovered late.

Protect the S3 state/backup store with:

- versioning;
- encryption and controlled KMS access where used;
- least-privilege IAM separated from routine workload roles;
- protection against bucket deletion and lifecycle mistakes;
- replication or an independent copy when the disaster model includes Region/account loss;
- monitoring for backup age, access errors, and unexpected deletion.

A backup in the same account and administrative boundary as the cluster is not sufficient for every threat model.

## Install a Compatible `etcd-manager-ctl`

Download `etcd-manager-ctl` from the official etcd-manager releases linked by kOps. Prefer the release corresponding to the etcd-manager version used by the cluster rather than an arbitrary old binary.

The CLI does not need to run inside Kubernetes. It needs network and credentials for the object store containing the backup and command prefixes.

Confirm the exact cluster and state store first:

```bash
export KOPS_STATE_STORE=s3://company-kops-state
export CLUSTER_NAME=prod.example.com

kops get cluster "$CLUSTER_NAME" -o yaml
```

For that example, the documented backup-store paths are:

```text
s3://company-kops-state/prod.example.com/backups/etcd/main
s3://company-kops-state/prod.example.com/backups/etcd/events
```

Do not point the tool at the bucket root or another cluster's prefix.

## List and Record Available Backups

List `main` and `events` independently:

```bash
etcd-manager-ctl \
  --backup-store=s3://company-kops-state/prod.example.com/backups/etcd/main \
  list-backups

etcd-manager-ctl \
  --backup-store=s3://company-kops-state/prod.example.com/backups/etcd/events \
  list-backups
```

The output names are the arguments accepted by `restore-backup`. Save the listing in the incident record and verify that:

- recent backups exist for every etcd cluster;
- timestamps meet the recovery-point objective;
- the chosen object metadata and backup data are readable;
- object-store audit logs show normal periodic writes;
- no lifecycle rule is about to delete the selected objects.

Do not wait for an outage to discover that an IAM principal can list the prefix but cannot read backup data or write a command.

## Choose a Coherent Restore Point

Select the desired `main` backup and a corresponding `events` backup. The prefixes are separate and their snapshots are not one atomic transaction across both etcd clusters. Prefer the closest appropriate times and document the exact pair.

Restoring `events` is less important than restoring primary API state, but follow the kOps procedure for both configured clusters so control-plane expectations remain aligned.

Before queuing anything:

1. declare a maintenance window and stop automated deployers, reconcilers, CronJobs, and external writers where possible;
2. record current control-plane instances, etcd members, cluster spec, kOps version, etcd-manager version, and selected backups;
3. preserve the current backup prefixes through S3 versioning or an independent copy;
4. confirm access to every control-plane node without relying solely on the Kubernetes API;
5. make sure all expected etcd-manager peers can start and communicate;
6. establish a rollback decision point—which in practice means selecting another backup and restoring again.

If the cluster is still writable, understand that writes after the chosen snapshot will be lost. Quiesce clients before beginning.

## Queue the Restore Commands

Use the exact names returned by `list-backups`:

```bash
MAIN_BACKUP='2026-08-01T00:15:00Z-000123'
EVENTS_BACKUP='2026-08-01T00:15:08Z-000124'

etcd-manager-ctl \
  --backup-store=s3://company-kops-state/prod.example.com/backups/etcd/main \
  restore-backup "$MAIN_BACKUP"

etcd-manager-ctl \
  --backup-store=s3://company-kops-state/prod.example.com/backups/etcd/events \
  restore-backup "$EVENTS_BACKUP"
```

These commands write restore instructions. They do not yet replace the live databases.

Inspect the queues before restarting anything:

```bash
etcd-manager-ctl \
  --backup-store=s3://company-kops-state/prod.example.com/backups/etcd/main \
  list-commands

etcd-manager-ctl \
  --backup-store=s3://company-kops-state/prod.example.com/backups/etcd/events \
  list-commands
```

If the wrong backup was queued and no restore has begun, remove that queued command with the current CLI's documented `delete-command <backup-name>` operation. Re-list the queue and confirm it is empty before proceeding. Do not manipulate command objects directly in S3.

## Restart etcd-manager on Every Control-Plane Node

The kOps procedure requires restarting etcd-manager on **all** control-plane nodes. The documented Docker-era example stops or kills containers whose names start with `k8s_etcd-manager_etcd-manager`; they restart automatically and consume the queued restore.

Do not copy a Docker command blindly onto a cluster using another container runtime or service layout. On each control-plane node:

1. identify the actual etcd-manager process/container and its supervisor;
2. confirm out-of-band SSH/SSM access;
3. restart the etcd-manager unit/container using the runtime-appropriate command;
4. repeat for every expected member, without leaving one on the old cluster indefinitely.

The restore waits until the configured number of peers is present. Once the peer set forms, etcd-manager creates a new etcd cluster, restores the selected backup, and switches members to it. The Kubernetes API is unavailable during this operation.

Follow progress in the etcd logs on the current leader. kOps documents:

```text
/var/log/etcd.log
/var/log/etcd-events.log
```

The `main` and `events` clusters can have different leaders. Check every control-plane node when locating the active restore log.

Do not repeatedly restart peers because the API remains unavailable for a few minutes. Look for peer-count, download, snapshot, quarantine, reconfiguration, and health messages and respond to the actual failure.

## Validate the Restored Cluster

After the API returns:

```bash
kubectl get --raw='/readyz?verbose'
kubectl get nodes
kubectl get pods --all-namespaces
kubectl get events --all-namespaces --sort-by=.lastTimestamp
kops validate cluster "$CLUSTER_NAME" --wait 15m
```

Validate application state at the selected recovery point:

- Deployments, StatefulSets, DaemonSets, Jobs, and CronJobs;
- Services, EndpointSlices, Ingresses, and load balancers;
- Secrets, ConfigMaps, RBAC, and admission configuration;
- PersistentVolume and claim bindings;
- controllers recreating objects that did not exist at the restored time;
- external systems whose state is now ahead of Kubernetes.

Restoring an older Kubernetes object does not rewind an external database, DNS provider, cloud load balancer, or storage system. Reconcile those differences carefully; do not simply restart every automation system at once.

## Check API Server Lease Consistency

The kOps restore documentation describes a case where obsolete API server leases leave stale addresses in the Kubernetes API endpoint.

Inspect it:

```bash
kubectl get endpoints kubernetes -o yaml
```

If it contains more addresses than the live control-plane/API server set, follow the official kOps etcd administration procedure to inspect `/registry/masterleases`. Do not delete etcd keys merely because the endpoint looks unfamiliar. Direct etcd changes bypass Kubernetes validation and require the correct TLS credentials and etcd endpoint.

The documented recovery deletes stale master leases, after which active API servers recreate theirs. kOps also recommends considering a forced rolling update of the cluster because node-local state can differ from restored etcd state. Preview that operation and restore application health first; it is another disruptive change, not part of the snapshot import itself.

## Test Recovery, Not Just Backup Creation

A successful `list-backups` proves enumeration, not recoverability. Run scheduled disaster-recovery exercises in an isolated, disposable environment with copied backup/state data and no route or DNS collision with production.

Measure:

- recovery-point age;
- time to obtain tools and credentials;
- time for all etcd peers to form;
- API downtime and control-plane load after restore;
- stale external resources and manual reconciliation;
- completeness of node, application, and storage recovery.

Update the runbook after every test. The first time an operator learns that `restore-backup` only queues a command should not be during a production outage.

## Recovery Checklist

- Are backups current for every configured `spec.etcdClusters` entry?
- Is the S3 backup store protected independently from the cluster?
- Does the recovery identity have tested read and command-write permissions?
- Are the exact `main` and `events` backup names recorded?
- Have writers and deployment automation been quiesced?
- Is there out-of-band access to every control-plane node?
- Were queued commands inspected before restarts?
- Will all etcd-manager peers be restarted with the correct runtime procedure?
- Are leader logs being followed for both etcd clusters?
- Will API state, PV data, and external systems be reconciled separately?
- Are stale API server leases checked only after the restore succeeds?
- Has the entire procedure been rehearsed in isolation?

kOps automates periodic backup creation, but recovery remains an operational event. Verify the objects, queue one deliberate restore per etcd cluster, restart every peer, and validate the whole distributed system—not only etcd health.

## Official Documentation

- [kOps: etcd backup, restore, and encryption](https://kops.sigs.k8s.io/operations/etcd_backup_restore_encryption/)
- [kOps: etcd administration](https://kops.sigs.k8s.io/operations/etcd_administration/)
- [kOps: Cluster resource etcd configuration](https://kops.sigs.k8s.io/cluster_spec/#etcdclusters)
- [etcd-manager: Official repository and releases](https://github.com/kubernetes-sigs/etcd-manager)
- [etcd-manager: Backup and restore internals](https://github.com/kubernetes-sigs/etcd-manager/blob/main/docs/backup-restore.md)
- [Kubernetes: Operating etcd clusters](https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/)
- [AWS: S3 Versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html)
- [AWS: S3 replication](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html)
