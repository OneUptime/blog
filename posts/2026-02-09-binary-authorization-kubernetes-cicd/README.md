# How to Use Binary Authorization Policies for Kubernetes Deployments in CI/CD

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
  --set admissionController.replicas=3 \
  --set backgroundController.replicas=2 \
  --set cleanupController.replicas=2 \
  --set reportsController.replicas=2
```

Create a policy requiring signed images:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-image-signature
spec:
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
          failureAction: Enforce
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
      - uses: actions/checkout@v6

      - name: Install Cosign
        uses: sigstore/cosign-installer@v3

      - name: Login to Registry
        uses: docker/login-action@v4
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
          cosign sign --yes --key cosign.key \
            registry.example.com/myapp:${{ github.sha }}

      - name: Generate Attestation
        env:
          COSIGN_PASSWORD: ${{ secrets.COSIGN_PASSWORD }}
        run: |
          cosign attest --yes --key cosign.key \
            --predicate predicate.json \
            --type slsaprovenance \
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
# Attach predicate.json as an in-toto attestation
cosign attest --yes --key cosign.key \
  --predicate predicate.json \
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
  background: false
  rules:
    - name: require-signature
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
          failureAction: Enforce
          required: true
          attestors:
            - count: 1
              entries:
                - keys:
                    publicKeys: |-
                      -----BEGIN PUBLIC KEY-----
                      MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
                      -----END PUBLIC KEY-----

    - name: require-attestation
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
          failureAction: Enforce
          attestations:
            - predicateType: "https://slsa.dev/provenance/v0.2"
              attestors:
                - count: 1
                  entries:
                    - keys:
                        publicKeys: |-
                          -----BEGIN PUBLIC KEY-----
                          MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
                          -----END PUBLIC KEY-----
              conditions:
                - all:
                    - key: "{{ builder.id }}"
                      operator: Equals
                      value: "https://github.com/myorg/myrepo/actions/runs/123456"
                    - key: "{{ invocation.configSource.uri }}"
                      operator: Equals
                      value: "git+https://github.com/myorg/myrepo@refs/heads/main"

    - name: restrict-image-registry
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        failureAction: Enforce
        message: "All images must come from registry.example.com"
        foreach:
          - list: "request.object.spec.[initContainers, ephemeralContainers, containers][]"
            deny:
              conditions:
                any:
                  - key: "{{ element.image }}"
                    operator: NotIn
                    value:
                      - "registry.example.com/*"
```

## Using OPA Gatekeeper for Binary Authorization

Install OPA Gatekeeper:

```bash
helm repo add gatekeeper https://open-policy-agent.github.io/gatekeeper/charts
helm repo update
helm install gatekeeper gatekeeper/gatekeeper \
  --namespace gatekeeper-system \
  --create-namespace \
  --set enableExternalData=true
```

After deploying a Cosign external data provider named `cosign-provider`, create constraint template:

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
          properties: {}

  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package requireimagesignature

        images := [img | img := input.review.object.spec.containers[_].image]
        responses := external_data({"provider": "cosign-provider", "keys": images})

        violation[{"msg": msg}] {
          response := responses[_]
          response[2] != ""
          msg := sprintf("Image %v could not be verified: %v", [response[0], response[2]])
        }

        violation[{"msg": msg}] {
          response := responses[_]
          response[2] == ""
          response[1] != true
          msg := sprintf("Image %v is not signed by a trusted key", [response[0]])
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
    - cosign sign --yes --key env://COSIGN_KEY $IMAGE
    - |
      cat > predicate.json <<EOF
      {
        "buildType": "gitlab-ci",
        "pipeline": "$CI_PIPELINE_ID",
        "commit": "$CI_COMMIT_SHA",
        "ref": "$CI_COMMIT_REF_NAME"
      }
      EOF
    - cosign attest --yes --key env://COSIGN_KEY --predicate predicate.json --type custom $IMAGE

verify-signature:
  stage: verify
  image: gcr.io/projectsigstore/cosign:latest
  script:
    - cosign verify --key env://COSIGN_PUBLIC_KEY $IMAGE
    - cosign verify-attestation --key env://COSIGN_PUBLIC_KEY --type custom $IMAGE

deploy-production:
  stage: deploy
  script:
    - kubectl set image deployment/myapp myapp=$IMAGE -n production
  only:
    - main
  when: on_success
```

## Implementing Notary Project Signatures

Use Notation from the Notary Project for OCI-native signatures:

```bash
# Install notation CLI
curl -Lo notation.tar.gz https://github.com/notaryproject/notation/releases/download/v1.3.2/notation_1.3.2_linux_amd64.tar.gz
tar xvzf notation.tar.gz
sudo install -m 0755 notation /usr/local/bin/notation

# Generate signing key
notation cert generate-test --default "myapp-signer"

# Sign image
notation sign registry.example.com/myapp:latest

# Configure trust policy before verification
cat > trustpolicy.json <<EOF
{
  "version": "1.0",
  "trustPolicies": [
    {
      "name": "myapp-policy",
      "registryScopes": ["registry.example.com/myapp"],
      "signatureVerification": {
        "level": "strict"
      },
      "trustStores": ["ca:myapp-signer"],
      "trustedIdentities": ["*"]
    }
  ]
}
EOF
notation policy import trustpolicy.json

# Verify signature
notation verify registry.example.com/myapp:latest
```

Configure Ratify for verification:

```yaml
apiVersion: config.ratify.deislabs.io/v1beta1
kind: Verifier
metadata:
  name: verifier-notation
spec:
  name: notation
  artifactTypes: application/vnd.cncf.notary.signature
  parameters:
    verificationCertStores:
      certs:
        - myapp-ca
    trustPolicyDoc:
      version: "1.0"
      trustPolicies:
        - name: default
          registryScopes:
            - "*"
          signatureVerification:
            level: strict
          trustStores:
            - ca:certs
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
          failureAction: Enforce
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
          failureAction: Enforce
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
