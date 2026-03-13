# How to Configure Flux with Calico Network Policies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Security, Network Policies, Calico, NetworkSet

Description: Secure Flux controllers using Calico GlobalNetworkPolicy and NetworkSet resources for enterprise-grade network segmentation and DNS-based egress control.

---

Calico is one of the most widely deployed CNI plugins and offers a powerful policy engine that goes beyond standard Kubernetes NetworkPolicies. Calico supports GlobalNetworkPolicy for cluster-wide rules, NetworkSet resources for managing groups of external IPs, and DNS-based policy for FQDN filtering. This guide walks through using Calico-specific resources to secure Flux controller traffic with fine-grained controls that are easier to manage at scale.

## Prerequisites

- A Kubernetes cluster with Calico installed (open-source or Calico Enterprise)
- Flux installed in the flux-system namespace
- kubectl and calicoctl configured
- Calico v3.20+ (for DNS-based policy support)

Verify Calico is running:

```bash
kubectl get pods -n calico-system
# or for older installations
kubectl get pods -n kube-system -l k8s-app=calico-node
```

Check the Calico version:

```bash
calicoctl version
```

Verify Calico CRDs are available:

```bash
kubectl get crd globalnetworkpolicies.crd.projectcalico.org
kubectl get crd networksets.crd.projectcalico.org
kubectl get crd globalnetworksets.crd.projectcalico.org
```

## Why Use Calico Policies Over Standard NetworkPolicies

Calico policies offer several advantages:

- GlobalNetworkPolicy applies cluster-wide without repeating rules per namespace
- NetworkSet and GlobalNetworkSet group external CIDRs into reusable, named objects
- DNS-based policy allows FQDN filtering without hardcoding IPs
- Policy ordering with explicit priority numbers
- Deny rules (standard Kubernetes NetworkPolicies can only allow)
- Logging for policy evaluation

## Step 1: Create NetworkSets for External Endpoints

NetworkSets let you define groups of external IP ranges and reference them by name in policies. Create a GlobalNetworkSet for GitHub:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkSet
metadata:
  name: github
  labels:
    destination: github
spec:
  nets:
    - 140.82.112.0/20
    - 143.55.64.0/20
    - 185.199.108.0/22
    - 192.30.252.0/22
```

Create one for Docker Hub:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkSet
metadata:
  name: docker-hub
  labels:
    destination: docker-hub
spec:
  nets:
    - 44.205.64.0/20
    - 104.16.0.0/12
```

Apply them:

```bash
calicoctl apply -f github-networkset.yaml
calicoctl apply -f dockerhub-networkset.yaml
```

You can update these NetworkSets independently without modifying any policies. This separation of concerns makes IP range updates much cleaner.

## Step 2: Create a Default Deny GlobalNetworkPolicy

Apply a global default deny that affects the flux-system namespace:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: flux-default-deny
spec:
  order: 1000
  selector: projectcalico.org/namespace == 'flux-system'
  types:
    - Ingress
    - Egress
```

```bash
calicoctl apply -f flux-default-deny.yaml
```

The `order: 1000` ensures this runs after more specific allow policies (lower numbers are evaluated first).

## Step 3: Allow DNS Resolution

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: flux-allow-dns
spec:
  order: 100
  selector: projectcalico.org/namespace == 'flux-system'
  types:
    - Egress
  egress:
    - action: Allow
      protocol: UDP
      destination:
        selector: k8s-app == 'kube-dns'
        namespaceSelector: projectcalico.org/name == 'kube-system'
        ports:
          - 53
    - action: Allow
      protocol: TCP
      destination:
        selector: k8s-app == 'kube-dns'
        namespaceSelector: projectcalico.org/name == 'kube-system'
        ports:
          - 53
```

```bash
calicoctl apply -f flux-allow-dns.yaml
```

## Step 4: Allow Kubernetes API Server Access

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: flux-allow-kube-api
spec:
  order: 100
  selector: projectcalico.org/namespace == 'flux-system'
  types:
    - Egress
  egress:
    - action: Allow
      protocol: TCP
      destination:
        services:
          name: kubernetes
          namespace: default
```

If your Calico version does not support the `services` selector, use the API server IP:

```bash
KUBE_API_IP=$(kubectl get endpoints kubernetes -n default -o jsonpath='{.subsets[0].addresses[0].ip}')

cat <<EOF > flux-allow-kube-api.yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: flux-allow-kube-api
spec:
  order: 100
  selector: projectcalico.org/namespace == 'flux-system'
  types:
    - Egress
  egress:
    - action: Allow
      protocol: TCP
      destination:
        nets:
          - ${KUBE_API_IP}/32
        ports:
          - 443
          - 6443
