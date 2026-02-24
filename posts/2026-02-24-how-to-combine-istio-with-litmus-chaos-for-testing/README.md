# How to Combine Istio with Litmus Chaos for Testing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, LitmusChaos, Chaos Engineering, Testing, Kubernetes

Description: A practical guide to integrating LitmusChaos with Istio for comprehensive chaos engineering experiments in Kubernetes environments.

---

LitmusChaos is a CNCF project that provides a framework for running chaos engineering experiments in Kubernetes. While Istio offers built-in fault injection through VirtualService resources, LitmusChaos brings a much broader set of chaos experiments including pod-level, node-level, and application-level disruptions. Using them together gives you a powerful combination: Istio for precise traffic-level faults and Litmus for infrastructure-level chaos.

## Installing LitmusChaos

Install the Litmus operator and CRDs:

```bash
kubectl apply -f https://litmuschaos.github.io/litmus/litmus-operator-v3.0.0.yaml
```

Verify the installation:

```bash
kubectl get pods -n litmus
```

You should see the litmus operator pods running. Also install the generic chaos experiments:

```bash
kubectl apply -f https://hub.litmuschaos.io/api/chaos/3.0.0?file=charts/generic/experiments.yaml -n litmus
```

## Setting Up the Test Environment

Create a namespace with Istio injection and deploy a test application:

```bash
kubectl create namespace litmus-istio-test
kubectl label namespace litmus-istio-test istio-injection=enabled

kubectl apply -n litmus-istio-test -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/bookinfo/platform/kube/bookinfo.yaml
kubectl apply -n litmus-istio-test -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/bookinfo/networking/destination-rule-all.yaml

kubectl wait --for=condition=ready pod --all -n litmus-istio-test --timeout=120s
```

## Understanding the Integration Points

LitmusChaos and Istio complement each other at different layers:

**Traffic layer (Istio):**
- HTTP delay/abort injection through VirtualService
- Traffic shifting and mirroring
- Circuit breaking through DestinationRule

**Infrastructure layer (LitmusChaos):**
- Pod delete, pod CPU hog, pod memory hog
- Container kill
- Node drain, node CPU hog
- Disk fill
- Network loss/corruption at the kernel level

The key insight is that LitmusChaos experiments test your Istio configuration. For example, you set up Istio circuit breakers and then use Litmus to actually stress the system to see if those circuit breakers kick in.

## Experiment 1: Pod Delete with Istio Circuit Breaker

First, configure an Istio circuit breaker on the ratings service:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: ratings-cb
  namespace: litmus-istio-test
spec:
  host: ratings
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 2
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 100
```

```bash
kubectl apply -n litmus-istio-test -f ratings-cb.yaml
```

Now create a Litmus ChaosEngine to kill ratings pods:

```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: ratings-pod-delete
  namespace: litmus-istio-test
spec:
  appinfo:
    appns: litmus-istio-test
    applabel: app=ratings
    appkind: deployment
  chaosServiceAccount: litmus-admin
  experiments:
  - name: pod-delete
    spec:
      components:
        env:
        - name: TOTAL_CHAOS_DURATION
          value: "60"
        - name: CHAOS_INTERVAL
          value: "15"
        - name: FORCE
          value: "true"
```

Before applying, create the service account:

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: litmus-admin
  namespace: litmus-istio-test
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: litmus-admin
  namespace: litmus-istio-test
rules:
- apiGroups: [""]
  resources: ["pods", "events"]
  verbs: ["create", "delete", "get", "list", "patch", "update", "deletecollection"]
- apiGroups: [""]
  resources: ["pods/exec", "pods/log"]
  verbs: ["create", "get", "list"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list"]
- apiGroups: ["batch"]
  resources: ["jobs"]
  verbs: ["create", "get", "list", "delete", "deletecollection"]
- apiGroups: ["litmuschaos.io"]
  resources: ["chaosengines", "chaosexperiments", "chaosresults"]
  verbs: ["create", "get", "list", "patch", "update"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: litmus-admin
  namespace: litmus-istio-test
subjects:
- kind: ServiceAccount
  name: litmus-admin
  namespace: litmus-istio-test
roleRef:
  kind: Role
  name: litmus-admin
  apiGroup: rbac.authorization.k8s.io
EOF
```

Apply the chaos engine:

```bash
kubectl apply -n litmus-istio-test -f ratings-pod-delete.yaml
```

Watch the experiment:

```bash
kubectl get chaosresult -n litmus-istio-test -w
```

While the experiment runs, monitor the Istio circuit breaker:

