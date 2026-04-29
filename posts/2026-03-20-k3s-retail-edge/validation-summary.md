# Validation Summary: How to Configure K3s for Retail Store Edge Computing

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- CronJob
- Deployment
- StatefulSet
- ConfigMap
- Secret
- Service
- HelmChart
- Grafana
- PostgreSQL

## Sources Consulted
- K3s configuration docs: https://docs.k3s.io/installation/configuration
- K3s Helm controller docs: https://docs.k3s.io/add-ons/helm
- K3s server CLI docs: https://docs.k3s.io/cli/server
- Kubernetes Deployment docs: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes StatefulSet docs: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes ConfigMap docs: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes CronJob docs: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes volumes docs: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes environment variable docs: https://kubernetes.io/docs/tasks/inject-data-application/define-environment-variable-container
- Kubernetes dependent environment variable docs: https://kubernetes.io/docs/tasks/inject-data-application/define-interdependent-environment-variables/
- Kubernetes DNS for Services and Pods docs: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- kubectl create namespace reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_namespace/
- Grafana Helm charts index: https://grafana.github.io/helm-charts/

## Issues Found
- The POS database `StatefulSet` was missing the required governing Service and `serviceName`. I added a headless `Service`, set `serviceName: pos-database`, and updated clients to use the existing `pos-database` DNS name so the manifest is valid and resolvable.
- The POS application referenced `$(POS_DB_PASSWORD)` without defining that environment variable. I added a `Secret` plus `POS_DB_PASSWORD` entries before the dependent `DATABASE_URL` fields so Kubernetes variable expansion works as documented.
- The end-of-day batch job used `eod_user` and `pos-database-svc`, but neither user nor Service existed in the post. I changed it to use the defined `pos_user`, the shared `pos-db-secret`, and the actual `pos-database` Service.
- The digital signage deployment was placed in `digital-signage` while its `store-config` `ConfigMap` existed only in `retail`. Because Pods and ConfigMaps must be in the same namespace, I moved the signage deployment to `retail`.
- The post referenced `local-pricing-db` for signage and HQ price sync, but no such database resource was defined. I added a matching headless `Service` and `StatefulSet`, and aligned both consumers on the same `pricing_user` credentials.
- The inventory `Deployment` was invalid because `.spec.selector.matchLabels` did not have matching pod template labels. I added `template.metadata.labels.app: inventory`.
- The inventory manifest mounted `/dev/ttyUSB0` via `hostPath` without declaring the expected path type. I set `type: CharDevice` to match Kubernetes hostPath validation for serial devices.
- Both CronJobs relied on implicit controller timezone behavior. I added `timeZone: "America/New_York"` so the schedules explicitly match the store configuration.

## Review Notes
- The K3s `kubelet-arg` settings are still supported, but current K3s documentation recommends kubelet config files or drop-ins for newer releases when you need more advanced kubelet configuration.
- The Grafana Helm chart version `7.0.0` is valid, but it is a pinned chart release rather than a current one. It would be worth refreshing periodically if this post is kept as an operational template.
- The HQ API hostnames appear to be illustrative example domains, so they were reviewed for plausibility rather than live reachability.
