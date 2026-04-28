# How to Set Up NeuVector WAF Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, WAF, Web Application Firewall, Container Security, Kubernetes

Description: Configure NeuVector's Web Application Firewall rules to detect and block common web attacks like SQL injection, XSS, and OWASP Top 10 threats in containerized applications.

## Introduction

NeuVector includes a built-in Web Application Firewall (WAF) that operates at the container network level. Unlike traditional WAFs that sit in front of your infrastructure, NeuVector's WAF runs inside your Kubernetes cluster and inspects traffic between containers. It uses Deep Packet Inspection to detect and block OWASP Top 10 attacks and custom threat patterns.

## Prerequisites

- NeuVector with DPI enabled
- Workloads running in Monitor or Protect mode
- HTTP/HTTPS services to protect
- NeuVector Manager access

## Step 1: Enable WAF Sensors

NeuVector comes with built-in WAF sensors. Enable them for your workloads:

1. Navigate to **Policy** > **WAF Sensors** in the NeuVector UI
2. Review the built-in sensors available
3. Enable relevant sensors for your application type

Via API:

```bash
# List available WAF sensors

curl -sk \
  "https://neuvector-manager:8443/v1/waf/sensor" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.sensors[].name'
```

## Step 2: Create a Custom WAF Sensor

Define custom WAF rules for your application:

```bash
# Create a WAF sensor with SQL injection detection
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/waf/sensor" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "name": "owasp-top10",
      "comment": "OWASP Top 10 web attack patterns",
      "rules": [
        {
          "name": "sql-injection",
          "patterns": [
            {
              "key": "pattern",
              "op": "regex",
              "value": "(?i)(\\bselect\\b.+\\bfrom\\b|\\bunion\\b.+\\bselect\\b|\\bdrop\\b.+\\btable\\b|\\binsert\\b.+\\binto\\b)",
              "context": "url"
            },
            {
              "key": "pattern",
              "op": "regex",
              "value": "(?i)(\\bselect\\b.+\\bfrom\\b|\\bunion\\b.+\\bselect\\b|\\bdrop\\b.+\\btable\\b)",
              "context": "body"
            }
          ]
        },
        {
          "name": "xss-detection",
          "patterns": [
            {
              "key": "pattern",
              "op": "regex",
              "value": "(?i)<script[^>]*>[\\s\\S]*?</script>|javascript:|on\\w+\\s*=",
              "context": "url"
            },
            {
              "key": "pattern",
              "op": "regex",
              "value": "(?i)<script[^>]*>[\\s\\S]*?</script>",
              "context": "body"
            }
          ]
        },
        {
          "name": "path-traversal",
          "patterns": [
            {
              "key": "pattern",
              "op": "regex",
              "value": "\\.\\./|\\.\\.",
              "context": "url"
            }
          ]
        },
        {
          "name": "command-injection",
          "patterns": [
            {
              "key": "pattern",
              "op": "regex",
              "value": "(?i)(;\\s*\\w+|\\|\\s*\\w+|`[^`]*`|\\$\\([^)]*\\))",
              "context": "url"
            }
          ]
        }
      ]
    }
  }'
```

## Step 3: Create WAF Sensor for Common Web Attacks

Add additional sensors for other OWASP threats:

```bash
# Log4Shell detection
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/waf/sensor" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "name": "log4shell",
      "comment": "Log4j Log4Shell RCE detection",
      "rules": [
        {
          "name": "log4shell-jndi",
          "patterns": [
            {
              "key": "pattern",
              "op": "regex",
              "value": "\\$\\{jndi:",
              "context": "header"
            },
            {
              "key": "pattern",
              "op": "regex",
              "value": "\\$\\{jndi:",
              "context": "url"
            }
          ]
        }
      ]
    }
  }'
```

## Step 4: Apply WAF Sensors to Groups

Attach your WAF sensors to specific workload groups:

```bash
# Apply WAF sensor to a group
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/waf/group/nv.webapp.default" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "name": "nv.webapp.default",
      "status": true,
      "sensors": [
        {"name": "owasp-top10", "action": "deny"},
        {"name": "log4shell", "action": "deny"}
      ]
    }
  }'
```

In the UI:
1. Go to **Policy** > **Groups**
2. Select a group
3. Click the **WAF** tab
4. Click **Add Sensor**
5. Select the sensor and choose **Alert** or **Deny** action

## Step 5: Monitor WAF Events

Review WAF-generated security events:

```bash
# Get WAF security threats (WAF detections are reported as threats)
curl -sk \
  "https://neuvector-manager:8443/v1/log/threat" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.threats[] | {
    name: .name,
    server: .server_workload_name,
    client: .client_workload_name,
    source_ip: .client_ip,
    sensor: .sensor,
    group: .group,
    action: .action,
    severity: .severity,
    timestamp: .reported_at
  }'
```

In the UI:
1. Go to **Notifications** > **Security Events**
2. Filter by type: **WAF**
3. Review attack details including:
   - Source IP and container
   - Matched rule and pattern
   - Request URI and headers
   - Action taken

## Step 6: Configure WAF in CRD

Define WAF sensor assignments declaratively:

```yaml
# waf-policy.yaml
apiVersion: neuvector.com/v1
kind: NvSecurityRule
metadata:
  name: webapp-waf
  namespace: default
spec:
  target:
    policymode: Protect
    selector:
      name: nv.webapp.default
      criteria:
        - key: service
          op: =
          value: webapp.default
  waf:
    status: true
    settings:
      - name: owasp-top10
        action: deny
      - name: log4shell
        action: deny
```

```bash
kubectl apply -f waf-policy.yaml
```

## Step 7: Test WAF Rules

Validate WAF rules are working:

```bash
# Test SQL injection detection (from another pod)
kubectl run test-client --image=curlimages/curl --rm -it --restart=Never -- \
  curl -v "http://webapp.default.svc/search?q=SELECT+*+FROM+users"

# Expected: Connection blocked or alert generated

# Test XSS detection
kubectl run test-client --image=curlimages/curl --rm -it --restart=Never -- \
  curl -v "http://webapp.default.svc/page?name=<script>alert(1)</script>"
```

## Conclusion

NeuVector's WAF provides application-layer protection without requiring changes to your application code or routing infrastructure. By deploying WAF rules alongside your containerized workloads, you get real-time protection against the OWASP Top 10 and custom attack patterns. The inline, per-container model ensures that even internal service-to-service traffic is inspected, closing a gap that traditional perimeter WAFs leave open.
