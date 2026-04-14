# How to Perform Security Scanning on Dapr Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Security, Scanning, DevSecOps, Kubernetes

Description: Learn how to perform security scanning on Dapr deployments using tools like Trivy, Kubesec, and Checkov to identify vulnerabilities and misconfigurations.

---

Security scanning of Dapr deployments identifies container vulnerabilities, Kubernetes misconfigurations, and Dapr-specific security issues. Integrating scanning into your CI/CD pipeline catches problems before they reach production.

## Container Image Scanning with Trivy

Scan the Dapr sidecar image and application images:

```bash
# Scan the Dapr sidecar image
trivy image daprio/daprd:1.13.0

# Scan your application image
trivy image myrepo/order-service:latest

# Fail pipeline if HIGH or CRITICAL vulnerabilities are found
trivy image --exit-code 1 --severity HIGH,CRITICAL myrepo/order-service:latest

# Generate a JSON report
trivy image --format json --output scan-results.json myrepo/order-service:latest
```

## Kubernetes Manifest Scanning with Kubesec

```bash
# Scan with kubesec hosted API
curl -sSX POST --data-binary @deployment.yaml https://v2.kubesec.io/scan

# Or run locally
docker run -i kubesec/kubesec:v2 scan /dev/stdin < deployment.yaml
```

A secure Dapr deployment manifest:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-service
spec:
  selector:
    matchLabels:
      app: secure-service
  template:
    metadata:
      labels:
        app: secure-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "secure-service"
        dapr.io/config: "security-config"
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 2000
      containers:
      - name: app
        image: myrepo/secure-service:latest
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop: ["ALL"]
        resources:
          limits:
            cpu: "500m"
            memory: "256Mi"
          requests:
            cpu: "100m"
            memory: "128Mi"
```

## Scanning Dapr Component Files with Checkov

```bash
# Install Checkov
pip install checkov

# Scan Dapr component YAML files
checkov -d ./components --framework kubernetes

# Custom check for plaintext secrets in Dapr components
cat > check_dapr_secrets.py << 'EOF'
from checkov.common.models.enums import CheckResult, CheckCategories
from checkov.kubernetes.checks.resource.base_spec_check import BaseK8Check

class DaprPlaintextSecret(BaseK8Check):
    def __init__(self):
        super().__init__(
            name="Dapr components should not contain plaintext passwords",
            check_id="CKV_DAPR_1",
            categories=[CheckCategories.SECRETS],
            supported_entities=["Component"]
        )

    def scan_spec_conf(self, conf):
        metadata = conf.get("spec", {}).get("metadata", [])
        for item in metadata:
            if "password" in item.get("name", "").lower():
                if "value" in item and "secretKeyRef" not in item:
                    return CheckResult.FAILED
        return CheckResult.PASSED
EOF
```

## Automated Security Scan Pipeline

```yaml
# .github/workflows/security-scan.yaml
name: Dapr Security Scan
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  image-scan:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Build image
      run: docker build -t myapp:${{ github.sha }} .
    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: myapp:${{ github.sha }}
        format: sarif
        output: trivy-results.sarif
        severity: HIGH,CRITICAL
        exit-code: 1
    - name: Upload Trivy scan results to GitHub Security tab
      uses: github/codeql-action/upload-sarif@v3
      if: always()
      with:
        sarif_file: trivy-results.sarif

  manifest-scan:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Scan Kubernetes manifests with Checkov
      uses: bridgecrewio/checkov-action@master
      with:
        directory: k8s/
        framework: kubernetes
        output_format: sarif
        output_file_path: checkov-results.sarif
        soft_fail: false
```

## Summary

Security scanning for Dapr deployments should include container image scanning (Trivy), Kubernetes manifest analysis (Kubesec, Checkov), and custom rules to detect Dapr-specific misconfigurations like plaintext credentials in components. Integrate all scans into CI/CD pipelines and treat HIGH/CRITICAL findings as pipeline blockers.
