# How to Use Separation of Duties for Telemetry Data Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, RBAC, Security, Access Control

Description: Implement role-based access control and separation of duties for telemetry data pipelines using OpenTelemetry and Kubernetes RBAC.

Separation of duties is a core security principle: the people who generate telemetry data should not be the same people who can modify the collection pipeline or access raw telemetry in bulk. In practice, most teams give broad access to their observability stack and hope for the best. This post shows how to enforce proper separation of duties across your OpenTelemetry infrastructure.

## Defining the Roles

Before writing any configuration, map out the roles that interact with your telemetry system. A typical separation looks like this:

- **Pipeline Operators** - Can deploy and configure OTel Collectors, but cannot query backend data directly
- **Data Consumers** - Can query dashboards and run searches, but cannot modify pipeline configs
- **Data Auditors** - Can read access logs and compliance reports, but cannot modify any telemetry component
- **Platform Admins** - Can manage infrastructure, but telemetry access requires explicit approval

## Enforcing RBAC at the Collector Level

The OpenTelemetry Collector supports bearer token authentication on its receivers. Combined with an auth extension, you can restrict which services are allowed to send data.

```yaml
# otel-collector-rbac.yaml

# Collector config with OIDC-based authentication on receivers

extensions:
  # OIDC authenticator validates JWT tokens from sending services
  oidc:
    providers:
      - issuer_url: https://auth.internal.company.com
        audience: otel-collector

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        # Require OIDC authentication on all incoming data
        auth:
          authenticator: oidc

processors:
  # Copy JWT claims from the auth context into resource attributes
  resource/auth-claims:
    attributes:
      - key: auth.team
        action: upsert
        from_context: auth.claims.team
      - key: auth.environment
        action: upsert
        from_context: auth.claims.environment

connectors:
  # Route data based on the authenticated team claim
  routing/team:
    default_pipelines: [traces/general]
    table:
      - context: resource
        condition: attributes["auth.team"] == "payments"
        pipelines: [traces/payments]
      - context: resource
        condition: attributes["auth.team"] == "platform"
        pipelines: [traces/platform]

exporters:
  otlp/payments-backend:
    endpoint: tempo-payments.monitoring.svc:4317
    tls:
      cert_file: /certs/client.crt
      key_file: /certs/client.key

  otlp/platform-backend:
    endpoint: tempo-platform.monitoring.svc:4317
    tls:
      cert_file: /certs/client.crt
      key_file: /certs/client.key

  otlp/general-backend:
    endpoint: tempo-general.monitoring.svc:4317
    tls:
      cert_file: /certs/client.crt
      key_file: /certs/client.key

service:
  extensions: [oidc]
  pipelines:
    traces/in:
      receivers: [otlp]
      processors: [resource/auth-claims]
      exporters: [routing/team]
    traces/payments:
      receivers: [routing/team]
      exporters: [otlp/payments-backend]
    traces/platform:
      receivers: [routing/team]
      exporters: [otlp/platform-backend]
    traces/general:
      receivers: [routing/team]
      exporters: [otlp/general-backend]
```

## Kubernetes RBAC for Pipeline Operators

Pipeline operators need access to manage Collector deployments but should not have access to query telemetry backends. Define a narrow ClusterRole for known Collector objects.

```yaml
# k8s-rbac-pipeline-operator.yaml
# Role that allows managing OTel Collector resources only
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: otel-pipeline-operator
rules:
  # Can manage OTel Collector deployments
  - apiGroups: ["apps"]
    resources: ["deployments", "daemonsets", "statefulsets"]
    verbs: ["get", "list", "watch", "update", "patch"]
    resourceNames: ["otel-collector", "otel-collector-agent", "otel-collector-gateway"]

  # Can manage collector ConfigMaps
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list", "watch", "update", "patch"]
    resourceNames: ["otel-collector-config"]

  # Can view pods for debugging, but not exec into them
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch"]

  # Explicitly NO access to secrets, services for backends, or exec
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: otel-pipeline-operators
subjects:
  - kind: Group
    name: "pipeline-operators"
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: otel-pipeline-operator
  apiGroup: rbac.authorization.k8s.io
```

## Restricting Backend Access for Data Consumers

Data consumers should query through Grafana, not directly hit backends. Use Kubernetes NetworkPolicy to enforce this.

