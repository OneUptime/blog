# How to Document Istio Gateway Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Gateway, Documentation, TLS, Ingresses

Description: Create clear documentation for Istio Gateway configurations including TLS settings, host routing, and integration with VirtualServices.

---

Istio Gateways are the front door of your mesh. They control what traffic enters, on which ports, for which hostnames, and with what TLS settings. When something goes wrong with external access to your services, the Gateway configuration is the first place to look. But if nobody has documented how the gateways are set up, debugging becomes a guessing game. Good gateway documentation saves hours of troubleshooting and makes it straightforward to add new services.

## What to Document for Each Gateway

Every Gateway should have documentation covering:

- What hostnames it serves
- What ports it listens on
- TLS configuration (mode, certificates, minimum version)
- Which VirtualServices bind to it
- Load balancer details (cloud provider LB, IP, DNS)
- Any special configuration (PROXY protocol, HTTP redirect, etc.)

## Self-Documenting Gateway Resources

Use annotations to embed documentation directly in the Gateway resource:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: production-gateway
  namespace: istio-system
  annotations:
    docs/description: "Main ingress gateway for production services"
    docs/owner: "platform-team"
    docs/lb-dns: "gateway.example.com"
    docs/lb-ip: "34.102.136.180"
    docs/cert-issuer: "cert-manager (Let's Encrypt production)"
    docs/last-updated: "2026-02-20"
spec:
  selector:
    istio: ingressgateway
  servers:
  # HTTPS for production APIs
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
    - "api.example.com"
    - "app.example.com"
    - "admin.example.com"
    tls:
      mode: SIMPLE
      credentialName: production-tls-cert
      minProtocolVersion: TLSV1_2
      cipherSuites:
      - ECDHE-RSA-AES256-GCM-SHA384
      - ECDHE-RSA-AES128-GCM-SHA256
  # HTTP redirect to HTTPS
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "api.example.com"
    - "app.example.com"
    - "admin.example.com"
    tls:
      httpsRedirect: true
```

## Generating Gateway Documentation

Extract gateway configurations into readable documentation:

```bash
#!/bin/bash
# gateway-docs.sh

echo "# Istio Gateway Configuration"
echo "Generated: $(date -u +%FT%TZ)"
echo ""

