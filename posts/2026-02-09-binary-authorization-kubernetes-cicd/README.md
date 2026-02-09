# How to Implement Binary Authorization Policies for Kubernetes Deployments in CI/CD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, CI/CD, Binary Authorization, Supply Chain Security

Description: Implement binary authorization policies in Kubernetes CI/CD pipelines to ensure only verified, signed container images can be deployed to production clusters with attestation-based verification.

---

Binary authorization adds a critical security layer by ensuring only trusted container images run in your clusters. This policy-based approach verifies image signatures and attestations before allowing deployments, preventing unauthorized or vulnerable images from reaching production. This guide demonstrates implementing binary authorization in Kubernetes CI/CD workflows using multiple tools and strategies.

## Understanding Binary Authorization

Binary authorization validates deployments against policies before allowing them to proceed. These policies check cryptographic signatures, attestations, and metadata to verify image provenance and integrity. Authorization happens at deployment time through admission webhooks, creating an enforcement point that cannot be bypassed.

## Setting Up Kyverno for Binary Authorization

Kyverno provides policy-based validation for Kubernetes resources. Install it first:

```bash
# Install Kyverno using Helm
helm repo add kyverno https://kyverno.github.io/kyverno/
helm repo update

kubectl create namespace kyverno
helm install kyverno kyverno/kyverno \
  --namespace kyverno \
  --set replicaCount=3
```

Create a policy requiring signed images:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-image-signature
spec:
  validationFailureAction: Enforce
  background: false
  rules:
    - name: verify-signature
      match:
        any:
          - resources:
              kinds:
                - Pod
              namespaces:
                - production
      verifyImages:
        - imageReferences:
            - "registry.example.com/*"
          attestors:
            - count: 1
              entries:
                - keys:
                    publicKeys: |-
                      -----BEGIN PUBLIC KEY-----
                      MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
                      -----END PUBLIC KEY-----
```

## Integrating Cosign Signatures in CI

Sign images during the build process:

```yaml
# GitHub Actions workflow
name: Build and Sign
on: [push]

jobs:
  build-and-sign:
    runs-on: ubuntu-latest
    permissions:
      packages: write
      id-token: write

    steps:
      - uses: actions/checkout@v3

      - name: Install Cosign
        uses: sigstore/cosign-installer@v3

      - name: Login to Registry
        uses: docker/login-action@v2
        with:
          registry: registry.example.com
          username: ${{ secrets.REGISTRY_USERNAME }}
          password: ${{ secrets.REGISTRY_PASSWORD }}

      - name: Build Image
        run: |
          docker build -t registry.example.com/myapp:${{ github.sha }} .
          docker push registry.example.com/myapp:${{ github.sha }}

      - name: Sign Image with Cosign
        env:
          COSIGN_PASSWORD: ${{ secrets.COSIGN_PASSWORD }}
        run: |
          cosign sign --key cosign.key \
            registry.example.com/myapp:${{ github.sha }}

      - name: Generate Attestation
        run: |
          cosign attest --key cosign.key \
            --predicate attestation.json \
            registry.example.com/myapp:${{ github.sha }}
```

## Creating Attestation Predicates

Generate build attestations with metadata:

```json
{
  "builder": {
    "id": "https://github.com/myorg/myrepo/actions/runs/123456"
  },
  "buildType": "https://github.com/Attestations/GitHubActionsWorkflow@v1",
  "invocation": {
    "configSource": {
      "uri": "git+https://github.com/myorg/myrepo@refs/heads/main",
      "digest": {
        "sha1": "abc123..."
      },
      "entryPoint": ".github/workflows/build.yml"
    },
    "parameters": {},
    "environment": {
      "github_run_id": "123456",
      "github_actor": "username"
    }
  },
  "buildConfig": {},
  "metadata": {
    "buildStartedOn": "2026-02-09T10:00:00Z",
    "buildFinishedOn": "2026-02-09T10:15:00Z",
    "completeness": {
      "parameters": true,
      "environment": true,
      "materials": true
    },
    "reproducible": false
  },
  "materials": []
}
```

Create and attach attestation:

```bash
# Create attestation JSON
cat > attestation.json <<EOF
{
  "predicateType": "https://slsa.dev/provenance/v0.2",
  "predicate": $(cat predicate.json)
}
EOF

# Attach attestation
cosign attest --key cosign.key \
  --predicate attestation.json \
  --type slsaprovenance \
  registry.example.com/myapp:latest
```

## Implementing Policy-Based Verification

Create Kyverno policies with detailed requirements:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: binary-authorization-policy
spec:
  validationFailureAction: Enforce
  background: false
  rules:
    - name: require-signature-and-attestation
      match:
        any:
          - resources:
              kinds:
                - Pod
              namespaces:
                - production
      verifyImages:
        - imageReferences:
            - "registry.example.com/*"
          required: true
          attestors:
            - count: 1
              entries:
                - keys:
                    publicKeys: |-
                      -----BEGIN PUBLIC KEY-----
                      MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
                      -----END PUBLIC KEY-----
          attestations:
            - predicateType: "https://slsa.dev/provenance/v0.2"
              conditions:
                - all:
                    - key: "{{ builder.id }}"
                      operator: In
                      value:
                        - "https://github.com/*"
                    - key: "{{ invocation.configSource.uri }}"
                      operator: Equals
                      value: "git+https://github.com/myorg/myrepo*"

    - name: block-unsigned-images
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: "All images must be signed"
        deny:
          conditions:
            any:
              - key: "{{ request.object.spec.containers[].image }}"
                operator: NotIn
                value:
                  - "registry.example.com/*"
```

