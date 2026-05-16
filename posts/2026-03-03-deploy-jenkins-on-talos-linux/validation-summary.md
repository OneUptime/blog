# Validation Summary: How to Deploy Jenkins on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Jenkins (LTS, JDK17)
- Jenkins Helm chart (chart v5.x value structure)
- Jenkins Configuration as Code (JCasC)
- Jenkins Kubernetes plugin (dynamic agents, JNLP)
- Kubernetes (RBAC, NetworkPolicy, Ingress v1)
- Talos Linux
- Helm v3
- Kaniko (image builds)
- Declarative Pipeline (Groovy / Jenkinsfile)
- Go and Node.js build containers

## Sources Consulted
- Jenkins Helm chart repository and values reference: https://github.com/jenkinsci/helm-charts/tree/main/charts/jenkins
- Jenkins official Helm repo: https://charts.jenkins.io
- Jenkins Kubernetes plugin docs: https://plugins.jenkins.io/kubernetes/
- Jenkins Configuration as Code plugin: https://plugins.jenkins.io/configuration-as-code/
- Jenkins inbound-agent Docker image: https://hub.docker.com/r/jenkins/inbound-agent
- Jenkins controller image: https://hub.docker.com/r/jenkins/jenkins
- Kaniko: https://github.com/GoogleContainerTools/kaniko
- Kubernetes Ingress v1 reference: https://kubernetes.io/docs/reference/kubernetes-api/service-resources/ingress-v1/
- Kubernetes NetworkPolicy reference: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes RBAC reference: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
No technical issues found.

The post was verified end-to-end. Specific items checked:

- `helm repo add jenkins https://charts.jenkins.io` is the correct official repository URL.
- `controller.image.tag: "lts-jdk17"` uses the map-style image structure introduced in chart v5.0 (current convention as of 2026).
- `installPlugins` syntax with `pluginname:latest` is valid.
- Admin password retrieval path `/run/secrets/additional/chart-admin-password` matches what the chart writes when `controller.adminPassword` is set.
- JNLP tunnel port `50000` and service name `jenkins-agent.<ns>.svc` match the chart's default service.
- JCasC `clouds.kubernetes` structure (serverUrl, jenkinsUrl, jenkinsTunnel, containerCapStr, retentionTimeout, templates, containers, nodeUsageMode) matches the kubernetes plugin schema.
- Kaniko invocation flags (`--dockerfile`, `--context=dir://`, `--destination`) and the `gcr.io/kaniko-project/executor:debug` image with the `/busybox/cat` command are correct.
- Declarative pipeline syntax (`agent { kubernetes { yaml '''...''' } }`, `container('...')`, `when { branch 'main' }`, `post { always { cleanWs() } }`) is valid.
- RBAC `Role` verbs against `pods`, `pods/exec`, `pods/log`, `secrets`, `events` reflect the minimum the kubernetes plugin needs.
- `networking.k8s.io/v1` Ingress and NetworkPolicy manifests are well-formed.
- Backup commands (`tar czf` of `/var/jenkins_home` and `kubectl cp`) are correct.

## Review Notes
- Pinning plugins with `pluginname:latest` works but in production environments specific versions are preferred for reproducible installs; this is a stylistic choice, not an error.
- The Blue Ocean plugin (`blueocean:latest`) is in maintenance/limited-activity mode upstream; it still functions but is no longer the recommended UI. Readers may want to omit it.
- The NetworkPolicy egress allows DNS only over UDP/53; some workloads also need TCP/53 (large responses, DoT clients). Not incorrect, just minimal.
- `storageClass: local-path` assumes the user has the Rancher local-path-provisioner (or similar) installed; readers should adjust to whatever StorageClass exists on their Talos cluster.
- `jenkins/inbound-agent:latest-jdk17` is a moving tag; for reproducibility, pinning a specific version is recommended in production.
- `containerCapStr: "20"` is fine; note that the kubernetes plugin's field is a string-encoded integer, which the post correctly uses.
