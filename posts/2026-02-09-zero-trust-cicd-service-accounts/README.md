# How to Implement Zero-Trust CI/CD by Restricting Pipeline Service Account Permissions in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Security, CI/CD, Kubernetes

Description: Learn how to implement zero-trust security principles in CI/CD pipelines by using scoped service accounts with minimal permissions, workload identity, and runtime policy enforcement in Kubernetes.

---

Traditional CI/CD pipelines often run with excessive permissions, granting cluster-admin access to deployment automation. This creates a massive attack surface where compromised pipelines can access secrets, modify critical workloads, or escalate privileges. Zero-trust CI/CD eliminates this risk by granting pipelines only the minimum permissions required for their specific tasks. This guide demonstrates implementing granular RBAC, workload identity federation, and runtime policy enforcement.

## The Problem with Traditional CI/CD Permissions

Most CI/CD systems authenticate to Kubernetes using a single service account with broad permissions. This account can typically create, update, and delete any resource in any namespace. While convenient for development, this violates the principle of least privilege. A compromised pipeline or malicious code in a build step gains full cluster control.

The blast radius extends beyond the immediate pipeline. CI/CD systems store credentials that grant this access, making them high-value targets. A breach of your CI/CD infrastructure means an attacker can deploy malicious workloads, exfiltrate secrets, or establish persistence in your clusters.

## Designing Scoped Service Accounts

Create dedicated service accounts for each pipeline with permissions scoped to specific namespaces and operations:

```yaml
# service-accounts/app-deployer.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-deployer
  namespace: myapp-production
  annotations:
    # Document the purpose and expected usage
    purpose: "Deploy myapp application to production"
    owner: "platform-team@company.com"
---
# Grant minimal permissions for deployment
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: app-deployer-role
  namespace: myapp-production
rules:
  # Can manage Deployments
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
    resourceNames: ["myapp"]  # Only this specific deployment

  # Can read deployment status
  - apiGroups: ["apps"]
    resources: ["deployments/status"]
    verbs: ["get"]
    resourceNames: ["myapp"]

  # Can manage associated ReplicaSets (needed for rollout)
  - apiGroups: ["apps"]
    resources: ["replicasets"]
    verbs: ["get", "list", "watch"]

  # Can read Pods to verify deployment
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]
    # Note: No resourceNames restriction - pods are created dynamically

  # Can read ConfigMaps and Secrets referenced by the deployment
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get"]
    resourceNames: ["myapp-config"]

  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get"]
    resourceNames: ["myapp-secrets"]

  # Explicitly deny dangerous operations
  # (Kubernetes RBAC is additive, but documenting what's NOT allowed helps)
  # Cannot: delete resources, access other namespaces, modify RBAC
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: app-deployer-binding
  namespace: myapp-production
subjects:
  - kind: ServiceAccount
    name: app-deployer
    namespace: myapp-production
roleRef:
  kind: Role
  name: app-deployer-role
  apiGroup: rbac.authorization.k8s.io
```

This service account can only deploy a specific application in a specific namespace, reading only the ConfigMaps and Secrets it needs.

## Implementing Workload Identity Federation

Instead of distributing long-lived service account tokens, use workload identity to authenticate pipelines dynamically:

```yaml
# For GitHub Actions using OIDC
# Step 1: Configure Kubernetes OIDC trust
apiVersion: v1
kind: ServiceAccount
metadata:
  name: github-actions-deployer
  namespace: myapp-production
  annotations:
    # Trust GitHub's OIDC provider
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/github-actions-deployer
    # Or for GKE
    iam.gke.io/gcp-service-account: github-actions@project-id.iam.gserviceaccount.com
```

Configure your cloud provider IAM to trust GitHub's OIDC provider:

```bash
# AWS example - create IAM role that trusts GitHub OIDC
cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:your-org/your-repo:*"
        }
      }
    }
  ]
}
EOF

aws iam create-role \
  --role-name github-actions-deployer \
  --assume-role-policy-document file://trust-policy.json
```

