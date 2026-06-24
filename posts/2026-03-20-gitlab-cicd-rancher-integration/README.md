# How to Integrate GitLab CI/CD with Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitLab, CI/CD, Rancher, Kubernetes, DevOps, Pipeline, Deployment

Description: Learn how to integrate GitLab CI/CD pipelines with Rancher to automate Kubernetes deployments, configure service accounts, and enable seamless GitOps-style delivery.

---

GitLab CI/CD combined with Rancher gives you a powerful, self-hosted pipeline that can deploy directly to Kubernetes clusters managed by Rancher. This guide walks through configuring the integration end-to-end.

---

## Prerequisites

- A running Rancher instance (v2.9+)
- GitLab instance or GitLab.com account
- A Kubernetes cluster imported into Rancher
- `kubectl` access to the cluster
- A GitLab Runner configured for Docker-in-Docker in privileged mode

---

## Step 1: Create a Deployment Service Account in the Cluster

Create a dedicated service account for GitLab CI. If you plan to connect through Rancher's cluster proxy URL (`/k8s/clusters/...`) as shown later in this guide, enable **JWT Authentication** for the cluster in Rancher first. Rancher added downstream service account JWT authentication in v2.9.0.

The following manifest creates a service account and binds it to the `edit` ClusterRole scoped to a specific namespace:

```yaml
# gitlab-deploy-sa.yaml

apiVersion: v1
kind: ServiceAccount
metadata:
  name: gitlab-deploy
  namespace: my-app
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: gitlab-deploy-binding
  namespace: my-app
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: edit
subjects:
  - kind: ServiceAccount
    name: gitlab-deploy
    namespace: my-app
```

Apply the manifest and extract the token:

```bash
kubectl apply -f gitlab-deploy-sa.yaml

# Kubernetes 1.24+ no longer auto-creates service account token secrets,
# so create one if you need a non-expiring token
kubectl apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: gitlab-deploy-token
  namespace: my-app
  annotations:
    kubernetes.io/service-account.name: gitlab-deploy
type: kubernetes.io/service-account-token
EOF

# Retrieve the token
kubectl get secret gitlab-deploy-token -n my-app \
  -o jsonpath='{.data.token}' | base64 -d
```

---

## Step 2: Store Credentials in GitLab CI Variables

In your GitLab project, go to **Settings > CI/CD > Variables** and add:

| Variable | Value |
|---|---|
| `KUBE_SERVER` | Rancher cluster proxy URL (e.g. `https://rancher.example.com/k8s/clusters/c-xxxxx`) |
| `KUBE_TOKEN` | The service account token from Step 1 |
| `KUBE_NAMESPACE` | `my-app` |

Mark `KUBE_TOKEN` as **Masked** to prevent it from appearing in logs.

---

## Step 3: Configure `.gitlab-ci.yml`

This pipeline builds a Docker image, pushes it to the GitLab registry, then deploys to Rancher-managed Kubernetes:

```yaml
# .gitlab-ci.yml
stages:
  - build
  - deploy

variables:
  IMAGE_TAG: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

build:
  stage: build
  image: docker:24.0.5-cli
  services:
    - docker:24.0.5-dind
  variables:
    DOCKER_HOST: tcp://docker:2375
    DOCKER_TLS_CERTDIR: ""
  script:
    # Log in to the GitLab Container Registry
    - echo "$CI_REGISTRY_PASSWORD" | docker login $CI_REGISTRY -u $CI_REGISTRY_USER --password-stdin
    # Build and push the image
    - docker build -t $IMAGE_TAG .
    - docker push $IMAGE_TAG

deploy:
  stage: deploy
  image: bitnami/kubectl:latest
  script:
    # Configure kubectl to use the Rancher cluster API
    - kubectl config set-cluster rancher --server=$KUBE_SERVER --insecure-skip-tls-verify=true
    - kubectl config set-credentials gitlab-deploy --token=$KUBE_TOKEN
    - kubectl config set-context rancher --cluster=rancher --user=gitlab-deploy --namespace=$KUBE_NAMESPACE
    - kubectl config use-context rancher
    # Perform a rolling update of the deployment
    - kubectl set image deployment/my-app app=$IMAGE_TAG -n $KUBE_NAMESPACE
    # Wait for rollout to complete
    - kubectl rollout status deployment/my-app -n $KUBE_NAMESPACE
  environment:
    name: production
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
```

---

## Step 4: Verify the Integration

After pushing to `main`, confirm the deployment succeeded:

```bash
# Check that the new image is running
kubectl get deployment my-app -n my-app \
  -o jsonpath='{.spec.template.spec.containers[0].image}'

# View rollout history
kubectl rollout history deployment/my-app -n my-app
```

---

## Best Practices

- Use **environment-specific Rancher projects** to separate staging and production namespaces.
- Add a **manual approval gate** for production deploys using GitLab's `when: manual` directive.
- Rotate the service account token periodically and store it in a secrets manager.
- Enable **Rancher audit logging** to track all API calls made by GitLab CI.

---

## Monitoring Deployments

Once deployed, use [OneUptime](https://oneuptime.com) to monitor your application's uptime and set up alerts for deployment-related incidents. You can also correlate deployments with error spikes using OneUptime's status pages and on-call routing.
