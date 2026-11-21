# Validation summary

Reviewed the pinned official chart, Kubernetes StatefulSet/PDB/topology/storage documentation, Helm rendering and API dry-run references, and JetStream replication guidance. The article distinguishes pod count from stream replication and readiness from replica catch-up.

## Local configuration checks

Chart archive digest matched the official index. Helm 3.17.3 lint/render passed with Kubernetes 1.30.0 capabilities. Assertions verified the three replicas, PVC template, strict zone spread, selectors, disruption budget and rollout partition. Partitions two, one and zero were separately rendered. The generated NATS configuration passed Server 2.11.4 parser validation. The stream-creation fragment compiled against nats.go 1.42.0.

Diagram structure was checked and the generated 1280x720 social image was visually reviewed.

## Limits

No Kubernetes cluster or NATS runtime deployment was used. API admission, scheduling, storage provisioning, permissions, failover, replication and upgrades were not executed. Security values are explicitly outside the topology overlay and must be merged before deployment. Mermaid was not graphically rendered. Sources and precise checks are recorded in validation.json.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
