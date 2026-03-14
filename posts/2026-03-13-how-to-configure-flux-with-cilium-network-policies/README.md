# How to Configure Flux with Cilium Network Policies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Security, Network Policies, Cilium, EBPF, Layer 7

Description: Use Cilium CiliumNetworkPolicy resources to secure Flux controllers with L3/L4 and L7 filtering, DNS-aware policies, and identity-based access control.

---

Cilium provides advanced network security capabilities beyond what standard Kubernetes NetworkPolicies offer. With Cilium, you can write policies that filter traffic based on DNS names, HTTP methods, and paths. You can also use Cilium identities instead of IP-based rules, which is more resilient to IP address changes. This guide shows how to secure Flux controllers using Cilium-native CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy resources.

## Prerequisites

- A Kubernetes cluster with Cilium installed as the CNI
- Flux installed in the flux-system namespace
- kubectl and the Cilium CLI configured
- Familiarity with CiliumNetworkPolicy CRDs

Verify Cilium is running and healthy:

```bash
cilium status
```

Check that CiliumNetworkPolicy CRD is available:

```bash
kubectl get crd ciliumnetworkpolicies.cilium.io
```

Verify Cilium version supports the features used in this guide (1.12+ recommended):

```bash
cilium version
```

## Why Use Cilium Instead of Standard NetworkPolicies

Standard Kubernetes NetworkPolicies work at L3/L4, meaning you can filter by IP and port. Cilium extends this with:

- DNS-based policies: Allow traffic to `github.com` without hardcoding IPs
- L7 filtering: Allow only GET requests to specific HTTP paths
- Identity-based rules: Reference pods by Cilium identity instead of labels
- Cluster-wide policies: Apply rules across all namespaces without repetition
- Policy enforcement visibility: Hubble provides real-time policy verdict monitoring

## Step 1: Create a Default Deny Policy with Cilium

Create a CiliumNetworkPolicy that denies all traffic in the flux-system namespace:

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: default-deny
  namespace: flux-system
spec:
  endpointSelector: {}
  ingress:
    - {}
  egress:
    - {}
```

Wait, that would allow all traffic. For Cilium, the default deny works differently. Apply explicit deny rules:

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: default-deny
  namespace: flux-system
spec:
  endpointSelector: {}
  ingress: []
  egress: []
```

```bash
kubectl apply -f cilium-default-deny.yaml
```

Note: In Cilium, once any CiliumNetworkPolicy selects an endpoint, traffic not explicitly allowed by any policy is denied.

## Step 2: Allow DNS with Cilium DNS Proxy

Cilium has a built-in DNS proxy that intercepts DNS queries for policy enforcement. Allow DNS resolution:

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-dns
  namespace: flux-system
spec:
  endpointSelector: {}
  egress:
    - toEndpoints:
        - matchLabels:
            k8s:io.cilium.k8s.namespace.labels.kubernetes.io/metadata.name: kube-system
            k8s:k8s-app: kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: UDP
            - port: "53"
              protocol: TCP
          rules:
            dns:
              - matchPattern: "*"
```

The `rules.dns` block tells Cilium to intercept DNS responses and learn the IP-to-FQDN mappings. This enables FQDN-based egress policies in subsequent rules.

```bash
kubectl apply -f cilium-allow-dns.yaml
```

## Step 3: Allow Source Controller Egress by FQDN

This is where Cilium shines. Instead of specifying IP CIDRs for GitHub, you reference the domain name directly:

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: source-controller-egress
  namespace: flux-system
spec:
  endpointSelector:
    matchLabels:
      app: source-controller
  egress:
    # Allow access to GitHub for Git operations
    - toFQDNs:
        - matchName: github.com
        - matchName: api.github.com
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
            - port: "22"
              protocol: TCP
    # Allow access to GitHub Container Registry
    - toFQDNs:
        - matchName: ghcr.io
        - matchPattern: "*.ghcr.io"
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
    # Allow access to Docker Hub
    - toFQDNs:
        - matchName: registry-1.docker.io
        - matchName: auth.docker.io
        - matchName: production.cloudflare.docker.com
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
    # Allow access to Kubernetes API server
    - toEntities:
        - kube-apiserver
```

```bash
kubectl apply -f cilium-source-controller-egress.yaml
```

The `toEntities: kube-apiserver` rule is a Cilium shorthand that automatically allows traffic to the Kubernetes API server without you needing to look up its IP address.

## Step 4: Allow Other Controllers API Server Access

The kustomize-controller and helm-controller only need API server access:

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: kustomize-controller-egress
  namespace: flux-system
