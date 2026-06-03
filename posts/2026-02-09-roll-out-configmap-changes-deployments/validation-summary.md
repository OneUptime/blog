# Validation Summary: How to Roll Out ConfigMap Changes to Deployments Automatically

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes ConfigMaps
- Kubernetes Deployments
- kubectl
- Stakater Reloader
- GitLab CI
- Node.js
- Prometheus / kube-state-metrics

## Sources Consulted
- Kubernetes ConfigMaps documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes kubectl create configmap reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/
- Kubernetes kubectl patch task documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/
- Kubernetes kubectl set env reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_env/
- Kubernetes kubectl rollout restart reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Stakater Reloader annotation reference: https://docs.stakater.com/reloader/latest/reference/annotations.html
- Stakater Reloader install manifest: https://raw.githubusercontent.com/stakater/Reloader/master/deployments/kubernetes/reloader.yaml
- kube-state-metrics ConfigMap metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/storage/configmap-metrics.md
- Node.js fs.watch documentation: https://nodejs.org/api/fs.html
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The post stated that existing pods do not reload ConfigMap changes in general. Kubernetes documentation says mounted ConfigMaps are updated eventually, while ConfigMaps consumed as environment variables are not updated automatically and require a pod restart. I narrowed the claim to environment-variable consumption and added the mounted-volume caveat.
- The Reloader search/match example placed `reloader.stakater.com/match: "true"` on the pod template. Reloader documents `match` as a ConfigMap or Secret annotation used with workload-level `search`. I removed the pod-template annotation and left it on the ConfigMap.
- The versioned ConfigMap update used `kubectl set env --from=configmap/app-config-v2`, which imports ConfigMap keys as explicit environment variables instead of updating the existing `envFrom.configMapRef.name`. I changed it to a JSON patch that updates the Deployment's ConfigMap reference.
- The application hot-reload example read `/etc/config/app.json`, but the surrounding ConfigMap examples define individual keys such as `LOG_LEVEL` and `CACHE_TTL`. I changed the code to read the mounted key files.
- The mounted ConfigMap explanation implied immediate file updates. Kubernetes documents eventual updates and notes that `subPath` mounts do not receive ConfigMap updates, so I added that caveat.
- The Prometheus alert used `changes(kube_configmap_info[5m])`, but kube-state-metrics exposes ConfigMap resource version changes through `kube_configmap_metadata_resource_version`. I updated the alert expression accordingly.
- The rollback example used `kubectl rollout undo`, which rolls back a Deployment revision and may revert unrelated pod-template changes. For restoring a ConfigMap backup and refreshing environment variables, `kubectl rollout restart deployment/web-app` is the appropriate command, so I changed the example.

## Review Notes
The hash examples calculate the hash from the full live ConfigMap YAML, which includes metadata that may change independently of the ConfigMap data. This still triggers a rollout safely, but future revisions could hash only `.data` and `.binaryData` for less noisy rollouts.