kubectl get gateways -A -o json | jq -r '
  .items[] |
  "## " + .metadata.name + "\n" +
  "**Namespace:** " + .metadata.namespace + "\n" +
  "**Description:** " + (.metadata.annotations["docs/description"] // "No description") + "\n" +
  "**Owner:** " + (.metadata.annotations["docs/owner"] // "Unknown") + "\n" +
  "**Load Balancer DNS:** " + (.metadata.annotations["docs/lb-dns"] // "N/A") + "\n" +
  "**Load Balancer IP:** " + (.metadata.annotations["docs/lb-ip"] // "N/A") + "\n" +
  "**Certificate Issuer:** " + (.metadata.annotations["docs/cert-issuer"] // "N/A") + "\n" +
  "\n### Servers\n" +
  (
    .spec.servers[] |
    "\n#### Port " + (.port.number | tostring) + " (" + .port.protocol + ")\n" +
    "- **Hosts:** " + (.hosts | join(", ")) + "\n" +
    (if .tls then
      "- **TLS Mode:** " + .tls.mode + "\n" +
      "- **Credential:** " + (.tls.credentialName // "N/A") + "\n" +
      "- **Min TLS Version:** " + (.tls.minProtocolVersion // "default") + "\n" +
      (if .tls.httpsRedirect then "- **HTTPS Redirect:** Yes\n" else "" end)
    else "" end)
  ) + "\n"
'
```

## Documenting Gateway-VirtualService Bindings

The relationship between Gateways and VirtualServices is crucial. A VirtualService binds to a Gateway by referencing its name:

```bash
#!/bin/bash
# gateway-bindings.sh

echo "# Gateway-VirtualService Bindings"
echo ""

for GW in $(kubectl get gateways -A -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}{"\n"}{end}'); do
  GW_NS=$(echo $GW | cut -d/ -f1)
  GW_NAME=$(echo $GW | cut -d/ -f2)

  echo "## Gateway: $GW_NAME (ns: $GW_NS)"
  echo ""
  echo "| VirtualService | Namespace | Hosts | Routes |"
  echo "|---------------|-----------|-------|--------|"

  kubectl get virtualservices -A -o json | jq -r --arg gw "$GW_NAME" --arg gwns "$GW_NS" '
    .items[] |
    select(.spec.gateways[]? == $gw or .spec.gateways[]? == ($gwns + "/" + $gw)) |
    "| " + .metadata.name +
    " | " + .metadata.namespace +
    " | " + (.spec.hosts | join(", ")) +
    " | " + ((.spec.http // []) | length | tostring) + " HTTP routes |"
  '

  echo ""
done
```

## TLS Certificate Documentation

Document the TLS certificates used by each gateway:

```bash
#!/bin/bash
# gateway-certs.sh

echo "# Gateway TLS Certificates"
echo ""
echo "| Gateway | Credential | Secret Namespace | Expiry | Issuer |"
echo "|---------|-----------|-----------------|--------|--------|"

kubectl get gateways -A -o json | jq -r '
  .items[] |
  .metadata.name as $gw |
  .spec.servers[] |
  select(.tls.credentialName != null) |
  [$gw, .tls.credentialName] | @tsv
' | while read GW CRED; do
  # Look for the TLS secret
  SECRET_DATA=$(kubectl get secret $CRED -n istio-system -o json 2>/dev/null)
  if [ $? -eq 0 ]; then
    EXPIRY=$(echo $SECRET_DATA | jq -r '.data["tls.crt"]' | \
      base64 -d | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
    ISSUER=$(echo $SECRET_DATA | jq -r '.data["tls.crt"]' | \
      base64 -d | openssl x509 -noout -issuer 2>/dev/null | sed 's/issuer=//')
    echo "| $GW | $CRED | istio-system | $EXPIRY | $ISSUER |"
  else
    echo "| $GW | $CRED | NOT FOUND | N/A | N/A |"
  fi
done
```

## Documenting Multi-Gateway Setups

Many production environments use multiple gateways for different purposes:

```markdown
# Gateway Architecture

## production-gateway
- **Purpose:** Public-facing API and web application traffic
- **LB Type:** External (cloud provider L4 load balancer)
- **IP:** 34.102.136.180
- **DNS:** gateway.example.com
- **TLS:** cert-manager with Let's Encrypt
- **Hosts:**
  - api.example.com -> api-service (production)
  - app.example.com -> web-app (production)
  - admin.example.com -> admin-dashboard (admin)

## internal-gateway
- **Purpose:** Internal service communication between clusters
- **LB Type:** Internal (cloud provider internal LB)
- **IP:** 10.0.100.50
- **DNS:** internal-gateway.internal.example.com
- **TLS:** Mutual TLS with custom CA
- **Hosts:**
  - *.internal.example.com -> various internal services

## metrics-gateway
- **Purpose:** Monitoring and observability endpoints
- **LB Type:** Internal
- **IP:** 10.0.100.51
- **DNS:** metrics.internal.example.com
- **TLS:** SIMPLE mode with internal CA cert
- **Hosts:**
  - prometheus.internal.example.com -> prometheus (monitoring)
  - grafana.internal.example.com -> grafana (monitoring)
```

## Gateway Health Monitoring Documentation

Document how to verify gateway health:

```bash
#!/bin/bash
# gateway-health.sh

echo "# Gateway Health Check"
echo ""

# Check the gateway deployment
echo "## Gateway Pod Status"
kubectl get pods -n istio-system -l istio=ingressgateway

echo ""
echo "## Gateway Service"
kubectl get svc -n istio-system istio-ingressgateway

echo ""
echo "## Active Listeners"
GATEWAY_POD=$(kubectl get pods -n istio-system -l istio=ingressgateway -o jsonpath='{.items[0].metadata.name}')
if [ -n "$GATEWAY_POD" ]; then
  kubectl exec -n istio-system $GATEWAY_POD -- \
    pilot-agent request GET /listeners | python3 -m json.tool | \
    jq -r '.[].name'
fi

echo ""
echo "## Certificate Status"
kubectl exec -n istio-system $GATEWAY_POD -- \
  pilot-agent request GET /certs | python3 -m json.tool 2>/dev/null | \
  jq -r '.certificates[]? | .cert_chain[0] | "- Subject: " + .subject + " | Expires: " + .valid_to'

echo ""
echo "## Active Routes"
kubectl exec -n istio-system $GATEWAY_POD -- \
  pilot-agent request GET /config_dump | python3 -m json.tool 2>/dev/null | \
  jq -r '.configs[]? | select(.["@type"] | contains("RouteConfiguration")) | .dynamic_route_configs[]? | .route_config.name'
```

## Runbook Entry for Gateway Issues

Include troubleshooting steps in your documentation:

```markdown
## Gateway Troubleshooting

### Symptom: 404 for a host that should be routed
1. Check that the Gateway has a server entry for the hostname
2. Check that a VirtualService references this gateway
3. Check that the VirtualService host matches the Gateway host
4. Verify: `istioctl proxy-config routes -n istio-system deploy/istio-ingressgateway`

### Symptom: TLS handshake failure
1. Verify the TLS secret exists: `kubectl get secret <cred-name> -n istio-system`
2. Check cert expiry: `kubectl get secret <cred-name> -n istio-system -o json | jq '.data["tls.crt"]' -r | base64 -d | openssl x509 -noout -dates`
3. Verify cert matches hostname: `openssl s_client -connect gateway.example.com:443 -servername api.example.com`

### Symptom: 503 Service Unavailable
1. Check if backend pods are running
2. Check if the VirtualService destination matches an actual service
3. Check Envoy upstream health: `istioctl proxy-config clusters -n istio-system deploy/istio-ingressgateway | grep <service>`
```

Gateway documentation should be the first thing someone looks at when external access breaks. Keep it updated, keep it accurate, and make sure it includes both the configuration details and the troubleshooting procedures. An auto-generated report handles the first part; a human-maintained runbook handles the second.
