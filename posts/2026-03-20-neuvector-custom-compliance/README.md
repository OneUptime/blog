# How to Configure NeuVector Custom Compliance Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Compliance, Custom Checks, Security, Kubernetes, CIS, SUSE Rancher

Description: Learn how to create and configure custom compliance checks in NeuVector to audit containers and hosts against your organization's specific security baselines and regulatory requirements.

---

NeuVector includes built-in CIS benchmark checks but also allows you to define custom compliance rules tailored to your organization's security policies, internal baselines, or industry-specific requirements.

---

## Built-in vs. Custom Compliance

| Type | Description |
|---|---|
| CIS Benchmarks | Docker, Kubernetes, Linux CIS checks |
| Custom | Organization-specific or regulatory checks |
| NIST | Maps to NIST 800-53 controls |
| PCI DSS | Payment card industry controls |

---

## Step 1: Create Custom Compliance Checks via API

NeuVector custom compliance checks are shell scripts attached to a group. Scripts run on the enforcer in the host's namespaces (for node groups like the predefined `nodes` group) or in the container context (for container groups). The exit code determines the result: `0` is `PASS`, non-zero is `WARN`, and an execution error is `ERROR`. Create a custom check by `PATCH`ing the target group:

```bash
# Add a custom compliance script to the predefined "nodes" group

curl -sk -X PATCH \
  -H "X-Auth-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  https://neuvector.example.com/v1/custom_check/nodes \
  -d '{
    "config": {
      "add": {
        "scripts": [
          {
            "name": "ensure_non_root",
            "script": "#!/bin/sh\n# Ensure host processes do not run as root\n[ $(id -u) -ne 0 ] && exit 0 || exit 1\n"
          }
        ]
      }
    }
  }'
```

The `name` must be unique within the group. Use `update` to change an existing script and `delete` to remove one. List configured scripts with `GET /v1/custom_check/<group>`.

---

## Step 2: Custom Check for Environment Variable Compliance

Attach a script to a container group (e.g., the predefined `containers` group, or a service group you have created) so the enforcer runs it against matching workloads. This script fails the check if `AWS_SECRET_ACCESS_KEY` is exposed in the container environment:

```bash
curl -sk -X PATCH \
  -H "X-Auth-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  https://neuvector.example.com/v1/custom_check/containers \
  -d '{
    "config": {
      "add": {
        "scripts": [
          {
            "name": "no_aws_secret_in_env",
            "script": "#!/bin/sh\n# Fail if AWS_SECRET_ACCESS_KEY is present in the container env\nenv | grep -q AWS_SECRET_ACCESS_KEY && exit 1 || exit 0\n"
          }
        ]
      }
    }
  }'
```

---

## Step 3: Custom Check for File Permission Compliance

```bash
curl -sk -X PATCH \
  -H "X-Auth-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  https://neuvector.example.com/v1/custom_check/nodes \
  -d '{
    "config": {
      "add": {
        "scripts": [
          {
            "name": "config_files_not_world_readable",
            "script": "#!/bin/sh\n# Fail if any /etc/*.conf file is world-readable\nfind /etc -maxdepth 2 -name \"*.conf\" -perm -o+r 2>/dev/null | grep -q . && exit 1 || exit 0\n"
          }
        ]
      }
    }
  }'
```

---

## Step 4: Run Compliance Scan

Custom scripts are executed automatically by the enforcer on its bench schedule once they are configured. To trigger a CIS benchmark run on a specific host on demand, use the per-host bench endpoints (these accept no request body):

```bash
# Look up the NeuVector host ID
HOST_ID=$(curl -sk -H "X-Auth-Token: $TOKEN" \
  https://neuvector.example.com/v1/host | jq -r '.hosts[0].id')

# Trigger the Kubernetes CIS benchmark for that host
curl -sk -X POST \
  -H "X-Auth-Token: $TOKEN" \
  https://neuvector.example.com/v1/bench/host/$HOST_ID/kubernetes

# Fetch the consolidated compliance report for that host
# (merges custom-host-checks, Docker CIS, and Kubernetes CIS results)
curl -sk \
  -H "X-Auth-Token: $TOKEN" \
  https://neuvector.example.com/v1/host/$HOST_ID/compliance \
  | jq '.items[] | select(.level == "ERROR") | {test: .test_number, desc: .description}'
```

For a cluster-wide view aggregated by check, use `GET /v1/compliance/asset`. For a per-workload view, use `GET /v1/workload/<container_id>/compliance`.

---

## Step 5: View and Report Compliance Status

In the NeuVector UI:

1. Go to **Security Risks > Compliance**
2. Filter by "Custom" to see your custom checks
3. Click **Generate Report** to export as PDF or CSV for auditors

---

## Best Practices

- Name custom-check scripts with a consistent prefix (e.g., `myorg_`) to distinguish them from built-in checks.
- Keep compliance scripts idempotent - they may run multiple times per day.
- Use exit codes deliberately: exit `0` for `PASS`, non-zero for `WARN`. Anything written to stdout/stderr is captured in the report message.
- Integrate compliance reports with your ticketing system (Jira, ServiceNow) for remediation tracking.
