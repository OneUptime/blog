# How to Handle IPv6 CIDR Ranges in Helm Chart Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Helm, IPv6, CIDR, Network Policy, Kubernetes

Description: Template IPv6 CIDR ranges for network policies, service CIDR configuration, and pod CIDR settings in Helm charts.

## Overview

Template IPv6-aware service settings and controller-specific CIDR annotations in Helm charts.

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
  ipFamilyPolicy: PreferDualStack
  
  # Leave empty to let Kubernetes choose, or set an explicit order
  # Example: [IPv4, IPv6] or [IPv6, IPv4]
  ipFamilies: []

# Service configuration
service:
  type: ClusterIP
  port: 80

# Ingress configuration
ingress:
  enabled: false
  annotations:
    # Example CIDR allowlist for ingress-nginx
    nginx.ingress.kubernetes.io/whitelist-source-range: "2001:db8::/32"
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
  {{- with .Values.networking.ipFamilies }}
  ipFamilies:
    {{- toYaml . | nindent 4 }}
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
# Install with IPv6 enabled
helm install myapp ./mychart --set networking.ipv6.enabled=true

# Verify service has IPv4 and IPv6 cluster IPs
kubectl get svc <rendered-service-name> -o jsonpath='{.spec.clusterIPs}'

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

Handling IPv6-aware service settings and CIDR-based ingress annotations in Helm chart templates requires careful template design that conditionally applies IPv6 settings, provides schema validation for IPv6-related fields, and is tested against real dual-stack clusters. Always document IPv6 values options and provide examples for common deployment scenarios.
