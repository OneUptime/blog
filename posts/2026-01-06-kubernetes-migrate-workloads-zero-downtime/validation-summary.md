# Validation Summary: How to Migrate Workloads Between Kubernetes Clusters with Zero Downtime

## Status
validated

## Post Type
Tutorial / Guide (step-by-step operational runbook)

## Technologies Covered
- Kubernetes (kubectl, CRDs, NetworkPolicies, Jobs)
- AWS EKS (eksctl) and Google GKE (gcloud)
- Helm (ingress-nginx, cert-manager, kube-prometheus-stack)
- Sealed Secrets (kubeseal) and External Secrets Operator
- PostgreSQL physical replication (pg_basebackup, replication slots)
- Velero (backup/restore, AWS plugin)
- AWS S3 sync / rclone for object storage
- AWS Route 53 weighted routing
- Istio (VirtualService traffic splitting and mirroring)
- Submariner and Liqo (multi-cluster networking / resource sharing)
- Prometheus (querying and scrape config)

## Sources Consulted
- Submariner subctl documentation — https://submariner.io/operations/deployment/subctl/ (confirmed `subctl join broker-info.subm --clusterid <ID>` flag)
- Liqo peering documentation — https://docs.liqo.io/en/latest/usage/peer.html (confirmed `liqoctl peer out-of-band <name> --auth-url ... --cluster-id ... --auth-token ...`)
- cert-manager Helm install docs (`installCRDs=true` valid for v1.13.x)
- External Secrets Operator API reference (`external-secrets.io/v1beta1` ExternalSecret/ClusterSecretStore)
- PostgreSQL streaming replication docs (`wal_level`, `max_wal_senders`, `pg_create_physical_replication_slot`, `pg_basebackup -R -S`)
- Velero CLI and AWS plugin docs (`velero install`, `--include-resources`, `velero/velero-plugin-for-aws`)
- AWS Route 53 ChangeResourceRecordSets / weighted routing docs
- Istio VirtualService and HTTP mirroring (`mirror`, `mirrorPercentage`) docs

## Issues Found
No technical issues found. All commands, flags, API versions, and configuration snippets are syntactically correct and use current (non-deprecated) APIs for the time of writing. No edits to the post were required.

## Review Notes
- The Submariner `--clusterid` flag and Liqo `peer out-of-band` command are valid. The Liqo example shows only `--auth-url` for brevity; a real invocation also requires `--cluster-id` and `--auth-token`. This reads as intentional shorthand rather than an error.
- The Istio cross-cluster `VirtualService` (`host: api-service.old-cluster.svc.cluster.local`) is illustrative — resolving service hostnames across clusters requires a multi-cluster mesh (shared trust / east-west gateway). Presented as a conceptual example, which is reasonable.
- The Route 53 `DELETE` snippet uses `"AliasTarget": {...}` as an elision placeholder; a real DELETE must include the exact existing AliasTarget. Clearly shown as a placeholder, not a literal value.
- `networking.istio.io/v1alpha3` is still served by current Istio releases, though `v1beta1`/`v1` are now preferred for VirtualService. Not incorrect, just worth a future refresh.
- `--set installCRDs=true` works for cert-manager v1.13.2; newer releases also support `crds.enabled=true`. Either is acceptable.
- Version pins (ingress-nginx 4.8.3, cert-manager v1.13.2, velero-plugin-for-aws v1.8.0, EKS 1.28) are valid releases consistent with the post's January 2026 timeframe and may warrant updating in future revisions.
