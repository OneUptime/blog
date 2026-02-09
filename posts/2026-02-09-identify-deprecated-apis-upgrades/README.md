# How to Identify Deprecated APIs Before Kubernetes Version Upgrades

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Upgrades, API

Description: Identify and remediate deprecated Kubernetes APIs before cluster upgrades using pluto, kubent, and API server audit logs to prevent application breakage from removed API versions.

---

Kubernetes regularly deprecates and removes old API versions as part of its evolution. Upgrading to a version that has removed APIs your workloads depend on causes immediate failures. Proactive API deprecation scanning identifies problematic resources before upgrades, allowing time for remediation.

This guide demonstrates using multiple tools to scan for deprecated APIs, analyzing API server audit logs for usage patterns, and systematically migrating resources to supported API versions.

## Understanding API Deprecation Policy

Kubernetes follows a formal deprecation policy: API versions must be announced as deprecated for at least 12 months or three releases (whichever is longer) before removal. Beta APIs must exist for at least 9 months before deprecation.

When an API version is removed, resources using that version fail to be created or updated. Existing resources stored in etcd continue working until you attempt modifications, at which point you must migrate to the supported API version.

Common deprecations include extensions/v1beta1 Ingress (removed in 1.22), policy/v1beta1 PodDisruptionBudget (removed in 1.25), batch/v1beta1 CronJob (removed in 1.25), and various storage.k8s.io/v1beta1 resources.

## Using Pluto to Scan for Deprecated APIs

Pluto scans Kubernetes manifests and Helm releases for deprecated APIs.

```bash
# Install pluto
wget https://github.com/FairwindsOps/pluto/releases/download/v5.19.0/pluto_5.19.0_linux_amd64.tar.gz
tar -xvf pluto_5.19.0_linux_amd64.tar.gz
sudo mv pluto /usr/local/bin/
chmod +x /usr/local/bin/pluto

# Scan cluster for deprecated APIs
pluto detect-all-in-cluster --target-versions k8s=v1.28.0

# Scan specific namespace
pluto detect-all-in-cluster --namespace production --target-versions k8s=v1.28.0

# Scan local manifests
pluto detect-files -d ./kubernetes-manifests/ --target-versions k8s=v1.28.0

# Scan Helm releases
pluto detect-helm --target-versions k8s=v1.28.0

# Output as JSON for processing
pluto detect-all-in-cluster --target-versions k8s=v1.28.0 -o json > deprecated-apis.json
```

Example output:

```
NAME                KIND         VERSION              REPLACEMENT   REMOVED   DEPRECATED
cert-manager        Deployment   apps/v1beta2         apps/v1       1.16      1.9
ingress-nginx       Ingress      extensions/v1beta1   networking.k8s.io/v1   1.22   1.14
pdb-production      PodDisruptionBudget   policy/v1beta1   policy/v1   1.25   1.21
```

## Using kubent for Deprecation Detection

Kubent provides another perspective on deprecated API usage.

```bash
# Install kubent
sh -c "$(curl -sSL https://git.io/install-kubent)"

# Run scan
kubent

# Check specific API version
kubent -t 1.28

# Output as JSON
kubent -o json > kubent-report.json

# Exit with error if deprecated APIs found
kubent --exit-error
```

## Analyzing API Server Audit Logs

Enable audit logging to track actual API usage.

```yaml
# audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
# Log deprecated API usage at Metadata level
- level: Metadata
  omitStages:
  - RequestReceived
  resources:
  - group: "extensions"
    resources: ["ingresses", "deployments", "daemonsets", "replicasets"]
  - group: "apps"
    resources: ["deployments", "daemonsets", "replicasets", "statefulsets"]
    resourceNames: []
    namespaces: []
    verbs: ["create", "update", "patch"]
  - group: "batch"
    resources: ["cronjobs"]
  - group: "policy"
    resources: ["poddisruptionbudgets"]
```

For managed Kubernetes, enable audit logging through cloud provider tools.

Query audit logs for deprecated API usage:

```bash
# For self-managed clusters with audit logs
cat /var/log/kubernetes/audit.log | \
  jq 'select(.requestURI | contains("extensions/v1beta1") or contains("apps/v1beta1") or contains("apps/v1beta2"))' | \
  jq -r '[.verb, .requestURI, .user.username, .sourceIPs[0]] | @tsv'

# Count deprecated API calls by resource
cat /var/log/kubernetes/audit.log | \
  jq -r 'select(.requestURI | contains("/v1beta")) | .requestURI' | \
  sort | uniq -c | sort -rn
```

## Scanning Helm Charts

Identify deprecated APIs in Helm charts before deploying.

```bash
# Template Helm chart and scan
helm template my-release my-chart/ | pluto detect - --target-versions k8s=v1.28.0

# Check all deployed Helm releases
helm list -A -o json | \
  jq -r '.[] | "\(.name) -n \(.namespace)"' | \
  while read -r name ns; do
    echo "Checking $name in $ns"
    helm get manifest $name $ns | pluto detect -
  done
```

## Creating Automated Deprecation Scanning

Implement CI/CD checks for deprecated APIs.