Use this identity in GitHub Actions without storing credentials:

```yaml
# .github/workflows/deploy.yml
name: Deploy with Workload Identity

on:
  push:
    branches: [main]

permissions:
  id-token: write  # Required for OIDC token
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials (no secrets needed!)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions-deployer
          aws-region: us-west-2

      - name: Update kubeconfig
        run: |
          aws eks update-kubeconfig --name my-cluster --region us-west-2

      - name: Deploy (using scoped service account)
        run: |
          kubectl set image deployment/myapp \
            myapp=myregistry.azurecr.io/myapp:${{ github.sha }} \
            -n myapp-production \
            --as=system:serviceaccount:myapp-production:app-deployer
```

This approach eliminates stored credentials entirely. Each pipeline run receives a short-lived token valid only for that specific repository and job.

## Enforcing Runtime Policy with OPA Gatekeeper

Add admission control policies to enforce additional constraints on what pipelines can deploy:

```yaml
# opa-policies/restrict-privileged-containers.yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8sblockprivileged
spec:
  crd:
    spec:
      names:
        kind: K8sBlockPrivileged
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8sblockprivileged

        violation[{"msg": msg}] {
          # Check if request is from CI/CD service account
          input.review.userInfo.username == "system:serviceaccount:myapp-production:app-deployer"

          # Block privileged containers
          container := input.review.object.spec.template.spec.containers[_]
          container.securityContext.privileged == true

          msg := sprintf("CI/CD pipelines cannot deploy privileged containers: %v", [container.name])
        }

        violation[{"msg": msg}] {
          # Also block hostPath mounts
          input.review.userInfo.username == "system:serviceaccount:myapp-production:app-deployer"
          volume := input.review.object.spec.template.spec.volumes[_]
          volume.hostPath

          msg := "CI/CD pipelines cannot deploy pods with hostPath volumes"
        }
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sBlockPrivileged
metadata:
  name: block-privileged-from-cicd
spec:
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment"]
    namespaces: ["myapp-production"]
```

This policy blocks CI/CD service accounts from deploying workloads with elevated privileges, even if RBAC would allow it.

## Implementing Just-In-Time Access

For sensitive operations like production deployments, require manual approval:

```yaml
# .github/workflows/deploy-prod.yml
name: Production Deployment

on:
  workflow_dispatch:

jobs:
  request-approval:
    runs-on: ubuntu-latest
    environment:
      name: production
      # GitHub environment protection rules require approval
    steps:
      - name: Approval granted
        run: echo "Proceeding with deployment"

  deploy:
    needs: request-approval
    runs-on: ubuntu-latest
    steps:
      # Generate time-limited token
      - name: Request temporary credentials
        id: creds
        run: |
          # Call internal API that vends short-lived credentials
          TEMP_TOKEN=$(curl -X POST https://vault.company.com/api/cicd/token \
            -H "Authorization: Bearer ${{ secrets.VAULT_TOKEN }}" \
            -d '{"ttl": "5m", "namespace": "myapp-production"}' \
            | jq -r .token)

          echo "::add-mask::${TEMP_TOKEN}"
          echo "token=${TEMP_TOKEN}" >> $GITHUB_OUTPUT

      - name: Deploy with temporary credentials
        env:
          KUBE_TOKEN: ${{ steps.creds.outputs.token }}
        run: |
          kubectl set image deployment/myapp \
            myapp=myregistry.azurecr.io/myapp:${{ github.sha }} \
            --token="${KUBE_TOKEN}"
```

This ensures production deployments require human approval and use credentials that expire after a few minutes.

## Auditing Pipeline Actions

Enable comprehensive audit logging for all pipeline operations:

