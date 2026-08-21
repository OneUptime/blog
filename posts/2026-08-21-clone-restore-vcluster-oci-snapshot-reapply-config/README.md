# How to Restore a vCluster from an OCI Snapshot and Reapply Its Config

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VCluster, Kubernetes, OCI, Backup, Disaster Recovery

Description: Restore vCluster control-plane state from an OCI artifact, distinguish clone from in-place recovery, and reapply the intended configuration.

---

vCluster can store a snapshot as an OCI artifact and use it either to restore an existing tenant cluster or to create a clone. In vCluster **0.36**, the artifact contains backing-store data, Helm release information, and saved configuration, but persistent-volume contents are not included. An in-place `vcluster restore` does not reapply the saved configuration to the Helm release; when creating a clone, pass the reviewed destination configuration explicitly to override the snapshot's Helm values.

Keep the reviewed `vcluster.yaml` in version control and protect workload data separately with Velero, provider tooling, or application-native backups.

## Choose Clone or In-Place Restore

| Operation | Use when | Main risk |
| --- | --- | --- |
| Clone to a new name/namespace | Recovery rehearsal, migration, forensics | External references and workload data still need isolation/restore |
| Restore existing tenant | Roll back damaged control-plane state | Temporary downtime and replacement of current API state |
| Create with restore plus changed config | Supported migration of selected settings | The backing-store type cannot be changed through snapshot and restore |

An in-place restore pauses the vCluster, scales all workload Pods down to zero, runs a temporary restore Pod, and resumes workloads afterward. If it fails, retry the restore; do not continue operating an uncertain control-plane state.

## Create and Verify the OCI Snapshot

Authenticate with the registry using its normal local credential store. For GHCR, use a token with only the required package permissions:

```bash
docker login ghcr.io

vcluster snapshot create team-a \
  "oci://ghcr.io/example-platform/vcluster-snapshots:team-a-2026-08-21"

vcluster snapshot get team-a \
  "oci://ghcr.io/example-platform/vcluster-snapshots:team-a-2026-08-21"
```

Wait for `Completed`. Pin the immutable digest in the change record if the registry exposes one; a mutable tag alone is weak recovery evidence.

Do not embed registry credentials in the URL in a reusable script. vCluster supports URL parameters, but their Base64 encoding is not encryption and can leak through history or CI logs.

## Save the Intended Configuration and External Inventory

Before restore, commit the desired `vcluster.yaml` and record the installed state:

```bash
vcluster --version
helm list -n team-a-vcluster
helm get values team-a -n team-a-vcluster --all
kubectl get storageclass
kubectl get crd
```

The Git file is the intended state; computed Helm values are diagnostic evidence. Also inventory Gateway or Ingress endpoints, DNS, host operators, Secrets, IAM roles, external databases, and the separate workload-data backup.

## Clone to a New Tenant Cluster

Create the destination from the snapshot and apply the reviewed destination configuration in the same operation. The supplied values override the values saved in the snapshot:

```bash
vcluster create team-a-restore-test \
  --namespace team-a-restore-test \
  --upgrade \
  --restore \
  "oci://ghcr.io/example-platform/vcluster-snapshots:team-a-2026-08-21" \
  --connect=false \
  --values vcluster.yaml
```

When a clone uses a new name or namespace, vCluster generates new certificates. That is expected; tenant clusters should not share cluster certificates.

If the reviewed configuration changes the backing-store type, stop. vCluster 0.36 does not support changing the backing-store type, including through snapshot and restore. The separately documented deployed-etcd-to-embedded-etcd migration changes the etcd deployment mode and is not a snapshot migration.

Keep the clone isolated from production side effects:

- Do not publish its original DNS names.
- Suspend GitOps automation until the target identity is reviewed.
- Replace outbound credentials or block egress.
- Prevent Jobs and controllers from sending production messages.
- Restore workload volumes into test-only storage.

A snapshot restores Kubernetes objects that may immediately reconcile external systems once credentials and networking are available.

## Restore an Existing vCluster

Schedule downtime and stop external writers. Then run:

```bash
vcluster restore team-a \
  --namespace team-a-vcluster \
  "oci://ghcr.io/example-platform/vcluster-snapshots:team-a-2026-08-21"
```

After it succeeds, reapply configuration from Git:

```bash
vcluster create team-a \
  --namespace team-a-vcluster \
  --upgrade \
  --connect=false \
  --values vcluster.yaml
```

Then restore persistent-volume data with the separate backup system at the coordinated recovery point. Restoring only the OCI snapshot can recreate the PVC objects without restoring their contents.

## Validate the Result

Use a dedicated kubeconfig and work from infrastructure outward:

```bash
vcluster connect team-a-restore-test \
  --namespace team-a-restore-test \
  --print > restore-test.kubeconfig

kubectl --kubeconfig restore-test.kubeconfig get --raw=/readyz
kubectl --kubeconfig restore-test.kubeconfig get namespaces
kubectl --kubeconfig restore-test.kubeconfig get deployments,statefulsets -A
kubectl --kubeconfig restore-test.kubeconfig get pvc -A
```

If the CLI falls back to foreground port-forwarding, leave it running and execute the `kubectl` checks from another terminal. Alternatively, supply the clone's reachable test endpoint with `--server`.

Verify:

1. The API and control-plane components are healthy.
2. The applied `vcluster.yaml` matches Git.
3. Expected CRDs and custom resources exist.
4. Synced workloads and status converge on the control plane cluster.
5. Every required PVC is Bound to separately restored data.
6. Applications pass consistency checks.
7. New certificates and endpoint SANs are correct.
8. External integrations target the intended environment.

Delete a disposable clone only after its recovery evidence has been retained and external resources created during testing have been identified.

## Important Limitations

- Sleeping tenant clusters must be running before a snapshot can be taken.
- Before restoring onto an external control-plane database, take a database-native backup: `vcluster restore` deletes the existing database data before replaying the snapshot, and vCluster cannot roll the database back if the restore fails.
- vCluster CLI snapshots do not back up persistent volumes in v0.36.
- Cluster certificates are not included in v0.36 snapshots.
- If the restore phase of `vcluster create --restore` fails, vCluster attempts to delete the new tenant cluster automatically; verify cleanup. An in-place restore failure requires a retry.
- Namespace changes can affect translated names, bindings, storage, and external policies even though the tenant API objects were restored.

## Official Documentation

- [vCluster: Create snapshots](https://www.vcluster.com/docs/vcluster/manage/backup-restore/backup)
- [vCluster: Restore and clone snapshots](https://www.vcluster.com/docs/vcluster/manage/backup-restore/restore)
- [vCluster: Deploy configuration changes](https://www.vcluster.com/docs/vcluster/manage/deploy-changes/)
- [vCluster: Using Velero](https://www.vcluster.com/docs/vcluster/manage/backup-restore/velero)
- [OCI Distribution Specification](https://github.com/opencontainers/distribution-spec)

## Conclusion

Treat the OCI artifact as a vCluster control-plane recovery point, not a complete application backup. Choose clone or in-place restore deliberately, reapply `vcluster.yaml` from Git, restore workload data separately, and isolate a clone until its credentials, routes, and controllers are safe.
