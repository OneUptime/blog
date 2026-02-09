# How to Audit Kubernetes Cluster Security Posture with Kubescape Frameworks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Compliance

Description: Learn how to use Kubescape security frameworks to audit your Kubernetes cluster against NSA-CISA guidelines, MITRE ATT&CK, and CIS Benchmark standards.

---

Securing Kubernetes requires following established security frameworks and best practices. Manual audits are time-consuming and error-prone, making it difficult to maintain consistent security posture across clusters. Kubescape automates security auditing by scanning clusters against multiple frameworks including NSA-CISA Kubernetes Hardening Guidelines, MITRE ATT&CK for containers, and the CIS Kubernetes Benchmark.

This guide will show you how to use Kubescape to audit your cluster security posture, understand framework compliance scores, and remediate identified issues.

## Understanding Kubescape Frameworks

Kubescape includes several built-in security frameworks:

- **NSA-CISA**: Kubernetes Hardening Guidelines from the National Security Agency and Cybersecurity and Infrastructure Security Agency
- **MITRE ATT&CK**: Framework for understanding adversary tactics and techniques against containers
- **CIS Benchmark**: Center for Internet Security benchmark for Kubernetes
- **DevOps Best Practices**: General security best practices for Kubernetes deployments

Each framework contains specific controls that check different aspects of cluster security, from RBAC configuration to network policies and pod security settings.

## Installing Kubescape

Install the Kubescape CLI for ad-hoc scans:

```bash
# Install Kubescape CLI
curl -s https://raw.githubusercontent.com/kubescape/kubescape/master/install.sh | /bin/bash

# Verify installation
kubescape version

# Update to latest version
kubescape update
```

For continuous monitoring, install the Kubescape operator:

```bash
# Install operator with Helm
helm repo add kubescape https://kubescape.github.io/helm-charts/
helm repo update

helm install kubescape kubescape/kubescape-operator \
  --namespace kubescape \
  --create-namespace \
  --set clusterName="production-cluster"
```

## Running NSA-CISA Framework Scan

The NSA-CISA framework checks clusters against official government security guidelines:

```bash
# Scan cluster with NSA-CISA framework
kubescape scan framework nsa --verbose

# Save results to JSON
kubescape scan framework nsa --format json --output nsa-results.json

# Generate HTML report
kubescape scan framework nsa --format html --output nsa-report.html
```

The scan evaluates controls like:
- Non-root containers
- Immutable container filesystems
- Resource limits
- Network policy enforcement
- RBAC restrictions
- Audit logging configuration

Review the output to see which controls passed and failed:

```bash
# View summary
kubescape scan framework nsa --format pretty-printer | head -50

# Filter failed controls only
kubescape scan framework nsa --format json | \
  jq '.results[] | select(.status == "failed") | {name, severity}'
```

## Scanning Against MITRE ATT&CK Framework

MITRE ATT&CK framework focuses on adversary tactics and techniques:

```bash
# Scan with MITRE ATT&CK framework
kubescape scan framework mitre --verbose

# Focus on specific tactics
kubescape scan framework mitre --controls-config controls.yaml
```

The framework checks for vulnerabilities that attackers could exploit:
- Privileged container execution
- Host path mounts exposing sensitive files
- Insecure capabilities
- Service account token exposure
- Unrestricted network access

## Auditing Against CIS Kubernetes Benchmark

The CIS Benchmark provides detailed security configuration guidelines:

```bash
# Scan with CIS Benchmark
kubescape scan framework cis-v1.23-t1.0.1

# Scan specific namespace
kubescape scan framework cis-v1.23-t1.0.1 --include-namespaces production

# Exclude system namespaces
kubescape scan framework cis-v1.23-t1.0.1 --exclude-namespaces kube-system,kube-public
```

CIS controls cover:
- Control plane security
- Worker node configuration
- RBAC and service accounts
- Pod security policies/standards
- Network segmentation
- Secrets management

## Understanding Compliance Scores

Kubescape calculates a compliance score based on passed vs. failed controls:

```bash
# Get compliance score
kubescape scan framework nsa --format json | \
  jq '.summaryDetails.score'

# View detailed breakdown
kubescape scan framework nsa --format json | \
  jq '.summaryDetails | {
    score,
    passed: .controls.passed,
    failed: .controls.failed,
    total: .controls.total
  }'
```

A score above 80% indicates good security posture, but aim for 90%+ in production. Focus on fixing high and critical severity failures first.

## Scanning Specific Resources

Audit individual resources or resource types:

```bash
# Scan specific deployment
kubescape scan workload deployment/web-app -n production

# Scan all deployments
kubescape scan workload deployment --all-namespaces

# Scan YAML files before applying
kubescape scan *.yaml --format json --output results.json

# Scan Helm chart
helm template myapp ./mychart | kubescape scan -
```

This helps catch security issues before deploying resources to the cluster.

## Configuring Custom Control Thresholds

Adjust severity thresholds to match your requirements:

```yaml
# controls-config.yaml
controls:
  - controlID: C-0016
    name: Allow privilege escalation
    severity: Critical
    action: warn
  - controlID: C-0017
    name: Immutable container filesystem
    severity: High
    action: enforce
  - controlID: C-0034
    name: Automatic mapping of service account
    severity: Medium
    action: warn
```

Use the configuration file:

```bash
kubescape scan framework nsa --controls-config controls-config.yaml
```

## Setting Up Exceptions

Create exceptions for known acceptable deviations:

