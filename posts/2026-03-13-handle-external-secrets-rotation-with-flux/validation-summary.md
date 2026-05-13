# Validation Summary: How to Handle External Secrets Rotation with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes Secrets and Deployments
- External Secrets Operator
- AWS Secrets Manager
- Stakater Reloader
- HelmRelease and Kustomization custom resources
- Prometheus metrics

## Sources Consulted
- External Secrets Operator ExternalSecret documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator AWS Secrets Manager provider documentation: https://external-secrets.io/v0.20.0/provider/aws-secrets-manager/
- External Secrets Operator metrics documentation: https://external-secrets.io/v0.14.4/api/metrics/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Stakater Reloader annotation reference: https://docs.stakater.com/reloader/main/reference/annotations.html
- Stakater Reloader architecture documentation: https://docs.stakater.com/reloader/1.4/architecture/how-it-works.html
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes volume documentation: https://kubernetes.io/docs/concepts/storage/volumes/
- AWS Secrets Manager secret version staging label documentation: https://docs.aws.amazon.com/secretsmanager/latest/userguide/whats-in-a-secret.html

## Issues Found
- The ESO examples used `apiVersion: external-secrets.io/v1beta1`. Updated them to `external-secrets.io/v1` to match the current documented ExternalSecret API.
- The Kubernetes Secret volume propagation wording gave a fixed 60-90 second timing. Replaced it with Kubernetes' documented kubelet sync period plus cache propagation delay behavior and noted the `subPath` exception.
- The Flux HelmRelease installed into `targetNamespace: reloader` without ensuring the namespace exists. Added `install.createNamespace: true`, which Flux documents as the Helm-supported way to create the target namespace on demand.
- The introduction implied rotated secrets could always be consumed without pod restarts. Reworded it to avoid conflicting with the later, correct explanation that environment-variable-based secrets require restarts.
- The best-practice recommendation said to always use volume mounts. Qualified it to applications that can re-read mounted secret files and noted that `subPath` mounts do not receive automatic updates.
- The Prometheus metric name was written as `externalsecret_sync_calls_error_total`. Updated it to the ESO-documented `externalsecret_sync_calls_error` metric name.

## Review Notes
The Reloader named Secret annotation, Flux Kustomization API, ESO manual `force-sync` annotation command, and AWS Secrets Manager `AWSCURRENT` / `AWSPREVIOUS` version-stage usage are consistent with the consulted documentation. Applications still need to be written to re-read mounted files or otherwise reconnect gracefully; Kubernetes only updates the mounted data.
