# Validation Summary: How to Migrate from Docker Swarm to Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Docker Swarm
- Docker Compose
- Kompose
- Bash
- Python
- AWS Route 53
- AWS CLI
- Amazon S3

## Sources Consulted
- Rancher architecture recommendations: https://ranchermanager.docs.rancher.com/v2.11/reference-guides/rancher-manager-architecture/architecture-recommendations
- Rancher Fleet overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/fleet/overview
- Docker `docker compose ps` reference: https://docs.docker.com/reference/cli/docker/compose/ps/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl create namespace` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_namespace/
- Kubernetes persistent volumes and claims: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kompose installation guide: https://kompose.io/installation/
- Kompose user guide: https://kompose.io/user-guide/
- Kompose command source for `--out` flag behavior: https://github.com/kubernetes/kompose/blob/main/cmd/convert.go
- Route 53 ELB alias record guidance: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-elb-load-balancer.html
- AWS CLI `change-resource-record-sets` reference: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html

## Issues Found
- The post treated Rancher as the target cluster platform rather than as the management layer for downstream Kubernetes clusters. I corrected the description, introduction, migration phase wording, deployment step heading, and conclusion to refer to a Rancher-managed Kubernetes cluster.
- The inventory example used the legacy `docker-compose ps` command. I updated it to `docker compose ps`, which matches the current Docker CLI documentation.
- The Python conversion example was not reliable as written. It wrote to `k8s/` while later steps applied `./kubernetes/`, did not create the output directory, only generated Deployments, and assumed `environment` was always a map and `ports` were always simple `HOST:CONTAINER` strings. I updated it to write into `kubernetes/`, create the directory, handle both Compose environment syntaxes, normalize service names, parse common port forms, and generate a Kubernetes Service when ports are present.
- The Kompose install example pinned an older binary version than the current official install page. I updated the command to the documented `v1.38.0` release and aligned the install path with the official example.
- The Kompose `--out` example assumed the output directory existed. I added `mkdir -p kubernetes` before `kompose convert -o ./kubernetes/` and kept the later `kubectl apply` path consistent.
- The persistent data migration example hard-coded `storageClassName: longhorn`, which is not a Rancher default and only works when that StorageClass exists. I replaced it with a generic valid placeholder, `your-storage-class`.
- The S3 sync command constructed the source URI as `s3://migration-backup/$DATA_DIR`, which produced an unintended double slash when `DATA_DIR=/data`. I corrected it to `s3://migration-backup${DATA_DIR}`.
- The migration script used `kubectl wait --for=condition=Succeeded` on a Pod, but `Succeeded` is a Pod phase rather than a standard Pod condition. I changed it to the documented JSONPath form that waits for `.status.phase` to become `Succeeded`.
- The deployment step assumed the namespace already existed and used a test command that did not match the generated resources. I added namespace creation and changed the verification command to use a simple one-shot pod that fetches the generated Service endpoint.
- The Route 53 example used an `A` record with raw `ResourceRecords` for an AWS load balancer. AWS documentation recommends an alias record for ELB/ALB/NLB targets, so I replaced the example with an `AliasTarget` record and removed `TTL`, which the AWS CLI reference says to omit for alias records.

## Review Notes
- The custom Python converter is appropriate for simple Compose files, but Kompose remains the better option for broader Compose-spec coverage and edge cases.
- The Route 53 cutover example now matches AWS load balancer usage. If the target is a static external IP instead of an ELB/NLB/ALB hostname, a standard `A` or `AAAA` record would still be appropriate.
