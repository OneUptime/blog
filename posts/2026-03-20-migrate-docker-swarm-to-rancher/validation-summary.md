# Validation Summary: How to Migrate from Docker Swarm to Rancher - A Practical Guide

## Status
validated

## Post Type
Guide / migration tutorial

## Technologies Covered
- Docker Swarm
- Rancher
- Kubernetes
- `kubectl`
- Docker CLI
- YAML manifests

## Sources Consulted
- Docker secrets docs: https://docs.docker.com/engine/swarm/secrets/
- `docker service inspect` reference: https://docs.docker.com/reference/cli/docker/service/inspect/
- `docker stack services` reference: https://docs.docker.com/reference/cli/docker/stack/services/
- `docker stack rm` reference: https://docs.docker.com/reference/cli/docker/stack/rm/
- Docker Swarm drain-node tutorial: https://docs.docker.com/engine/swarm/swarm-tutorial/drain-node/
- Kubernetes Deployment docs: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Secret docs: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes Services and networking overview: https://kubernetes.io/docs/concepts/services-networking/
- Kubernetes Ingress docs: https://kubernetes.io/docs/concepts/services-networking/ingress/
- `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- `kubectl create configmap` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/
- Rancher workload/ingress quick start: https://ranchermanager.docs.rancher.com/v2.14/getting-started/quick-start-guides/deploy-workloads/workload-ingress
- Rancher monitoring docs: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/monitoring-and-alerting

## Issues Found
- The original Swarm-to-Kubernetes concept table mapped Swarm overlay networking to `NetworkPolicy`, which is not equivalent. I changed this to pod networking/CNI plus optional `NetworkPolicy`, because Kubernetes networking and traffic-policy enforcement are separate concepts.
- The original inspection step used `docker service inspect --pretty` while instructing readers to collect environment variables and volume mounts. I changed it to `docker service inspect`, because the JSON output exposes those fields while `--pretty` is a reduced human-readable view.
- The original secrets section implied that `docker secret inspect` could be used to recover a Swarm secret value. I replaced that flow with `docker secret ls` plus recreating the Kubernetes Secret from the original source value, because Docker does not return secret contents through the CLI.
- The original Kubernetes example converted a Swarm file-mounted secret into an environment variable and added CPU requests/limits that were not present in the source stack. I changed the Deployment to mount the Secret at `/run/secrets` and removed the invented CPU values so the example matches the Swarm workload more closely.
- The original Rancher UI and monitoring wording was too version-specific. I generalized the YAML import/editor wording and changed the monitoring note so it does not imply monitoring is always preinstalled.

## Review Notes
- The Ingress example is technically valid, but it assumes the target cluster already has an ingress controller and, if required by the environment, a default or explicit `IngressClass`.
- Kubernetes does not provide a direct field-for-field equivalent for every Swarm `deploy` option shown in the sample, especially `update_config.delay` and `restart_policy.condition`. The revised wording now presents the Deployment as an approximate workload translation rather than an exact one-to-one conversion.
- The Kubernetes project recommends Gateway API for newer platform designs, but the `Ingress` API remains stable and acceptable for this post.