spec:
  endpointSelector:
    matchLabels:
      app: kustomize-controller
  egress:
    - toEntities:
        - kube-apiserver
    - toEndpoints:
        - matchLabels:
            app: source-controller
      toPorts:
        - ports:
            - port: "9090"
              protocol: TCP
    - toEndpoints:
        - matchLabels:
            app: notification-controller
      toPorts:
        - ports:
            - port: "9292"
              protocol: TCP
---
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: helm-controller-egress
  namespace: flux-system
spec:
  endpointSelector:
    matchLabels:
      app: helm-controller
  egress:
    - toEntities:
        - kube-apiserver
    - toEndpoints:
        - matchLabels:
            app: source-controller
      toPorts:
        - ports:
            - port: "9090"
              protocol: TCP
    - toEndpoints:
        - matchLabels:
            app: notification-controller
      toPorts:
        - ports:
            - port: "9292"
              protocol: TCP
```

```bash
kubectl apply -f cilium-controller-egress.yaml
```

## Step 5: Allow Notification Controller Egress by FQDN

The notification-controller sends alerts to external services. Specify each alert destination by name:

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: notification-controller-egress
  namespace: flux-system
spec:
  endpointSelector:
    matchLabels:
      app: notification-controller
  egress:
    - toEntities:
        - kube-apiserver
    # Slack
    - toFQDNs:
        - matchName: hooks.slack.com
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
    # Microsoft Teams
    - toFQDNs:
        - matchPattern: "*.webhook.office.com"
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
    # PagerDuty
    - toFQDNs:
        - matchName: events.pagerduty.com
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
```

## Step 6: Add L7 HTTP Filtering for Webhook Receiver

Cilium can filter HTTP traffic at Layer 7. Restrict the webhook receiver to only accept POST requests on the /hook/ path:

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: webhook-receiver-l7
  namespace: flux-system
spec:
  endpointSelector:
    matchLabels:
      app: notification-controller
  ingress:
    - fromEndpoints:
        - matchLabels:
            k8s:io.cilium.k8s.namespace.labels.kubernetes.io/metadata.name: ingress-nginx
            k8s:app.kubernetes.io/name: ingress-nginx
      toPorts:
        - ports:
            - port: "9292"
              protocol: TCP
          rules:
            http:
              - method: POST
                path: "/hook/.*"
```

This ensures that even if an attacker reaches the webhook port, only POST requests to /hook/ paths are allowed.

## Step 7: Monitor Policy Enforcement with Hubble

Cilium includes Hubble, an observability platform that shows policy verdicts in real time:

```bash
# Install Hubble CLI if not present
cilium hubble enable

# Watch policy verdicts for flux-system
hubble observe --namespace flux-system --verdict DROPPED
```

To see all traffic for a specific controller:

```bash
hubble observe --namespace flux-system --pod source-controller --follow
```

Export policy verdicts as Prometheus metrics:

```bash
hubble observe --namespace flux-system -o json | jq '.verdict'
```

## Verification

Verify all Cilium policies are applied:

```bash
kubectl get ciliumnetworkpolicies -n flux-system
```

Check the policy enforcement status:

```bash
cilium endpoint list | grep flux-system
```

Trigger a Flux reconciliation and confirm it succeeds:

```bash
flux reconcile source git flux-system
flux get sources git
flux get kustomizations -A
```

Use Hubble to confirm traffic is flowing correctly:

```bash
hubble observe --namespace flux-system --verdict FORWARDED --last 20
```

## Troubleshooting

**FQDN-based policies not working**

Cilium needs to observe DNS responses to build its FQDN-to-IP mapping. Make sure the DNS policy with `rules.dns` is applied first:

```bash
kubectl get ciliumnetworkpolicy allow-dns -n flux-system -o yaml
```

If FQDNs are not resolving, restart the Cilium agent:

```bash
kubectl rollout restart daemonset/cilium -n kube-system
```

**toEntities kube-apiserver not matching**

Verify Cilium recognizes the API server:

```bash
cilium status | grep KubeApiServer
```

If the API server is not detected, you may need to specify the API server IP explicitly using `toCIDR` instead.

**L7 HTTP rules cause 403 errors**

L7 policy enforcement requires Cilium to proxy the traffic. Check that the Envoy proxy is running:

```bash
cilium status | grep Envoy
```

If HTTP parsing fails, the request may be dropped. Check the Hubble flow log for details:

```bash
hubble observe --namespace flux-system --port 9292 --verdict DROPPED -o json
```

**Hubble shows DROPPED verdicts for legitimate traffic**

Review the dropped flows to identify which policy is blocking:

```bash
hubble observe --namespace flux-system --verdict DROPPED -o json | jq '{src: .source.labels, dst: .destination.labels, port: .l4.TCP.destination_port}'
```

Add the missing allow rule for the identified source and destination.
