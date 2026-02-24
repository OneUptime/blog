# How to Set Up Runtime Security Monitoring for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Security, Runtime Monitoring, Falco, Kubernetes

Description: How to implement runtime security monitoring for Istio components using Falco, audit logs, and Prometheus alerting.

---

Static security configurations are important, but they only cover what you planned for. Runtime security monitoring catches the things you did not anticipate: unexpected process executions inside sidecar containers, unusual network connections from istiod, attempts to modify Istio configuration outside of normal deployment processes, and more.

This guide covers how to set up runtime security monitoring specifically for Istio components.

## What to Monitor

There are several categories of runtime events that matter for Istio security:

1. **Process execution** in Istio containers (istiod, sidecar proxies, gateways)
2. **Network connections** from Istio components to unexpected destinations
3. **File system modifications** inside Istio containers
4. **Kubernetes API calls** from Istio service accounts
5. **Configuration changes** to Istio CRDs
6. **Certificate operations** (issuance, rotation, expiration)

## Setting Up Falco

Falco is a runtime security tool that monitors system calls and Kubernetes audit events. It is the go-to tool for detecting anomalous behavior in containers.

Install Falco with Helm:

```bash
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm repo update

helm install falco falcosecurity/falco \
  --namespace falco \
  --create-namespace \
  --set falcosidekick.enabled=true \
  --set falcosidekick.webui.enabled=true
```

## Custom Falco Rules for Istio

Create custom rules that specifically monitor Istio components:

```yaml
# istio-falco-rules.yaml
- rule: Unexpected Process in Istio Proxy
  desc: Detect unexpected processes running in istio-proxy containers
  condition: >
    spawned_process
    and container
    and k8s.pod.label.security.istio.io/tlsMode exists
    and container.name = "istio-proxy"
    and not proc.name in (pilot-agent, envoy)
  output: >
    Unexpected process in istio-proxy container
    (command=%proc.cmdline pod=%k8s.pod.name namespace=%k8s.ns.name container=%container.name)
  priority: CRITICAL
  tags: [istio, process, security]

- rule: Unexpected Process in Istiod
  desc: Detect unexpected processes running in istiod containers
  condition: >
    spawned_process
    and container
    and container.image.repository contains "istio/pilot"
    and not proc.name in (pilot-discovery, istiod)
  output: >
    Unexpected process in istiod container
    (command=%proc.cmdline pod=%k8s.pod.name container=%container.name)
  priority: CRITICAL
  tags: [istio, process, security]

- rule: File Write in Istio Proxy
  desc: Detect file writes in istio-proxy containers outside expected paths
  condition: >
    open_write
    and container
    and container.name = "istio-proxy"
    and not fd.name startswith /etc/istio/proxy
    and not fd.name startswith /var/lib/istio
    and not fd.name startswith /tmp
    and not fd.name startswith /dev/null
  output: >
    Unexpected file write in istio-proxy
    (file=%fd.name pod=%k8s.pod.name command=%proc.cmdline)
  priority: WARNING
  tags: [istio, filesystem, security]

- rule: Istio Proxy Outbound Connection to Unknown
  desc: Detect istio-proxy connecting to non-mesh destinations on unexpected ports
  condition: >
    outbound
    and container
    and container.name = "istio-proxy"
    and fd.sport != 15001
    and fd.sport != 15006
    and fd.sport != 15021
    and fd.sport != 15090
    and not fd.sip in (rfc_1918_addresses)
  output: >
    Istio proxy connecting to external address
    (connection=%fd.name pod=%k8s.pod.name namespace=%k8s.ns.name)
  priority: WARNING
  tags: [istio, network, security]
```

Apply the custom rules:

```bash
kubectl create configmap istio-falco-rules \
  --from-file=istio-falco-rules.yaml \
  --namespace falco

# Update Falco to load custom rules
helm upgrade falco falcosecurity/falco \
  --namespace falco \
  --set falcosidekick.enabled=true \
  --set "extraVolumes[0].name=istio-rules" \
  --set "extraVolumes[0].configMap.name=istio-falco-rules" \
  --set "extraVolumeMounts[0].name=istio-rules" \
  --set "extraVolumeMounts[0].mountPath=/etc/falco/rules.d/istio-rules.yaml" \
  --set "extraVolumeMounts[0].subPath=istio-falco-rules.yaml"
```

## Kubernetes Audit Log Monitoring

Kubernetes audit logs capture API server interactions. Monitor these for suspicious Istio-related activity.

Configure audit policy for Istio resources:

```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
# Log all changes to Istio CRDs
- level: RequestResponse
  verbs: ["create", "update", "patch", "delete"]
  resources:
  - group: "networking.istio.io"
  - group: "security.istio.io"
  - group: "telemetry.istio.io"

# Log changes to webhook configurations
- level: RequestResponse
  verbs: ["update", "patch", "delete"]
  resources:
  - group: "admissionregistration.k8s.io"
    resources: ["mutatingwebhookconfigurations", "validatingwebhookconfigurations"]

# Log secret access in istio-system
- level: Metadata
  verbs: ["get", "list"]
  resources:
  - group: ""
    resources: ["secrets"]
  namespaces: ["istio-system"]

# Log all actions by Istio service accounts
- level: RequestResponse
  users:
  - "system:serviceaccount:istio-system:istiod"
  - "system:serviceaccount:istio-system:istio-ingressgateway"
```

