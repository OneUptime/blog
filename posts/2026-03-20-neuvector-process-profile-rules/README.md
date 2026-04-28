# How to Set Up NeuVector Process Profile Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Process Security, Container Security, Kubernetes, Runtime Security

Description: Learn how to configure NeuVector process profile rules to control which processes can run inside containers and block unauthorized execution.

## Introduction

Process profile rules are one of NeuVector's most powerful runtime security features. They define exactly which processes are permitted to run inside a container, enabling you to block malicious process execution, reverse shells, and cryptocurrency miners. This guide explains how to build and manage process profiles for your containerized workloads.

## Why Process Profiles Matter

When an attacker gains access to a container, they typically try to:
- Execute a shell (`/bin/bash`, `/bin/sh`)
- Run reconnaissance tools (`curl`, `wget`, `nmap`)
- Download and execute malware
- Escalate privileges using system utilities

By restricting process execution to only what the application needs, NeuVector's process profiles prevent these attack patterns even when a container is compromised.

## Prerequisites

- NeuVector installed with Enforcer running
- Workloads running in Discover mode for 24-48 hours
- NeuVector Manager access

## Step 1: Review Auto-Discovered Process Profiles

After the learning period, NeuVector builds a process whitelist automatically:

```bash
# Get the process profile for a group

curl -sk \
  "https://neuvector-manager:8443/v1/process_profile/nv.nginx.default" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.process_profile.process_list[] | {
    name: .name,
    path: .path,
    action: .action,
    type: .cfg_type
  }'
```

Example output:
```json
[
  {"name": "nginx", "path": "/usr/sbin/nginx", "action": "allow", "type": "learned"},
  {"name": "sh", "path": "", "action": "allow", "type": "learned"}
]
```

## Step 2: Add and Remove Processes via UI

1. Navigate to **Policy** > **Groups**
2. Select your workload group
3. Click the **Process Profile** tab
4. Review the auto-discovered process list
5. Remove processes that should not be allowed (e.g., shells)
6. Add any required processes that were not auto-discovered
7. Set the group mode to **Protect**

## Step 3: Configure Process Profiles via API

Fine-tune the process profile programmatically:

```bash
# Add a specific process to the allow list
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/process_profile/nv.nginx.default" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "process_profile_config": {
      "group": "nv.nginx.default",
      "process_change_list": [
        {
          "name": "nginx",
          "path": "/usr/sbin/nginx",
          "user": "nginx",
          "action": "allow"
        }
      ]
    }
  }'

# Explicitly deny shells
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/process_profile/nv.nginx.default" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "process_profile_config": {
      "group": "nv.nginx.default",
      "process_change_list": [
        {
          "name": "sh",
          "path": "/bin/sh",
          "action": "deny"
        }
      ]
    }
  }'
```

## Step 4: Define Process Profiles as CRDs

Manage process profiles declaratively:

```yaml
# process-profile-policy.yaml
apiVersion: neuvector.com/v1
kind: NvSecurityRule
metadata:
  name: nv.nginx.default
  namespace: default
spec:
  target:
    policymode: Protect
    selector:
      name: nv.nginx.default
      criteria:
        - key: service
          op: "="
          value: nginx.default
        - key: domain
          op: "="
          value: default
  process:
    - name: nginx
      path: /usr/sbin/nginx
      action: allow
    - name: nginx
      path: /usr/lib/nginx/modules
      action: allow
    # Deny common attack tools
    - name: sh
      path: /bin/sh
      action: deny
    - name: bash
      path: /bin/bash
      action: deny
    - name: curl
      path: /usr/bin/curl
      action: deny
    - name: wget
      path: /usr/bin/wget
      action: deny
    - name: nc
      path: /usr/bin/nc
      action: deny
    - name: python3
      path: /usr/bin/python3
      action: deny
```

```bash
kubectl apply -f process-profile-policy.yaml
```

## Step 5: Handle Process Profile for Workloads with Startup Scripts

Some workloads run additional processes during startup (init containers, migration scripts, entrypoint shells). Make sure these are included in the allow list so they aren't blocked in Protect mode:

```yaml
# Allow startup-time processes alongside the main application
apiVersion: neuvector.com/v1
kind: NvSecurityRule
metadata:
  name: nv.myapp.default
  namespace: default
spec:
  target:
    policymode: Protect
    selector:
      name: nv.myapp.default
      criteria:
        - key: service
          op: "="
          value: myapp.default
        - key: domain
          op: "="
          value: default
  process:
    # Main application process
    - name: myapp
      path: /app/myapp
      action: allow
    # Allow migration scripts that run briefly at startup
    - name: migrate
      path: /app/scripts/migrate.sh
      action: allow
    # Allow the shell used by the entrypoint
    - name: sh
      path: /bin/sh
      action: allow
```

## Step 6: Test Process Profile Enforcement

Validate that your process profile blocks unauthorized processes:

```bash
# Attempt to run a denied process (should be blocked in Protect mode)
kubectl exec -it <pod-name> -n default -- /bin/sh
# Expected: Process terminated and security event generated

# Check for generated security events (process violations are reported as incidents)
curl -sk \
  "https://neuvector-manager:8443/v1/log/incident" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.incidents[] | {
    container: .workload_name,
    process: .proc_name,
    path: .proc_path,
    action: .action,
    user: .proc_effective_user
  }'
```

## Step 7: Monitor Process Violations

Set up alerting for process violations to detect breach attempts:

```bash
# View process security events in real-time
# In the NeuVector UI: Notifications > Security Events > Filter: Process Violation

# Export events for SIEM integration
curl -sk \
  "https://neuvector-manager:8443/v1/log/incident" \
  -H "X-Auth-Token: ${TOKEN}" > process-events.json
```

## Step 8: Use Process Profiles in CI/CD

Generate process profiles from test environments and apply them to production:

```bash
#!/bin/bash
# generate-process-profile.sh
# Run this after your application has been exercised in staging

GROUP_NAME="nv.myapp.staging"

# Export the learned process profile
curl -sk \
  "https://neuvector-staging:8443/v1/process_profile/${GROUP_NAME}" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq '.process_profile' > profile-export.json

echo "Process profile exported. Review and apply to production."
```

## Conclusion

NeuVector process profile rules create a strong last line of defense for your containers. By explicitly whitelisting only the processes your application needs and denying everything else, you drastically reduce the blast radius of any container compromise. Combined with network rules and file access rules, process profiles form the core of NeuVector's zero-trust runtime security model.
