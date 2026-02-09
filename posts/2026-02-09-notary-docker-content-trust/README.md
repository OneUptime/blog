# How to Configure Notary for Docker Content Trust in Kubernetes Image Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Kubernetes, Security

Description: Learn how to implement Notary and Docker Content Trust to cryptographically sign and verify container images in Kubernetes pipelines, ensuring image integrity and preventing tampering.

---

Container image security extends beyond vulnerability scanning. Even if an image is scanned and approved, how do you ensure that the exact same image is deployed to production? Without cryptographic signatures, images can be modified in transit or at rest. Notary and Docker Content Trust (DCT) solve this problem by providing a framework for signing and verifying images.

## Understanding Docker Content Trust

Docker Content Trust is Docker's implementation of The Update Framework (TUF), a specification for secure software distribution. DCT uses digital signatures to verify the publisher and integrity of images.

When DCT is enabled:
1. Publishers sign images with private keys after pushing
2. Signatures are stored in a Notary server
3. Clients verify signatures before pulling images
4. Only signed images from trusted publishers can be used

This creates a chain of custody from build time to runtime, ensuring that deployed images match exactly what was tested and approved.

## Why Notary Matters in Kubernetes

In Kubernetes environments, images flow through multiple stages: build, scan, test, staging, production. At each stage, you need confidence that images haven't been tampered with.

**Supply chain attacks** - An attacker who compromises a registry could replace legitimate images with malicious ones. Signatures detect this tampering.

**Insider threats** - Even with access controls, a malicious insider could push modified images. Signatures require access to private keys, adding a second factor.

**Compliance requirements** - Regulations like PCI-DSS and HIPAA increasingly require provenance tracking for software artifacts.

**Multi-tenant registries** - In shared registries, signatures prevent cross-contamination between projects.

## Deploying Notary Server

Notary consists of two components: the Notary server (stores signatures) and the Notary signer (signs metadata).

Deploy Notary on Kubernetes:

```yaml
# notary-deployment.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: notary-system
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: notary-server-config
  namespace: notary-system
data:
  server-config.json: |
    {
      "server": {
        "http_addr": ":4443",
        "tls_cert_file": "/certs/tls.crt",
        "tls_key_file": "/certs/tls.key"
      },
      "trust_service": {
        "type": "remote",
        "hostname": "notary-signer",
        "port": "7899",
        "tls_ca_file": "/certs/ca.crt"
      },
      "storage": {
        "backend": "postgres",
        "db_url": "postgres://notary:password@postgres:5432/notaryserver?sslmode=disable"
      },
      "auth": {
        "type": "token",
        "options": {
          "realm": "https://registry.example.com/service/token",
          "service": "notary-server",
          "issuer": "registry-token-issuer",
          "rootcertbundle": "/certs/root-ca.crt"
        }
      }
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notary-server
  namespace: notary-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: notary-server
  template:
    metadata:
      labels:
        app: notary-server
    spec:
      containers:
      - name: notary-server
        image: notary:server-0.7.0
        ports:
        - containerPort: 4443
          name: https
        volumeMounts:
        - name: config
          mountPath: /config
        - name: certs
          mountPath: /certs
        env:
        - name: NOTARY_SERVER_CONFIG_FILE
          value: /config/server-config.json
      volumes:
      - name: config
        configMap:
          name: notary-server-config
      - name: certs
        secret:
          secretName: notary-tls
---
apiVersion: v1
kind: Service
metadata:
  name: notary-server
  namespace: notary-system
spec:
  selector:
    app: notary-server
  ports:
  - port: 4443
    targetPort: 4443
    name: https
  type: ClusterIP
```

Deploy the Notary signer:

```yaml
# notary-signer-deployment.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: notary-signer-config
  namespace: notary-system
data:
  signer-config.json: |
    {
      "server": {
        "grpc_addr": ":7899",
        "tls_cert_file": "/certs/tls.crt",
        "tls_key_file": "/certs/tls.key",
        "client_ca_file": "/certs/ca.crt"
      },
      "storage": {
        "backend": "postgres",
        "db_url": "postgres://notary:password@postgres:5432/notarysigner?sslmode=disable"
      }
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notary-signer
  namespace: notary-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: notary-signer
  template:
    metadata:
      labels:
        app: notary-signer
    spec:
      containers:
      - name: notary-signer
        image: notary:signer-0.7.0
        ports:
        - containerPort: 7899
          name: grpc
        volumeMounts:
        - name: config
          mountPath: /config
        - name: certs
          mountPath: /certs
        env:
        - name: NOTARY_SIGNER_CONFIG_FILE
          value: /config/signer-config.json
      volumes:
      - name: config
        configMap:
          name: notary-signer-config
      - name: certs
        secret:
          secretName: notary-tls
---
apiVersion: v1
kind: Service
metadata:
  name: notary-signer
  namespace: notary-system
spec:
  selector:
    app: notary-signer
  ports:
  - port: 7899
    targetPort: 7899
    name: grpc
  type: ClusterIP
```

Apply the configurations:

```bash
kubectl apply -f notary-deployment.yaml
kubectl apply -f notary-signer-deployment.yaml
```

## Integrating Notary with Harbor

Harbor has built-in Notary integration. Enable it during deployment:

```yaml
# harbor-values.yaml with Notary
notary:
  enabled: true
  server:
    replicas: 2
  signer:
    replicas: 2

# Harbor will automatically configure itself to use Notary
```

Or enable Notary on an existing Harbor instance via the UI: Administration > Configuration > Project Creation > Content Trust.

## Signing Images in CI/CD Pipelines

Configure your CI/CD pipeline to sign images after successful builds and scans.

Generate signing keys:

