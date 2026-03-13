# How to Deploy AWS X-Ray Daemon with Flux on EKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, AWS, EKS, X-Ray, Distributed Tracing, Observability, Helm

Description: Learn how to deploy the AWS X-Ray daemon on EKS using Flux for GitOps-managed distributed tracing, enabling request tracking across microservices.

---

## What is AWS X-Ray

AWS X-Ray is a distributed tracing service that helps developers analyze and debug applications composed of microservices. The X-Ray daemon listens for trace data from instrumented applications and forwards it to the X-Ray service for visualization, analysis, and debugging. Deploying it on EKS allows all your Kubernetes workloads to send trace data without individual configuration.

## Prerequisites

- An EKS cluster with the OIDC provider enabled
- Flux installed on the EKS cluster
- Applications instrumented with the X-Ray SDK
- IAM permissions for X-Ray

## Repository Structure

```text
flux-repo/
├── clusters/
│   └── production/
│       └── tracing.yaml
└── infrastructure/
    └── xray/
        ├── kustomization.yaml
        ├── namespace.yaml
        ├── service-account.yaml
        ├── daemonset.yaml
        └── service.yaml
```

## Step 1: Create the IAM Policy

```bash
cat > xray-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "xray:PutTraceSegments",
        "xray:PutTelemetryRecords",
        "xray:GetSamplingRules",
        "xray:GetSamplingTargets",
        "xray:GetSamplingStatisticSummaries"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name XRayDaemonEKSPolicy \
  --policy-document file://xray-policy.json
```

## Step 2: Create the IAM Role

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
OIDC_PROVIDER=$(aws eks describe-cluster --name my-cluster \
  --query "cluster.identity.oidc.issuer" --output text | sed 's|https://||')

cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/${OIDC_PROVIDER}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "${OIDC_PROVIDER}:sub": "system:serviceaccount:xray-system:xray-daemon",
          "${OIDC_PROVIDER}:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
EOF

aws iam create-role \
  --role-name EKSXRayDaemonRole \
  --assume-role-policy-document file://trust-policy.json

aws iam attach-role-policy \
  --role-name EKSXRayDaemonRole \
  --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/XRayDaemonEKSPolicy"
```

## Step 3: Define Flux Resources

```yaml
# infrastructure/xray/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: xray-system
  labels:
    name: xray-system
```

```yaml
# infrastructure/xray/service-account.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: xray-daemon
  namespace: xray-system
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/EKSXRayDaemonRole
```

```yaml
# infrastructure/xray/daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: xray-daemon
  namespace: xray-system
spec:
  selector:
    matchLabels:
      app: xray-daemon
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
  template:
    metadata:
      labels:
        app: xray-daemon
    spec:
      serviceAccountName: xray-daemon
      terminationGracePeriodSeconds: 60
      containers:
        - name: xray-daemon
          image: public.ecr.aws/xray/aws-xray-daemon:3.3.7
          command:
            - /usr/bin/xray
            - --bind=0.0.0.0:2000
            - --bind-tcp=0.0.0.0:2000
            - --region=us-east-1
            - --log-level=info
          ports:
            - name: xray-udp
              containerPort: 2000
              hostPort: 2000
              protocol: UDP
            - name: xray-tcp
              containerPort: 2000
              hostPort: 2000
              protocol: TCP
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 100m
              memory: 128Mi
          readinessProbe:
            tcpSocket:
              port: 2000
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            tcpSocket:
              port: 2000
            initialDelaySeconds: 15
            periodSeconds: 20
      tolerations:
        - key: node-role.kubernetes.io/master
          effect: NoSchedule
```

```yaml
# infrastructure/xray/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: xray-daemon
  namespace: xray-system
spec:
  selector:
    app: xray-daemon
  type: ClusterIP
  ports:
    - name: xray-udp
      port: 2000
      targetPort: 2000
      protocol: UDP
    - name: xray-tcp
      port: 2000
      targetPort: 2000
      protocol: TCP
```

```yaml
# infrastructure/xray/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - service-account.yaml
  - daemonset.yaml
  - service.yaml
```

## Step 4: Configure Flux Kustomization

```yaml
# clusters/production/tracing.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: xray
  namespace: flux-system
spec:
  interval: 1h
  retryInterval: 1m
  timeout: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/xray
  prune: true
  wait: true
  healthChecks:
    - apiVersion: apps/v1
      kind: DaemonSet
      name: xray-daemon
      namespace: xray-system