```yaml
# network-policy-telemetry-backends.yaml
# Only allow Grafana and the Collector to reach Tempo/Prometheus/Loki
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: restrict-telemetry-backends
  namespace: monitoring
spec:
  podSelector:
    matchLabels:
      tier: telemetry-backend
  policyTypes:
    - Ingress
  ingress:
    # Allow ingest from OTel Collectors
    - from:
        - podSelector:
            matchLabels:
              app: otel-collector
      ports:
        - port: 4317
          protocol: TCP

    # Allow queries from Grafana only
    - from:
        - podSelector:
            matchLabels:
              app: grafana
      ports:
        - port: 3100  # Loki
          protocol: TCP
        - port: 9090  # Prometheus
          protocol: TCP
        - port: 3200  # Tempo
          protocol: TCP
```

## Grafana Data Source Permissions

Within Grafana Enterprise or Grafana Cloud, use data source permissions to restrict which teams can query which data sources.

```yaml
# grafana-provisioning/datasources/tempo.yaml
# Provision the data sources first
apiVersion: 1

datasources:
  - name: Tempo-Payments
    uid: tempo-payments
    type: tempo
    url: http://tempo-payments.monitoring.svc:3200
    access: proxy
    editable: false

  - name: Tempo-Platform
    uid: tempo-platform
    type: tempo
    url: http://tempo-platform.monitoring.svc:3200
    access: proxy
    editable: false
```

```bash
# Use the Grafana data source permissions API to grant query access.
# Replace the team IDs with the IDs from your Grafana organization.
GRAFANA_URL="https://grafana.internal.company.com"
GRAFANA_TOKEN="$GRAFANA_SERVICE_ACCOUNT_TOKEN"

curl -sS -X POST "$GRAFANA_URL/api/access-control/datasources/tempo-payments/teams/12" \
  -H "Authorization: Bearer $GRAFANA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"permission":"Query"}'

curl -sS -X POST "$GRAFANA_URL/api/access-control/datasources/tempo-payments/teams/34" \
  -H "Authorization: Bearer $GRAFANA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"permission":"Query"}'

curl -sS -X POST "$GRAFANA_URL/api/access-control/datasources/tempo-platform/teams/56" \
  -H "Authorization: Bearer $GRAFANA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"permission":"Query"}'

curl -sS -X POST "$GRAFANA_URL/api/access-control/datasources/tempo-platform/teams/34" \
  -H "Authorization: Bearer $GRAFANA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"permission":"Query"}'
```

## Auditing Role Usage

Separation of duties means nothing without proof it works. Run periodic checks to verify that RBAC bindings match your policy.

```bash
#!/bin/bash
# audit_rbac.sh
# Checks that no single user has both pipeline-operator and data-consumer roles

echo "=== RBAC Separation of Duties Audit ==="
echo "Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# Get all subjects bound to pipeline-operator role
OPERATORS=$(kubectl get clusterrolebinding otel-pipeline-operators \
  -o jsonpath='{.subjects[*].name}' 2>/dev/null)

# Get all subjects bound to data-consumer role
CONSUMERS=$(kubectl get clusterrolebinding telemetry-data-consumers \
  -o jsonpath='{.subjects[*].name}' 2>/dev/null)

# Check for overlaps
echo "Pipeline Operators: $OPERATORS"
echo "Data Consumers: $CONSUMERS"
echo ""

VIOLATIONS=0
for op in $OPERATORS; do
  for con in $CONSUMERS; do
    if [ "$op" = "$con" ]; then
      echo "VIOLATION: '$op' has both pipeline-operator and data-consumer roles"
      VIOLATIONS=$((VIOLATIONS + 1))
    fi
  done
done

if [ $VIOLATIONS -eq 0 ]; then
  echo "PASS: No separation of duties violations found"
else
  echo "FAIL: $VIOLATIONS violation(s) detected"
  exit 1
fi
```

## Wrapping Up

Separation of duties for telemetry data is about building layers of enforcement. Authentication on the Collector prevents unauthorized data submission. Kubernetes RBAC restricts who can change pipeline configurations. NetworkPolicy ensures backends are only reachable through approved paths. And Grafana RBAC controls who can query what data. No single layer is sufficient on its own, but together they create a defensible access control model that satisfies audit requirements. Start by defining your roles clearly, then implement controls at each layer.
