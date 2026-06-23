# Validation Summary: How to Set Up Multi-Cluster Kubernetes for High Availability

## Status
validated

## Post Type
Guide / Tutorial (architectural patterns with illustrative configuration and command examples)

## Technologies Covered
- Kubernetes (multi-cluster, federation)
- Terraform (GCP global load balancer)
- ExternalDNS (DNSEndpoint CRD, weighted records)
- Istio (multi-cluster mesh, ServiceEntry, create-remote-secret)
- Submariner (subctl, cross-cluster pod/service connectivity)
- Velero (DR backup/restore, schedules)
- CloudNativePG (PostgreSQL replica clusters, failover/promotion)
- Cloudflare DNS API (failover automation)
- Argo CD ApplicationSet (cluster generator)
- Flux CD (Kustomization, postBuild substitutions)
- Prometheus (federation)
- MinIO (bucket replication via mc client)
- Chaos Mesh (NetworkChaos)
- KEDA (cron-based ScaledObject)
- Cluster Autoscaler (priority expander)

## Sources Consulted
- Submariner docs — service export usage: https://submariner.io/operations/usage/
- Submariner docs — subctl reference: https://submariner.io/operations/deployment/subctl/
- MinIO Operator Tenant CRD reference: https://github.com/minio/operator/blob/master/docs/tenant_crd.adoc
- MinIO `mc replicate add` reference: https://docs.min.io/community/minio-object-store/reference/minio-mc/mc-replicate-add.html
- CloudNativePG replica clusters docs: https://cloudnative-pg.io/docs/1.28/replica_cluster/
- CloudNativePG automated failover docs: https://cloudnative-pg.io/docs/devel/failover/

## Issues Found
1. **Submariner service export used a non-existent annotation.** The post ran `kubectl annotate service myapp submariner.io/exportTo=ClusterSetIP`. No such annotation exists in Submariner; services are exported by creating a `ServiceExport` resource, idiomatically via `subctl export service`. Changed it to `subctl export service --namespace default myapp` and updated the comment.

2. **CloudNativePG "Primary" cluster had an invalid/contradictory replica block.** The primary defined `replica: { enabled: true, source: postgres-dr }` but provided no matching `externalClusters` entry for `postgres-dr`, and `replica.enabled: true` would actually make this cluster a passive replica (contradicting its role as the primary). Removed the `replica` block from the primary so it is a standard read-write primary, with the DR cluster correctly configured as the read replica that points at it.

3. **Replica promotion in the failover Job was incorrect.** The post promoted the DR database with `kubectl annotate cluster postgres-dr cnpg.io/hibernation-`. Removing the hibernation annotation only un-hibernates a cluster; it does not promote a replica. CloudNativePG promotes a replica cluster by setting `spec.replica.enabled: false`. Replaced it with `kubectl patch cluster postgres-dr --type merge -p '{"spec":{"replica":{"enabled":false}}}'`.

4. **MinIO bucket replication used a non-existent CRD.** The post used `apiVersion: minio.min.io/v2` / `kind: BucketReplication`. The MinIO Operator only ships the `Tenant` CRD under `minio.min.io/v2`; there is no `BucketReplication` kind. Bucket replication is configured with the `mc` client. Replaced the YAML with the equivalent `mc alias set` + `mc replicate add --remote-bucket --priority 1` commands.

## Review Notes
- The Terraform GCP, ExternalDNS `DNSEndpoint` (`externaldns.k8s.io/v1alpha1`), Istio install/`create-remote-secret`/`ServiceEntry`, Velero install/schedule/restore, Argo CD `ApplicationSet` cluster generator, Flux CD `Kustomization`, Prometheus `/federate`, Chaos Mesh `NetworkChaos` (partition), KEDA cron trigger, and Cluster Autoscaler priority-expander snippets were checked and are syntactically/API-correct as illustrative examples.
- The Argo CD ApplicationSet uses the classic `{{name}}`/`{{server}}` templating (non-Go-template mode), which is valid; newer setups using `goTemplate: true` would need `{{.name}}` syntax instead — worth noting if readers enable Go templating.
- The CloudNativePG distributed-topology feature also supports controlled switchover via demotion/promotion tokens for a zero-data-loss handover; the simple `replica.enabled: false` promotion used here triggers a failover and may require rebuilding the former primary. This is acceptable for a DR illustration but readers running production distributed topologies should review the promotion-token workflow.
- Snippets generally use placeholder hostnames/IPs and are intended as templates rather than copy-paste-ready manifests, which is appropriate for an architectural overview post.
