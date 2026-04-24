# Validation Summary: How to Configure Application Annotations in Portainer for Kubernetes - App

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes annotations and labels
- kubectl
- ingress-nginx
- cert-manager
- Prometheus
- Cluster Autoscaler
- Linkerd
- HashiCorp Vault
- ExternalDNS
- Velero
- AWS load balancer annotations

## Sources Consulted
- Portainer Docs: Add a new application using a form - https://docs.portainer.io/sts/user/kubernetes/applications/add
- Portainer Docs: Add a new application using code - https://docs.portainer.io/sts/user/kubernetes/applications/manifest
- Portainer Docs: Edit an application - https://docs.portainer.io/user/kubernetes/applications/edit
- Kubernetes Docs: Annotations - https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/
- Kubernetes Docs: Labels and Selectors - https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes Docs: Well-Known Labels, Annotations and Taints - https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes Docs: `kubectl annotate` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/
- Kubernetes Docs: `kubectl get` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes Docs: `kubectl rollout history` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_history/
- Kubernetes Docs: Horizontal Pod Autoscaling - https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- ingress-nginx Docs: Annotations - https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Linkerd Docs: Automatic Proxy Injection - https://linkerd.io/2.13/features/proxy-injection/
- Linkerd Docs: Proxy Configuration - https://linkerd.io/2-edge/reference/proxy-configuration/
- HashiCorp Docs: Vault Agent Injector annotations - https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/annotations
- Cluster Autoscaler FAQ - https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md
- cert-manager Docs: Annotated Ingress resource - https://cert-manager.io/docs/usage/ingress/
- ExternalDNS Docs: Annotations - https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/
- Velero Docs: File System Backup - https://velero.io/docs/main/file-system-backup/
- AWS Load Balancer Controller Docs: Service annotations - https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/

## Issues Found
- The labels vs annotations table said annotation values were "Unlimited". I changed that to "Can be large" because Kubernetes removes the 63-character label-value limit for annotations, but annotation values are still string fields and not literally unlimited.
- The Deployment example manually set `deployment.kubernetes.io/revision`. I removed it because Kubernetes documents this as a Deployment-controller annotation on ReplicaSets, not a user-managed Deployment annotation.
- The Prometheus comments implied the annotations alone enable scraping. I clarified them as a common Prometheus scrape convention so the post does not overstate what Kubernetes itself does.
- The Istio sidecar comment incorrectly suggested the `sidecar.istio.io/inject` annotation also covered Linkerd. I narrowed the comment to Istio.
- The ingress-nginx example used nonexistent annotation names: `nginx.ingress.kubernetes.io/rate-limit` and `nginx.ingress.kubernetes.io/rate-limit-burst-multiplier`. I changed them to the documented `limit-rps` and `limit-burst-multiplier`, and added `enable-cors: "true"` so the CORS example matches ingress-nginx behavior.
- The Cluster Autoscaler `safe-to-evict` example was shown as generic resource metadata. I moved it under `spec.template.metadata.annotations`, which is where pod-level annotations belong for controller-managed workloads.
- The Horizontal Pod Autoscaler example used a nonexistent annotation-based custom-metric pattern. I replaced it with valid custom tooling metadata annotations instead.
- The `fluentd.io/parser` and `fluentd.io/tag` keys were presented as if they were standard/common Kubernetes annotation keys. I replaced them with clearly generic logging metadata keys to avoid asserting undocumented vendor behavior.
- The Linkerd example used an unquoted value and a less clear CPU quantity. I updated it to documented-style values: `linkerd.io/inject: "enabled"` and `config.linkerd.io/proxy-cpu-request: "100m"`.
- The `kubectl annotate` and `kubectl rollout history` commands omitted `-n production` even though the example Deployment was in the `production` namespace. I added the namespace flag so the commands match the manifest.
- The command that piped `kubectl get -o jsonpath='{.metadata.annotations}'` into `python3 -m json.tool` would not reliably produce valid JSON. I changed it to `-o jsonpath-as-json='{.metadata.annotations}'`.
- The final PVC example used deprecated `volume.beta.kubernetes.io/storage-provisioner` and placed Velero's `backup.velero.io/backup-volumes` annotation on a PVC. I replaced it with a correct Pod-level Velero example.

## Review Notes
- Prometheus `prometheus.io/*` annotations are conventions used by many Prometheus relabeling setups, not a Kubernetes-native scrape standard.
- Several YAML snippets are illustrative fragments that show annotation placement rather than complete standalone manifests.
- Some examples are controller- or provider-specific. AWS load balancer annotations require AWS integration, ExternalDNS annotations require ExternalDNS, cert-manager annotations require cert-manager, and Vault injection annotations require the Vault injector.
