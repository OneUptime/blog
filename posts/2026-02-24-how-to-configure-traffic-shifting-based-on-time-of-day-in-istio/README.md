# How to Configure Traffic Shifting Based on Time of Day in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Traffic Management, Scheduling, Service Mesh, Kubernetes, CronJob

Description: A practical guide to implementing time-based traffic shifting in Istio using CronJobs and VirtualService weight adjustments for day and night routing strategies.

---

Istio does not have a built-in "route traffic differently at 2 AM versus 2 PM" feature. There is no time-of-day field in VirtualService specs. But there are legitimate reasons you would want time-based traffic routing. Maybe you want to run experimental versions during off-peak hours when fewer users are affected. Or you need to shift traffic to a maintenance backend during scheduled windows. Or your batch processing services need more capacity at night.

The approach that works well is combining Kubernetes CronJobs with Istio VirtualService updates. The CronJob triggers at specific times and patches the VirtualService to adjust traffic weights. It is simple, reliable, and uses tools you already have.

## The Basic Approach

The strategy has three parts:

1. A DestinationRule that defines your service subsets
2. A VirtualService with weighted routing
3. CronJobs that patch the VirtualService weights at scheduled times

## Setting Up Service Subsets

Start with your deployments and a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-api
  namespace: production
spec:
  host: my-api
  subsets:
  - name: stable
    labels:
      version: stable
  - name: experimental
    labels:
      version: experimental
```

## The Daytime VirtualService

During business hours, send all traffic to the stable version:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-api
  namespace: production
spec:
  hosts:
  - my-api
  http:
  - route:
    - destination:
        host: my-api
        subset: stable
      weight: 100
    - destination:
        host: my-api
        subset: experimental
      weight: 0
```

## Creating the CronJob for Night Shift

This CronJob runs at 11 PM and shifts 50% of traffic to the experimental version:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: traffic-shift-night
  namespace: production
spec:
  schedule: "0 23 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: traffic-manager
          containers:
          - name: kubectl
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              kubectl patch virtualservice my-api -n production --type='json' \
                -p='[
                  {"op": "replace", "path": "/spec/http/0/route/0/weight", "value": 50},
                  {"op": "replace", "path": "/spec/http/0/route/1/weight", "value": 50}
                ]'
          restartPolicy: OnFailure
```

And the corresponding CronJob to shift back in the morning:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: traffic-shift-day
  namespace: production
spec:
  schedule: "0 7 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: traffic-manager
          containers:
          - name: kubectl
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              kubectl patch virtualservice my-api -n production --type='json' \
                -p='[
                  {"op": "replace", "path": "/spec/http/0/route/0/weight", "value": 100},
                  {"op": "replace", "path": "/spec/http/0/route/1/weight", "value": 0}
                ]'
          restartPolicy: OnFailure
```

## RBAC for the Traffic Manager

The CronJob needs permission to modify VirtualService resources. Create a ServiceAccount and ClusterRole:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: traffic-manager
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: virtualservice-editor
  namespace: production
