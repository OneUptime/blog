# How to Build Production Readiness Reviews for Kubernetes Deployments Using Automated Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Production Readiness, Automation, Best Practices

Description: Implement automated production readiness reviews that validate Kubernetes deployments against best practices before they reach production, preventing common configuration issues and improving reliability.

---

Deploying to production without proper validation leads to predictable failures. Misconfigured health checks, missing resource limits, inadequate replica counts, and other preventable issues cause outages that could have been caught before deployment. Production readiness reviews systematically check deployments against established criteria before allowing them into production environments.

Manual reviews are slow, inconsistent, and error-prone. Automated checks provide fast, reliable validation that catches issues immediately. By codifying your production standards into automated checks, you scale your review process and improve deployment quality across all teams.

The goal is creating a checklist of requirements that every production deployment must satisfy, then automating enforcement of these requirements through policy engines and CI/CD pipeline integration.

## Core Production Readiness Criteria

Every production-ready Kubernetes deployment should meet minimum standards for reliability and operability. Start by defining core criteria that apply across all services.

Essential checks include:

- Health check configuration (liveness, readiness, startup probes)
- Resource requests and limits defined
- Multiple replicas for availability
- Pod Disruption Budgets configured
- Security context constraints applied
- Appropriate labels and annotations
- Network policies defined
- Monitoring and alerting configured

Document these requirements clearly:

```markdown
# Production Readiness Checklist

## Required Configurations

### Health Checks
- [ ] Liveness probe configured with appropriate timeouts
- [ ] Readiness probe configured
- [ ] Startup probe configured for slow-starting applications
- [ ] Probe endpoints return correct status codes

### Resource Management
- [ ] CPU requests defined (minimum 100m)
- [ ] Memory requests defined (minimum 128Mi)
- [ ] CPU limits defined
- [ ] Memory limits defined
- [ ] Requests and limits are reasonable for workload

### High Availability
- [ ] Minimum 2 replicas configured
- [ ] Pod Disruption Budget exists
- [ ] Pod topology spread constraints configured
- [ ] Anti-affinity rules prevent single point of failure

### Security
- [ ] Non-root user specified
- [ ] Read-only root filesystem where possible
- [ ] Security context configured
- [ ] Secrets used for sensitive data
- [ ] Network policies restrict traffic

### Observability
- [ ] Prometheus metrics endpoint exposed
- [ ] Structured logging configured
- [ ] Distributed tracing enabled
- [ ] Service monitors configured
```

## Building Automated Validation with Conftest

Conftest uses Open Policy Agent (OPA) to validate Kubernetes manifests against policies written in Rego. This provides flexible, powerful validation that integrates easily into CI/CD pipelines.

Install Conftest:

```bash
# Install on macOS
brew install conftest

# Install on Linux
wget https://github.com/open-policy-agent/conftest/releases/latest/download/conftest_Linux_x86_64.tar.gz
tar xzf conftest_Linux_x86_64.tar.gz
sudo mv conftest /usr/local/bin/
```

Create a policy file enforcing production standards:

```rego
# policy/production.rego
package main

deny[msg] {
  input.kind == "Deployment"
  not input.spec.template.spec.containers[_].livenessProbe
  msg = "Deployment must have liveness probe configured"
}

deny[msg] {
  input.kind == "Deployment"
  not input.spec.template.spec.containers[_].readinessProbe
  msg = "Deployment must have readiness probe configured"
}

deny[msg] {
  input.kind == "Deployment"
  container := input.spec.template.spec.containers[_]
  not container.resources.requests.cpu
  msg = sprintf("Container %s must have CPU requests defined", [container.name])
}

deny[msg] {
  input.kind == "Deployment"
  container := input.spec.template.spec.containers[_]
  not container.resources.requests.memory
  msg = sprintf("Container %s must have memory requests defined", [container.name])
}

deny[msg] {
  input.kind == "Deployment"
  input.spec.replicas < 2
  msg = "Deployment must have at least 2 replicas for production"
}

warn[msg] {
  input.kind == "Deployment"
  container := input.spec.template.spec.containers[_]
  not container.resources.limits.memory
  msg = sprintf("Container %s should have memory limits defined", [container.name])
}

warn[msg] {
  input.kind == "Deployment"
  not input.spec.template.spec.securityContext
  msg = "Deployment should have security context configured"
}
```

Run validation against manifests:

```bash
# Test deployment manifest
conftest test deployment.yaml -p policy/

# Output shows violations
FAIL - deployment.yaml - main - Deployment must have liveness probe configured
FAIL - deployment.yaml - main - Container app must have CPU requests defined
WARN - deployment.yaml - main - Container app should have memory limits defined
```

## Implementing Validation with Kyverno

Kyverno provides Kubernetes-native policy management that validates, mutates, and generates resources. It is particularly well-suited for production readiness checks because it operates directly in-cluster.

Install Kyverno:

```bash
kubectl create -f https://github.com/kyverno/kyverno/releases/latest/download/install.yaml
```

Create a ClusterPolicy enforcing production standards:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: production-readiness
  annotations:
    policies.kyverno.io/title: Production Readiness Requirements
    policies.kyverno.io/category: Best Practices
    policies.kyverno.io/severity: high
