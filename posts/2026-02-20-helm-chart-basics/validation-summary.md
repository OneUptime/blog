# Validation Summary: How to Create Your First Helm Chart from Scratch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Helm
- Kubernetes
- Helm charts
- Go templating in Helm
- Kubernetes Deployments, Services, Ingress, probes, and resource requests/limits
- OCI chart registries

## Sources Consulted
- Helm chart format documentation: https://helm.sh/docs/topics/charts/
- Helm `helm create` command documentation: https://helm.sh/docs/helm/helm_create/
- Helm `helm install` command documentation: https://helm.sh/docs/helm/helm_install/
- Helm OCI registry documentation: https://helm.sh/docs/topics/registries/
- Helm named templates documentation: https://helm.sh/docs/chart_template_guide/named_templates/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#container-probes
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/

## Issues Found
- The `helm version` example showed a specific old Helm 3 version (`v3.14.0`). Changed it to say the output includes the installed Helm version, avoiding a stale version-specific example.
- The ingress values used `ingress.host`, but Helm's generated ingress template from `helm create` uses a `hosts` list with path entries. Updated both `values.yaml` and `production-values.yaml` examples to use `ingress.hosts[].host` and `ingress.hosts[].paths[]`.
- The dry-run command was described as checking against the cluster while using plain `--dry-run`. Current Helm documents plain `--dry-run` as client-side by default; changed the command to `--dry-run=server --debug` for cluster-side validation.

## Review Notes
The deployment, service, helper template examples, value overrides, chart packaging, and OCI push command align with current Helm and Kubernetes documentation. Helm 4 is now available, but the chart API `v2` guidance remains correct for charts requiring Helm 3 or later.
