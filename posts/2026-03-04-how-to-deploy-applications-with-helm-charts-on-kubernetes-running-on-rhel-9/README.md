# How to Deploy Applications with Helm Charts on Kubernetes Running on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Kubernetes, Helm

Description: Step-by-step guide on deploy applications with helm charts on kubernetes running on rhel 9 with practical examples and commands.

---

Helm simplifies application deployment on Kubernetes running on RHEL 9. This guide covers installing Helm and deploying applications.

## Install Helm

```bash
curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
helm version
```

## Add a Chart Repository

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
```

## Search for Charts

```bash
helm search repo nginx
helm search repo postgresql
```

## Deploy an Application

```bash
helm install my-nginx bitnami/nginx \
  --set service.type=LoadBalancer \
  --namespace web --create-namespace
```

## Deploy with Custom Values

```yaml
# values.yaml
replicaCount: 3
service:
  type: ClusterIP
  port: 80
resources:
  requests:
    memory: 128Mi
    cpu: 100m
  limits:
    memory: 256Mi
    cpu: 200m
```

```bash
helm install my-app bitnami/nginx -f values.yaml
```

## Manage Releases

```bash
helm list -A
helm status my-nginx -n web
helm upgrade my-nginx bitnami/nginx --set replicaCount=5 -n web
helm rollback my-nginx 1 -n web
helm uninstall my-nginx -n web
```

## Conclusion

Helm on RHEL 9 Kubernetes clusters simplifies application deployment with templated charts. Use custom values files for environment-specific configurations and Helm's rollback feature for safe updates.