## Using OPA Gatekeeper for Binary Authorization

Install OPA Gatekeeper:

```bash
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/master/deploy/gatekeeper.yaml
```

Create constraint template:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: requireimagesignature
spec:
  crd:
    spec:
      names:
        kind: RequireImageSignature
      validation:
        openAPIV3Schema:
          type: object
          properties:
            allowedRegistries:
              type: array
              items:
                type: string

  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package requireimagesignature

        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not is_signed(container.image)
          msg := sprintf("Image %v is not signed", [container.image])
        }

        is_signed(image) {
          # Check signature via external data provider
          data.inventory.cluster.images[image].signed == true
        }
```

Apply constraint:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: RequireImageSignature
metadata:
  name: require-prod-signatures
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    namespaces:
      - production
  parameters:
    allowedRegistries:
      - "registry.example.com"
```

## Integrating with GitLab CI

Implement signing in GitLab pipelines:

```yaml
stages:
  - build
  - sign
  - verify
  - deploy

variables:
  IMAGE: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t $IMAGE .
    - docker push $IMAGE

sign-image:
  stage: sign
  image: gcr.io/projectsigstore/cosign:latest
  script:
    - cosign sign --key $COSIGN_KEY $IMAGE
    - |
      cat > attestation.json <<EOF
      {
        "buildType": "gitlab-ci",
        "pipeline": "$CI_PIPELINE_ID",
        "commit": "$CI_COMMIT_SHA",
        "ref": "$CI_COMMIT_REF_NAME"
      }
      EOF
    - cosign attest --key $COSIGN_KEY --predicate attestation.json $IMAGE

verify-signature:
  stage: verify
  image: gcr.io/projectsigstore/cosign:latest
  script:
    - cosign verify --key $COSIGN_PUBLIC_KEY $IMAGE
    - cosign verify-attestation --key $COSIGN_PUBLIC_KEY $IMAGE

deploy-production:
  stage: deploy
  script:
    - kubectl set image deployment/myapp myapp=$IMAGE -n production
  only:
    - main
  when: on_success
```

## Implementing Notary v2 Signatures

Use Notary v2 for OCI-native signatures:

```bash
# Install notation CLI
curl -Lo notation.tar.gz https://github.com/notaryproject/notation/releases/download/v1.0.0/notation_1.0.0_linux_amd64.tar.gz
tar xvzf notation.tar.gz

# Generate signing key
notation cert generate-test --default "myapp-signer"

# Sign image
notation sign registry.example.com/myapp:latest

# Verify signature
notation verify registry.example.com/myapp:latest
```

Configure Ratify for verification:

```yaml
apiVersion: config.ratify.deislabs.io/v1beta1
kind: Verifier
metadata:
  name: verifier-notaryv2
spec:
  name: notaryv2
  artifactTypes: application/vnd.cncf.notary.signature
  parameters:
    trustStores:
      - type: ca
        name: myapp-ca
    trustPolicy:
      type: signerInfo
      scope: "*"
      trustedIdentities:
        - "x509.subject: CN=myapp-signer"
```

## Creating Multi-Signer Policies

Require signatures from multiple parties:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: multi-signer-policy
spec:
  validationFailureAction: Enforce
  rules:
    - name: require-multiple-signatures
      match:
        any:
          - resources:
              kinds:
                - Pod
              namespaces:
                - production
      verifyImages:
        - imageReferences:
            - "registry.example.com/*"
          attestors:
            # Require signatures from both CI and security team
            - count: 2
              entries:
                - keys:
                    publicKeys: |-
                      -----BEGIN PUBLIC KEY-----
                      # CI signing key
                      MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
                      -----END PUBLIC KEY-----
                - keys:
                    publicKeys: |-
                      -----BEGIN PUBLIC KEY-----
                      # Security team signing key
                      MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
                      -----END PUBLIC KEY-----
```

## Monitoring Authorization Denials

Track policy violations:

```bash
# View Kyverno policy reports
kubectl get policyreport -A

# Check specific violations
kubectl get policyreport -n production -o yaml

# View admission controller logs
kubectl logs -n kyverno -l app.kubernetes.io/name=kyverno

# Create alert for denials
kubectl create -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: kyverno-alerts
data:
  alert.yaml: |
    groups:
      - name: kyverno
        rules:
          - alert: ImageSignatureViolation
            expr: increase(kyverno_policy_results_total{policy_result="fail"}[5m]) > 0
            annotations:
              summary: "Unsigned image deployment attempted"
EOF
```

## Handling Emergency Overrides

Create break-glass mechanism:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: binary-authorization-with-override
spec:
  validationFailureAction: Enforce
  rules:
    - name: verify-signature
      match:
        any:
          - resources:
              kinds:
                - Pod
              namespaces:
                - production
      exclude:
        any:
          - resources:
              annotations:
                emergency-override: "true"
              namespaces:
                - production
      verifyImages:
        - imageReferences:
            - "registry.example.com/*"
          attestors:
            - count: 1
              entries:
                - keys:
                    publicKeys: |-
                      -----BEGIN PUBLIC KEY-----
                      MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
                      -----END PUBLIC KEY-----
```

## Conclusion

Binary authorization provides strong assurance that only verified, trusted container images run in your Kubernetes clusters. By integrating signature verification into CI/CD pipelines and enforcing policies at deployment time, you create a comprehensive supply chain security solution. This approach prevents unauthorized deployments, ensures image integrity, and provides audit trails for compliance. Combined with proper key management and multi-party signing, binary authorization becomes a critical control for production Kubernetes environments.
