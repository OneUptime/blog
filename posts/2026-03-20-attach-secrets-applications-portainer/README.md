# How to Attach Secrets to Applications in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Secret, Security, Configuration Management

Description: Learn how to create Kubernetes Secrets and securely attach them to applications in Portainer.

## What Are Kubernetes Secrets?

Kubernetes Secrets store sensitive data such as passwords, API tokens, TLS certificates, and SSH keys. Unlike ConfigMaps, Secrets are intended for confidential data, but base64 encoding does not encrypt them. By default, Secret objects are stored unencrypted unless you enable encryption at rest, and access should be restricted with RBAC. Portainer provides a UI to create and attach Secrets to applications.

## Creating a Secret in Portainer

1. Select your Kubernetes environment.
2. Go to **ConfigMaps & Secrets** and select the **Secrets** tab.
3. Click **Add with form**.
4. Select the secret type (`Opaque` for generic key-value secrets).
5. Enter a name, namespace, and key-value pairs.
6. Click **Create Secret**.

## Attaching a Secret to an Application

When deploying or editing an application in Portainer:

1. Open the application's form and scroll to the **Secrets** section.
2. Select the Secret you want to make available to the application.
3. Portainer exposes all keys from the Secret as environment variables by default; use **Override** if you need to mount keys as files instead.

## Usage Pattern 1: Single Key from Secret

```yaml
# Inject a single key from a Secret as an environment variable

env:
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: app-secrets         # Secret name
        key: db-password          # Key within the secret
```

## Usage Pattern 2: All Keys from Secret

```yaml
# Load all keys from a Secret as environment variables
envFrom:
  - secretRef:
      name: app-secrets
```

## Usage Pattern 3: Mount Secret as a File

For TLS certificates or SSH keys that must be file-based:

```yaml
spec:
  containers:
    - name: app
      volumeMounts:
        - name: tls-secret
          mountPath: /etc/ssl/app    # Mount path
          readOnly: true
  volumes:
    - name: tls-secret
      secret:
        secretName: app-tls-cert     # Secret containing the certificate files
```

## Creating Secrets via CLI

```bash
# Create a generic secret from literal values
kubectl create secret generic app-secrets \
  --from-literal=db-password=supersecretpassword \
  --from-literal=api-key=myapikey123 \
  --namespace=production

# Create a TLS secret from certificate files
kubectl create secret tls app-tls \
  --cert=fullchain.pem \
  --key=privkey.pem \
  --namespace=production

# Create a Docker registry pull secret
kubectl create secret docker-registry registry-pull \
  --docker-server=registry.mycompany.com \
  --docker-username=myuser \
  --docker-password=mypassword \
  --namespace=production
```

## Viewing Secret Values (Carefully)

```bash
# Get a secret's base64-encoded value
kubectl get secret app-secrets -n production \
  -o jsonpath="{.data['db-password']}"

# Decode it
kubectl get secret app-secrets -n production \
  -o jsonpath="{.data['db-password']}" | base64 -d
```

## Security Best Practices

- **Encrypt Secrets at rest**: Enable encryption at rest for Secret data in etcd, typically using the API server `EncryptionConfiguration`.
- **Use RBAC**: Restrict which service accounts and users can read Secrets.
- **Consider external secret managers**: Use Vault, AWS Secrets Manager, or GCP Secret Manager with the External Secrets Operator for production workloads.
- **Never commit plaintext Secrets to Git**: If you store secret-related manifests in Git, use an encrypted workflow such as Sealed Secrets instead.

## Conclusion

Portainer simplifies Secret management in Kubernetes by providing a UI for creation and attachment. Always follow security best practices and consider external secret management solutions for production environments.
