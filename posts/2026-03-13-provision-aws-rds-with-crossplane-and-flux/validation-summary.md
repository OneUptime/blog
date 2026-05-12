# Validation Summary: How to Provision AWS RDS with Crossplane and Flux

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Crossplane (Upbound `provider-aws-rds` and `provider-aws-ec2`)
- AWS RDS (PostgreSQL)
- AWS EC2 (Security Group, Security Group Rule)
- Flux CD (Kustomization controller)
- Kubernetes (kubectl, Secrets)
- SOPS / External Secrets Operator (mentioned in best practices)
- PostgreSQL 15

## Sources Consulted
- Upbound Marketplace — `provider-aws-rds` Instance v1beta1: https://marketplace.upbound.io/providers/upbound/provider-aws-rds/latest/resources/rds.aws.upbound.io/Instance/v1beta1
- Upbound Marketplace — `provider-aws-rds` SubnetGroup v1beta1: https://marketplace.upbound.io/providers/upbound/provider-aws-rds/latest/resources/rds.aws.upbound.io/SubnetGroup/v1beta1
- Upbound Marketplace — `provider-aws-ec2` SecurityGroup and SecurityGroupRule v1beta1
- Crossplane managed resources docs (paused annotation, refs/selectors): https://docs.crossplane.io/latest/managed-resources/managed-resources/
- Flux CD Kustomization API (`kustomize.toolkit.fluxcd.io/v1`): https://fluxcd.io/flux/components/kustomize/kustomizations/
- AWS RDS docs for PostgreSQL engine versions and instance classes

## Issues Found

1. **Invalid field `finalSnapshotIdentifierPrefix` on the RDS `Instance` resource.** The Upbound `provider-aws-rds` Instance schema does not expose a `Prefix` variant — the correct field is `finalSnapshotIdentifier` (full identifier, not a prefix). Submitting the manifest as written would fail schema validation. Fixed by renaming to `finalSnapshotIdentifier` and using a concrete identifier (`production-postgres-final-snapshot`).

2. **Misleading `crossplane.io/paused: "false"` annotation with incorrect comment.** The comment claimed Crossplane "will wait for this resource before marking it ready", but the `crossplane.io/paused` annotation has no readiness-gating semantics — it only pauses/resumes reconciliation, and `false` is the default (no-op). Removed the annotation block entirely to avoid spreading the misconception.

3. **`securityGroupIdSelector.matchLabels.crossplane.io/name` doesn't resolve.** `crossplane.io/name` is not a label automatically applied to managed resources, so the selector would match nothing and the SecurityGroupRule would never reconcile. Replaced with `securityGroupIdRef.name: production-rds-sg`, which is the documented pattern for referencing another managed resource by its Kubernetes object name.

## Review Notes

- `passwordSecretRef` is correctly nested under `spec.forProvider` in the post.
- The hardcoded `sg-0a1b2c3d4e5f60011` in `vpcSecurityGroupIds` on the Instance is awkward because the ID isn't known until after the SecurityGroup is created. Switching to `vpcSecurityGroupIdRefs: [{ name: production-rds-sg }]` (or a selector) would be more idiomatic, but the inline comment "(after creation)" acknowledges the limitation, and a single illustrative ID is acceptable for a tutorial.
- PostgreSQL 15.4 is a real minor version, but minor versions are routinely deprecated by AWS. Readers should consult the current AWS RDS PostgreSQL availability matrix before copy-pasting.
- `gp3`, `db.t3.medium`, `multiAz`, `performanceInsightsEnabled`, and `storageEncrypted` are all valid fields on the Upbound RDS Instance resource.
- The `Kustomization` `apiVersion: kustomize.toolkit.fluxcd.io/v1` and the `healthChecks` / `dependsOn` / `prune` fields are all current and correct.
- `kubectl get instances.rds.aws.upbound.io` and `kubectl describe instance.rds.aws.upbound.io` are both valid resource-name forms.
- The connection secret published by `writeConnectionSecretsToRef` includes an `endpoint` key for RDS Instances, so the `kubectl get secret ... -o jsonpath='{.data.endpoint}' | base64 -d` invocation works as written.
