# How to Scan Kubernetes Secrets with NeuVector - Scanning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Secrets Scanning, Kubernetes, Security, Compliance, Vulnerability, SUSE Rancher

Description: Learn how to use NeuVector to detect exposed secrets in Kubernetes workloads, environment variables, and container images to prevent credential leakage.

---

Exposed secrets in Kubernetes environments - API keys, passwords, certificates in environment variables, ConfigMaps, or container image layers - are a common cause of security breaches. NeuVector helps detect these exposures.

---

## How NeuVector Detects Exposed Secrets

NeuVector scans for secrets through:
1. **Container image scanning** - detects secrets embedded in image layers
2. **Runtime process monitoring** - detects sensitive data in process environment
3. **Compliance checks** - custom rules for secret detection
4. **Admission control** - blocks deployments that expose secrets in environment variables

---

## Step 1: Enable Secrets Detection in Image Scanning

NeuVector's registry scanner automatically checks for secrets in image layers as part of every registry scan:

1. In NeuVector UI, go to **Assets > Registries**
2. Click your registry and confirm scanning is configured
3. Run a scan or wait for the scheduled scan

Or trigger via API:

```bash
# Trigger a registry scan (secrets detection runs automatically)

curl -sk -X POST \
  -H "X-Auth-Token: $TOKEN" \
  https://neuvector.example.com/v1/scan/registry/<registry-name>/scan

# Check scan results for secret violations
curl -sk \
  -H "X-Auth-Token: $TOKEN" \
  https://neuvector.example.com/v1/scan/registry/<registry-name>/image/<image-id> \
  | jq '.report.secrets'
```

---

## Step 2: Create Admission Control Rule to Block Secret Exposure

Configure an admission control rule that blocks deployments with sensitive environment variable names:

```bash
# Create admission control rule via API
curl -sk -X POST \
  -H "X-Auth-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  https://neuvector.example.com/v1/admission/rule \
  -d '{
    "config": {
      "category": "Kubernetes",
      "comment": "Block deployments that expose API keys in env vars",
      "criteria": [
        {
          "name": "envVarSecrets",
          "op": "containsAny",
          "value": "AWS_SECRET_ACCESS_KEY,GITHUB_TOKEN,DATABASE_PASSWORD,API_KEY,PRIVATE_KEY",
          "type": "envVarSecrets"
        }
      ],
      "rule_type": "deny",
      "cfg_type": "user"
    }
  }'
```

---

## Step 3: Custom Compliance Check for Secret Detection

Create a custom compliance check that runs inside containers in a NeuVector group to detect exposed credentials. Custom checks are attached to a group via `PATCH /v1/custom_check/<group>`:

```bash
curl -sk -X PATCH \
  -H "X-Auth-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  https://neuvector.example.com/v1/custom_check/<group-name> \
  -d '{
    "config": {
      "update": {
        "group": "<group-name>",
        "scripts": [
          {
            "name": "no_aws_credentials",
            "script": "! (env | grep -qE \"AWS_SECRET|AWS_ACCESS_KEY\") && echo pass || echo fail"
          },
          {
            "name": "no_private_keys",
            "script": "! find /etc /app -name \"*.pem\" -o -name \"id_rsa\" 2>/dev/null | grep -q . && echo pass || echo fail"
          }
        ]
      }
    }
  }'
```

---

## Step 4: Monitor Process Environment for Secret Leakage

NeuVector's process monitor can alert when a process accesses sensitive files:

1. Go to **Policy > Groups > [Group] > Process Rules**
2. Add a rule that **monitors/denies** access to known secret paths:

```text
/run/secrets/
/etc/*.key
/etc/*.pem
~/.aws/credentials
```

---

## Step 5: Review Secret Exposure Reports

```bash
# Get the scan report for a specific workload (includes detected secrets)
curl -sk \
  -H "X-Auth-Token: $TOKEN" \
  https://neuvector.example.com/v1/scan/workload/<workload-id> \
  | jq '.report.secrets'

# Iterate over all workloads and report any with detected secrets
curl -sk -H "X-Auth-Token: $TOKEN" \
  https://neuvector.example.com/v1/workload \
  | jq -r '.workloads[].id' \
  | while read id; do
      curl -sk -H "X-Auth-Token: $TOKEN" \
        "https://neuvector.example.com/v1/scan/workload/$id" \
        | jq --arg id "$id" '(.report.secrets // []) | select(length > 0) | {workload: $id, secrets: .}'
    done
```

---

## Best Practices

- Use Kubernetes Secrets for credentials - never hardcode secrets in environment variables or ConfigMaps.
- Integrate NeuVector's registry scanner into your CI pipeline to catch secrets before images are pushed.
- Use External Secrets Operator with Vault or AWS Secrets Manager to inject secrets dynamically.
- Alert on any NeuVector secret detection event and treat it as a security incident.
