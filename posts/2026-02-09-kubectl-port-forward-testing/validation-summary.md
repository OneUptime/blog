# Validation Summary: How to Use kubectl port-forward for Testing Service Connectivity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl
- kubectl port-forward
- Kubernetes Services, Pods, and Deployments
- Kubernetes Dashboard
- MongoDB Shell
- PostgreSQL, MySQL, Redis, Prometheus, Grafana, Kibana, and Elasticsearch access examples

## Sources Consulted
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes port forwarding task guide: https://kubernetes.io/docs/tasks/access-application-cluster/port-forward-access-application-cluster/
- Kubernetes kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes kubectl proxy reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_proxy/
- Kubernetes access services through proxy documentation: https://kubernetes.io/docs/tasks/access-application-cluster/access-cluster-services/
- Kubernetes Dashboard access documentation: https://v1-33.docs.kubernetes.io/docs/tasks/access-application-cluster/web-ui-dashboard/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- MongoDB Shell documentation: https://www.mongodb.com/docs/mongodb-shell/

## Issues Found
- The introduction described forwarding to "a pod or service" and "the target resource." Official kubectl documentation states port-forward forwards local ports to a pod, with services and deployments used to select a pod. Updated the wording to clarify that traffic is forwarded to the selected pod.
- The multiple-address example used repeated `--address` flags. The official kubectl reference documents comma-separated addresses, so the example was changed to `--address 0.0.0.0,::`.
- The MongoDB example used the legacy `mongo` client. Updated it to `mongosh`, the current MongoDB Shell.
- The Kubernetes Dashboard example used `service/kubernetes-dashboard`. Current Dashboard documentation uses `svc/kubernetes-dashboard-kong-proxy`, so the service name was updated.

## Review Notes
- `kubectl` was not installed in the review environment, so command validation was performed against official Kubernetes documentation instead of local `kubectl --help` output.
- The service names for Prometheus, Grafana, Kibana, Elasticsearch, and databases are deployment-specific examples. They are technically plausible but may need adjustment for a reader's actual Helm chart or manifest names.
