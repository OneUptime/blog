# Validation Summary: How to Deploy Kubernetes Operators via Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (Kubernetes Edition - Advanced Deployment / manifest interface)
- Kubernetes (Operators, CRDs, Custom Resources)
- Cert-Manager (ClusterIssuer, Certificate, ACME HTTP01 solver)
- Zalando Postgres Operator (acid.zalan.do/v1 postgresql CRD)
- kubectl (apply, get, describe)
- Let's Encrypt ACME

## Sources Consulted
- Cert-manager ACME configuration docs: https://cert-manager.io/docs/configuration/acme/
- Cert-manager HTTP01 ingress solver docs: https://cert-manager.io/docs/configuration/acme/http01/
- Zalando postgres-operator cluster manifest reference: https://github.com/zalando/postgres-operator/blob/master/docs/reference/cluster_manifest.md
- Zalando postgres-operator minimal manifest example: https://github.com/zalando/postgres-operator/blob/master/manifests/minimal-postgres-manifest.yaml
- Cert-manager release download URL pattern (github.com/cert-manager/cert-manager/releases)

## Issues Found
- **Zalando Postgres cluster naming convention**: The example postgres manifest had `metadata.name: acid-production-db` paired with `spec.teamId: "production"`. The Zalando operator requires the cluster name to start with the `teamId` followed by a dash. Fixed by changing `metadata.name` to `production-db` so it correctly starts with the `production` teamId prefix.

## Review Notes
- The cert-manager solver uses `ingress.class: nginx`. This still works, but cert-manager 1.12+ added `ingressClassName` as the recommended field for most ingress controllers (the legacy `class` field is now mainly retained for ingress-gce). Future revisions could switch to `ingressClassName: nginx`.
- The `https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml` URL is the canonical install manifest URL; using `latest` means the deployed version will drift over time, which is fine for an example but production users typically pin a version.
- The PostgreSQL version `"16"` in the Zalando example is a supported Spilo version at time of writing. The Spilo project's supported versions evolve over time; readers should check the Spilo releases for currently supported PG majors.
- The Cert-Manager pod list (cert-manager, cert-manager-cainjector, cert-manager-webhook) accurately reflects the three deployments installed by the standard manifest.
- Portainer's "Advanced Deployment" path under Kubernetes is the correct location for applying raw manifests/URL imports.
