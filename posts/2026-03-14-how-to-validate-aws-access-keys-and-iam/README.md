# Validating AWS Access Keys and IAM Roles in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, AWS, IAM, Validation

Description: How to validate AWS IAM configuration for Cilium to ensure correct authentication, minimal permissions, and secure credential handling.

---

## Introduction

Validating AWS IAM configuration for Cilium ensures authentication works, permissions are minimal, and credentials are handled securely. Run these checks after initial setup, after IAM changes, and during security audits.

## Prerequisites

- EKS cluster with Cilium
- kubectl, jq, and AWS CLI configured
- AWS_REGION set to the cluster's AWS region

## Validating Authentication

```bash
#!/bin/bash
echo "=== AWS IAM Validation for Cilium ==="

: "${AWS_REGION:?Set AWS_REGION to your cluster's AWS region}"

run_as_cilium_operator() {
  kubectl run cilium-iam-check -n kube-system --rm -i --restart=Never --quiet \
    --image=public.ecr.aws/aws-cli/aws-cli:latest \
    --overrides='{"spec":{"serviceAccountName":"cilium-operator"}}' \
    --env="AWS_REGION=${AWS_REGION}" -- "$@"
}

# Test authentication

IDENTITY=$(run_as_cilium_operator sts get-caller-identity 2>&1)
if echo "$IDENTITY" | jq -e '.Arn' &>/dev/null; then
  echo "PASS: Authentication works"
  echo "  Role: $(echo "$IDENTITY" | jq -r '.Arn')"
else
  echo "FAIL: Authentication failed"
  echo "  Error: $IDENTITY"
fi

# Test ENI operations
ENIS=$(run_as_cilium_operator ec2 describe-network-interfaces --max-items 1 2>&1)
if echo "$ENIS" | jq -e '.NetworkInterfaces' &>/dev/null; then
  echo "PASS: ENI API access works"
else
  echo "FAIL: ENI API access denied"
fi
```

## Validating Least Privilege

```bash
# Test actions that should be denied
CILIUM_ROLE_ARN=${CILIUM_ROLE_ARN:-$(kubectl get sa cilium-operator -n kube-system \
  -o jsonpath='{.metadata.annotations.eks\.amazonaws\.com/role-arn}')}
: "${CILIUM_ROLE_ARN:?Set CILIUM_ROLE_ARN to the Cilium operator IAM role ARN}"

for action in s3:ListBuckets iam:CreateUser ec2:TerminateInstances; do
  RESULT=$(aws iam simulate-principal-policy \
    --policy-source-arn "$CILIUM_ROLE_ARN" \
    --action-names "$action" --query 'EvaluationResults[0].EvalDecision' --output text)
  if [ "$RESULT" = "implicitDeny" ] || [ "$RESULT" = "explicitDeny" ]; then
    echo "PASS: $action is denied"
  else
    echo "FAIL: $action is allowed (should be denied)"
  fi
done
```

```mermaid
graph TD
    A[Validate IAM] --> B[Test Auth]
    B --> C[Test Required Perms]
    C --> D[Test Denied Perms]
    D --> E[Check Credential Storage]
    E --> F{All Pass?}
    F -->|Yes| G[Valid]
    F -->|No| H[Fix]
```

## Verification

```bash
cilium status | grep IPAM
kubectl get sa cilium-operator -n kube-system -o yaml
```

## Troubleshooting

- **Auth validation fails**: Check IRSA setup and role trust policy.
- **Overly broad permissions**: Tighten IAM policy immediately.
- **Cannot simulate policies**: Ensure you have iam:SimulatePrincipalPolicy permission.

## Conclusion

Validate AWS IAM for Cilium by testing authentication, verifying required permissions work, and confirming unnecessary permissions are denied. This ensures both functionality and security.
