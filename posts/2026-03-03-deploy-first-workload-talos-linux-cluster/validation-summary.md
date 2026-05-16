# Validation Summary: How to Deploy Your First Workload on a Talos Linux Cluster

## Status
validated

## Post Type
Tutorial / Getting Started Guide

## Technologies Covered
- Talos Linux
- Kubernetes (core resources: Pods, Deployments, Services, ConfigMaps, Namespaces)
- kubectl CLI
- CoreDNS
- nginx (container image)
- hashicorp/http-echo (container image)
- Alpine Linux (used as a debug container)
- metrics-server (briefly mentioned)

## Sources Consulted
- Kubernetes official documentation — Workloads & kubectl reference: https://kubernetes.io/docs/reference/kubectl/
- Kubernetes API reference for `apps/v1` Deployment, `v1` Service, ConfigMap, Namespace: https://kubernetes.io/docs/reference/kubernetes-api/
- Kubernetes NodePort service docs (valid range 30000-32767): https://kubernetes.io/docs/concepts/services-networking/service/#type-nodeport
- CoreDNS in Kubernetes — default labels (`k8s-app=kube-dns` retained for compatibility): https://kubernetes.io/docs/tasks/administer-cluster/coredns/
- Talos Linux documentation — control plane scheduling: https://www.talos.dev/latest/kubernetes-guides/configuration/
- nginx official Docker Hub image — config include path `/etc/nginx/conf.d`: https://hub.docker.com/_/nginx
- hashicorp/http-echo flags (`-text`, `-listen`): https://github.com/hashicorp/http-echo
- Kubernetes DNS for Services — `<service>.<namespace>.svc.cluster.local` format: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/

## Issues Found
No technical issues found.

## Review Notes
- The CoreDNS label selector `k8s-app=kube-dns` is correct — CoreDNS retains this historical label for compatibility with the older kube-dns naming convention.
- `kubectl get events --sort-by=.lastTimestamp` works but may emit warnings on newer Kubernetes versions where some events use `eventTime` instead of `lastTimestamp`. Still the most common idiom in practice.
- The single `kubectl apply -f app-namespace.yaml` correctly applies all five resources in that multi-document YAML file (Namespace, two Deployments, two Services).
- The ConfigMap mounted at `/etc/nginx/conf.d` will replace the default `default.conf` from the nginx image — intended behavior here.
- Alpine 3.x ships with BusyBox `nslookup`, so the in-cluster DNS debug command will succeed without installing extra packages.
- NodePort values 30080 and 30081 fall within the default valid range (30000-32767).
- All container resource requests/limits are reasonable for a tutorial workload and will schedule on small single-node clusters.