```yaml
# audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Log all actions by CI/CD service accounts at RequestResponse level
  - level: RequestResponse
    users:
      - "system:serviceaccount:myapp-production:app-deployer"
      - "system:serviceaccount:*:*-deployer"  # All deployer accounts
    verbs: ["create", "update", "patch", "delete"]

  # Also log access to secrets
  - level: RequestResponse
    users:
      - "system:serviceaccount:myapp-production:app-deployer"
    resources:
      - group: ""
        resources: ["secrets", "configmaps"]
    verbs: ["get", "list"]
```

Ship these audit logs to a SIEM for anomaly detection:

```bash
# Example: detect unusual access patterns
kubectl logs -n kube-system kube-apiserver-* | \
  jq 'select(.user.username | startswith("system:serviceaccount")) |
      select(.verb == "delete") |
      select(.objectRef.resource == "deployment")' | \
  # Alert if CI/CD account deletes deployments (should only update)
```

## Network Segmentation for CI/CD

Restrict network access for pipeline workloads using NetworkPolicies:

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: cicd-egress-policy
  namespace: myapp-production
spec:
  podSelector:
    matchLabels:
      app: deployment-agent  # Pods running with CI/CD service account
  policyTypes:
    - Egress
  egress:
    # Allow access to Kubernetes API
    - to:
        - namespaceSelector:
            matchLabels:
              name: kube-system
      ports:
        - protocol: TCP
          port: 443

    # Allow access to container registry
    - to:
        - podSelector: {}
      ports:
        - protocol: TCP
          port: 5000  # Internal registry

    # Block access to other services
    # (no rule = deny all other egress)
```

This prevents compromised CI/CD workloads from accessing internal services or exfiltrating data.

## Validating Deployments with Policy-as-Code

Before deployment, validate manifests against security policies:

```yaml
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Conftest
        run: |
          wget https://github.com/open-policy-agent/conftest/releases/download/v0.48.0/conftest_0.48.0_Linux_x86_64.tar.gz
          tar xzf conftest_0.48.0_Linux_x86_64.tar.gz
          sudo mv conftest /usr/local/bin/

      - name: Validate against security policies
        run: |
          conftest test k8s/*.yaml -p policies/

# policies/deployment.rego
package main

deny[msg] {
  input.kind == "Deployment"
  not input.spec.template.spec.securityContext.runAsNonRoot

  msg := "Deployments must set runAsNonRoot: true"
}

deny[msg] {
  input.kind == "Deployment"
  container := input.spec.template.spec.containers[_]
  not container.securityContext.allowPrivilegeEscalation == false

  msg := sprintf("Container %v must set allowPrivilegeEscalation: false", [container.name])
}
```

This catches security issues before deployment attempts, failing pipelines that don't meet policy requirements.

## Rotating Service Account Tokens

Even with scoped permissions, rotate service account tokens regularly:

```bash
#!/bin/bash
# rotate-sa-tokens.sh

NAMESPACE="myapp-production"
SA_NAME="app-deployer"

# Delete existing token secret
kubectl delete secret \
  -n "${NAMESPACE}" \
  -l kubernetes.io/service-account.name="${SA_NAME}"

# Kubernetes automatically creates a new token
# Update CI/CD system with new token
NEW_TOKEN=$(kubectl get secret \
  -n "${NAMESPACE}" \
  -l kubernetes.io/service-account.name="${SA_NAME}" \
  -o jsonpath='{.items[0].data.token}' | base64 -d)

# Update CI/CD secret store (GitHub, GitLab, etc.)
gh secret set KUBE_TOKEN --body "${NEW_TOKEN}"
```

Run this as a CronJob every 30 days to limit token exposure window.

## Conclusion

Zero-trust CI/CD eliminates the excessive permissions that make traditional pipelines attractive attack targets. By implementing scoped service accounts, workload identity federation, runtime policy enforcement, and comprehensive auditing, you reduce the blast radius of pipeline compromises from cluster-wide to a single application deployment.

The key is treating CI/CD systems as untrusted by default, granting only the minimum permissions required for specific operations. Combined with just-in-time access for sensitive deployments and continuous validation of security policies, you build deployment automation that maintains velocity while dramatically improving your security posture.
