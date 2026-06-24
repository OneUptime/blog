# How to Validate Helm Chart IPv6 Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Helm, IPv6, Validation, JSON Schema, Testing

Description: Add JSON schema validation and helm lint rules to ensure IPv6 configuration in Helm charts is correct before deployment.

## Overview

Add a `values.schema.json` schema and use `helm lint` to ensure IPv6 configuration in Helm charts is correct before deployment.

## Helm Chart IPv6 Best Practices

When designing Helm charts for IPv6-ready deployments:
1. Use a top-level `ipv6` or `networking` section in values.yaml
2. Provide sensible defaults that work in both IPv4-only and dual-stack clusters
3. Use conditional templates to apply IPv6-specific config only when enabled
4. Document IPv6 configuration options with comments

## Example values.yaml Structure

```yaml
# values.yaml

# Network configuration

networking:
  # Enable IPv6 support
  ipv6:
    enabled: false
  
  # IP family policy for services
  # Options: SingleStack, PreferDualStack, RequireDualStack
  ipFamilyPolicy: SingleStack
  
  # Optional explicit IP families
  # Leave empty to let Kubernetes choose based on ipFamilyPolicy
  ipFamilies: []

# Service configuration
service:
  type: ClusterIP
  port: 80

# Ingress configuration
ingress:
  enabled: false
  annotations: {}
```

## Template for Dual-Stack Services

```yaml
# templates/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: {{ .Release.Name }}
spec:
  type: {{ .Values.service.type }}
  {{- if .Values.networking.ipv6.enabled }}
  ipFamilyPolicy: {{ .Values.networking.ipFamilyPolicy | default "PreferDualStack" }}
  {{- if .Values.networking.ipFamilies }}
  ipFamilies:
    {{- toYaml .Values.networking.ipFamilies | nindent 4 }}
  {{- end }}
  {{- end }}
  ports:
    - port: {{ .Values.service.port }}
      targetPort: http
  selector:
    {{- include "mychart.selectorLabels" . | nindent 4 }}
```

## Template Helper for IPv6 Addresses

```yaml
{{/* templates/_helpers.tpl */}}

{{/*
Format an IP address for use in a URL.
Wraps IPv6 addresses in brackets.
*/}}
{{- define "mychart.formatIP" -}}
{{- if contains ":" . -}}
[{{ . }}]
{{- else -}}
{{ . }}
{{- end -}}
{{- end -}}

{{/* Usage: http://{{ include "mychart.formatIP" .Values.server.host }}:{{ .Values.server.port }}/ */}}
```

## Testing with IPv6 Cluster

```bash
# Lint with IPv6 values before deployment
helm lint ./mychart --set networking.ipv6.enabled=true --set networking.ipFamilyPolicy=PreferDualStack

# Install with IPv6 enabled
helm install myapp ./mychart --set networking.ipv6.enabled=true --set networking.ipFamilyPolicy=PreferDualStack

# Verify service has IPv4 and IPv6 cluster IPs
kubectl get svc myapp -o jsonpath='{.spec.clusterIPs}'
```

## Validation Schema (`values.schema.json`)

```json
{
  "$schema": "https://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "networking": {
      "type": "object",
      "properties": {
        "ipv6": {
          "type": "object",
          "properties": {
            "enabled": {
              "type": "boolean"
            }
          }
        },
        "ipFamilyPolicy": {
          "type": "string",
          "enum": ["SingleStack", "PreferDualStack", "RequireDualStack"]
        },
        "ipFamilies": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": ["IPv4", "IPv6"]
          },
          "maxItems": 2,
          "uniqueItems": true
        }
      }
    }
  }
}
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor the services deployed by your Helm chart over IPv6. Configure monitors for both IPv4 and IPv6 service endpoints to ensure dual-stack deployments are fully functional.

## Conclusion

How to Validate Helm Chart IPv6 Configuration requires careful template design that conditionally applies IPv6 settings, provides schema validation for IPv6 fields, and is tested against real dual-stack clusters. Always document IPv6 values options and provide examples for common deployment scenarios.