```bash
REVIEWS_POD=$(kubectl get pod -n litmus-istio-test -l app=reviews -o jsonpath='{.items[0].metadata.name}')

kubectl exec -n litmus-istio-test $REVIEWS_POD -c istio-proxy -- \
  pilot-agent request GET stats | grep "outlier_detection"
```

## Experiment 2: Pod CPU Hog with Istio Timeout

Configure an Istio timeout on calls to the reviews service:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews-timeout
  namespace: litmus-istio-test
spec:
  hosts:
  - reviews
  http:
  - route:
    - destination:
        host: reviews
    timeout: 5s
```

Then stress the reviews pod CPU with Litmus:

```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: reviews-cpu-hog
  namespace: litmus-istio-test
spec:
  appinfo:
    appns: litmus-istio-test
    applabel: app=reviews
    appkind: deployment
  chaosServiceAccount: litmus-admin
  experiments:
  - name: pod-cpu-hog
    spec:
      components:
        env:
        - name: TOTAL_CHAOS_DURATION
          value: "120"
        - name: CPU_CORES
          value: "2"
        - name: CPU_LOAD
          value: "90"
```

```bash
kubectl apply -n litmus-istio-test -f reviews-timeout.yaml
kubectl apply -n litmus-istio-test -f reviews-cpu-hog.yaml
```

This tests whether the Istio timeout properly cuts off requests when the reviews service becomes slow due to CPU pressure.

## Experiment 3: Network Loss with Istio Retries

Configure Istio retries:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ratings-retry
  namespace: litmus-istio-test
spec:
  hosts:
  - ratings
  http:
  - route:
    - destination:
        host: ratings
    retries:
      attempts: 3
      perTryTimeout: 2s
      retryOn: 5xx,reset,connect-failure,retriable-status-codes
```

Use Litmus to inject network packet loss:

```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: ratings-network-loss
  namespace: litmus-istio-test
spec:
  appinfo:
    appns: litmus-istio-test
    applabel: app=ratings
    appkind: deployment
  chaosServiceAccount: litmus-admin
  experiments:
  - name: pod-network-loss
    spec:
      components:
        env:
        - name: TOTAL_CHAOS_DURATION
          value: "60"
        - name: NETWORK_INTERFACE
          value: "eth0"
        - name: NETWORK_PACKET_LOSS_PERCENTAGE
          value: "50"
```

```bash
kubectl apply -n litmus-istio-test -f ratings-retry.yaml
kubectl apply -n litmus-istio-test -f ratings-network-loss.yaml
```

With 50% packet loss, many requests will fail. The Istio retry policy should recover most of them. Monitor success rates:

```bash
# Run requests during the chaos experiment
for i in $(seq 1 50); do
  kubectl exec -n litmus-istio-test deploy/productpage-v1 -- \
    curl -s -o /dev/null -w "%{http_code}\n" \
    productpage:9080/productpage
  sleep 1
done
```

## Checking Experiment Results

LitmusChaos stores results in ChaosResult resources:

```bash
kubectl get chaosresult -n litmus-istio-test

kubectl describe chaosresult ratings-pod-delete-pod-delete -n litmus-istio-test
```

The result shows whether the experiment passed or failed based on the steady state hypothesis you defined.

## Creating a Litmus Workflow with Istio Validation

You can create Litmus workflows that include validation steps checking Istio metrics:

```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: full-test
  namespace: litmus-istio-test
spec:
  appinfo:
    appns: litmus-istio-test
    applabel: app=ratings
    appkind: deployment
  chaosServiceAccount: litmus-admin
  experiments:
  - name: pod-delete
    spec:
      probe:
      - name: check-productpage-health
        type: httpProbe
        httpProbe/inputs:
          url: http://productpage.litmus-istio-test.svc.cluster.local:9080/productpage
          method:
            get:
              criteria: "=="
              responseCode: "200"
        mode: Continuous
        runProperties:
          probeTimeout: 5s
          interval: 5s
          retry: 3
      components:
        env:
        - name: TOTAL_CHAOS_DURATION
          value: "60"
        - name: CHAOS_INTERVAL
          value: "15"
```

The probe checks that the productpage remains healthy even while ratings pods are being deleted. This validates that Istio's circuit breaker and the application's error handling work together correctly.

## Cleanup

```bash
kubectl delete namespace litmus-istio-test
```

LitmusChaos and Istio are a natural pairing. Istio defines your resilience policies (timeouts, retries, circuit breakers), and LitmusChaos creates the real infrastructure failures that test whether those policies actually work. The combination gives you much more confidence than either tool alone.
