# How to Use Polaris to Audit Kubernetes Deployments for Best Practice Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Polaris, Audit, Best Practices, Security

Description: Learn how to use Polaris to audit Kubernetes deployments against best practices, identifying configuration issues around security, reliability, and efficiency.

---

Kubernetes deployments often violate best practices around security contexts, resource limits, and health checks. Polaris audits clusters and manifests against configurable best practices, generating reports that identify issues before they cause problems. This automated auditing ensures deployments meet organizational standards.

In this guide, we'll configure Polaris to audit clusters, customize checks for organizational requirements, integrate auditing into CI/CD pipelines, and establish automated compliance verification.

## Installing Polaris CLI

Install Polaris for local auditing:

```bash
# Install on macOS
brew install fairwindsops/tap/polaris

# Install on Linux
wget https://github.com/FairwindsOps/polaris/releases/download/8.5.0/polaris_linux_amd64.tar.gz
tar -xzf polaris_linux_amd64.tar.gz
sudo mv polaris /usr/local/bin/

# Verify installation
polaris version
```

## Auditing Kubernetes Manifests

Audit manifest files before deployment:

```bash
# Audit single file
polaris audit --audit-path deployment.yaml

# Audit directory
polaris audit --audit-path k8s/

# Generate JSON report
polaris audit --audit-path k8s/ --format json > report.json

# Set minimum score threshold
polaris audit --audit-path k8s/ --set-exit-code-on-danger
```

Example output shows violations:

```
Polaris audited 5 controllers and found:
  - 3 danger-level issues
  - 5 warning-level issues
  - 2 info-level issues

deployment/nginx [danger]:
  - Container does not have resource limits set
  - Container is running as root
  - Container does not have liveness probe
```

## Installing In-Cluster Dashboard

Deploy Polaris dashboard to cluster:

```bash
kubectl apply -f https://github.com/FairwindsOps/polaris/releases/latest/download/dashboard.yaml

# Access dashboard
kubectl port-forward --namespace polaris svc/polaris-dashboard 8080:80

# Open http://localhost:8080 in browser
```

The dashboard provides visual reports of cluster compliance with drill-down into specific violations.

## Configuring Custom Checks

Create custom Polaris configuration:

```yaml
# polaris-config.yaml
checks:
  # Security checks
  hostIPCSet: danger
  hostPIDSet: danger
  hostNetworkSet: warning
  runAsRootAllowed: danger
  readOnlyRootFilesystem: warning
  privilegeEscalationAllowed: danger

  # Resource checks
  cpuRequestsMissing: warning
  cpuLimitsMissing: warning
  memoryRequestsMissing: warning
  memoryLimitsMissing: warning

  # Reliability checks
  readinessProbeMissing: warning
  livenessProbeMissing: warning
  tagNotSpecified: danger

  # Efficiency checks
  pullPolicyNotAlways: ignore

exemptions:
  - namespace: kube-system
  - controllerNames:
    - dns-controller
    - kube-dns
```

Use custom configuration:

```bash
polaris audit --config polaris-config.yaml --audit-path k8s/
```

## Integrating into CI/CD Pipelines

Add Polaris to GitHub Actions:

```yaml
# .github/workflows/polaris-audit.yml
name: Polaris Audit

on: [pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2

    - name: Install Polaris
      run: |
        wget https://github.com/FairwindsOps/polaris/releases/download/8.5.0/polaris_linux_amd64.tar.gz
        tar -xzf polaris_linux_amd64.tar.gz
        sudo mv polaris /usr/local/bin/

    - name: Run Polaris audit
      run: |
        polaris audit \
          --audit-path k8s/ \
          --format pretty \
          --set-exit-code-on-danger

    - name: Upload report
      if: always()
      uses: actions/upload-artifact@v2
      with:
        name: polaris-report
        path: polaris-report.html
```

## Webhook Admission Controller

Deploy Polaris as admission webhook to block non-compliant resources:

```bash
# Install webhook
kubectl apply -f https://github.com/FairwindsOps/polaris/releases/latest/download/webhook.yaml

# Verify webhook is running
kubectl get validatingwebhookconfigurations polaris-webhook
```

Test webhook enforcement:

```yaml
# This deployment will be rejected
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: test
  template:
    metadata:
      labels:
        app: test
    spec:
      containers:
      - name: nginx
        image: nginx
        # Missing resource limits - will be rejected
```

```bash
kubectl apply -f test-deployment.yaml
# Error: admission webhook "polaris.fairwinds.com" denied the request
```

## Generating Compliance Reports

Create detailed reports:

```bash
# HTML report
polaris audit --audit-path k8s/ --format html > compliance-report.html

# JSON for programmatic processing
polaris audit --audit-path k8s/ --format json | jq '.Results[] | select(.Results | length > 0)'

# Summary statistics
polaris audit --audit-path k8s/ --format json | jq '{
  total: .Results | length,
  danger: [.Results[].Results[] | select(.Severity == "danger")] | length,
  warning: [.Results[].Results[] | select(.Severity == "warning")] | length
}'
```

## Fixing Common Violations

Add resource limits:

```yaml
containers:
- name: app
  image: myapp:latest
  resources:
    requests:
      cpu: "100m"
      memory: "128Mi"
    limits:
      cpu: "500m"
      memory: "512Mi"
```

Add health probes:

```yaml
containers:
- name: app
  livenessProbe:
    httpGet:
      path: /healthz
      port: 8080
    initialDelaySeconds: 30
  readinessProbe:
    httpGet:
      path: /ready
      port: 8080
    initialDelaySeconds: 5
```

Configure security context:

```yaml
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 2000
  containers:
  - name: app
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
```

## Conclusion

Polaris automates best practice auditing for Kubernetes deployments, catching configuration issues before they cause security vulnerabilities or reliability problems. Integration into CI/CD pipelines provides automated compliance gates while the admission webhook enforces standards at deployment time.

Regular auditing with Polaris ensures deployments meet organizational standards, identifies drift from best practices, and educates teams about proper Kubernetes configuration through actionable feedback.

For production use, customize Polaris checks to match organizational requirements, integrate auditing into every pull request, and use the admission webhook to enforce critical security and reliability standards.
