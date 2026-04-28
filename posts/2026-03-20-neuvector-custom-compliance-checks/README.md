# How to Configure NeuVector Custom Compliance Checks - Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Compliance, Custom Checks, Security Policy, Kubernetes

Description: Create organization-specific custom compliance checks in NeuVector to enforce internal security standards beyond the built-in CIS Benchmarks.

## Introduction

While NeuVector includes comprehensive CIS Benchmarks and regulatory framework checks, most organizations have additional internal security standards that need to be enforced. NeuVector's custom compliance check feature allows you to write shell scripts that run inside containers to verify your specific security requirements. This guide explains how to create, deploy, and manage custom compliance checks.

## How Custom Checks Work

Custom compliance checks are shell scripts that:
1. Run inside container groups
2. Return exit code 0 for pass, non-zero for fail
3. Output descriptive messages via stdout
4. Are evaluated against all containers in the target group

## Prerequisites

- NeuVector installed and running
- Groups defined for your workloads
- Knowledge of shell scripting
- NeuVector Manager access

## Step 1: Create a Simple Custom Check

A minimal compliance check script:

```bash
#!/bin/bash
# check-no-secrets-in-env.sh

# Checks that no passwords or secrets are exposed as environment variables

FAILED=0

# Check for suspicious environment variable names
for VAR_NAME in $(env | cut -d= -f1); do
  if echo "${VAR_NAME}" | grep -iE "password|secret|key|token|credential" > /dev/null; then
    echo "FAIL: Sensitive environment variable found: ${VAR_NAME}"
    FAILED=1
  fi
done

if [ "${FAILED}" -eq "0" ]; then
  echo "PASS: No sensitive environment variable names found"
fi

exit "${FAILED}"
```

## Step 2: Add Custom Check via API

```bash
# Create a custom compliance check for a group
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/custom_check/nv.webapp.production" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "add": {
        "scripts": [
          {
            "name": "check-no-secrets-in-env",
            "script": "#!/bin/sh\nFAILED=0\nfor VAR in $(env | cut -d= -f1); do\n  case $VAR in\n    *PASSWORD*|*SECRET*|*TOKEN*|*KEY*)\n      echo \"FAIL: Sensitive env var: $VAR\"\n      FAILED=1\n      ;;\n  esac\ndone\n[ $FAILED -eq 0 ] && echo \"PASS: No sensitive env vars detected\"\nexit $FAILED"
          }
        ]
      }
    }
  }'
```

## Step 3: Create Checks via UI

1. Navigate to **Policy** > **Groups**
2. Select a group
3. Click the **Custom Check** tab
4. Click **Add Script**
5. Enter:
   - **Name**: A descriptive name (e.g., `check-file-permissions`)
   - **Script**: The shell script to execute
6. Click **Add**

## Step 4: Common Custom Check Examples

### Check File Permissions

```bash
#!/bin/sh
# check-file-permissions.sh
# Verify critical files have correct permissions

FAILED=0

# Check that /app/config is not world-writable
if [ -d "/app/config" ]; then
  PERMS=$(stat -c "%a" /app/config)
  if echo "${PERMS}" | grep -E "^.{2}[2367]" > /dev/null; then
    echo "FAIL: /app/config is world-writable (${PERMS})"
    FAILED=1
  else
    echo "PASS: /app/config permissions are correct (${PERMS})"
  fi
fi

# Check that SSL private keys are not world-readable
for KEY_FILE in /app/certs/*.key /etc/ssl/private/*.key; do
  if [ -f "${KEY_FILE}" ]; then
    PERMS=$(stat -c "%a" "${KEY_FILE}")
    if echo "${PERMS}" | grep -E "[0-7][0-7][1-7]" > /dev/null; then
      echo "FAIL: ${KEY_FILE} is world-readable (${PERMS})"
      FAILED=1
    else
      echo "PASS: ${KEY_FILE} permissions OK (${PERMS})"
    fi
  fi
done

exit "${FAILED}"
```

