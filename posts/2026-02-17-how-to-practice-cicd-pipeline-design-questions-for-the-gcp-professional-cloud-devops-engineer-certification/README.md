# How to Practice CI/CD Pipeline Design Questions for the GCP Professional Cloud DevOps Engineer Certification

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, CI/CD, Certification, Professional Cloud DevOps Engineer, Cloud Build, Deployment Strategies

Description: Practice guide for CI/CD pipeline design questions on the GCP Professional Cloud DevOps Engineer certification exam covering Cloud Build, deployment strategies, and release management.

---

CI/CD pipeline design is one of the heaviest topics on the GCP Professional Cloud DevOps Engineer exam. The questions go beyond basic "how to set up Cloud Build" and into real architectural decisions - choosing deployment strategies, handling rollbacks, managing secrets in pipelines, and designing for multiple environments. You need to know not just how to build pipelines, but why you would design them a certain way.

Here is a structured approach to studying CI/CD for this exam, with practice scenarios that mirror what you will actually see.

## Core GCP CI/CD Services

Know these services and when to use each:

**Cloud Build**: Serverless CI/CD that executes build steps in containers. Handles building, testing, and deploying.

**Artifact Registry**: Stores Docker images, language packages (npm, Maven, Python), and OS packages. Replaces Container Registry.

**Cloud Deploy**: Managed continuous delivery for GKE and Cloud Run. Handles progressive rollouts with approval gates.

**Binary Authorization**: Enforces that only signed container images can be deployed. Part of a secure software supply chain.

## Deployment Strategies

The exam tests all major deployment strategies. For each one, know how it works, when to use it, and how to implement it on GCP.

### Rolling Update

Gradually replace old instances with new ones. Zero downtime but both versions run simultaneously during the rollout.

```yaml
# GKE deployment with rolling update strategy
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
spec:
  replicas: 6
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2        # Add up to 2 extra pods during rollout
      maxUnavailable: 1   # Allow 1 pod to be unavailable
  template:
    spec:
      containers:
        - name: api
          image: us-central1-docker.pkg.dev/my-project/apps/api:v2
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
```

**When to use**: Most common strategy. Good for stateless services where both versions can coexist.

### Blue-Green Deployment

Run two identical environments (blue and green). Deploy to the inactive one, test it, then switch traffic. Instant rollback by switching back.

```yaml
# Cloud Deploy delivery pipeline with blue-green strategy
apiVersion: deploy.cloud.google.com/v1
kind: DeliveryPipeline
metadata:
  name: api-pipeline
serialPipeline:
  stages:
    - targetId: staging
    - targetId: production
      strategy:
        standard:
          verify: true  # Run verification tests after deployment
---
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: production
gke:
  cluster: projects/my-project/locations/us-central1/clusters/prod-cluster
```

For Cloud Run, blue-green is straightforward with traffic splitting:

```bash
# Deploy the new revision without routing traffic to it
gcloud run deploy api-service \
  --image=us-central1-docker.pkg.dev/my-project/apps/api:v2 \
  --region=us-central1 \
  --no-traffic

# After testing, shift all traffic to the new revision
gcloud run services update-traffic api-service \
  --region=us-central1 \
  --to-latest
```

**When to use**: When you need instant rollback capability and can afford running two full environments.

### Canary Deployment

Route a small percentage of traffic to the new version. Gradually increase if metrics look good.

```bash
# Route 10% of traffic to the new Cloud Run revision
gcloud run services update-traffic api-service \
  --region=us-central1 \
  --to-revisions=api-service-v2=10,api-service-v1=90

# After monitoring, increase to 50%
gcloud run services update-traffic api-service \
  --region=us-central1 \
  --to-revisions=api-service-v2=50,api-service-v1=50

# Full rollout
gcloud run services update-traffic api-service \
  --region=us-central1 \
  --to-latest
```

For GKE, use Istio or Anthos Service Mesh for traffic splitting:

```yaml
# Istio VirtualService for canary traffic splitting
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-service
spec:
  hosts:
    - api-service
  http:
    - route:
        - destination:
            host: api-service
            subset: v1
          weight: 90
        - destination:
            host: api-service
            subset: v2
          weight: 10
```

**When to use**: For high-risk changes where you want to validate with real traffic before full rollout.

### A/B Testing

Similar to canary but routes traffic based on user attributes (not random percentage). Used for testing features with specific user segments.

**When to use**: Product experimentation, not general deployments. Usually requires application-level routing.

## Secure Software Supply Chain

This is a major exam topic. Know the components:

### Binary Authorization

Ensures only trusted container images are deployed:

```bash
# Create a Binary Authorization policy
gcloud container binauthz policy import policy.yaml

# Example policy.yaml:
# defaultAdmissionRule:
#   evaluationMode: REQUIRE_ATTESTATION
#   enforcementMode: ENFORCED_BLOCK_AND_AUDIT_LOG
#   requireAttestationsBy:
#     - projects/my-project/attestors/build-attestor
```

### Attestation in Cloud Build