```yaml
# .github/workflows/api-deprecation-check.yaml
name: Check API Deprecations
on: [pull_request]
jobs:
  check-deprecations:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Install Pluto
      run: |
        wget -q https://github.com/FairwindsOps/pluto/releases/download/v5.19.0/pluto_5.19.0_linux_amd64.tar.gz
        tar -xzf pluto_5.19.0_linux_amd64.tar.gz
        sudo mv pluto /usr/local/bin/

    - name: Scan manifests
      run: |
        pluto detect-files -d ./k8s/ --target-versions k8s=v1.28.0 --output markdown > pluto-report.md

    - name: Comment PR with results
      if: always()
      uses: actions/github-script@v6
      with:
        script: |
          const fs = require('fs');
          const report = fs.readFileSync('pluto-report.md', 'utf8');
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: '## API Deprecation Report\n\n' + report
          });

    - name: Fail if deprecated APIs found
      run: |
        if pluto detect-files -d ./k8s/ --target-versions k8s=v1.28.0 | grep -q "DEPRECATED"; then
          echo "Deprecated APIs found!"
          exit 1
        fi
```

## Generating Migration Reports

Create comprehensive reports for stakeholders.

```bash
#!/bin/bash
# generate-migration-report.sh

OUTPUT_FILE="api-migration-report-$(date +%Y%m%d).md"

cat > $OUTPUT_FILE <<EOF
# API Migration Report
Generated: $(date)
Target Kubernetes Version: 1.28

## Summary
EOF

# Count deprecated resources
DEPRECATED_COUNT=$(pluto detect-all-in-cluster --target-versions k8s=v1.28.0 -o json | jq '. | length')

echo "Total deprecated resources found: **$DEPRECATED_COUNT**" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

# Group by namespace
echo "## Deprecated Resources by Namespace" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

pluto detect-all-in-cluster --target-versions k8s=v1.28.0 -o json | \
  jq -r 'group_by(.namespace) | .[] | "### Namespace: \(.[0].namespace)\n\n| Name | Kind | Current API | Replacement | Removed In |\n|------|------|------------|-------------|------------|\n\(map("| \(.name) | \(.kind) | \(.api.version) | \(.api.replacement // "N/A") | \(.api.removedIn) |") | join("\n"))\n"' >> $OUTPUT_FILE

# Add remediation steps
cat >> $OUTPUT_FILE <<EOF

## Remediation Steps

1. For each deprecated resource, identify the replacement API version
2. Use kubectl-convert to migrate manifests (see migration guide)
3. Update source control with corrected manifests
4. Update Helm charts and operators
5. Redeploy applications with updated manifests
6. Verify functionality after migration

## Timeline

- Week 1: Review and plan migrations
- Week 2-3: Implement migrations in dev/staging
- Week 4: Production migration
- Week 5: Cluster upgrade

## Resources

- Kubernetes Deprecation Guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- API Migration Tool: kubectl-convert
EOF

echo "Report generated: $OUTPUT_FILE"
```

Run the report generator:

```bash
chmod +x generate-migration-report.sh
./generate-migration-report.sh
```

## Monitoring Deprecated API Usage

Set up alerts for deprecated API usage.

```yaml
# prometheus-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: deprecated-api-alerts
  namespace: monitoring
spec:
  groups:
  - name: deprecated-apis
    rules:
    - alert: DeprecatedAPIUsage
      expr: |
        sum by (group, version, resource) (
          apiserver_requested_deprecated_apis
        ) > 0
      labels:
        severity: warning
      annotations:
        summary: "Deprecated API {{ $labels.resource }}.{{ $labels.version }}.{{ $labels.group }} is being used"
        description: "Applications are using deprecated API {{ $labels.resource }}.{{ $labels.version }}.{{ $labels.group }} which will be removed in a future version"
```

Query deprecated API metrics:

```promql
# Count of deprecated API requests
sum by (group, version, resource) (apiserver_requested_deprecated_apis)

# Rate of deprecated API calls
rate(apiserver_request_total{deprecated="true"}[5m])
```

## Creating Deprecation Dashboard

Track deprecation metrics over time.

```json
{
  "dashboard": {
    "title": "API Deprecation Tracking",
    "panels": [
      {
        "title": "Deprecated API Request Rate",
        "targets": [{
          "expr": "rate(apiserver_request_total{deprecated=\"true\"}[5m])"
        }]
      },
      {
        "title": "Deprecated APIs by Version",
        "targets": [{
          "expr": "sum by (version) (apiserver_requested_deprecated_apis)"
        }]
      },
      {
        "title": "Top Clients Using Deprecated APIs",
        "targets": [{
          "expr": "topk(10, sum by (client) (rate(apiserver_request_total{deprecated=\"true\"}[5m])))"
        }]
      }
    ]
  }
}
```

Proactive identification of deprecated APIs prevents upgrade-induced outages. By combining static analysis tools like Pluto and kubent with runtime audit log analysis, you gain complete visibility into API version usage. Automated scanning in CI/CD pipelines ensures new code doesn't introduce deprecated API usage, while monitoring and alerting track production usage patterns. This multi-layered approach enables confident upgrades without surprise application failures.
