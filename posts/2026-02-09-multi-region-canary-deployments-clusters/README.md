# How to Implement Multi-Region Canary Deployments Across Kubernetes Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Multi-Region, Canary

Description: Learn how to implement canary deployments across multiple Kubernetes clusters in different regions for safe global rollouts with regional isolation and coordinated traffic shifting.

---

Rolling out changes globally carries massive risk. A bug that affects one region affects all regions simultaneously. Multi-region canary deployments let you test changes in one region before expanding to others, containing the blast radius of failures.

## Multi-Region Architecture

Deploy the same application across multiple Kubernetes clusters in different regions:

```
Region: us-east-1 (Cluster A)
Region: eu-west-1 (Cluster B)
Region: ap-southeast-1 (Cluster C)
```

Canary deployment progression:
1. Deploy canary to us-east-1
2. Monitor metrics for us-east-1
3. If successful, deploy to eu-west-1
4. Monitor metrics for eu-west-1
5. If successful, deploy to ap-southeast-1
6. Monitor and complete rollout

## Global Traffic Management with External DNS

Use external DNS and load balancers to route regional traffic:

```yaml
# GeoDNS configuration (example with Route53)
apiVersion: externaldns.k8s.io/v1alpha1
kind: DNSEndpoint
metadata:
  name: web-app-global
spec:
  endpoints:
  - dnsName: app.example.com
    recordType: A
    targets:
    - us-east-nlb.example.com
    - eu-west-nlb.example.com
    - ap-southeast-nlb.example.com
    providerSpecific:
    - name: aws/route53/geolocation-continent-code
      value: NA  # North America -> us-east
  - dnsName: app.example.com
    recordType: A
    targets:
    - eu-west-nlb.example.com
    providerSpecific:
    - name: aws/route53/geolocation-continent-code
      value: EU  # Europe -> eu-west
```

## Regional Canary Rollout

Deploy canary to first region:

```yaml
# us-east-1 cluster
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: web-app
  namespace: production
  labels:
    region: us-east-1
spec:
  replicas: 20
  selector:
    matchLabels:
      app: web-app
      region: us-east-1
  template:
    metadata:
      labels:
        app: web-app
        region: us-east-1
    spec:
      containers:
      - name: web
        image: myregistry.io/web-app:v1.0.0
        ports:
        - containerPort: 8080
  strategy:
    canary:
      steps:
      - setWeight: 10
      - pause: {duration: 10m}
      - setWeight: 25
      - pause: {duration: 10m}
      - setWeight: 50
      - pause: {duration: 10m}
      - setWeight: 100
      analysis:
        templates:
        - templateName: regional-health
        args:
        - name: region
          value: us-east-1
```

## Coordinated Multi-Region Rollout

Use GitOps with Argo CD to coordinate rollouts across regions:

```yaml
# ArgoCD ApplicationSet for multi-region
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: web-app-multi-region
  namespace: argocd
spec:
  generators:
  - list:
      elements:
      - region: us-east-1
        cluster: cluster-a
        weight: 100  # Start here
      - region: eu-west-1
        cluster: cluster-b
        weight: 0    # Deploy after us-east-1
      - region: ap-southeast-1
        cluster: cluster-c
        weight: 0    # Deploy last
  template:
    metadata:
      name: 'web-app-{{region}}'
    spec:
      project: production
      source:
        repoURL: https://github.com/myorg/deployments
        targetRevision: HEAD
        path: 'rollouts/{{region}}'
      destination:
        server: '{{cluster}}'
        namespace: production
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

## Progressive Regional Rollout Script

Automate regional progression:

```bash
#!/bin/bash
# multi-region-canary.sh

REGIONS=("us-east-1" "eu-west-1" "ap-southeast-1")
IMAGE=$1

for region in "${REGIONS[@]}"; do
  echo "Starting canary rollout in $region..."

  # Set kubectl context for region
  kubectl config use-context $region

  # Update image
  kubectl argo rollouts set image web-app \
    web=$IMAGE \
    -n production

  # Wait for rollout to complete
  echo "Waiting for $region rollout..."
  kubectl argo rollouts status web-app -n production --watch

  # Check if rollout succeeded
  STATUS=$(kubectl argo rollouts status web-app -n production | grep "Healthy")

  if [ -z "$STATUS" ]; then
    echo "Rollout failed in $region! Aborting global rollout."

    # Rollback this region
    kubectl argo rollouts abort web-app -n production

    # Rollback all previous regions
    for rollback_region in "${REGIONS[@]}"; do
      if [ "$rollback_region" == "$region" ]; then
        break
      fi
      kubectl config use-context $rollback_region
      kubectl argo rollouts undo web-app -n production
    done

    exit 1
  fi

  echo "$region rollout successful!"
  echo "Waiting 15 minutes before next region..."
  sleep 900
