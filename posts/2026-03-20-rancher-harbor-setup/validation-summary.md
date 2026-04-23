# Validation Summary: How to Set Up Harbor with Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Harbor
- Rancher
- RKE2
- Kubernetes
- Helm
- cert-manager
- Harbor API v2.0
- Trivy

## Sources Consulted
- Harbor Helm chart values: https://github.com/goharbor/harbor-helm/blob/main/values.yaml
- Harbor API v2.0 Swagger: https://raw.githubusercontent.com/goharbor/harbor/main/api/v2.0/swagger.yaml
- Harbor project configuration docs: https://goharbor.io/docs/main/working-with-projects/project-configuration/
- Harbor content trust docs: https://goharbor.io/docs/main/working-with-projects/project-configuration/implementing-content-trust/
- Harbor artifact signing docs: https://goharbor.io/docs/2.14.0/working-with-projects/working-with-images/sign-images/
- Harbor replication docs: https://goharbor.io/docs/edge/administration/configuring-replication/create-replication-rules/
- RKE2 private registry configuration: https://docs.rke2.io/install/private_registry
- Rancher private registry usage docs: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/kubernetes-resources-setup/kubernetes-and-docker-registries
- Kubernetes `kubectl create secret docker-registry` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Kubernetes Ingress docs: https://kubernetes.io/docs/concepts/services-networking/ingress/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/

## Issues Found
- The Harbor Helm values block used outdated chart keys. `persistence.persistentVolumeClaim.jobservice` now stores job logs under `jobservice.jobLog`, `trivy.autoUpdate` is not a current chart value and should be represented as `trivy.skipUpdate: false`, and `notary.enabled` is not present in the current chart. I updated the values snippet accordingly.
- The project creation API example used the deprecated top-level `public` field. I changed it to `metadata.public`, which matches the current Harbor API model.
- The content-trust example used the older `enable_content_trust` field. I changed it to `enable_content_trust_cosign`, which matches Harbor’s current Cosign-based content trust support.
- The Harbor robot account username in the `kubectl create secret docker-registry` example contained `$` but was not quoted, which would break in a shell. I quoted the username and changed the token placeholder to a shell variable so the command is runnable.
- The post implied that creating the registry secret was enough for workloads created with `kubectl`. I added the required note that workloads must reference the secret via `imagePullSecrets` or a ServiceAccount.
- The RKE2 cluster-level registry example used fields that do not match the documented `registries.yaml` format. I replaced it with the current `mirrors` and `configs` structure, including `auth` and `tls.ca_file`, and added the note to restart RKE2 on each node.
- The replication example assumed registry endpoint ID `1` existed. I clarified that the remote registry endpoint must be created first and that the ID in the example must be replaced.
- The troubleshooting command used `curl -I` against Harbor’s ping endpoint, but the Harbor API defines `GET /ping`. I changed it to a normal GET request with `curl -sSf`.
- The prerequisites said the setup could use a domain name or IP, but the guide’s ingress-based configuration requires a DNS host. I corrected the prerequisite to a DNS name.
- The values file comment described the sample as “Production-grade” even though it uses internal database/Redis services and placeholder passwords. I changed the comment to describe it as an example configuration.

## Review Notes
- The guide now validates for an ingress-based Harbor deployment and uses an RKE2-specific node configuration example for cluster-wide image pulls. Other downstream cluster types need the equivalent container runtime registry configuration instead of `registries.yaml`.
- If cert-manager is not installed, users still need to create the `harbor-tls` secret by another method because the Helm values use `expose.tls.certSource: secret`.
