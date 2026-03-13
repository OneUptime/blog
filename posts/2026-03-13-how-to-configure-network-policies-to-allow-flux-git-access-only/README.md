# How to Configure Network Policies to Allow Flux Git Access Only

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Security, Network Policies, Git

Description: Learn how to create Kubernetes NetworkPolicies that restrict the Flux source-controller to only communicate with your Git repositories.

---

The Flux source-controller is responsible for cloning Git repositories, downloading Helm charts, and pulling OCI artifacts. In a default installation, it has unrestricted network access, which means a vulnerability in the controller could be exploited to reach any network destination. By applying targeted NetworkPolicies, you can limit the source-controller to only your Git hosting endpoints, significantly reducing your attack surface.

This guide covers how to configure NetworkPolicies that allow the Flux source-controller to access only specific Git servers over HTTPS and SSH while blocking all other egress traffic.

## Prerequisites

- A Kubernetes cluster running version 1.24 or later with a CNI plugin that enforces NetworkPolicies (Calico, Cilium, or Weave Net)
- Flux installed in the flux-system namespace
- kubectl configured with cluster-admin access
- The IP addresses or CIDR ranges of your Git hosting provider

To find the IP addresses of your Git hosting provider:

```bash
# For GitHub
dig github.com +short

# For GitLab
dig gitlab.com +short

# For a self-hosted Git server
dig git.internal.company.com +short
```

## Step 1: Identify Your Git Endpoints

Before writing policies, document the Git endpoints Flux needs to reach. List your GitRepository sources:

```bash
kubectl get gitrepositories -n flux-system -o jsonpath='{range .items[*]}{.spec.url}{"\n"}{end}'
```

For each URL, determine the hostname and resolve its IP addresses:

```bash
# Example for GitHub
host github.com
```

GitHub uses a range of IP addresses. You can get the current list from their API:

```bash
curl -s https://api.github.com/meta | jq -r '.git[]'
```

For GitLab.com:

```bash
curl -s https://gitlab.com/api/v4/metadata | jq -r '.kas.externalUrl'
dig gitlab.com +short
```

## Step 2: Create a Default Deny Egress Policy

Apply a default deny policy for the flux-system namespace to block all outbound traffic:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-egress
  namespace: flux-system
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress: []
```

```bash
kubectl apply -f default-deny-egress.yaml
```

## Step 3: Allow DNS Resolution

All controllers need DNS to resolve Git hostnames:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: flux-system
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

```bash
kubectl apply -f allow-dns.yaml
```

## Step 4: Allow Kubernetes API Server Access

All Flux controllers need to talk to the API server:

```bash
KUBE_API_IP=$(kubectl get endpoints kubernetes -n default -o jsonpath='{.subsets[0].addresses[0].ip}')

cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-kube-api
  namespace: flux-system
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - ipBlock:
            cidr: ${KUBE_API_IP}/32
      ports:
        - protocol: TCP
          port: 443
        - protocol: TCP
          port: 6443
EOF
```

## Step 5: Allow Source Controller Access to GitHub Only

If your Git repositories are hosted on GitHub, allow the source-controller to reach GitHub IPs on HTTPS and SSH:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-source-controller-github
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: source-controller
  policyTypes:
    - Egress
  egress:
    # GitHub IP ranges - update these from https://api.github.com/meta
    - to:
        - ipBlock:
            cidr: 140.82.112.0/20
      ports:
        - protocol: TCP
          port: 443
        - protocol: TCP
          port: 22
    - to:
        - ipBlock:
            cidr: 143.55.64.0/20
      ports:
        - protocol: TCP
          port: 443
        - protocol: TCP
          port: 22
    - to:
        - ipBlock:
            cidr: 185.199.108.0/22
      ports:
        - protocol: TCP
          port: 443
        - protocol: TCP
          port: 22
    - to:
        - ipBlock:
            cidr: 192.30.252.0/22
      ports:
        - protocol: TCP
          port: 443
        - protocol: TCP
          port: 22
```

```bash
kubectl apply -f allow-source-github.yaml
```

## Step 5 (Alternative): Allow Access to a Self-Hosted Git Server

If you run a self-hosted Git server (Gitea, GitLab, etc.) on an internal network:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-source-controller-internal-git
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: source-controller
  policyTypes:
    - Egress
  egress:
    - to:
        - ipBlock:
            cidr: 10.0.50.10/32
      ports:
        - protocol: TCP
          port: 443
        - protocol: TCP
          port: 22
        - protocol: TCP
          port: 3000  # Gitea default port
```

Replace `10.0.50.10/32` with the actual IP of your Git server.

## Step 5 (Alternative): Allow Access to GitLab.com

For GitLab.com hosted repositories:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-source-controller-gitlab
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: source-controller
  policyTypes:
    - Egress
  egress:
    - to:
        - ipBlock:
            cidr: 172.65.0.0/16
      ports:
        - protocol: TCP
          port: 443
        - protocol: TCP
          port: 22
```

Resolve current GitLab IPs and adjust the CIDR accordingly:

```bash
dig gitlab.com +short
```

## Step 6: Automate IP Range Updates with a CronJob

Git hosting providers rotate their IP ranges periodically. Create a CronJob to keep the NetworkPolicy up to date:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: update-github-netpol
  namespace: flux-system
spec:
  schedule: "0 */6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: netpol-updater
          containers:
            - name: updater
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  apk add --no-cache curl jq
                  CIDRS=$(curl -s https://api.github.com/meta | jq -r '.git[]' | head -10)
                  # Generate and apply updated NetworkPolicy
                  echo "Updated GitHub CIDRs: $CIDRS"
          restartPolicy: OnFailure
```

This is a starting point. In production, you would generate the full NetworkPolicy manifest in the script and apply it with kubectl.

## Verification

Confirm Flux can still pull from your Git repository:

```bash
flux reconcile source git flux-system
```

Check the source-controller logs for successful fetches:

```bash
kubectl logs -n flux-system deployment/source-controller --tail=20
```

Verify the NetworkPolicies are in place:

```bash
kubectl get networkpolicies -n flux-system
```

Test that other egress is blocked by running a temporary pod in the flux-system namespace:

```bash
kubectl run test-egress --rm -it --image=busybox -n flux-system -- wget -qO- --timeout=5 https://example.com
```

This should time out, confirming that only Git traffic is allowed.

## Troubleshooting

**Source controller reports connection timeouts**

The Git server IP may have changed. Re-resolve the IPs and update the NetworkPolicy:

```bash
dig github.com +short
kubectl get networkpolicy allow-source-controller-github -n flux-system -o yaml
```

**SSH cloning fails but HTTPS works**

Make sure port 22 is included in the egress rules. Some providers use a non-standard SSH port (e.g., GitLab uses port 22 but some self-hosted instances use 2222).

**Multiple Git providers need access**

Create separate NetworkPolicy resources for each provider. Kubernetes NetworkPolicies are additive, so multiple policies targeting the same pods will combine their allowed destinations:

```bash
kubectl apply -f allow-source-github.yaml
kubectl apply -f allow-source-gitlab.yaml
```

**DNS resolution works but connections fail**

Verify the resolved IP falls within the CIDR range in your policy:

```bash
dig github.com +short
# Compare with the CIDRs in your NetworkPolicy
```

If the resolved IP is outside the allowed CIDR, expand the range or add a new egress rule.