```

## Step 5: Configure Applications to Send Traces

Applications need to know where the X-Ray daemon is running. There are two approaches:

### Option A: Using the DaemonSet Host IP

Configure applications to send traces to the daemon running on the same node:

```yaml
# apps/production/my-service/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-service
  template:
    metadata:
      labels:
        app: my-service
    spec:
      containers:
        - name: my-service
          image: myregistry/my-service:v1.0
          env:
            - name: AWS_XRAY_DAEMON_ADDRESS
              value: xray-daemon.xray-system.svc.cluster.local:2000
            - name: AWS_XRAY_TRACING_NAME
              value: my-service
          ports:
            - containerPort: 8080
```

### Option B: Using the X-Ray Sidecar Pattern

For more isolated tracing, deploy X-Ray as a sidecar:

```yaml
# apps/production/my-service/deployment-sidecar.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-service
  template:
    metadata:
      labels:
        app: my-service
    spec:
      serviceAccountName: my-service
      containers:
        - name: my-service
          image: myregistry/my-service:v1.0
          env:
            - name: AWS_XRAY_DAEMON_ADDRESS
              value: "127.0.0.1:2000"
          ports:
            - containerPort: 8080
        - name: xray-sidecar
          image: public.ecr.aws/xray/aws-xray-daemon:3.3.7
          command:
            - /usr/bin/xray
            - --bind=0.0.0.0:2000
            - --bind-tcp=0.0.0.0:2000
            - --region=us-east-1
          ports:
            - containerPort: 2000
              protocol: UDP
          resources:
            requests:
              cpu: 25m
              memory: 32Mi
            limits:
              cpu: 50m
              memory: 64Mi
```

## Step 6: Sampling Rules Configuration

Create custom sampling rules to control trace volume:

```yaml
# infrastructure/xray/sampling-rules.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: xray-sampling-rules
  namespace: xray-system
data:
  sampling-rules.json: |
    {
      "version": 2,
      "rules": [
        {
          "description": "Health check - low sampling",
          "host": "*",
          "http_method": "GET",
          "url_path": "/health",
          "fixed_target": 0,
          "rate": 0.01,
          "service_name": "*",
          "service_type": "*",
          "resource_arn": "*",
          "priority": 1
        },
        {
          "description": "API requests - normal sampling",
          "host": "*",
          "http_method": "*",
          "url_path": "/api/*",
          "fixed_target": 1,
          "rate": 0.1,
          "service_name": "*",
          "service_type": "*",
          "resource_arn": "*",
          "priority": 100
        }
      ],
      "default": {
        "fixed_target": 1,
        "rate": 0.05
      }
    }
```

## Integrating with AWS Distro for OpenTelemetry (ADOT)

For a more modern approach, you can use the ADOT collector instead of the standalone X-Ray daemon:

```yaml
# infrastructure/xray/adot-collector.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: adot-collector
  namespace: xray-system
spec:
  interval: 1h
  chart:
    spec:
      chart: adot-exporter-for-eks-on-ec2
      version: "0.15.x"
      sourceRef:
        kind: HelmRepository
        name: eks-charts
        namespace: flux-system
  values:
    clusterName: my-cluster
    awsRegion: us-east-1
    serviceAccount:
      create: false
      name: xray-daemon
```

## Verifying the Deployment

```bash
# Check X-Ray daemon pods
kubectl get pods -n xray-system -l app=xray-daemon

# Verify daemon is running on all nodes
kubectl get pods -n xray-system -o wide

# Check daemon logs for trace processing
kubectl logs -n xray-system daemonset/xray-daemon --tail=20

# Verify traces in AWS console
aws xray get-trace-summaries \
  --start-time $(date -u -v-1H +%s) \
  --end-time $(date -u +%s)

# Check Flux kustomization status
flux get kustomization xray
```

## Conclusion

Deploying the AWS X-Ray daemon with Flux on EKS provides GitOps-managed distributed tracing for your microservices. By running the daemon as a DaemonSet, every node in your cluster has a local trace collector, minimizing latency for trace data submission. The IRSA integration ensures secure access to the X-Ray API, and Flux ensures the tracing infrastructure is always running and properly configured. For teams adopting OpenTelemetry, the ADOT collector provides a standards-based alternative that supports X-Ray as an export destination.
