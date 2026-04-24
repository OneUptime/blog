# Validation Summary: How to Deploy a Kubernetes Application via Form in Portainer - Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Kubernetes
- Kubernetes Deployments and StatefulSets
- Kubernetes Services (`ClusterIP`, `NodePort`, `LoadBalancer`)
- ConfigMaps and Secrets
- PersistentVolumeClaims and persistent storage
- HorizontalPodAutoscaler (HPA)
- `kubectl`

## Sources Consulted
- Portainer documentation: Applications overview - https://docs.portainer.io/user/kubernetes/applications
- Portainer documentation: Add a new application using a form - https://docs.portainer.io/sts/user/kubernetes/applications/add
- Portainer documentation: Inspect an application - https://docs.portainer.io/sts/user/kubernetes/applications/inspect
- Portainer documentation: Edit an application - https://docs.portainer.io/sts/user/kubernetes/applications/edit
- Portainer documentation: Cluster setup - https://docs.portainer.io/user/kubernetes/cluster/setup
- Portainer official source: application list and `Add with form` button - https://github.com/portainer/portainer/blob/develop/app/react/kubernetes/applications/ListView/ApplicationsDatatable/ApplicationsDatatable.tsx
- Portainer official source: application name validation - https://github.com/portainer/portainer/blob/develop/app/react/kubernetes/applications/components/NameFormSection/nameValidation.ts
- Portainer official source: autoscaling form - https://github.com/portainer/portainer/blob/develop/app/react/kubernetes/applications/components/AutoScalingFormSection/AutoScalingFormSection.tsx
- Portainer official source: ConfigMaps form section - https://github.com/portainer/portainer/blob/develop/app/react/kubernetes/applications/components/ConfigurationsFormSection/ConfigMapsFormSection.tsx
- Portainer official source: Secrets form section - https://github.com/portainer/portainer/blob/develop/app/react/kubernetes/applications/components/ConfigurationsFormSection/SecretsFormSection.tsx
- Portainer official source: persisted folder fields - https://github.com/portainer/portainer/blob/develop/app/react/kubernetes/applications/components/PersistedFoldersFormSection/PersistedFolderItem.tsx
- Portainer official source: data access policy form - https://github.com/portainer/portainer/blob/develop/app/react/kubernetes/applications/CreateView/DataAccessPolicyFormSection.tsx
- Portainer official source: service publishing tabs - https://github.com/portainer/portainer/blob/develop/app/react/kubernetes/applications/CreateView/application-services/KubeServicesForm.tsx
- Portainer official source: NodePort service form - https://github.com/portainer/portainer/blob/develop/app/react/kubernetes/applications/CreateView/application-services/node-port/NodePortServicesForm.tsx
- Portainer official source: LoadBalancer service form - https://github.com/portainer/portainer/blob/develop/app/react/kubernetes/applications/CreateView/application-services/load-balancer/LoadBalancerServicesForm.tsx
- Kubernetes documentation: Object Names and IDs - https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
- Kubernetes documentation: Service - https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes documentation: Horizontal Pod Autoscaling - https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes documentation: `kubectl get` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes documentation: `kubectl describe` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/

## Issues Found
- The navigation steps used outdated Portainer UI wording (`+ Add application` and then choosing `Form`). I changed this to the current `Applications` -> `Add with form` flow documented in current Portainer docs and reflected in the current frontend source.
- The introduction incorrectly said the form generates `ConfigMap` resources. Current Portainer behavior is to attach existing ConfigMaps and Secrets through dedicated sections; I corrected the introduction to describe the workload and supporting resources the form actually creates.
- The environment-variable section implied a Kubernetes-style `valueFrom` editor inside the environment variable list. Portainer's current form uses separate **ConfigMaps** and **Secrets** sections that automatically expose keys as environment variables, with override options for per-key handling. I rewrote those steps to match current behavior.
- The persistent-storage section described a PVC creation workflow and field set that does not match the current Portainer form. I updated it to the documented **Persisted folders** flow and added the important `Shared` versus `Isolated` data access policy behavior, because `Isolated` changes the workload from a `Deployment` to a `StatefulSet`.
- The service-publishing section used outdated wording (`Publish a new port`) and omitted the current service-tab workflow. I updated it to Portainer's current `ClusterIP` / `NodePort` / `LoadBalancer` tabs with `Create service`, and clarified that `LoadBalancer` depends on cluster setup and provider support.
- The health-check section was not supported by the current Portainer Kubernetes application form. I replaced it with accurate ConfigMaps and Secrets guidance instead of leaving unsupported probe fields in the tutorial.
- The auto-scaling section incorrectly claimed both CPU and memory threshold inputs. Current Portainer form support is CPU-target based autoscaling only, so I removed the memory threshold and aligned the wording with current `Minimum instances`, `Maximum instances`, and `Target CPU usage` fields.
- The labels-and-annotations section implied user-configurable application labels and recommended setting `deployment.kubernetes.io/revision`, which is a controller-managed annotation. I reduced this to a correct annotation example and removed the label guidance.
- The verification commands filtered pods with `-l app=my-web-app`, which is not documented as the selector Portainer creates for this workflow. I changed the verification commands to namespace-scoped `kubectl` checks that do not depend on an undocumented label.
- The YAML-viewing section said to use the `YAML` or `Edit` tab. Current Portainer documentation says generated manifests are shown in the `YAML` tab, while editing YAML from that tab is a Business Edition capability. I corrected that behavior.

## Review Notes
- Portainer's form can also work with ingress rules and can create Ingress resources when configured, but this post remains focused on service publishing rather than ingress-based exposure.
- `LoadBalancer` services depend on Portainer cluster setup and the underlying cloud or infrastructure provider, and may incur provider-side cost.
- `kubectl` was not installed in this workspace, so command syntax was validated against official Kubernetes reference documentation rather than executed locally.
