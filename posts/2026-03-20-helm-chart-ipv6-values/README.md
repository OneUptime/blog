# How to Configure Helm Chart Values for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Helm, IPv6, Kubernetes, Helm Chart, DevOps

Description: Define and document IPv6 configuration options in Helm chart values.yaml files for flexible dual-stack deployments.

## Overview

Define and document IPv6 configuration options in Helm chart values.yaml files for flexible dual-stack deployments.

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
  
  # IP families (IPv4, IPv6, or both; set both for dual-stack)
  ipFamilies:
    - IPv4

# Service configuration
service:
  type: ClusterIP
  port: 80

# Ingress configuration
ingress:
  enabled: false
  # Add controller-specific annotations only if your ingress implementation requires them
  annotations: {}
```

## Template for Dual-Stack Services

```yaml
# templates/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: {{ include "mychart.fullname" . }}
spec:
  type: {{ .Values.service.type }}
  {{- if .Values.networking.ipv6.enabled }}
  ipFamilyPolicy: {{ .Values.networking.ipFamilyPolicy | default "PreferDualStack" }}
  ipFamilies:
    {{- toYaml .Values.networking.ipFamilies | nindent 4 }}
  {{- end }}
  ports:
    - port: {{ .Values.service.port }}
      targetPort: {{ .Values.service.port }}
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

## Testing with Dual-Stack Cluster

```bash
# Install with dual-stack enabled
helm install myapp ./mychart \
  --set networking.ipv6.enabled=true \
  --set networking.ipFamilyPolicy=PreferDualStack \
  --set networking.ipFamilies[0]=IPv4 \
  --set networking.ipFamilies[1]=IPv6

# Verify service has IPv4 and IPv6 cluster IPs
kubectl get svc myapp-mychart -o jsonpath='{.spec.clusterIPs}'

# Run helm tests
helm test myapp
```

## Validation Schema

```json
{
  "$schema": "https://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "networking": {
      "type": "object",
      "properties": {
        "ipFamilyPolicy": {
          "type": "string",
          "enum": ["SingleStack", "PreferDualStack", "RequireDualStack"]
        },
        "ipFamilies": {
          "type": "array",
          "minItems": 1,
          "maxItems": 2,
          "items": {
            "type": "string",
            "enum": ["IPv4", "IPv6"]
          }
        }
      }
    }
  }
}
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor the services deployed by your Helm chart over IPv6. Configure monitors for both IPv4 and IPv6 service endpoints to ensure dual-stack deployments are fully functional.

## Conclusion

How to Configure Helm Chart Values for IPv6 requires careful template design that conditionally applies IPv6 settings, provides schema validation for IPv6 fields, and is tested against real dual-stack clusters. Always document IPv6 values options and provide examples for common deployment scenarios.
