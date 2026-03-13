# How to Configure Network Policies to Allow Flux Registry Access Only

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Security, Network Policies, Container Registry, OCI

Description: Configure Kubernetes NetworkPolicies to restrict the Flux source-controller egress to only your container registries and OCI artifact repositories.

---

Flux uses the source-controller to pull container images, Helm charts stored as OCI artifacts, and other registry-hosted content. In a default setup, the source-controller has unrestricted network access. If you want to follow the principle of least privilege, you should restrict egress to only the container registries your cluster actually uses. This prevents the controller from being used as a network pivot point if it is ever compromised.

This guide demonstrates how to build NetworkPolicies that allow the Flux source-controller to access only specific container registries while blocking all other outbound traffic.

## Prerequisites

- A Kubernetes cluster (v1.24+) with a CNI plugin that enforces NetworkPolicies
- Flux installed in the flux-system namespace
- kubectl with cluster-admin access
- Knowledge of which container registries your Flux installation uses

Identify the registries Flux accesses by listing your image automation and Helm sources:

```bash
# List OCI repositories
kubectl get ocirepositories -A -o jsonpath='{range .items[*]}{.spec.url}{"\n"}{end}'

# List Helm repositories using OCI
kubectl get helmrepositories -A -o jsonpath='{range .items[*]}{.spec.url}{"\n"}{end}'

# List image repositories for automation
kubectl get imagerepositories -A -o jsonpath='{range .items[*]}{.spec.image}{"\n"}{end}'
```

## Step 1: Map Your Registry Endpoints

Determine the IP addresses for each registry your cluster uses.

For Docker Hub:

```bash
dig registry-1.docker.io +short
dig auth.docker.io +short
dig production.cloudflare.docker.com +short
```

For GitHub Container Registry (ghcr.io):

```bash
dig ghcr.io +short
```

For Amazon ECR:

```bash
# Replace with your region and account ID
dig <account-id>.dkr.ecr.<region>.amazonaws.com +short
```

For Google Artifact Registry:

```bash
dig us-docker.pkg.dev +short
dig gcr.io +short
```

For Azure Container Registry:

```bash
dig <registry-name>.azurecr.io +short
```

## Step 2: Create a Default Deny Egress Policy

Block all egress from the flux-system namespace:

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

## Step 3: Allow DNS and Kubernetes API Server

These are required by all Flux controllers:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-and-api
  namespace: flux-system
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    # DNS
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

Apply it:

```bash
kubectl apply -f allow-dns-and-api.yaml
```

Then allow the Kubernetes API server:

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

## Step 4: Allow Source Controller Access to Docker Hub

Docker Hub requires access to multiple endpoints for authentication and image pulls:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-source-controller-dockerhub
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: source-controller
  policyTypes:
    - Egress
  egress:
    # Docker Hub registry
    - to:
        - ipBlock:
            cidr: 44.205.64.0/20
      ports:
        - protocol: TCP
          port: 443
    # Docker Hub auth
    - to:
        - ipBlock:
            cidr: 54.198.86.0/24
      ports:
        - protocol: TCP
          port: 443
    # Cloudflare CDN for Docker layers
    - to:
        - ipBlock:
            cidr: 104.16.0.0/12
      ports:
        - protocol: TCP
          port: 443
```

Note: Docker Hub IPs change frequently. Resolve them before applying and consider automating updates.

## Step 5: Allow Source Controller Access to GitHub Container Registry

For ghcr.io:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-source-controller-ghcr
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
            cidr: 140.82.112.0/20
      ports:
        - protocol: TCP
          port: 443
    - to:
        - ipBlock:
            cidr: 185.199.108.0/22
      ports:
        - protocol: TCP
          port: 443
```

## Step 6: Allow Source Controller Access to Amazon ECR

For ECR, the controller needs to reach the ECR endpoint and the S3 backend where layers are stored:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-source-controller-ecr
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: source-controller
  policyTypes:
    - Egress
  egress:
    # ECR API endpoint
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
            except:
              - 10.0.0.0/8
              - 172.16.0.0/12
              - 192.168.0.0/16
      ports:
        - protocol: TCP
          port: 443
```

For ECR, the broad CIDR is often necessary because AWS uses many IP ranges. You can narrow this using the AWS IP ranges JSON:

```bash
curl -s https://ip-ranges.amazonaws.com/ip-ranges.json | \
  jq -r '.prefixes[] | select(.service=="EC2" and .region=="us-east-1") | .ip_prefix' | head -20
```

## Step 7: Allow Access to a Private Registry

If you run a private registry inside your cluster or on an internal network:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-source-controller-private-registry
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
            cidr: 10.0.100.50/32
      ports:
        - protocol: TCP
          port: 5000
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: registry
          podSelector:
            matchLabels:
              app: registry
      ports:
        - protocol: TCP
          port: 5000
```

The first rule targets a registry at a specific internal IP. The second rule targets a registry running as a pod inside the cluster, matched by namespace and pod labels.

## Verification

Trigger a reconciliation and check that OCI artifacts and Helm charts are pulled successfully:

```bash
flux reconcile source oci <oci-repo-name> -n flux-system
flux reconcile source helm <helm-repo-name> -n flux-system
```

Review the source-controller logs:

```bash
kubectl logs -n flux-system deployment/source-controller --tail=30
```

Verify policies are active:

```bash
kubectl get networkpolicies -n flux-system -o wide
```

Confirm that non-registry traffic is blocked:

```bash
kubectl run test-block -n flux-system --rm -it --image=busybox -- wget -qO- --timeout=5 https://example.com
```

This should fail with a timeout.

## Troubleshooting

**OCI pull fails with timeout errors**

The registry IP may not be covered by your policy CIDR. Resolve the current IP and compare:

```bash
dig ghcr.io +short
kubectl get networkpolicy allow-source-controller-ghcr -n flux-system -o yaml
```

**Authentication to registry fails**

Some registries use separate auth endpoints (e.g., Docker Hub uses auth.docker.io). Make sure the auth endpoint IP is also included in your policy.

```bash
dig auth.docker.io +short
```

**Helm chart download fails but image pull works**

OCI-based Helm charts may use a different registry endpoint than container images. Check the HelmRepository URL and ensure that endpoint is allowed.

**ECR token refresh fails**

If you use IRSA (IAM Roles for Service Accounts) with ECR, the source-controller needs access to the STS endpoint for token exchange. Add the STS endpoint to the policy:

```bash
dig sts.us-east-1.amazonaws.com +short
```

**Policy has no effect**

Verify your CNI supports NetworkPolicies. Some lightweight CNIs like Flannel do not enforce them:

```bash
kubectl get pods -n kube-system | grep -E 'calico|cilium|weave'
```

If none of these are present, your NetworkPolicies may not be enforced.
