# How to Parse Kubernetes Audit Logs (JSON Format) with the Filelog Receiver and Extract Request Metadata

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kubernetes, Audit Logs, Security, Filelog Receiver

Description: Parse Kubernetes API server audit logs in JSON format using the OpenTelemetry filelog receiver and extract request metadata.

Kubernetes audit logs record every request made to the API server. They are essential for security monitoring, compliance, and debugging access issues. These logs are JSON-formatted and contain detailed request metadata including the user, resource, verb, and response status. Parsing them with the filelog receiver turns them into structured OpenTelemetry logs you can query and alert on.

## Kubernetes Audit Log Format

A typical audit log entry looks like this:

```json
{
  "kind": "Event",
  "apiVersion": "audit.k8s.io/v1",
  "level": "RequestResponse",
  "auditID": "abc-123-def",
  "stage": "ResponseComplete",
  "requestURI": "/api/v1/namespaces/default/pods",
  "verb": "list",
  "user": {
    "username": "system:serviceaccount:kube-system:default",
    "groups": ["system:serviceaccounts", "system:authenticated"]
  },
  "sourceIPs": ["10.0.0.1"],
  "userAgent": "kubectl/v1.28.0",
  "objectRef": {
    "resource": "pods",
    "namespace": "default",
    "apiVersion": "v1"
  },
  "responseStatus": {
    "metadata": {},
    "code": 200
  },
  "stageTimestamp": "2026-02-06T14:23:45.123456Z"
}
```

## Configuring the Filelog Receiver

```yaml
receivers:
  filelog/k8s-audit:
    include:
      - /var/log/kubernetes/audit/audit.log
    start_at: end
    operators:
      # Parse the JSON audit log entry
      - type: json_parser
        timestamp:
          parse_from: attributes.stageTimestamp
          layout: "%Y-%m-%dT%H:%M:%S.%LZ"

      # Extract key fields into well-named attributes
      - type: move
        from: attributes.verb
        to: attributes["k8s.audit.verb"]
      - type: move
        from: attributes.requestURI
        to: attributes["k8s.audit.request_uri"]
      - type: move
        from: attributes.stage
        to: attributes["k8s.audit.stage"]
      - type: move
        from: attributes.level
        to: attributes["k8s.audit.level"]
      - type: move
        from: attributes.auditID
        to: attributes["k8s.audit.id"]

      # Extract user information
      - type: move
        from: attributes["user.username"]
        to: attributes["k8s.audit.user"]
        if: 'attributes["user.username"] != nil'
      - type: move
        from: attributes.userAgent
        to: attributes["user_agent.original"]
        if: 'attributes.userAgent != nil'

      # Extract object reference
      - type: move
        from: attributes["objectRef.resource"]
        to: attributes["k8s.audit.resource"]
        if: 'attributes["objectRef.resource"] != nil'
      - type: move
        from: attributes["objectRef.namespace"]
        to: attributes["k8s.audit.namespace"]
        if: 'attributes["objectRef.namespace"] != nil'

      # Extract response status
      - type: move
        from: attributes["responseStatus.code"]
        to: attributes["k8s.audit.response_code"]
        if: 'attributes["responseStatus.code"] != nil'

      # Set severity based on response code
      - type: severity_parser
        parse_from: attributes["k8s.audit.response_code"]
        if: 'attributes["k8s.audit.response_code"] != nil'
        mapping:
          error: ["401", "403", "500", "502", "503"]
          warn: ["404", "409", "429"]
          info: ["200", "201", "204"]

      # Clean up nested objects we have already extracted from
      - type: remove
        field: attributes.stageTimestamp
      - type: remove
        field: attributes.user
        if: 'attributes.user != nil'
      - type: remove
        field: attributes.objectRef
        if: 'attributes.objectRef != nil'
      - type: remove
        field: attributes.responseStatus
        if: 'attributes.responseStatus != nil'
```

