# Validation Summary: How to Set Up Jenkins on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Jenkins
- Jenkins Helm chart
- Jenkins Kubernetes plugin
- Kubernetes
- Helm
- Jenkins Pipeline
- Docker-in-Docker
- Kubernetes RBAC
- Kubernetes PersistentVolumeClaims and StorageClasses
- Kubernetes ResourceQuota and LimitRange
- Kubernetes NetworkPolicy

## Sources Consulted
- Jenkins Helm chart README: https://github.com/jenkinsci/helm-charts/blob/main/charts/jenkins/README.md
- Jenkins Helm chart values.yaml: https://github.com/jenkinsci/helm-charts/blob/main/charts/jenkins/values.yaml
- Jenkins Helm chart controller StatefulSet template: https://github.com/jenkinsci/helm-charts/blob/main/charts/jenkins/templates/jenkins-controller-statefulset.yaml
- Jenkins Helm chart PVC template: https://github.com/jenkinsci/helm-charts/blob/main/charts/jenkins/templates/home-pvc.yaml
- Jenkins Helm chart PodDisruptionBudget template: https://github.com/jenkinsci/helm-charts/blob/main/charts/jenkins/templates/jenkins-controller-pdb.yaml
- Jenkins Kubernetes plugin documentation: https://plugins.jenkins.io/kubernetes/
- Helm install command documentation: https://helm.sh/docs/helm/helm_install/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes API concepts for probes, PVCs, RBAC, quotas, and network policies: https://kubernetes.io/docs/

## Issues Found
- The Jenkins Helm values used stale controller image keys. Updated `controller.image` / `controller.tag` to the current nested `controller.image.repository` and `controller.image.tag` form used by the chart templates.
- The JCasC values included `controller.JCasC.enabled`, which is not present in the current chart defaults. Removed it and kept `defaultConfig: true`.
- The JCasC reference block was labelled as Groovy even though it is YAML. Changed the code fence and comments to YAML syntax.
- The Docker pod-template example omitted required DinD settings. Added privileged mode and disabled Docker TLS certificate generation for the `docker:24-dind` container to match the `DOCKER_HOST=tcp://localhost:2375` setup.
- The custom PVC example created `jenkins-home` but did not show how the Helm chart should use it. Added the required `persistence.existingClaim: jenkins-home` values snippet.
- The availability values used chart-incompatible probe and PDB keys. Moved probe settings under `controller.probes` and replaced unsupported `minAvailable` with the chart-supported `maxUnavailable: "0"`.
- The availability example included a `backup:` values block that is not part of the Jenkins Helm chart. Replaced it with a note to back up the Jenkins home PVC using external backup tooling such as cloud backups or Velero.
- The security guidance said to store credentials in Kubernetes Secrets, not Jenkins, which conflicts with Jenkins Credentials and the example pipeline's `withCredentials` usage. Updated it to recommend Jenkins Credentials, Kubernetes Secrets, or an external secret manager, and not Jenkinsfiles.
- The NetworkPolicy example used a non-standard namespace label for ingress and allowed only UDP DNS. Updated the namespace selector to `kubernetes.io/metadata.name: ingress-nginx` and allowed both UDP and TCP port 53.

## Review Notes
- The post is technically relevant and remains a useful Jenkins-on-Kubernetes tutorial after the corrections.
- Helm and kubectl were not installed in this environment, so chart-specific validation was done against the official Jenkins Helm chart source and Kubernetes/Helm documentation rather than by rendering the chart locally.
- Several examples intentionally use placeholder repositories, registry names, and storage classes; those are acceptable for a tutorial but must be replaced by readers in a real deployment.
