# How to Deploy Cloud Armor Security Policies with Flux on GKE

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, GKE, Google Cloud, Cloud Armor, Security, WAF

Description: Manage Google Cloud Armor security policies via BackendConfig CRDs with Flux CD to enforce WAF rules and DDoS protection in a GitOps workflow.

---

## Introduction

Google Cloud Armor is a managed Web Application Firewall (WAF) and DDoS protection service that integrates directly with GKE through BackendConfig custom resources. By attaching a Cloud Armor security policy to a GKE Ingress backend, you can enforce IP allowlists, rate limiting, OWASP rules, and geographic restrictions at the Google network edge before traffic ever reaches your pods.

Managing security policies manually creates audit gaps and makes rollback difficult. Flux CD solves this by treating Cloud Armor BackendConfig manifests as code - every policy change goes through a Git pull request, is reviewed, and is automatically applied to the cluster. If a bad rule causes an outage, reverting is as simple as reverting a Git commit.

This guide covers creating a Cloud Armor security policy in GCP, referencing it from a Kubernetes BackendConfig resource, attaching it to an Ingress, and managing the entire lifecycle through Flux CD.

## Prerequisites

- A GKE cluster with HTTP load balancing enabled (the default)
- Cloud Armor enabled in your GCP project (`gcloud services enable compute.googleapis.com`)
- Flux CD bootstrapped against your cluster repository
- `kubectl` and `gcloud` CLIs installed and configured
- The GKE `BackendConfig` CRD available (installed with the GKE HTTP load balancer add-on)

## Step 1: Create the Cloud Armor Security Policy in GCP

Cloud Armor security policies are GCP resources, not Kubernetes resources. Create the policy and its rules using gcloud or Terraform, then reference it by name from Kubernetes.

```bash
# Create a security policy
gcloud compute security-policies create my-waf-policy \
  --description "WAF policy for production API"

# Add a rule to block traffic from a specific CIDR range
gcloud compute security-policies rules create 1000 \
  --security-policy my-waf-policy \
  --description "Block malicious IP range" \
  --src-ip-ranges "198.51.100.0/24" \
  --action "deny-403"

# Add an OWASP ModSecurity Core Rule Set (CRS) preconfigured rule
gcloud compute security-policies rules create 2000 \
  --security-policy my-waf-policy \
  --expression "evaluatePreconfiguredExpr('xss-stable')" \
  --action "deny-403" \
  --description "Block XSS attacks"

# Allow all other traffic (default rule at priority 2147483647)
gcloud compute security-policies rules update 2147483647 \
  --security-policy my-waf-policy \
  --action "allow"
```

## Step 2: Create the BackendConfig Manifest

The `BackendConfig` CRD is provided by GKE and lets you configure backend-specific settings on GKE Ingress, including a Cloud Armor policy reference.

```yaml
# apps/production/backend-config.yaml
apiVersion: cloud.google.com/v1
kind: BackendConfig
metadata:
  name: api-backend-config
  namespace: production
spec:
  # Reference the Cloud Armor security policy by name
  securityPolicy:
    name: my-waf-policy
  # Enable Cloud CDN (optional, compatible with Cloud Armor)
  cdn:
    enabled: false
  # Configure connection draining timeout
  connectionDraining:
    drainingTimeoutSec: 30
  # Custom response headers
  customResponseHeaders:
    headers:
      - "X-Frame-Options: DENY"
      - "X-Content-Type-Options: nosniff"
```

## Step 3: Attach BackendConfig to the Service

Annotate the Kubernetes Service to link it to the BackendConfig.

```yaml
# apps/production/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-api
  namespace: production
  annotations:
    # Tell GKE to use this BackendConfig for all ports on this Service
    cloud.google.com/backend-config: '{"default": "api-backend-config"}'
spec:
  selector:
    app: my-api
  ports:
    - name: http
      port: 80
      targetPort: 8080
  type: ClusterIP   # Use ClusterIP with GKE Ingress; Ingress creates the LB
```

## Step 4: Create the GKE Ingress

```yaml
# apps/production/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-api-ingress
  namespace: production
  annotations:
    kubernetes.io/ingress.class: "gce"          # Use the GCE HTTP(S) load balancer
    kubernetes.io/ingress.global-static-ip-name: "my-api-static-ip"
    networking.gke.io/managed-certificates: "my-api-cert"  # Google-managed TLS
spec:
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-api
                port:
                  number: 80
```

## Step 5: Define the Flux Kustomization

```yaml
# clusters/my-cluster/apps/production/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: production-app
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: ./apps/production
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-api
      namespace: production
    - apiVersion: networking.k8s.io/v1
      kind: Ingress
      name: my-api-ingress
      namespace: production
```

## Step 6: Validate the Policy is Applied

```bash
# Check Flux reconciliation
flux get kustomizations production-app

# Verify BackendConfig is created
kubectl get backendconfig -n production

# Describe the Ingress to see backend annotations
kubectl describe ingress my-api-ingress -n production

# Test that blocked IPs receive 403 responses
curl -I --interface 198.51.100.1 https://api.example.com/

# View Cloud Armor logs in Cloud Logging
gcloud logging read \
  'resource.type="http_load_balancer" AND jsonPayload.enforcedSecurityPolicy.name="my-waf-policy"' \
  --limit 10
```

## Best Practices

- Manage Cloud Armor policies as Terraform alongside your Flux manifests so the policy resource and its Kubernetes reference are both version-controlled.
- Use preview mode (`--action preview-deny-403`) when adding new rules to measure false-positive rates before enforcing.
- Separate environment-specific BackendConfigs (staging vs. production) using Kustomize overlays so rules can be tested in staging first.
- Set alert policies in Cloud Monitoring on the `blocked_request_count` metric to detect attack surges quickly.
- Use Flux `postBuild` variable substitution to inject the Cloud Armor policy name from environment-specific ConfigMaps rather than hardcoding it.
- Always pin GKE-managed certificate names to avoid accidental certificate rotation disruption.

## Conclusion

Flux CD turns Cloud Armor policy management into a standard GitOps workflow. Security engineers propose WAF rule changes through pull requests, operators review and approve them, and Flux applies the BackendConfig changes automatically. The result is an auditable, reviewable, and reversible security posture for every service exposed through GKE Ingress.