## Complete Collector Configuration

```yaml
receivers:
  filelog/k8s-audit:
    include:
      - /var/log/kubernetes/audit/audit.log
    start_at: end
    operators:
      - type: json_parser
        timestamp:
          parse_from: attributes.stageTimestamp
          layout: "%Y-%m-%dT%H:%M:%S.%LZ"
      - type: move
        from: attributes.verb
        to: attributes["k8s.audit.verb"]
      - type: move
        from: attributes.requestURI
        to: attributes["k8s.audit.request_uri"]
      - type: move
        from: attributes["user.username"]
        to: attributes["k8s.audit.user"]
        if: 'attributes["user.username"] != nil'
      - type: move
        from: attributes["objectRef.resource"]
        to: attributes["k8s.audit.resource"]
        if: 'attributes["objectRef.resource"] != nil'
      - type: move
        from: attributes["objectRef.namespace"]
        to: attributes["k8s.audit.namespace"]
        if: 'attributes["objectRef.namespace"] != nil'
      - type: move
        from: attributes["responseStatus.code"]
        to: attributes["k8s.audit.response_code"]
        if: 'attributes["responseStatus.code"] != nil'

processors:
  resource:
    attributes:
      - key: service.name
        value: "kube-apiserver"
        action: upsert
      - key: k8s.cluster.name
        value: "production"
        action: upsert

  # Filter out noisy audit events
  filter/reduce-noise:
    logs:
      exclude:
        match_type: regexp
        record_attributes:
          # Drop health check audit logs
          - key: k8s.audit.request_uri
            value: "^/healthz|^/readyz|^/livez"
          # Drop watch events (very high volume)
          - key: k8s.audit.verb
            value: "^watch$"

  batch:
    timeout: 5s

exporters:
  otlp:
    endpoint: "backend.internal:4317"

service:
  pipelines:
    logs:
      receivers: [filelog/k8s-audit]
      processors: [resource, filter/reduce-noise, batch]
      exporters: [otlp]
```

## Security-Focused Filtering

For security monitoring, you probably care most about specific audit events. Filter to keep only security-relevant ones:

```yaml
processors:
  filter/security-events:
    logs:
      include:
        match_type: regexp
        record_attributes:
          # Keep only authentication/authorization events
          - key: k8s.audit.verb
            value: "^(create|delete|patch|update)$"
          # Keep failed requests
          - key: k8s.audit.response_code
            value: "^(401|403|500)$"
```

## Monitoring for Privilege Escalation

Alert on specific patterns that might indicate privilege escalation:

```yaml
processors:
  transform/flag-escalation:
    log_statements:
      - context: log
        statements:
          # Flag ClusterRole and ClusterRoleBinding changes
          - set(attributes["security.alert"], "privilege_change") where attributes["k8s.audit.resource"] == "clusterroles" and attributes["k8s.audit.verb"] == "create"
          - set(attributes["security.alert"], "privilege_change") where attributes["k8s.audit.resource"] == "clusterrolebindings" and attributes["k8s.audit.verb"] == "create"
          # Flag secret access
          - set(attributes["security.alert"], "secret_access") where attributes["k8s.audit.resource"] == "secrets" and attributes["k8s.audit.verb"] == "get"
```

## Configuring the Kubernetes Audit Policy

To keep audit log volume manageable, configure the audit policy on your API server:

```yaml
# audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Log authentication failures at RequestResponse level
  - level: RequestResponse
    users: ["system:anonymous"]
  # Log secret access at Metadata level
  - level: Metadata
    resources:
      - group: ""
        resources: ["secrets"]
  # Log everything else at Request level
  - level: Request
    resources:
      - group: ""
```

Parsing Kubernetes audit logs with the filelog receiver gives you a powerful security monitoring capability. By extracting the right attributes and filtering for security-relevant events, you can build alerts on unauthorized access attempts, privilege escalation, and suspicious API usage patterns.
