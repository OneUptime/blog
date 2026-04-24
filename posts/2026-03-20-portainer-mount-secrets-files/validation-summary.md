# Validation Summary: How to Mount Secrets as Files in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes Secrets
- Kubernetes Deployments and Secret volumes
- `kubectl`
- Python
- Node.js

## Sources Consulted
- Portainer Docs, "Add a new application using a form": https://docs.portainer.io/sts/user/kubernetes/applications/add
- Portainer Docs, "ConfigMaps & Secrets": https://docs.portainer.io/2.27/user/kubernetes/configurations
- Kubernetes Docs, "Secrets": https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes Docs, "Volumes": https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes Docs, "Configure a Security Context for a Pod or Container": https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes Docs, "`kubectl create secret tls`": https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/

## Issues Found
- The Portainer form instructions were incorrect. The post said to use the `Volumes` section and add a `Secret` volume, but current Portainer Kubernetes documentation exposes Secrets from the `Secrets` section and uses `Override` to change keys from environment variables to filesystem mounts. Step 2 was corrected to match the documented workflow.
- The Deployment manifest in Step 3 was invalid for `apps/v1` because it omitted the required `.spec.selector` and matching pod template labels. Those fields were added so the example is a valid Deployment manifest.
- The TLS section described a `kubernetes.io/tls` Secret as something HTTPS clients use to verify certificates, but the official Kubernetes Secret type stores a certificate and its associated private key for TLS endpoints or mTLS-style client auth. The explanation was reworded accordingly.
- The SSH example mounted Secret files into `/home/app/.ssh` with root-owned Secret files and `0400` defaults, which can block non-root workloads from reading them. The example now mounts explicit files under `/run/secrets/ssh` and adds a note to align `securityContext` and file modes for non-root containers.
- The post overstated Secret update behavior. Kubernetes documents Secret volume updates as eventually consistent and explicitly notes that `subPath` mounts do not receive automatic updates. The comparison table, Step 6, Step 8, and the conclusion were updated to reflect that behavior.
- The file-permission explanation used `chmod` language for a read-only Secret volume. That wording was replaced with volume file modes, which is the Kubernetes mechanism shown in the examples.

## Review Notes
- Portainer UI labels can vary slightly by release, but the current documented Kubernetes application form behavior is that Secret keys default to environment variables and can be overridden to filesystem mounts.
- Mounted Secret data is kept out of durable node storage, but Secret objects still require standard Kubernetes protections such as RBAC and encryption at rest.
- `kubectl` was not installed in the local workspace, so CLI examples were checked against the official Kubernetes reference documentation rather than local `--help` output.
