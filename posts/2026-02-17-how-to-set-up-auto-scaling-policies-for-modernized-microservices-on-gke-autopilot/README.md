# How to Set Up Auto-Scaling Policies for Modernized Microservices on GKE Autopilot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, Autopilot, Kubernetes, Auto-Scaling, Microservices, HPA

Description: Configure horizontal pod autoscaling, vertical pod autoscaling, and custom metrics scaling for microservices running on GKE Autopilot to handle variable workloads efficiently.

---

GKE Autopilot takes away most of the cluster-level operational burden - node provisioning, node pools, scaling the underlying infrastructure. But you still need to think about pod-level scaling. Your microservices need to scale up when traffic increases and scale down when things are quiet. Getting this right means your application handles load smoothly without wasting money on idle pods.

This post covers how to set up Horizontal Pod Autoscaler (HPA), Vertical Pod Autoscaler (VPA), and custom metrics-based scaling for microservices on GKE Autopilot.

## How Autopilot Scaling Differs from Standard GKE

In standard GKE, you manage two layers of scaling: the cluster autoscaler (adds/removes nodes) and the pod autoscaler (adds/removes pod replicas). In Autopilot, Google manages the node layer entirely. You only deal with pod-level scaling.

This is simpler, but it means your pod resource requests matter more. Autopilot provisions node capacity based on your pod resource requests, so if your requests are too high, you pay for unused resources. If they are too low, your pods might get throttled.

## Setting Up Horizontal Pod Autoscaler (HPA)

HPA is the most common scaling mechanism. It adjusts the number of pod replicas based on CPU utilization, memory usage, or custom metrics. Here is a deployment and HPA configuration for a typical API service.

First, the deployment with proper resource requests:

```yaml
# api-deployment.yaml - Microservice deployment with resource requests
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: production
spec:
  # Do not set replicas here - HPA will manage this
  selector:
    matchLabels:
      app: api-service
  template:
    metadata:
      labels:
        app: api-service
    spec:
      containers:
        - name: api
          image: us-docker.pkg.dev/my-project/services/api-service:v1.2.0
          ports:
            - containerPort: 8080
          resources:
            requests:
              # Set requests based on actual observed usage
              cpu: "250m"
              memory: "256Mi"
            limits:
              # In Autopilot, limits default to requests if not set
              cpu: "500m"
              memory: "512Mi"
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 20
```

Now the HPA:

```yaml
# api-hpa.yaml - Horizontal Pod Autoscaler for the API service
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-service-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-service
  minReplicas: 2        # Always keep at least 2 for availability
  maxReplicas: 20       # Cap at 20 to control costs
  metrics:
    # Scale based on average CPU utilization across all pods
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70   # Scale up when average CPU hits 70%
    # Also consider memory usage
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleUp:
      # Allow rapid scale-up during traffic spikes
      stabilizationWindowSeconds: 30
      policies:
        - type: Percent
          value: 100      # Can double the pods in one step
          periodSeconds: 60
        - type: Pods
          value: 4        # Or add up to 4 pods at a time
          periodSeconds: 60
      selectPolicy: Max   # Use whichever policy adds more pods
    scaleDown:
      # Scale down slowly to avoid flapping
      stabilizationWindowSeconds: 300  # Wait 5 minutes before scaling down
      policies:
        - type: Percent
          value: 25       # Remove at most 25% of pods per step
          periodSeconds: 120
```

Apply both:

```bash
# Apply the deployment and HPA configuration
kubectl apply -f api-deployment.yaml
kubectl apply -f api-hpa.yaml
```

## Understanding HPA Behavior Configuration

The `behavior` section is where most people trip up. Without it, HPA uses defaults that can cause problems:

- **Scale-up too slow**: By default, HPA is conservative about adding pods. During a traffic spike, you might be short on capacity for several minutes.
- **Scale-down too fast**: HPA might remove pods immediately after a spike ends, only for traffic to come back and trigger another scale-up.

The configuration above addresses both issues. Scale-up is aggressive (can double pods within 60 seconds), while scale-down is cautious (waits 5 minutes, removes only 25% at a time).

## Scaling on Custom Metrics

CPU and memory are not always the best signals. For a message processing service, you might want to scale based on queue depth. For an API service, requests per second might be more meaningful.

GKE integrates with Cloud Monitoring custom metrics. Here is how to scale based on Pub/Sub subscription backlog.