rules:
- apiGroups: ["networking.istio.io"]
  resources: ["virtualservices"]
  verbs: ["get", "patch", "update"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: traffic-manager-binding
  namespace: production
subjects:
- kind: ServiceAccount
  name: traffic-manager
  namespace: production
roleRef:
  kind: Role
  name: virtualservice-editor
  apiGroup: rbac.authorization.k8s.io
```

## A More Sophisticated Script Approach

If you need more complex logic than just weight swapping, use a ConfigMap to hold the shifting script:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: traffic-shift-script
  namespace: production
data:
  shift.sh: |
    #!/bin/sh
    set -e

    HOUR=$(date +%H)
    NAMESPACE="production"
    VS_NAME="my-api"

    if [ "$HOUR" -ge 7 ] && [ "$HOUR" -lt 23 ]; then
      # Daytime: 100% stable
      STABLE_WEIGHT=100
      EXPERIMENTAL_WEIGHT=0
      echo "Daytime mode: all traffic to stable"
    elif [ "$HOUR" -ge 23 ] || [ "$HOUR" -lt 3 ]; then
      # Late night: 50/50 split
      STABLE_WEIGHT=50
      EXPERIMENTAL_WEIGHT=50
      echo "Late night mode: 50/50 split"
    else
      # Early morning: 80/20 split
      STABLE_WEIGHT=80
      EXPERIMENTAL_WEIGHT=20
      echo "Early morning mode: 80/20 split"
    fi

    kubectl patch virtualservice $VS_NAME -n $NAMESPACE --type='json' \
      -p="[
        {\"op\": \"replace\", \"path\": \"/spec/http/0/route/0/weight\", \"value\": $STABLE_WEIGHT},
        {\"op\": \"replace\", \"path\": \"/spec/http/0/route/1/weight\", \"value\": $EXPERIMENTAL_WEIGHT}
      ]"

    echo "Traffic weights updated: stable=$STABLE_WEIGHT, experimental=$EXPERIMENTAL_WEIGHT"
```

Then reference it in a CronJob that runs every hour:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: traffic-shift-hourly
  namespace: production
spec:
  schedule: "0 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: traffic-manager
          containers:
          - name: shifter
            image: bitnami/kubectl:latest
            command: ["/bin/sh", "/scripts/shift.sh"]
            volumeMounts:
            - name: script
              mountPath: /scripts
          restartPolicy: OnFailure
          volumes:
          - name: script
            configMap:
              name: traffic-shift-script
              defaultMode: 0755
```

## Handling Timezone Considerations

CronJob schedules use the kube-controller-manager timezone, which defaults to UTC. If your users are in a specific timezone, you need to account for the offset. In Kubernetes 1.27+, you can set the timezone directly:

```yaml
spec:
  schedule: "0 23 * * *"
  timeZone: "America/New_York"
```

For older clusters, just calculate the UTC offset manually. If you want 11 PM Eastern (UTC-5), schedule for 4 AM UTC: `"0 4 * * *"`.

## Monitoring the Shifts

Add some observability around these transitions. You can check the current VirtualService state anytime:

```bash
kubectl get virtualservice my-api -n production -o jsonpath='{.spec.http[0].route[*].weight}'
```

Check CronJob history to make sure shifts are happening:

```bash
kubectl get jobs -n production --sort-by=.metadata.creationTimestamp
```

Review logs from the most recent shift job:

```bash
kubectl logs job/traffic-shift-night-28456789 -n production
```

## Weekend-Specific Routing

You can also create schedules that only run on weekdays or weekends. For example, to only do experimental routing on weekends:

```yaml
spec:
  schedule: "0 0 * * 6"  # Saturday at midnight
```

And revert on Monday morning:

```yaml
spec:
  schedule: "0 6 * * 1"  # Monday at 6 AM
```

## Failure Handling

What happens if the CronJob fails? The traffic stays at whatever weights were set last. This is actually safe because the default state should always be your stable configuration. Set `startingDeadlineSeconds` to handle cases where the job cannot start on time:

```yaml
spec:
  schedule: "0 23 * * *"
  startingDeadlineSeconds: 300
  concurrencyPolicy: Forbid
  failedJobsHistoryLimit: 3
  successfulJobsHistoryLimit: 3
```

The `concurrencyPolicy: Forbid` prevents overlapping jobs if one runs long.

## Summary

Time-based traffic shifting in Istio is a composition of Kubernetes CronJobs and VirtualService patching. You define your traffic routing as normal with DestinationRules and VirtualServices, then use scheduled jobs to modify the weights at the times you need. The RBAC setup is straightforward, and the CronJob spec gives you plenty of flexibility for complex schedules. Always make sure your default state is the safe state - all traffic to stable - so that if any scheduled job fails, your users are unaffected.
