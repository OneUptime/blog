# How to Configure Private Container Registries in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Private Registry, Container Images, Authentication, Kubernetes Security

Description: Step-by-step guide to configuring private container registries in Talos Linux with authentication, TLS, and troubleshooting tips.

---

Most production Kubernetes clusters pull images from private registries. Whether you use AWS ECR, Google Artifact Registry, Azure Container Registry, or a self-hosted solution, Talos Linux needs to know how to authenticate with these registries. Unlike traditional Linux distributions where you might configure Docker credentials in a file, Talos Linux handles private registry configuration through its machine configuration API.

This guide covers how to set up private container registries in Talos Linux, including authentication methods, TLS configuration, and common patterns for different registry providers.

## Machine-Level Registry Authentication

The most straightforward way to configure private registry access in Talos is through the machine configuration. This applies to all containers on the node, including system containers:

```yaml
machine:
  registries:
    config:
      my-registry.example.com:
        auth:
          username: deploy-bot
          password: "s3cur3-p@ssw0rd"
```

This configuration is applied to every node and allows containerd to pull images from the private registry without additional Kubernetes configuration.

## Configuring AWS ECR

Amazon Elastic Container Registry requires token-based authentication. ECR tokens expire every 12 hours, which makes static credentials impractical. Instead, you can use a credential helper or configure the registry at the Kubernetes level:

```yaml
# For ECR, it is better to use Kubernetes imagePullSecrets
# rather than machine-level config because tokens expire
machine:
  registries:
    mirrors:
      123456789012.dkr.ecr.us-east-1.amazonaws.com:
        endpoints:
          - https://123456789012.dkr.ecr.us-east-1.amazonaws.com
```

Then handle authentication through Kubernetes secrets:

```bash
# Get ECR login token
aws ecr get-login-password --region us-east-1 | \
  kubectl create secret docker-registry ecr-secret \
    --docker-server=123456789012.dkr.ecr.us-east-1.amazonaws.com \
    --docker-username=AWS \
    --docker-password-stdin
```

For automated token refresh, deploy a CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ecr-token-refresh
  namespace: kube-system
spec:
  schedule: "*/6 * * * *"  # Every 6 hours
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: ecr-refresh
          containers:
            - name: refresh
              image: amazon/aws-cli:latest
              command:
                - /bin/sh
                - -c
                - |
                  TOKEN=$(aws ecr get-login-password --region us-east-1)
                  kubectl delete secret ecr-secret -n default --ignore-not-found
                  kubectl create secret docker-registry ecr-secret \
                    --docker-server=123456789012.dkr.ecr.us-east-1.amazonaws.com \
                    --docker-username=AWS \
                    --docker-password=$TOKEN \
                    -n default
          restartPolicy: OnFailure
```

## Configuring Google Artifact Registry

For Google Artifact Registry, use a service account key:

```yaml
machine:
  registries:
    config:
      us-docker.pkg.dev:
        auth:
          username: _json_key
          password: |
            {
              "type": "service_account",
              "project_id": "my-project",
              "private_key_id": "key-id",
              "private_key": "-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n",
              "client_email": "registry-reader@my-project.iam.gserviceaccount.com",
              ...
            }
```

Alternatively, create a Kubernetes secret:

```bash
kubectl create secret docker-registry gcr-secret \
  --docker-server=us-docker.pkg.dev \
  --docker-username=_json_key \
  --docker-password="$(cat service-account.json)"
```

## Configuring Azure Container Registry

For Azure Container Registry with service principal authentication:

```yaml
machine:
  registries:
    config:
      myregistry.azurecr.io:
        auth:
          username: "service-principal-app-id"
          password: "service-principal-password"
```

## Self-Hosted Registry with TLS

For self-hosted registries using certificates from an internal CA:

```yaml
machine:
  registries:
    config:
      registry.internal.example.com:
        auth:
          username: deploy-user
          password: deploy-password
        tls:
          ca: |
            -----BEGIN CERTIFICATE-----
            MIIBhTCCASugAwIBAgIQQkY0IT2iWmRDNMWRNvfQdDAKBggqhkjOPQQDAjAjMSEw
            ...
            -----END CERTIFICATE-----
```

If the registry uses mutual TLS (mTLS), provide client certificates:

```yaml
machine:
  registries:
    config:
      registry.internal.example.com:
        tls:
          clientIdentity:
            crt: |
              -----BEGIN CERTIFICATE-----
              ...client cert...
              -----END CERTIFICATE-----
            key: |
              -----BEGIN EC PRIVATE KEY-----
              ...client key...
              -----END EC PRIVATE KEY-----
          ca: |
            -----BEGIN CERTIFICATE-----
            ...CA cert...
            -----END CERTIFICATE-----
```

## Kubernetes-Level Image Pull Secrets

In addition to machine-level configuration, you can use Kubernetes image pull secrets for more granular control:

```bash
# Create an image pull secret
kubectl create secret docker-registry my-registry-secret \
  --docker-server=registry.example.com \
  --docker-username=deploy-user \
  --docker-password=deploy-password \
  --namespace=my-app

# Attach to service account for automatic use
kubectl patch serviceaccount default -n my-app \
  -p '{"imagePullSecrets": [{"name": "my-registry-secret"}]}'
```

Reference it in pod specs:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
  namespace: my-app
spec:
  imagePullSecrets:
    - name: my-registry-secret
  containers:
    - name: app
      image: registry.example.com/my-app:v1.0.0
```

## Combining Machine and Kubernetes Auth

You can use both machine-level and Kubernetes-level authentication. Machine-level config is tried first, and Kubernetes image pull secrets provide additional credentials. This is useful when:

- Machine-level config handles system images and common registries
- Kubernetes secrets handle application-specific private registries

```yaml
# Machine config handles the base registries
machine:
  registries:
    config:
      ghcr.io:
        auth:
          username: org-bot
          password: github-pat-token
```

```bash
# Kubernetes secrets handle app-specific registries
kubectl create secret docker-registry app-registry \
  --docker-server=app-registry.example.com \
  --docker-username=app-deploy \
  --docker-password=app-token
```

## Applying and Testing

Apply the registry configuration:

```bash
# Apply to all nodes
talosctl apply-config --nodes 10.0.0.5 --file worker.yaml

# Test by pulling an image from the private registry
kubectl run test-pull \
  --image=registry.example.com/test-image:latest \
  --restart=Never

# Check if the pull succeeded
kubectl get pod test-pull
kubectl describe pod test-pull | grep -A 5 Events

# Clean up
kubectl delete pod test-pull
```

## Troubleshooting

When image pulls fail, diagnose step by step:

```bash
# Check containerd logs for authentication errors
talosctl logs containerd --nodes 10.0.0.5 | grep -i "auth\|401\|403\|denied"

# Verify the registry is reachable
talosctl logs containerd --nodes 10.0.0.5 | grep -i "dial\|connect\|timeout"

# Check TLS errors
talosctl logs containerd --nodes 10.0.0.5 | grep -i "tls\|x509\|certificate"
```

## Conclusion

Private container registries in Talos Linux can be configured at both the machine level and the Kubernetes level. Machine-level configuration is best for cluster-wide access to registries that all nodes need. Kubernetes image pull secrets work better for application-specific registries and registries with rotating credentials. For cloud provider registries like ECR, prefer Kubernetes secrets with automated token refresh. Always test your configuration on a single node before rolling it out cluster-wide.