First, deploy the custom metrics adapter:

```bash
# The custom metrics stackdriver adapter is needed
# to expose Cloud Monitoring metrics to HPA
kubectl apply -f https://raw.githubusercontent.com/GoogleCloudPlatform/k8s-stackdriver/master/custom-metrics-stackdriver-adapter/deploy/production/adapter_new_resource_model.yaml
```

Then create an HPA that uses a Pub/Sub metric:

```yaml
# worker-hpa.yaml - Scale workers based on Pub/Sub message backlog
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: worker-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: message-worker
  minReplicas: 1
  maxReplicas: 50
  metrics:
    - type: External
      external:
        metric:
          name: pubsub.googleapis.com|subscription|num_undelivered_messages
          selector:
            matchLabels:
              # Target this specific Pub/Sub subscription
              resource.labels.subscription_id: my-subscription
        target:
          type: AverageValue
          # Each pod should handle about 100 messages in its backlog
          averageValue: "100"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0   # Scale up immediately for queue backlogs
      policies:
        - type: Pods
          value: 10
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 600  # Wait 10 min before scaling down workers
```

## Vertical Pod Autoscaler (VPA) for Right-Sizing

VPA adjusts the CPU and memory requests of your pods based on actual usage. On Autopilot, this directly affects how much you pay since billing is based on resource requests.

```yaml
# api-vpa.yaml - Vertical Pod Autoscaler in recommendation mode
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-service-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-service
  updatePolicy:
    # Start with "Off" to just get recommendations without automatic changes
    updateMode: "Off"
  resourcePolicy:
    containerPolicies:
      - containerName: api
        minAllowed:
          cpu: "100m"
          memory: "128Mi"
        maxAllowed:
          cpu: "2"
          memory: "2Gi"
```

Check VPA recommendations:

```bash
# View the VPA recommendations for your deployment
kubectl get vpa api-service-vpa -n production -o yaml | grep -A 20 recommendation
```

Once you trust the recommendations, you can switch `updateMode` to `Auto`. But be careful - VPA and HPA should not both target the same metric. If you use HPA on CPU, do not let VPA adjust CPU requests. They will fight each other.

A common pattern is to use HPA for scaling replica count based on CPU, and VPA for right-sizing memory requests only:

```yaml
# api-vpa-memory-only.yaml - VPA only adjusts memory, HPA handles CPU scaling
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-service-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-service
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
      - containerName: api
        controlledResources: ["memory"]  # Only adjust memory
        minAllowed:
          memory: "128Mi"
        maxAllowed:
          memory: "2Gi"
```

## Pod Disruption Budgets

When scaling down or during node replacements, you want to make sure your service stays available. Set a PodDisruptionBudget:

```yaml
# api-pdb.yaml - Ensure at least 50% of pods are always available
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-service-pdb
  namespace: production
spec:
  minAvailable: "50%"
  selector:
    matchLabels:
      app: api-service
```

## Monitoring Auto-Scaling

Keep an eye on your scaling behavior with these commands:

```bash
# Watch HPA status in real time
kubectl get hpa -n production -w

# Check current replica count and scaling events
kubectl describe hpa api-service-hpa -n production

# View scaling events in the cluster
kubectl get events -n production --field-selector reason=SuccessfulRescale
```

## Common Pitfalls

**Setting resource requests too low**: On Autopilot, if your actual usage exceeds your requests, pods get throttled. Set requests based on real usage data, not guesses.

**Not setting minReplicas high enough**: For production services, minReplicas of 1 means a single pod failure takes your service down while a new pod starts. Use at least 2 for any service that needs availability.

**Ignoring scale-down behavior**: Without a stabilization window, HPA will scale down aggressively after a spike, and if traffic comes back (which it often does), you get a painful cycle of scaling up and down.

**Using the same metric for HPA and VPA**: This causes them to conflict. Use HPA for horizontal scaling decisions and VPA for right-sizing the resource requests of individual pods.

## Wrapping Up

Auto-scaling on GKE Autopilot is about getting pod-level scaling right. Use HPA for scaling replica counts based on load, configure aggressive scale-up with cautious scale-down, and consider custom metrics for workloads where CPU is not the right signal. Add VPA to right-size your resource requests, and pair everything with PodDisruptionBudgets to maintain availability during scaling events. The combination gives you responsive scaling that handles traffic spikes without wasting resources during quiet periods.