```bash
# Initialize Docker Notary keys
export DOCKER_CONTENT_TRUST=1
export DOCKER_CONTENT_TRUST_SERVER=https://notary.example.com

# This generates keys on first push
docker trust key generate mykey

# Store keys securely (e.g., Vault, AWS Secrets Manager)
```

GitLab CI pipeline with image signing:

```yaml
# .gitlab-ci.yml
stages:
  - build
  - sign
  - deploy

variables:
  DOCKER_CONTENT_TRUST: "1"
  DOCKER_CONTENT_TRUST_SERVER: "https://notary.example.com"

build-image:
  stage: build
  script:
    - docker build -t registry.example.com/myapp:${CI_COMMIT_SHA} .
    - docker push registry.example.com/myapp:${CI_COMMIT_SHA}

sign-image:
  stage: sign
  script:
    # Import signing keys from CI/CD secrets
    - mkdir -p ~/.docker/trust/private
    - echo "$DOCKER_TRUST_KEY" | base64 -d > ~/.docker/trust/private/mykey.key
    - chmod 600 ~/.docker/trust/private/mykey.key

    # Sign the image
    - docker trust sign registry.example.com/myapp:${CI_COMMIT_SHA}

    # Verify signature
    - docker trust inspect registry.example.com/myapp:${CI_COMMIT_SHA}
  dependencies:
    - build-image

deploy-staging:
  stage: deploy
  script:
    # DCT will automatically verify signatures on pull
    - kubectl set image deployment/myapp \
        myapp=registry.example.com/myapp:${CI_COMMIT_SHA} \
        -n staging
```

## Enforcing Content Trust in Kubernetes

To prevent unsigned images from running, use admission controllers.

Deploy Connaisseur, a Kubernetes admission controller for image verification:

```bash
# Install Connaisseur via Helm
helm repo add connaisseur https://sse-secure-systems.github.io/connaisseur/charts
helm install connaisseur connaisseur/connaisseur \
  --create-namespace --namespace connaisseur
```

Configure Connaisseur to validate signatures:

```yaml
# connaisseur-values.yaml
application:
  validators:
  - name: default
    type: notaryv1
    host: notary.example.com
    trust_roots:
    - name: default
      key: |
        -----BEGIN PUBLIC KEY-----
        MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
        -----END PUBLIC KEY-----

  policy:
  - pattern: "registry.example.com/*:*"
    validator: default
    with:
      delegations: []
  - pattern: "*:*"
    validator: allow  # Allow other registries (or use deny)
```

Apply the configuration:

```bash
helm upgrade connaisseur connaisseur/connaisseur \
  -f connaisseur-values.yaml \
  -n connaisseur
```

Now, only signed images from registry.example.com can be deployed:

```bash
# This will succeed (signed image)
kubectl run signed-app --image=registry.example.com/myapp:v1.0

# This will fail (unsigned image)
kubectl run unsigned-app --image=registry.example.com/badapp:latest
# Error: image signature verification failed
```

## Using Sigstore Cosign as Alternative

Cosign from Sigstore project offers a simpler alternative to Notary:

```bash
# Install cosign
curl -sL https://github.com/sigstore/cosign/releases/download/v2.0.0/cosign-linux-amd64 \
  -o /usr/local/bin/cosign
chmod +x /usr/local/bin/cosign

# Generate key pair
cosign generate-key-pair

# Sign image
cosign sign --key cosign.key registry.example.com/myapp:v1.0

# Verify image
cosign verify --key cosign.pub registry.example.com/myapp:v1.0
```

Use Cosign with Kubernetes admission controller:

```yaml
# policy.yaml for Cosign verification
apiVersion: policy.sigstore.dev/v1beta1
kind: ClusterImagePolicy
metadata:
  name: require-signed-images
spec:
  images:
  - glob: "registry.example.com/**"
  authorities:
  - key:
      data: |
        -----BEGIN PUBLIC KEY-----
        MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
        -----END PUBLIC KEY-----
```

## Rotating Signing Keys

Key rotation is critical for long-term security:

```bash
# Generate new key
docker trust key generate newkey

# Add new key to repository
docker trust signer add --key newkey.pub newsigner \
  registry.example.com/myapp

# Sign with new key
docker trust sign registry.example.com/myapp:v2.0

# Remove old key after transition period
docker trust signer remove oldsigner registry.example.com/myapp
```

Update admission controller configurations with new public keys.

## Monitoring and Auditing

Track signature operations for compliance:

```bash
# Query Notary for signature history
curl -s https://notary.example.com/v2/registry.example.com/myapp/_trust/tuf/timestamp.json

# List all signers for a repository
docker trust inspect --pretty registry.example.com/myapp:v1.0
```

Set up alerts for:
- Unsigned image deployment attempts
- Signature verification failures
- Key expiration warnings
- Unauthorized signer additions

## Best Practices

**Automate signing in CI/CD** - Never allow manual image pushes without signatures in production pipelines.

**Use hardware security modules (HSM)** - Store root keys in HSMs for maximum security.

**Implement key rotation schedules** - Rotate signing keys quarterly or after personnel changes.

**Maintain key backup procedures** - Losing signing keys can lock you out of your own images.

**Test verification in lower environments** - Ensure admission controllers work correctly before enforcing in production.

**Document trust delegation** - Clearly define who can sign images for each repository.

## Conclusion

Docker Content Trust with Notary provides cryptographic assurance that deployed images match approved builds. By integrating signature verification into Kubernetes admission control, you create a mandatory checkpoint that blocks tampered or unauthorized images. This defense-in-depth approach complements vulnerability scanning and access controls, building a robust container security posture. As supply chain attacks become more sophisticated, image signing transitions from optional hardening to essential security practice.