done

echo "Global rollout complete!"
```

## Regional Metric Analysis

Analyze metrics per region:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: regional-health
spec:
  args:
  - name: region
  metrics:
  - name: regional-error-rate
    interval: 1m
    count: 10
    successCondition: result < 0.01
    provider:
      prometheus:
        address: http://prometheus:9090
        query: |
          sum(rate(
            http_requests_total{
              region="{{ args.region }}",
              status=~"5.."
            }[5m]
          ))
          /
          sum(rate(
            http_requests_total{
              region="{{ args.region }}"
            }[5m]
          ))

  - name: regional-latency
    interval: 1m
    count: 10
    successCondition: result < 0.5
    provider:
      prometheus:
        address: http://prometheus:9090
        query: |
          histogram_quantile(0.95,
            sum(rate(
              http_request_duration_seconds_bucket{
                region="{{ args.region }}"
              }[5m]
            )) by (le)
          )
```

## Traffic Shifting Across Regions

Use global load balancer weights to shift traffic:

```yaml
# AWS Global Accelerator or similar
apiVersion: v1
kind: ConfigMap
metadata:
  name: traffic-weights
data:
  weights.json: |
    {
      "us-east-1": {
        "canary": 10,
        "stable": 90
      },
      "eu-west-1": {
        "canary": 0,
        "stable": 100
      },
      "ap-southeast-1": {
        "canary": 0,
        "stable": 100
      }
    }
```

Update weights programmatically as canary progresses.

## Regional Rollback Strategy

Rollback affected regions independently:

```bash
# Rollback specific region
REGION="eu-west-1"
kubectl config use-context $REGION
kubectl argo rollouts undo web-app -n production

# Verify rollback
kubectl argo rollouts status web-app -n production
```

## Monitoring Multi-Region Rollouts

Track rollout status across all regions:

```promql
# Rollout status by region
argo_rollouts_info{rollout="web-app"}

# Success rate comparison across regions
rate(http_requests_total{status!~"5.."}[5m])
  /
rate(http_requests_total[5m])

# Regional latency comparison
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, region)
)
```

Create dashboard comparing metrics across regions.

## Staggered Deployment Schedule

Deploy during low-traffic periods per region:

```yaml
# CronJob for scheduled regional deployments
apiVersion: batch/v1
kind: CronJob
metadata:
  name: web-app-rollout-us-east
spec:
  # 2 AM EST (7 AM UTC)
  schedule: "0 7 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: deploy
            image: argoproj/kubectl-argo-rollouts:latest
            command:
            - /bin/sh
            - -c
            - |
              kubectl config use-context us-east-1
              kubectl argo rollouts set image web-app \
                web=myregistry.io/web-app:$(date +%Y%m%d)
          restartPolicy: Never
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: web-app-rollout-eu-west
spec:
  # 2 AM CET (1 AM UTC)
  schedule: "0 1 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: deploy
            image: argoproj/kubectl-argo-rollouts:latest
            command:
            - /bin/sh
            - -c
            - |
              kubectl config use-context eu-west-1
              kubectl argo rollouts set image web-app \
                web=myregistry.io/web-app:$(date +%Y%m%d)
          restartPolicy: Never
```

## Best Practices

**Start with smallest region**. Deploy to your region with least traffic first.

**Wait between regions**. Give time to detect issues before expanding.

**Monitor cross-region metrics**. Compare regions to detect anomalies.

**Have regional rollback plans**. Be ready to roll back individual regions independently.

**Test multi-region rollback**. Practice rolling back specific regions.

**Communicate rollout progress**. Keep stakeholders informed about which regions are updated.

**Consider time zones**. Deploy during low-traffic periods for each region.

## Conclusion

Multi-region canary deployments provide the ultimate safety for global applications. By rolling out to one region at a time, you contain failures to a subset of users and infrastructure.

Use progressive rollouts across regions, monitor regional metrics independently, and be prepared to rollback specific regions while keeping others stable. This approach turns a risky global deployment into a series of manageable regional rollouts.