EOF

calicoctl apply -f flux-allow-kube-api.yaml
```

## Step 5: Allow Source Controller Egress Using NetworkSets

Reference the NetworkSets created in Step 1:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: flux-source-controller-egress
spec:
  order: 200
  selector: app == 'source-controller' && projectcalico.org/namespace == 'flux-system'
  types:
    - Egress
  egress:
    # Allow access to GitHub
    - action: Allow
      protocol: TCP
      destination:
        selector: destination == 'github'
        ports:
          - 443
          - 22
    # Allow access to Docker Hub
    - action: Allow
      protocol: TCP
      destination:
        selector: destination == 'docker-hub'
        ports:
          - 443
```

```bash
calicoctl apply -f flux-source-egress.yaml
```

When GitHub updates their IP ranges, you only update the GlobalNetworkSet -- no policy changes needed.

## Step 6: Allow Inter-Controller Communication

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: flux-inter-controller
spec:
  order: 200
  selector: projectcalico.org/namespace == 'flux-system'
  types:
    - Ingress
    - Egress
  ingress:
    - action: Allow
      protocol: TCP
      source:
        selector: projectcalico.org/namespace == 'flux-system'
      destination:
        ports:
          - 9090
          - 9292
          - 8080
  egress:
    - action: Allow
      protocol: TCP
      destination:
        selector: projectcalico.org/namespace == 'flux-system'
        ports:
          - 9090
          - 9292
          - 8080
```

```bash
calicoctl apply -f flux-inter-controller.yaml
```

## Step 7: Allow Notification Controller External Egress

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: flux-notification-egress
spec:
  order: 200
  selector: app == 'notification-controller' && projectcalico.org/namespace == 'flux-system'
  types:
    - Egress
  egress:
    - action: Allow
      protocol: TCP
      destination:
        domains:
          - hooks.slack.com
          - "*.webhook.office.com"
          - events.pagerduty.com
        ports:
          - 443
```

The `domains` field uses Calico DNS-based policy to resolve hostnames and allow traffic without hardcoding IPs.

```bash
calicoctl apply -f flux-notification-egress.yaml
```

## Step 8: Enable Policy Logging

Calico supports logging policy decisions. Add a log action before the deny to track blocked traffic:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: flux-log-denied
spec:
  order: 999
  selector: projectcalico.org/namespace == 'flux-system'
  types:
    - Ingress
    - Egress
  ingress:
    - action: Log
  egress:
    - action: Log
```

This logs all traffic that reaches this policy (traffic not matched by earlier allow rules). View the logs:

```bash
kubectl logs -n calico-system -l k8s-app=calico-node --tail=50 | grep flux-system
```

## Verification

List all Calico policies affecting flux-system:

```bash
calicoctl get globalnetworkpolicy -o wide | grep flux
```

List NetworkSets:

```bash
calicoctl get globalnetworkset -o wide
```

Verify Flux reconciliation works:

```bash
flux reconcile source git flux-system
flux get sources all
flux get kustomizations -A
```

Check that blocked traffic is logged:

```bash
kubectl logs -n calico-system -l k8s-app=calico-node --tail=30 | grep -i deny
```

## Troubleshooting

**Policies not taking effect**

Verify the selector matches the pods:

```bash
calicoctl get workloadendpoint -n flux-system -o yaml
```

Check that the labels on your pods match the selectors in the policies.

**NetworkSet selector not matching**

Verify the GlobalNetworkSet has the correct labels:

```bash
calicoctl get globalnetworkset github -o yaml
```

The selector in the policy must match the labels on the NetworkSet, not the metadata name.

**DNS-based policy not resolving**

Calico DNS-based policy requires the DNS proxy to be enabled. Check:

```bash
calicoctl get felixconfiguration default -o yaml | grep -i dns
```

If DNS policy is not enabled, set it:

```bash
calicoctl patch felixconfiguration default --patch='{"spec":{"dnsTrustedServers":["k8s-service:kube-system/kube-dns"]}}'
```

**Policy ordering conflicts**

Calico evaluates policies in order of the `order` field (lowest first). If an allow policy has a higher order number than the deny policy, traffic will be denied before the allow rule is evaluated. Use `calicoctl get gnp -o wide` to review ordering:

```bash
calicoctl get globalnetworkpolicy -o wide
```

**Calico logs show unexpected denies**

Examine the denied flows in detail:

```bash
kubectl logs -n calico-system -l k8s-app=calico-node --tail=100 | grep -A2 "denied"
```

Cross-reference the source and destination with your policies to identify the missing rule.
