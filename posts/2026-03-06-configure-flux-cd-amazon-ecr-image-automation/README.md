# How to Configure Flux CD with Amazon ECR for Image Automation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, AWS, ECR, Image Automation, Kubernetes, GitOps, IRSA

Description: Learn how to configure Flux CD image automation with Amazon ECR, including IRSA authentication, image scanning, automatic tag updates, and ECR token refresh.

---

Flux CD image automation can monitor Amazon Elastic Container Registry (ECR) for new container image tags and automatically update your Git repository with the latest versions. This guide covers the complete setup, including ECR authentication with IRSA, image scanning policies, and automated Git commits.

## Prerequisites

- Flux CD installed on an Amazon EKS cluster
- IRSA configured for Flux controllers (see the IRSA setup guide)
- Image reflector and automation controllers installed
- A container image pushed to ECR

## Step 1: Install Image Automation Controllers

If you have not already installed the image automation controllers:

```bash
# Bootstrap or upgrade Flux with image automation components
flux bootstrap github \
  --owner=my-org \
  --repository=fleet-infra \
  --path=clusters/production \
  --components-extra=image-reflector-controller,image-automation-controller
```

Verify the controllers are running:

```bash
# Check that image automation pods are running
kubectl get pods -n flux-system | grep image

# Expected output:
# image-automation-controller-xxx   1/1     Running   0          1m
# image-reflector-controller-xxx    1/1     Running   0          1m
```

## Step 2: Configure IRSA for ECR Access

### Create the IAM Policy

```bash
# Create a policy that allows ECR image scanning
cat > /tmp/flux-ecr-image-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "FluxECRImageReflector",
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:DescribeRepositories",
        "ecr:ListImages",
        "ecr:DescribeImages",
        "ecr:ListTagsForResource"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name FluxECRImageReflector \
  --policy-document file:///tmp/flux-ecr-image-policy.json
```

### Create the IAM Role for Image Reflector Controller

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
OIDC_ID=$(aws eks describe-cluster \
  --name my-cluster \
  --query "cluster.identity.oidc.issuer" \
  --output text | cut -d'/' -f5)

cat > /tmp/image-reflector-trust.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/${OIDC_ID}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.eks.us-east-1.amazonaws.com/id/${OIDC_ID}:sub": "system:serviceaccount:flux-system:image-reflector-controller",
          "oidc.eks.us-east-1.amazonaws.com/id/${OIDC_ID}:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
EOF

aws iam create-role \
  --role-name flux-image-reflector \
  --assume-role-policy-document file:///tmp/image-reflector-trust.json

aws iam attach-role-policy \
  --role-name flux-image-reflector \
  --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/FluxECRImageReflector
```

### Annotate the Service Account

```yaml
# clusters/production/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  # Annotate image-reflector-controller with IRSA role
  - target:
      kind: ServiceAccount
      name: image-reflector-controller
    patch: |
      apiVersion: v1
      kind: ServiceAccount
      metadata:
        name: image-reflector-controller
        annotations:
          eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/flux-image-reflector
  # Annotate image-automation-controller for Git write access
  - target:
      kind: ServiceAccount
      name: image-automation-controller
    patch: |
      apiVersion: v1
      kind: ServiceAccount
      metadata:
        name: image-automation-controller
        annotations:
          eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/flux-image-automation
```

## Step 3: Create the ImageRepository

The ImageRepository resource tells Flux which ECR repository to scan:

```yaml
# image-automation/image-repository.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app
  interval: 5m
  provider: aws  # Use IRSA for ECR authentication
```

The `provider: aws` field is critical. It tells Flux to use the AWS SDK credential chain (which includes IRSA) instead of looking for a static secret.

```bash
# Apply and verify
kubectl apply -f image-automation/image-repository.yaml

# Check the scan results
kubectl get imagerepository my-app -n flux-system

# Describe for detailed status
kubectl describe imagerepository my-app -n flux-system
```

Expected output:

```yaml
Status:
  Canonical Image Name:  123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app
  Last Scan Result:
    Scan Time:  2026-03-06T10:00:00Z
    Tag Count:  42
  Conditions:
    Type:    Ready
    Status:  True
    Message: successful scan: found 42 tags
```

## Step 4: Create the ImagePolicy

The ImagePolicy defines how Flux selects the latest image tag:

### Semver-Based Policy

```yaml
# image-automation/image-policy-semver.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      range: ">=1.0.0"  # Select the highest semver tag >= 1.0.0
```

### Timestamp-Based Policy

```yaml
# image-automation/image-policy-timestamp.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^main-[a-f0-9]+-(?P<ts>[0-9]+)'
    extract: '$ts'
  policy:
    numerical:
      order: asc  # Select the tag with the highest timestamp
