# How to Set Up NeuVector Compliance Scanning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Compliance, Container Security, CIS Benchmark, Kubernetes

Description: Configure NeuVector's compliance scanning to automatically assess your Kubernetes cluster and containers against security standards and regulatory requirements.

## Introduction

NeuVector's compliance scanning evaluates your containers and Kubernetes cluster against established security benchmarks and regulatory frameworks. It runs CIS Benchmarks, Docker security checks, and custom compliance rules to identify configuration weaknesses and help you meet compliance requirements.

## Compliance Frameworks Supported

NeuVector covers these compliance standards:

- **CIS Kubernetes Benchmark** - Kubernetes cluster hardening
- **CIS Docker Benchmark** - Container host hardening
- **PCI DSS** - Payment card industry requirements
- **HIPAA** - Healthcare data protection
- **GDPR** - European data privacy regulation
- **NIST 800-190** - Application Container Security Guide

## Prerequisites

- NeuVector installed and running
- Enforcers running on all nodes
- NeuVector Manager access

## Step 1: Run a Compliance Scan

Trigger a compliance scan from the NeuVector UI:

1. Navigate to **Security Risks** > **Compliance**
2. Click **Scan** to start a new compliance check
3. Select the node(s) or workload(s) to scan
4. Wait for results (typically 1-5 minutes)

Via API (the REST API is served by the Controller on port 10443; port 8443 is the Manager web console):

```bash
# Look up the NeuVector host ID
NODE_ID=$(curl -sk \
  "https://neuvector-svc-controller:10443/v1/host" \
  -H "X-Auth-Token: ${TOKEN}" | jq -r '.hosts[0].id')

# Trigger the Docker CIS bench scan on that host
curl -sk -X POST \
  "https://neuvector-svc-controller:10443/v1/bench/host/${NODE_ID}/docker" \
  -H "X-Auth-Token: ${TOKEN}"

# Trigger the Kubernetes CIS bench scan on that host
curl -sk -X POST \
  "https://neuvector-svc-controller:10443/v1/bench/host/${NODE_ID}/kubernetes" \
  -H "X-Auth-Token: ${TOKEN}"
```

## Step 2: View Compliance Results

```bash
# List hosts to discover their NeuVector IDs
curl -sk \
  "https://neuvector-svc-controller:10443/v1/host" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.hosts[] | {id, name, state}'

# Get the consolidated compliance report for a specific host
# (merges custom-host-checks, Docker CIS, and Kubernetes CIS results)
curl -sk \
  "https://neuvector-svc-controller:10443/v1/host/${NODE_ID}/compliance" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.items[] |
    select(.level != "PASS" and .level != "NOTE") | {
      id: .test_number,
      description: .description,
      level: .level,
      category: .category,
      remediation: .remediation
    }'

# Or fetch only the Docker CIS bench report for that host
curl -sk \
  "https://neuvector-svc-controller:10443/v1/bench/host/${NODE_ID}/docker" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.items[]'
```

## Step 3: View Container Compliance Results

Check compliance status for individual containers:

```bash
# Get container compliance results
WORKLOAD_ID="abc123"
curl -sk \
  "https://neuvector-svc-controller:10443/v1/workload/${WORKLOAD_ID}/compliance" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.items[] | {
    test: .test_number,
    description: .description,
    level: .level,
    remediation: .remediation
  }'
```

In the UI:
1. Go to **Assets** > **Containers**
2. Click a container name
3. Select the **Compliance** tab
4. Review failed and warned checks

## Step 4: Configure Compliance Filters

Focus on specific compliance categories:

```bash
# Get results filtered by category (valid categories: docker, kubernetes, custom)
curl -sk \
  "https://neuvector-svc-controller:10443/v1/host/${NODE_ID}/compliance" \
  -H "X-Auth-Token: ${TOKEN}" | jq '[.items[] |
    select(.category == "kubernetes" and .level != "PASS")]'
```

## Step 5: Map Compliance Checks to Frameworks

View compliance results mapped to specific regulatory frameworks:

In the UI:
1. Go to **Security Risks** > **Compliance**
2. Use the **Filter** dropdown to select a framework:
   - **CIS**: CIS Benchmark checks only
   - **PCI**: PCI DSS relevant checks
   - **HIPAA**: HIPAA relevant checks

## Step 6: Configure Custom Compliance Checks

Add organization-specific compliance requirements:

```bash
# Add a custom compliance check to a service group
curl -sk -X PATCH \
  "https://neuvector-svc-controller:10443/v1/custom_check/nv.webapp.production" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "add": {
        "scripts": [
          {
            "name": "check-env-vars",
            "script": "#!/bin/bash\n# Check no passwords in env vars\nif env | grep -i -E \"password|secret|key\" | grep -v \"SECRET_FILE\" > /dev/null; then\n  exit 1\nfi\nexit 0"
          }
        ]
      }
    }
  }'
```

## Step 7: Schedule Automatic Compliance Scans

Configure recurring compliance scans:

```yaml
# compliance-scan-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: neuvector-compliance-scan
  namespace: neuvector
spec:
  schedule: "0 6 * * 1"  # Every Monday at 6 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: compliance-scanner
              image: alpine:3.19
              command:
                - /bin/sh
                - -c
                - |
                  apk add --no-cache curl jq

                  TOKEN=$(curl -sk -X POST \
                    "https://neuvector-svc-controller:10443/v1/auth" \
                    -H "Content-Type: application/json" \
                    -d '{"password":{"username":"admin","password":"'"${NV_PASSWORD}"'"}}' \
                    | jq -r '.token.token')

                  HOST_IDS=$(curl -sk \
                    "https://neuvector-svc-controller:10443/v1/host" \
                    -H "X-Auth-Token: ${TOKEN}" | jq -r '.hosts[].id')

                  for HOST_ID in $HOST_IDS; do
                    curl -sk -X POST \
                      "https://neuvector-svc-controller:10443/v1/bench/host/${HOST_ID}/docker" \
                      -H "X-Auth-Token: ${TOKEN}"
                    curl -sk -X POST \
                      "https://neuvector-svc-controller:10443/v1/bench/host/${HOST_ID}/kubernetes" \
                      -H "X-Auth-Token: ${TOKEN}"
                  done

                  echo "Compliance scan triggered"
              env:
                - name: NV_PASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: neuvector-credentials
                      key: password
          restartPolicy: OnFailure
```

```bash
kubectl apply -f compliance-scan-cronjob.yaml
```

## Step 8: Generate Compliance Reports

```bash
# Generate a cluster-wide compliance summary - one row per failing/warning check
curl -sk \
  "https://neuvector-svc-controller:10443/v1/compliance/asset" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq -r '"Test,Category,Level,Description,Nodes,Workloads",(
    .compliances[] |
    [.name, .category, .level, .description, (.nodes | length), (.workloads | length)] |
    @csv
  )' > compliance-report.csv

echo "Report saved to compliance-report.csv"
```

## Conclusion

NeuVector's compliance scanning provides automated, continuous assessment against industry security benchmarks and regulatory frameworks. By running regular compliance scans and remediating failed checks, you build a measurable, auditable security posture. Use the framework-specific filters to focus remediation efforts on the regulatory requirements most relevant to your industry, and combine compliance results with vulnerability data for a complete risk picture.
