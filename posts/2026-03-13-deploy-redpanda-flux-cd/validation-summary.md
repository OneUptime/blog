# Validation Summary: How to Deploy Redpanda with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository custom resources
- Redpanda Helm chart
- Redpanda Kafka API, HTTP Proxy, Schema Registry, and SASL/SCRAM authentication
- `rpk` CLI

## Sources Consulted
- Redpanda Helm Chart Specification: https://docs.redpanda.com/current/reference/k-redpanda-helm-spec/
- Redpanda Kubernetes authentication documentation: https://docs.redpanda.com/25.2/manage/kubernetes/security/authentication/k-authentication/
- Redpanda 24.2 Kubernetes authentication documentation: https://docs.redpanda.com/24.2/manage/kubernetes/security/authentication/k-authentication/
- Redpanda `rpk -X` options reference: https://docs.redpanda.com/24.2/reference/rpk/rpk-x-options/
- Redpanda `rpk topic create` reference: https://docs.redpanda.com/24.2/reference/rpk/rpk-topic/rpk-topic-create/
- Redpanda `rpk topic produce` reference: https://docs.redpanda.com/24.2/reference/rpk/rpk-topic/rpk-topic-produce/
- Redpanda supported versions policy: https://support.redpanda.com/hc/en-us/articles/20617574366743-Redpanda-Supported-Versions
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/

## Issues Found
- The post used Redpanda Helm chart `5.9.4` and `redpandadata/redpanda:v24.2.1`, which are tied to Redpanda 24.2 and are past end of support as of the 2026-05-13 review date. Updated the chart to `25.2.1` and the Job image to `docker.redpanda.com/redpandadata/redpanda:v25.2.11`, matching the current Redpanda Helm spec consulted.
- The Helm values used `statefulset.podAffinity`, `resources.cpu.overprovisioned`, and `resources.memory.redpanda.reserveMemory`, which do not match the current chart spec. Replaced `podAffinity` with `podAntiAffinity` and removed stale resource fields.
- The post configured `auth.sasl.users` while also creating the Secret referenced by `auth.sasl.secretRef`. Redpanda documentation says `auth.sasl.users` must be empty when the Secret already exists, otherwise the chart tries to create the Secret itself. Changed `users` to an empty list.
- The Secret used `users.txt`; Redpanda authentication documentation expects `superusers.txt` for Secret-backed superusers. Updated the Secret key.
- The `rpk` examples used older direct flags such as `--brokers`, `--user`, `--password`, and `--sasl-mechanism`. The current `rpk` reference uses `-X` config options or corresponding environment variables. Updated the Job to use `RPK_*` environment variables and the verification commands to use `-X`.
- The `kubectl exec` produce example used stdin redirection without `-i`. Added `-i` so the here-string is passed to `rpk topic produce`.
- The HelmRepository manifest was shown under `infrastructure/sources` while the Flux Kustomization reconciled only `./infrastructure/messaging/redpanda`. Moved the example file path under the reconciled directory so the source object is applied with the rest of the manifests.
- The introduction and conclusion made overly absolute performance claims. Reworded them to avoid implying guaranteed single-node equivalence with multi-node Kafka or universal sub-millisecond latency.

## Review Notes
The tutorial still uses a hard-coded example password in snippets. The text says to use SealedSecret, but a future improvement would be to show `valuesFrom` or a Secret-managed Job pattern so the password is not duplicated in the Helm values, Secret, and Job command.
