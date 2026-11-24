# Validation summary

Reviewed on 24 November 2026.

## Evidence

Official EKS documentation establishes update-error and logging behavior. Kubernetes1.34.0 source establishes the distinct eviction responses, audit fields and selector behavior. CloudWatch documentation supports the QL constructs. All checked source links are listed in validation.json.

A disposable Kubernetes1.34.0 API server emitted real audit events for four UID-guarded dry-run evictions: stale PDB status429, exhausted budget429, overlapping budgets500 and allowed preview201. Fixture readiness and budget status were manually seeded; the Pod remained present. The exact article jq extraction selected only the three failures and retained budget details. A derived event without responseObject verified fallback to responseStatus. The exact current-state kubectl/jq block ran successfully.

Both AWSCLI2.38.1 command examples ran against a loopback HTTP fixture with no signing or AWS calls. Request paths, nodegroup parameter and output projections matched expectations. An initial describe-cluster output-skeleton attempt failed because the CLI generated unrelated out-of-range defaults; the loopback fixture test supplied valid responses instead. CloudWatch queries were not executed or claimed to be locally parsed by the CloudWatch engine.

Four shell blocks passed bash syntax. Mermaid structure passed with seven nodes and seven edges. The1280x720 generated image was opened and reviewed; its three-line title fits with clear margins.

## Limits

No live EKS cluster, managed-node update, CloudWatch request, workload, kubelet or disruption controller was tested. The local audit policy intentionally records response bodies, so its event completeness is not a guarantee about an EKS account's retained logs. The disposable API was stopped and temporary kubeconfig removed. Mermaid was not rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