### Check Non-Root User

```bash
#!/bin/sh
# check-non-root.sh
# Verify container is not running as root

CURRENT_USER=$(id -u)

if [ "${CURRENT_USER}" -eq "0" ]; then
  echo "FAIL: Container is running as root (uid=0)"
  exit 1
else
  echo "PASS: Container running as non-root user (uid=${CURRENT_USER})"
  exit 0
fi
```

### Check No Unnecessary Packages

```bash
#!/bin/sh
# check-no-debug-tools.sh
# Verify attack tools are not installed

FAILED=0
TOOLS="nmap netcat curl wget nc tcpdump strace gdb"

for TOOL in ${TOOLS}; do
  if which "${TOOL}" > /dev/null 2>&1; then
    echo "FAIL: Security tool found: ${TOOL} ($(which ${TOOL}))"
    FAILED=1
  fi
done

if [ "${FAILED}" -eq "0" ]; then
  echo "PASS: No unnecessary security tools found"
fi

exit "${FAILED}"
```

### Check Required Security Headers (Web Apps)

```bash
#!/bin/sh
# check-security-headers.sh
# Verify nginx/apache has security headers configured

FAILED=0

# Check nginx config for security headers
if [ -f "/etc/nginx/nginx.conf" ]; then
  for HEADER in "X-Frame-Options" "X-Content-Type-Options" "X-XSS-Protection"; do
    if ! grep -q "${HEADER}" /etc/nginx/nginx.conf /etc/nginx/conf.d/*.conf 2>/dev/null; then
      echo "FAIL: Missing security header: ${HEADER}"
      FAILED=1
    else
      echo "PASS: Security header configured: ${HEADER}"
    fi
  done
fi

exit "${FAILED}"
```

## Step 5: Create Checks for Multiple Groups

Apply the same checks to multiple groups:

```bash
#!/bin/bash
# apply-checks-to-groups.sh

GROUPS=("nv.webapp.production" "nv.api.production" "nv.backend.production")
CHECK_SCRIPT="#!/bin/sh\n# Standard organization check\nif [ \$(id -u) -eq 0 ]; then\n  echo FAIL: Running as root\n  exit 1\nfi\necho PASS: Non-root user\nexit 0"

for GROUP in "${GROUPS[@]}"; do
  echo "Adding check to ${GROUP}..."
  curl -sk -X PATCH \
    "https://neuvector-manager:8443/v1/custom_check/${GROUP}" \
    -H "Content-Type: application/json" \
    -H "X-Auth-Token: ${TOKEN}" \
    -d "{
      \"config\": {
        \"add\": {
          \"scripts\": [
            {
              \"name\": \"check-non-root\",
              \"script\": \"${CHECK_SCRIPT}\"
            }
          ]
        }
      }
    }"
done
```

## Step 6: View Custom Check Results

```bash
# Get the compliance report for a container and filter custom check results
curl -sk \
  "https://neuvector-manager:8443/v1/workload/<workload-id>/compliance" \
  -H "X-Auth-Token: ${TOKEN}" | jq '{
    checks: [.items[] | select(.category == "custom")],
    passed: [.items[] | select(.category == "custom" and .level == "PASS")] | length,
    failed: [.items[] | select(.category == "custom" and .level == "FAIL")] | length
  }'
```

In the UI:
1. Go to **Assets** > **Containers**
2. Click a container
3. Select the **Compliance** tab
4. Scroll to **Custom Checks** section

## Conclusion

Custom compliance checks extend NeuVector's built-in compliance capabilities to cover your organization's unique security requirements. By writing targeted shell scripts that validate specific security properties, you can automate enforcement of internal security standards, configuration baselines, and regulatory controls that aren't covered by CIS Benchmarks. Maintain your custom check scripts in version control and deploy them as part of your security-as-code practice.
