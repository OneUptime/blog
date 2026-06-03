# Validation Summary: How to Use Reloader to Automatically Restart Deployments on ConfigMap Changes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Deployments, StatefulSets, DaemonSets, ConfigMaps, and Secrets
- Stakater Reloader
- Helm
- kubectl
- Prometheus Operator monitoring configuration

## Sources Consulted
- Stakater Reloader annotation reference: https://docs.stakater.com/reloader/1.4/reference/annotations.html
- Stakater Reloader Helm values and CLI flags reference: https://docs.stakater.com/reloader/main/reference/helm-values.html
- Stakater Reloader OSS installation guide: https://docs.stakater.com/reloader/1.4/installation/install-oss.html
- Stakater Reloader architecture guide: https://docs.stakater.com/reloader/1.4/architecture/how-it-works.html
- Kubernetes ConfigMap update tutorial: https://kubernetes.io/docs/tutorials/configuration/updating-configuration-via-a-configmap/
- Kubernetes Secrets concept documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes kubectl create configmap reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/
- Helm install command reference: https://docs.helm.sh/docs/helm/helm_install/

## Issues Found
- The post stated that mounted ConfigMap or Secret files update in "30-60 seconds." Kubernetes documents this as depending on the kubelet sync loop, and applications only observe the change if they reread or watch the files. Updated the explanation and the related problem bullet.
- Several workload examples used `reloader.stakater.com/match: "true"` together with explicit `configmap.reloader.stakater.com/reload` and `secret.reloader.stakater.com/reload` annotations. Reloader documents `match` as a ConfigMap/Secret annotation used with workload `reloader.stakater.com/search`, not as a required workload annotation for named reloads. Removed the incorrect workload annotations.
- The namespace filtering example combined `reloader.watchGlobally=false` with `reloader.namespaceSelector` while installing Reloader into a dedicated `reloader` namespace. Current Reloader docs state that `watchGlobally=false` limits Reloader to its deployment namespace, while `namespaceSelector` filters watched namespaces. Removed `watchGlobally=false` from the specific-namespace example.
- The custom image example used the outdated or incorrect Helm value `reloader.deployment.image.tag`. Current chart documentation uses `image.tag`. Updated the command.
- The monitoring section showed a ServiceMonitor example. Current Reloader docs recommend `reloader.podMonitor.enabled` and mark ServiceMonitor as deprecated. Replaced the ServiceMonitor manifest with the supported PodMonitor Helm values and changed the port-forward command to target a selected Reloader pod instead of assuming a Service name.

## Review Notes
The remaining Kubernetes manifests and kubectl commands are syntactically plausible and use current stable Kubernetes APIs. The exact Reloader log lines in the testing section should be treated as illustrative output; log formatting can vary by Reloader version and log settings.
