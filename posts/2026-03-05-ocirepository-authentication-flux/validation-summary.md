# Validation Summary: How to Configure OCIRepository with Authentication in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux source-controller
- Flux OCIRepository
- Kubernetes Secrets
- Kubernetes ServiceAccounts and imagePullSecrets
- OCI container registries
- AWS ECR, Azure ACR, and Google Artifact Registry authentication
- SOPS

## Sources Consulted
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux `create secret oci` CLI reference: https://fluxcd.io/flux/cmd/flux_create_secret_oci/
- Flux `get sources oci` CLI reference: https://fluxcd.io/flux/cmd/flux_get_sources_oci/
- Flux `reconcile source oci` CLI reference: https://fluxcd.io/flux/cmd/flux_reconcile_source_oci/
- Flux `list artifacts` CLI reference: https://fluxcd.io/flux/cmd/flux_list_artifacts/
- Flux `pull artifact` CLI reference: https://fluxcd.io/flux/cmd/flux_pull_artifact/
- Kubernetes `kubectl create secret docker-registry` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/

## Issues Found
- The introduction said Flux supports "static credentials" separately from Docker registry secrets for OCIRepository authentication. Current Flux API documentation specifies that `spec.secretRef` must reference a `kubernetes.io/dockerconfigjson` image pull secret. Updated the wording to describe Kubernetes image pull secrets and cloud provider mechanisms.
- The post claimed to cover "all" OCIRepository authentication methods. The guide covers common registry credential and cloud-provider methods, but not every related option such as TLS client certificate authentication via `certSecretRef`. Updated the wording to "common authentication methods."
- The prerequisites referenced "Flux CD installed (v0.35 or later)" while the examples use the current `source.toolkit.fluxcd.io/v1` OCIRepository API. Updated the prerequisite to require that API instead of an outdated Flux version threshold.
- The authentication overview diagram listed "Generic Secret with Credentials," which could imply username/password keys are valid for OCIRepository `secretRef`. Updated it to "Docker Config Secret from Existing Config."
- The local testing section said successful local Flux CLI commands mean the same credentials should work in-cluster. Local Docker credentials are not automatically available to Flux in the cluster. Updated the sentence to clarify that the credentials must be configured through `secretRef`, `serviceAccountName`, or the matching cloud provider authentication method.

## Review Notes
- The `flux create secret oci`, `flux get sources oci`, and OCI-related Flux CLI commands are documented as preview in current Flux CLI docs, but the commands and flags used in the post are valid.
- The Kubernetes and Flux YAML snippets use current field names and valid `source.toolkit.fluxcd.io/v1` OCIRepository structure.