```yaml
# exceptions.yaml
exceptions:
  - name: "kube-system-privileged-pods"
    policyName: C-0016
    resources:
      - kind: DaemonSet
        name: kube-proxy
        namespace: kube-system
      - kind: DaemonSet
        name: calico-node
        namespace: kube-system
    justification: "System components require privileged access"

  - name: "monitoring-host-path"
    policyName: C-0048
    resources:
      - kind: DaemonSet
        name: node-exporter
        namespace: monitoring
    justification: "Node exporter needs host metrics access"
```

Apply exceptions:

```bash
kubescape scan framework nsa --exceptions exceptions.yaml --format pretty-printer
```

## Continuous Compliance Monitoring

Set up scheduled scans with the operator:

```yaml
# scheduled-scan.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubescape-scheduler
  namespace: kubescape
data:
  config.json: |
    {
      "scan": {
        "scanSchedule": "0 2 * * *",
        "frameworks": ["nsa", "mitre", "cis-v1.23-t1.0.1"],
        "scanScope": {
          "includeNamespaces": ["production", "staging"],
          "excludeNamespaces": ["kube-system"]
        }
      }
    }
```

Apply the configuration:

```bash
kubectl apply -f scheduled-scan.yaml

# Trigger immediate scan
kubectl exec -n kubescape deployment/kubescape-operator -- \
  kubescape scan framework nsa
```

## Viewing Historical Scan Results

Query past scans from the operator's storage:

```bash
# Get scan history
kubectl exec -n kubescape deployment/kubescape-storage -- \
  curl -s http://localhost:8080/v1/scans | jq '.scans[] | {date, score}'

# Compare scans over time
kubectl exec -n kubescape deployment/kubescape-storage -- \
  curl -s http://localhost:8080/v1/scans | \
  jq '.scans | sort_by(.date) | .[] | {date, score}'
```

## Integrating with CI/CD Pipelines

Fail builds that don't meet security requirements:

```yaml
# .github/workflows/security-scan.yml
name: Security Scan
on: [pull_request]

jobs:
  kubescape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Kubescape
        run: curl -s https://raw.githubusercontent.com/kubescape/kubescape/master/install.sh | /bin/bash

      - name: Scan manifests
        run: |
          kubescape scan framework nsa *.yaml \
            --format json \
            --output results.json \
            --fail-threshold 80

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: kubescape-results
          path: results.json
```

This prevents deploying resources that don't meet minimum security standards.

## Remediating Common Issues

Address frequent security findings:

```bash
# Issue: Containers running as root
# Fix: Add securityContext
kubectl patch deployment web-app -n production --type=json -p='[
  {
    "op": "add",
    "path": "/spec/template/spec/securityContext",
    "value": {"runAsNonRoot": true, "runAsUser": 1000}
  }
]'

# Issue: No resource limits
# Fix: Add limits
kubectl set resources deployment web-app -n production \
  --limits=cpu=500m,memory=512Mi \
  --requests=cpu=250m,memory=256Mi

# Issue: Privileged containers
# Fix: Remove privileged flag
kubectl patch deployment risky-app -n production --type=json -p='[
  {
    "op": "remove",
    "path": "/spec/template/spec/containers/0/securityContext/privileged"
  }
]'
```

## Generating Compliance Reports

Create reports for auditors and stakeholders:

```bash
# Generate PDF report
kubescape scan framework nsa --format pdf --output compliance-report.pdf

# Generate SARIF for GitHub Security
kubescape scan framework nsa --format sarif --output results.sarif

# Custom JSON processing for executive summary
kubescape scan framework nsa --format json | jq '{
  cluster: .clusterName,
  scanDate: .scanDate,
  score: .summaryDetails.score,
  criticalIssues: (.results[] | select(.severity == "Critical") | .name),
  highIssues: [.results[] | select(.severity == "High") | .name]
}'
```

## Monitoring Security Trends

Track security improvements over time:

```bash
# Export metrics to Prometheus
helm upgrade kubescape kubescape/kubescape-operator \
  --namespace kubescape \
  --reuse-values \
  --set prometheus.enabled=true

# Query metrics
curl -s http://kubescape-prometheus:8080/metrics | grep kubescape_
```

Create dashboards showing:
- Compliance score trends
- Number of critical/high findings
- Mean time to remediation
- Framework-specific scores

## Best Practices for Security Auditing

Run scans regularly to catch new issues as they're introduced. Start with one framework and gradually add others as you improve compliance. Prioritize fixing critical and high-severity issues that pose the greatest risk.

Document exceptions with clear justifications and review them quarterly. Integrate scanning into CI/CD to prevent introducing new security issues. Create separate exceptions files for different environments.

Set realistic compliance targets and track progress over time. Celebrate improvements to encourage security-conscious development. Use scan results to educate teams about Kubernetes security best practices.

Combine automated scanning with manual security reviews for comprehensive coverage. No automated tool catches everything, so supplement with periodic penetration testing and threat modeling.

## Conclusion

Kubescape provides comprehensive security auditing capabilities for Kubernetes clusters using industry-standard frameworks. By scanning against NSA-CISA guidelines, MITRE ATT&CK, and CIS Benchmark, you gain detailed visibility into your security posture and clear remediation guidance.

Start by running ad-hoc scans to establish a baseline. Deploy the operator for continuous monitoring and trend analysis. Integrate scanning into CI/CD pipelines to prevent new security issues. Focus on high-impact remediations that improve your compliance score.

Regular security audits using established frameworks help identify weaknesses before attackers exploit them. Combined with runtime security, network policies, and proper RBAC, framework-based auditing forms a critical part of your Kubernetes security strategy. The automated nature of Kubescape makes comprehensive security auditing accessible and sustainable.