```yaml
# Cloud Build step to create an attestation after tests pass
steps:
  - name: 'gcr.io/cloud-builders/docker'
    id: 'build'
    args: ['build', '-t', '${_IMAGE}', '.']

  - name: 'gcr.io/cloud-builders/docker'
    id: 'test'
    args: ['run', '${_IMAGE}', 'npm', 'test']

  # Create an attestation only if tests pass
  - name: 'gcr.io/cloud-builders/gcloud'
    id: 'attest'
    args:
      - 'container'
      - 'binauthz'
      - 'attestations'
      - 'sign-and-create'
      - '--artifact-url=${_IMAGE}@${_DIGEST}'
      - '--attestor=build-attestor'
      - '--keyversion=projects/my-project/locations/global/keyRings/attestors/cryptoKeys/signing-key/cryptoKeyVersions/1'
```

### Vulnerability Scanning

```bash
# Enable on-push scanning for Artifact Registry
gcloud artifacts repositories update my-repo \
  --location=us-central1 \
  --enable-vulnerability-scanning

# Block images with critical vulnerabilities using Binary Authorization
# Configure the policy to require a vulnerability scan attestation
```

## Multi-Environment Pipelines

The exam expects you to design pipelines that promote through environments:

```yaml
# cloudbuild.yaml - Multi-environment promotion pipeline
steps:
  # Build and test
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', '${_IMAGE}:${SHORT_SHA}', '.']

  - name: 'gcr.io/cloud-builders/docker'
    args: ['run', '${_IMAGE}:${SHORT_SHA}', 'npm', 'test']

  # Push to Artifact Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '${_IMAGE}:${SHORT_SHA}']

  # Deploy to dev (automatic)
  - name: 'gcr.io/cloud-builders/gke-deploy'
    args:
      - 'run'
      - '--image=${_IMAGE}:${SHORT_SHA}'
      - '--cluster=dev-cluster'
      - '--location=us-central1'
      - '--namespace=default'

  # Deploy to staging (automatic after dev succeeds)
  - name: 'gcr.io/cloud-builders/gke-deploy'
    args:
      - 'run'
      - '--image=${_IMAGE}:${SHORT_SHA}'
      - '--cluster=staging-cluster'
      - '--location=us-central1'
      - '--namespace=default'

  # Production deployment uses Cloud Deploy for approval gates
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'deploy'
      - 'releases'
      - 'create'
      - 'release-${SHORT_SHA}'
      - '--delivery-pipeline=my-pipeline'
      - '--region=us-central1'
      - '--images=app=${_IMAGE}:${SHORT_SHA}'
```

## Secrets Management in Pipelines

Never hardcode secrets. Use Secret Manager:

```yaml
# Cloud Build with secrets from Secret Manager
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'my-image', '.']
    secretEnv: ['DB_PASSWORD', 'API_KEY']

availableSecrets:
  secretManager:
    - versionName: projects/my-project/secrets/db-password/versions/latest
      env: 'DB_PASSWORD'
    - versionName: projects/my-project/secrets/api-key/versions/latest
      env: 'API_KEY'
```

## Practice Scenarios

### Scenario 1: Safe Production Deployment

"Your team deploys to production twice a week. Occasionally a deployment causes issues that are not caught in staging. How do you reduce the blast radius?"

Answer: Implement canary deployments. Deploy to 5% of traffic first, monitor error rates and latency for 30 minutes, then gradually increase. Use Cloud Deploy with verify steps to automate the monitoring check.

### Scenario 2: Compliance Requirement

"Your organization requires that every container deployed to production has passed security scanning and been approved by the security team."

Answer: Set up Binary Authorization with attestation. Cloud Build creates a vulnerability scan attestation after scanning. The security team creates a manual approval attestation. The Binary Authorization policy requires both attestations before allowing deployment.

### Scenario 3: Rollback Strategy

"A deployment to GKE caused a 10% increase in error rate. What is the fastest way to roll back?"

Answer: `kubectl rollout undo deployment/my-service`. For Cloud Run, route traffic back to the previous revision. For Cloud Deploy, use the rollback command. The key is that rolling back should be a single command, not a full pipeline run.

### Scenario 4: Database Migration with Deployment

"Your deployment includes a database schema change. How do you handle this safely?"

Answer: Use backward-compatible schema changes. Add new columns without removing old ones. Deploy the new code that can work with both the old and new schema. After the deployment is stable, run a cleanup migration to remove the old columns. Never make breaking schema changes in the same deployment as code changes.

## Key Study Areas

1. **Know all deployment strategies** and when each is appropriate.
2. **Understand Cloud Deploy** for managed delivery with approval gates.
3. **Binary Authorization** for secure software supply chain.
4. **Secret management** in CI/CD pipelines.
5. **Rollback mechanisms** for each compute platform (GKE, Cloud Run, Compute Engine).
6. **Infrastructure as Code** integration (Terraform in Cloud Build).
7. **Testing strategies** (unit, integration, canary analysis).

## Wrapping Up

CI/CD pipeline design questions on the DevOps Engineer exam test your ability to build reliable, secure delivery systems. The exam favors answers that minimize blast radius (canary, progressive rollouts), enforce security (Binary Authorization, vulnerability scanning), and enable fast rollback (blue-green, traffic splitting). Practice designing pipelines that promote through environments with appropriate gates, and make sure you understand the trade-offs between different deployment strategies. The goal is not just getting code deployed, but getting it deployed safely and with confidence.