## Prometheus-Based Runtime Alerts

Use Istio's built-in metrics for runtime security monitoring:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-runtime-security
  namespace: monitoring
spec:
  groups:
  - name: istio-security-runtime
    rules:
    # Alert on mTLS failures
    - alert: IstioMTLSHandshakeFailure
      expr: |
        sum(rate(envoy_cluster_ssl_connection_error[5m])) by (pod, namespace) > 5
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High rate of mTLS handshake failures in {{ $labels.namespace }}/{{ $labels.pod }}"

    # Alert on unexpected 403s (authorization failures)
    - alert: IstioUnexpectedAuthzDenials
      expr: |
        sum(rate(istio_requests_total{response_code="403", reporter="destination"}[5m]))
        by (destination_workload, destination_workload_namespace) > 10
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High rate of authorization denials for {{ $labels.destination_workload }}"

    # Alert on control plane config rejections
    - alert: IstioConfigRejections
      expr: |
        sum(rate(pilot_xds_cds_reject[5m])) > 0
        or sum(rate(pilot_xds_lds_reject[5m])) > 0
        or sum(rate(pilot_xds_rds_reject[5m])) > 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Istio control plane is rejecting proxy configurations"

    # Detect proxy version mismatch
    - alert: IstioProxyVersionMismatch
      expr: |
        count(count by (tag) (istio_build{component="proxy"})) > 1
      for: 30m
      labels:
        severity: warning
      annotations:
        summary: "Multiple proxy versions detected in the mesh"

    # Alert on certificate expiration
    - alert: IstioCertificateExpiringSoon
      expr: |
        (citadel_server_root_cert_expiry_timestamp - time()) < 86400 * 30
      for: 1h
      labels:
        severity: critical
      annotations:
        summary: "Istio root certificate expires in less than 30 days"
```

## Network Flow Monitoring

Monitor network flows to detect unusual patterns:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-access-logging
  namespace: istio-system
spec:
  accessLogging:
  - providers:
    - name: envoy
    filter:
      expression: |
        response.code >= 400 ||
        connection.mtls == false ||
        request.headers["x-forwarded-for"] != ""
```

This logs all error responses, non-mTLS connections, and requests with forwarded-for headers (which might indicate proxy bypass attempts).

## Detecting Configuration Drift

Monitor for unauthorized changes to Istio configuration:

```bash
#!/bin/bash
# Configuration drift detection script

EXPECTED_MTLS_MODE="STRICT"
EXPECTED_OUTBOUND_POLICY="REGISTRY_ONLY"

# Check mTLS mode
CURRENT_MTLS=$(kubectl get peerauthentication -n istio-system default -o jsonpath='{.spec.mtls.mode}' 2>/dev/null)
if [ "$CURRENT_MTLS" != "$EXPECTED_MTLS_MODE" ]; then
  echo "ALERT: mTLS mode changed from $EXPECTED_MTLS_MODE to $CURRENT_MTLS"
fi

# Check outbound policy
CURRENT_OUTBOUND=$(kubectl get cm istio -n istio-system -o json | \
  jq -r '.data.mesh' | grep -o 'REGISTRY_ONLY\|ALLOW_ANY')
if [ "$CURRENT_OUTBOUND" != "$EXPECTED_OUTBOUND_POLICY" ]; then
  echo "ALERT: Outbound policy changed from $EXPECTED_OUTBOUND_POLICY to $CURRENT_OUTBOUND"
fi

# Check webhook configurations
WEBHOOK_COUNT=$(kubectl get mutatingwebhookconfiguration istio-sidecar-injector -o json | \
  jq '.webhooks | length')
if [ "$WEBHOOK_COUNT" -ne 2 ]; then
  echo "ALERT: Unexpected number of webhook rules: $WEBHOOK_COUNT"
fi

# Check for new AuthorizationPolicies with ALLOW action and no rules
kubectl get authorizationpolicy --all-namespaces -o json | \
  jq '.items[] | select(.spec.action == "ALLOW" and (.spec.rules | length == 0)) |
    "ALERT: Open AuthorizationPolicy \(.metadata.name) in \(.metadata.namespace)"'
```

Run this as a CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: istio-drift-check
  namespace: monitoring
spec:
  schedule: "*/15 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: drift-checker
          containers:
          - name: checker
            image: bitnami/kubectl:latest
            command: ["/bin/bash", "/scripts/drift-check.sh"]
            volumeMounts:
            - name: scripts
              mountPath: /scripts
          volumes:
          - name: scripts
            configMap:
              name: drift-check-script
          restartPolicy: OnFailure
```

## Centralizing Security Events

Send all security events to a central SIEM or logging system:

```yaml
# Falco Sidekick configuration for forwarding events
config:
  elasticsearch:
    hostport: https://elasticsearch.monitoring:9200
    index: istio-security-events
  slack:
    webhookurl: https://hooks.slack.com/services/xxx/yyy/zzz
    channel: "#security-alerts"
    minimumpriority: "warning"
```

Runtime security monitoring for Istio is about layering multiple detection mechanisms: system call monitoring with Falco, API audit logging, Prometheus metric alerts, and configuration drift detection. Each layer catches different types of threats, and together they provide comprehensive visibility into the security state of your service mesh.
