# Validation Summary: How to Install Portainer Server on Kubernetes via Helm

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Kubernetes
- Helm
- Kubernetes Services (`NodePort`, `LoadBalancer`)
- PersistentVolumeClaims / StorageClasses

## Sources Consulted
- Portainer CE install docs for Kubernetes: https://docs.portainer.io/start/install-ce/server/kubernetes/baremetal
- Portainer BE install docs for Kubernetes: https://docs.portainer.io/start/install/server/kubernetes/baremetal
- Portainer Helm chart configuration options: https://docs.portainer.io/advanced/helm-chart-configuration-options
- Portainer requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer upgrade docs for Kubernetes: https://docs.portainer.io/start/upgrade/kubernetes
- Portainer initial setup docs: https://docs.portainer.io/start/install-ce/server/setup and https://docs.portainer.io/start/install/server/setup
- Portainer FAQ on the 5-minute initial setup timeout: https://docs.portainer.io/faqs/installing/i-just-installed-portainer-but-i-cant-access-the-ui-how-do-i-fix-this
- Portainer Helm chart raw values: https://raw.githubusercontent.com/portainer/k8s/master/charts/portainer/values.yaml
- Portainer Helm chart service template: https://raw.githubusercontent.com/portainer/k8s/master/charts/portainer/templates/service.yaml
- Portainer Helm chart PVC template: https://raw.githubusercontent.com/portainer/k8s/master/charts/portainer/templates/pvc.yaml
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The prerequisites section hard-coded `Kubernetes (v1.20+)`, which is outdated relative to current Portainer guidance. I changed this to "a working and up-to-date Kubernetes cluster" and added the missing cluster-admin and default `StorageClass` requirements because the current Portainer install docs require both for a standard Kubernetes deployment.
- The post covered Business Edition installation but did not mention that a Portainer BE license key is required. I added that prerequisite to match the current BE installation documentation.
- The access section was too vague for NodePort and incomplete for LoadBalancer. I replaced the generic examples with the current chart's actual default ports: `30777` and `30779` for NodePort, `9000` and `9443` for LoadBalancer.
- The upgrade comment said the command upgraded Portainer "to the latest version". I changed the wording to say it upgrades using the existing release values, which is more accurate for `helm upgrade ... --reuse-values`.

## Review Notes
- The Helm commands in the post are syntactically valid for the current chart. The chart's raw `values.yaml` currently defaults to `service.type: NodePort`, exposes both HTTP and HTTPS service ports, and supports the `service`, `persistence`, and `resources` fields used in the post.
- Current Portainer install docs often show `helm upgrade --install --create-namespace` and explicitly set `image.tag=lts` or `enterpriseEdition.image.tag=lts`. The blog's simpler `helm install` examples still work, but they rely on chart defaults rather than the documented LTS pinning approach.