```

### Alphabetical Policy

```yaml
# image-automation/image-policy-alpha.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^main-'  # Only consider tags starting with 'main-'
  policy:
    alphabetical:
      order: asc  # Select the last alphabetically (latest)
```

```bash
# Apply and verify
kubectl apply -f image-automation/image-policy-semver.yaml

# Check which image was selected
kubectl get imagepolicy my-app -n flux-system

# Expected output shows the latest image
kubectl get imagepolicy my-app -n flux-system \
  -o jsonpath='{.status.latestImage}'
```

## Step 5: Configure Image Update Automation

The ImageUpdateAutomation resource tells Flux to commit image tag changes back to Git:

```yaml
# image-automation/image-update-automation.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: fluxcdbot
        email: fluxcdbot@users.noreply.github.com
      messageTemplate: |
        Automated image update

        Automation name: {{ .AutomationObject }}

        Files:
        {{ range $filename, $_ := .Changed.FileChanges -}}
        - {{ $filename }}
        {{ end -}}

        Objects:
        {{ range $resource, $changes := .Changed.Objects -}}
        - {{ $resource.Kind }}/{{ $resource.Name }} ({{ $resource.Namespace }})
          {{ range $_, $change := $changes -}}
          - {{ $change.OldValue }} -> {{ $change.NewValue }}
          {{ end -}}
        {{ end -}}
    push:
      branch: main
  update:
    path: ./clusters/production  # Only update manifests in this path
    strategy: Setters
```

## Step 6: Add Image Policy Markers to Your Manifests

Flux uses marker comments to know which image tags to update:

```yaml
# clusters/production/apps/my-app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          # The marker comment tells Flux which ImagePolicy to use
          image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app:1.0.0 # {"$imagepolicy": "flux-system:my-app"}
          ports:
            - containerPort: 8080
```

The marker `# {"$imagepolicy": "flux-system:my-app"}` links the image field to the ImagePolicy named `my-app` in the `flux-system` namespace.

## Step 7: Handle ECR Token Refresh

ECR tokens expire after 12 hours. When using IRSA with `provider: aws`, Flux handles token refresh automatically. If you are not using IRSA, you need a CronJob to refresh the token:

```yaml
# ecr-token-refresh.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ecr-token-refresh
  namespace: flux-system
spec:
  schedule: "0 */6 * * *"  # Refresh every 6 hours
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: ecr-token-refresh
          containers:
            - name: ecr-login
              image: amazon/aws-cli:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Get ECR login token
                  TOKEN=$(aws ecr get-login-password --region us-east-1)
                  # Update the Kubernetes secret
                  kubectl create secret docker-registry ecr-credentials \
                    -n flux-system \
                    --docker-server=123456789012.dkr.ecr.us-east-1.amazonaws.com \
                    --docker-username=AWS \
                    --docker-password=$TOKEN \
                    --dry-run=client -o yaml | kubectl apply -f -
          restartPolicy: OnFailure
```

## Troubleshooting ECR Image Automation

```bash
# Check ImageRepository scan status
kubectl describe imagerepository my-app -n flux-system

# Check ImagePolicy selection
kubectl describe imagepolicy my-app -n flux-system

# Check ImageUpdateAutomation status
kubectl describe imageupdateautomation flux-system -n flux-system

# Check image-reflector-controller logs
kubectl logs -n flux-system deployment/image-reflector-controller --tail=50

# Check image-automation-controller logs
kubectl logs -n flux-system deployment/image-automation-controller --tail=50

# Verify IRSA is working
kubectl exec -n flux-system deployment/image-reflector-controller -- env | grep AWS
```

### Common error: "no ECR login credentials"

This typically means IRSA is not configured or the service account is not annotated:

```bash
# Verify the annotation exists
kubectl get sa image-reflector-controller -n flux-system -o yaml | grep -A2 annotations

# Restart the controller after fixing annotations
kubectl rollout restart deployment/image-reflector-controller -n flux-system
```

## Summary

Flux CD image automation with Amazon ECR provides a fully automated deployment pipeline. The image-reflector-controller scans your ECR repositories for new tags, the ImagePolicy selects the latest version based on your rules, and the image-automation-controller commits the updated tag back to your Git repository. Using IRSA eliminates the need for ECR token refresh CronJobs and provides secure, credential-free authentication.