spec:
  validationFailureAction: enforce
  background: true
  rules:
  - name: require-probes
    match:
      any:
      - resources:
          kinds:
          - Deployment
          namespaces:
          - production
    validate:
      message: "Liveness and readiness probes are required"
      pattern:
        spec:
          template:
            spec:
              containers:
              - livenessProbe:
                  httpGet:
                    path: "?*"
                    port: "?*"
                readinessProbe:
                  httpGet:
                    path: "?*"
                    port: "?*"

  - name: require-resources
    match:
      any:
      - resources:
          kinds:
          - Deployment
          namespaces:
          - production
    validate:
      message: "CPU and memory requests must be defined"
      pattern:
        spec:
          template:
            spec:
              containers:
              - resources:
                  requests:
                    memory: "?*"
                    cpu: "?*"
                  limits:
                    memory: "?*"
                    cpu: "?*"

  - name: require-multiple-replicas
    match:
      any:
      - resources:
          kinds:
          - Deployment
          namespaces:
          - production
    validate:
      message: "Production deployments must have at least 2 replicas"
      pattern:
        spec:
          replicas: ">=2"

  - name: require-pdb
    match:
      any:
      - resources:
          kinds:
          - Deployment
          namespaces:
          - production
    validate:
      message: "Production deployments must have a PodDisruptionBudget"
      deny:
        conditions:
          any:
          - key: "{{request.operation}}"
            operator: Equals
            value: CREATE
          - key: "{{request.operation}}"
            operator: Equals
            value: UPDATE
```

These policies automatically block deployments that violate production standards. Attempting to create a non-compliant deployment results in immediate rejection:

```bash
# Try to deploy without probes
kubectl apply -f bad-deployment.yaml

# Error output
Error from server: admission webhook "validate.kyverno.svc" denied the request:
resource Deployment/production/api-service was blocked due to the following policies
production-readiness:
  require-probes: validation error: Liveness and readiness probes are required
```

## CI/CD Pipeline Integration

Integrate production readiness checks into CI/CD pipelines to catch issues before deployment attempts. This provides fast feedback and prevents invalid manifests from reaching clusters.

GitHub Actions example:

```yaml
name: Production Readiness Check

on:
  pull_request:
    paths:
    - 'k8s/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Install Conftest
      run: |
        wget https://github.com/open-policy-agent/conftest/releases/latest/download/conftest_Linux_x86_64.tar.gz
        tar xzf conftest_Linux_x86_64.tar.gz
        chmod +x conftest
        sudo mv conftest /usr/local/bin/

    - name: Validate Kubernetes manifests
      run: |
        conftest test k8s/*.yaml -p policy/ --all-namespaces

    - name: Run kubeval
      run: |
        wget https://github.com/instrumenta/kubeval/releases/latest/download/kubeval-linux-amd64.tar.gz
        tar xzf kubeval-linux-amd64.tar.gz
        sudo mv kubeval /usr/local/bin/
        kubeval k8s/*.yaml

    - name: Check resource limits
      run: |
        # Custom script checking specific requirements
        ./scripts/check-resources.sh k8s/*.yaml
```

GitLab CI example:

```yaml
production-readiness:
  stage: validate
  image: ghcr.io/open-policy-agent/conftest:latest
  script:
    - conftest test k8s/*.yaml -p policy/
  only:
    changes:
      - k8s/**
  allow_failure: false
```

## Custom Validation Scripts

For checks not easily expressed in policy languages, write custom validation scripts:

```bash
#!/bin/bash
# check-production-readiness.sh

MANIFEST=$1
ERRORS=0

echo "Checking production readiness for $MANIFEST"

# Check for health probes
if ! grep -q "livenessProbe" $MANIFEST; then
  echo "ERROR: No liveness probe configured"
  ERRORS=$((ERRORS + 1))
fi

# Check replica count
REPLICAS=$(grep "replicas:" $MANIFEST | awk '{print $2}')
if [ "$REPLICAS" -lt 2 ]; then
  echo "ERROR: Replica count is $REPLICAS, minimum 2 required"
  ERRORS=$((ERRORS + 1))
fi

# Check for resource requests
if ! grep -q "requests:" $MANIFEST; then
  echo "ERROR: No resource requests configured"
  ERRORS=$((ERRORS + 1))
fi

# Check for PDB
DEPLOYMENT_NAME=$(grep "name:" $MANIFEST | head -1 | awk '{print $2}')
if ! kubectl get pdb -l app=$DEPLOYMENT_NAME >/dev/null 2>&1; then
  echo "WARNING: No PodDisruptionBudget found for $DEPLOYMENT_NAME"
fi

if [ $ERRORS -gt 0 ]; then
  echo "Production readiness check failed with $ERRORS errors"
  exit 1
fi

echo "Production readiness check passed"
```

## Generating Production Readiness Reports

Create comprehensive reports showing compliance status across all deployments:

```bash
#!/bin/bash
# generate-readiness-report.sh

echo "Production Readiness Report - $(date)"
echo "========================================"

kubectl get deployments --all-namespaces -o json | jq -r '
.items[] |
{
  namespace: .metadata.namespace,
  name: .metadata.name,
  replicas: .spec.replicas,
  has_liveness: (.spec.template.spec.containers[0].livenessProbe != null),
  has_readiness: (.spec.template.spec.containers[0].readinessProbe != null),
  has_requests: (.spec.template.spec.containers[0].resources.requests != null),
  has_limits: (.spec.template.spec.containers[0].resources.limits != null)
} |
"|\(.namespace)|\(.name)|\(.replicas)|\(.has_liveness)|\(.has_readiness)|\(.has_requests)|\(.has_limits)|"
' | column -t -s '|'
```

Schedule regular reports to track compliance over time and identify deployments needing updates.

Automated production readiness reviews transform deployment quality by catching configuration issues before they reach production. By codifying best practices into enforceable policies and integrating validation into deployment workflows, you build more reliable systems while reducing the operational burden on teams. The initial investment in creating these checks pays dividends through improved availability and reduced incident rates.
