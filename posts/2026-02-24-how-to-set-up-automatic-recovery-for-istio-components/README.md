# How to Set Up Automatic Recovery for Istio Components

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Recovery, Kubernetes, Automation, Reliability

Description: Learn how to set up automatic recovery mechanisms for Istio control plane and data plane components using Kubernetes features and custom automation scripts.

---

Waiting for a human to notice and fix Istio component failures at 3 AM is not a sustainable strategy. Kubernetes already provides basic recovery through pod restart policies and deployments, but you can build additional layers of automatic recovery that handle more complex failure scenarios without manual intervention.

This guide covers automatic recovery strategies for every Istio component, from the obvious ones to the edge cases that catch people off guard.

## Kubernetes Built-In Recovery

Kubernetes already handles the basics. When an Istio pod crashes, the kubelet restarts it. When a Deployment detects fewer replicas than desired, it creates new ones. This covers straightforward crash-and-restart scenarios.

Make sure these fundamentals are configured correctly:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: istiod
  namespace: istio-system
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      restartPolicy: Always
      containers:
        - name: discovery
          livenessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 1
            periodSeconds: 3
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 1
            periodSeconds: 3
            failureThreshold: 3
```

The liveness probe is key here. If istiod becomes unresponsive but does not crash (a hung process), the liveness probe detects it and triggers a restart. Without the liveness probe, Kubernetes would not know anything is wrong.

## Auto-Scaling for Load Recovery

When istiod is overloaded rather than crashed, you need auto-scaling rather than restart. Configure an HPA that scales istiod based on CPU and memory:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: istiod
  namespace: istio-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: istiod
  minReplicas: 3
  maxReplicas: 7
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

When a large deployment event triggers a storm of configuration pushes, the HPA adds more istiod replicas to handle the load. After the storm passes, it scales back down.

## Automatic Sidecar Recovery

Sidecar proxy crashes are handled by Kubernetes restart policies, but there are cases where the sidecar is running but not functioning. Set up a sidecar health check that detects this:

The Envoy sidecar exposes a health endpoint on port 15021:

```bash
curl http://localhost:15021/healthz/ready
```

Kubernetes uses this automatically when sidecar injection is configured. But you can add custom monitoring that takes action when sidecars are unhealthy across multiple pods:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: sidecar-health-check
  namespace: istio-system
spec:
  schedule: "*/5 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: sidecar-health-checker
          containers:
            - name: checker
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Find pods with high sidecar restart counts
                  kubectl get pods --all-namespaces -o json | \
                    jq -r '.items[] | select(.status.containerStatuses[]? | select(.name=="istio-proxy" and .restartCount > 10)) | .metadata.namespace + "/" + .metadata.name' | \
                    while read pod; do
                      ns=$(echo $pod | cut -d/ -f1)
                      name=$(echo $pod | cut -d/ -f2)
                      echo "Restarting pod with excessive sidecar restarts: $pod"
                      kubectl delete pod $name -n $ns
                    done
          restartPolicy: OnFailure
```

This CronJob checks every 5 minutes for pods where the sidecar has restarted more than 10 times and deletes them, allowing Kubernetes to create fresh replacements.

## Control Plane Configuration Recovery

Sometimes istiod is running but has lost sync with the actual state. This can happen after an API server partition or during split-brain scenarios. A recovery script can detect and fix this:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: istio-config-sync-check
  namespace: istio-system
spec:
  schedule: "*/10 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: istio-sync-checker
          containers:
            - name: checker
              image: istio/istioctl:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Check proxy sync status
                  STALE_COUNT=$(istioctl proxy-status 2>/dev/null | grep -c "STALE" || echo "0")
                  NOT_SENT_COUNT=$(istioctl proxy-status 2>/dev/null | grep -c "NOT SENT" || echo "0")

                  TOTAL_ISSUES=$((STALE_COUNT + NOT_SENT_COUNT))

                  if [ "$TOTAL_ISSUES" -gt 5 ]; then
                    echo "Detected $TOTAL_ISSUES proxies with sync issues. Restarting istiod."
                    kubectl rollout restart deployment/istiod -n istio-system
                  fi
          restartPolicy: OnFailure
```

This checks if more than 5 proxies have stale or missing configuration and restarts istiod to trigger a fresh sync.

## Certificate Rotation Recovery

If certificate rotation fails (because istiod was down during the rotation window), certificates may expire. Set up monitoring that detects expiring certificates:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cert-expiry-check
  namespace: istio-system
spec:
  schedule: "0 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: cert-checker
          containers:
            - name: checker
              image: istio/istioctl:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Check root CA cert expiry
                  ROOT_CERT=$(kubectl get secret istio-ca-secret -n istio-system -o jsonpath='{.data.ca-cert\.pem}' 2>/dev/null)
                  if [ -n "$ROOT_CERT" ]; then
                    EXPIRY=$(echo "$ROOT_CERT" | base64 -d | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
                    EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$EXPIRY" +%s 2>/dev/null)
                    NOW_EPOCH=$(date +%s)
                    DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

                    if [ "$DAYS_LEFT" -lt 30 ]; then
                      echo "WARNING: Root CA certificate expires in $DAYS_LEFT days"
                      # Trigger notification or automatic rotation
                    fi
                  fi
          restartPolicy: OnFailure
```

## Ingress Gateway Recovery

The ingress gateway has its own recovery needs. Beyond basic restart and scaling, you can set up health check automation:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: gateway-health-check
  namespace: istio-system
spec:
  schedule: "*/2 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: gateway-checker
          containers:
            - name: checker
              image: curlimages/curl:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Check each gateway pod directly
                  GATEWAY_IPS=$(kubectl get pods -l app=istio-ingressgateway -n istio-system -o jsonpath='{.items[*].status.podIP}')

                  for ip in $GATEWAY_IPS; do
                    STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://$ip:15021/healthz/ready)
                    if [ "$STATUS" != "200" ]; then
                      POD=$(kubectl get pod -n istio-system --field-selector status.podIP=$ip -o jsonpath='{.items[0].metadata.name}')
                      echo "Gateway pod $POD is unhealthy (status: $STATUS). Deleting for recovery."
                      kubectl delete pod $POD -n istio-system
                    fi
                  done
          restartPolicy: OnFailure
```

## Using Kubernetes Operators for Recovery

For more sophisticated recovery logic, you can use an operator framework. While a full operator is beyond the scope of this guide, here is the pattern using a simple controller script:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: istio-recovery-controller
  namespace: istio-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: istio-recovery
  template:
    metadata:
      labels:
        app: istio-recovery
    spec:
      serviceAccountName: istio-recovery
      containers:
        - name: controller
          image: bitnami/kubectl:latest
          command:
            - /bin/sh
            - -c
            - |
              while true; do
                # Check istiod health
                READY=$(kubectl get deploy istiod -n istio-system -o jsonpath='{.status.readyReplicas}' 2>/dev/null)
                DESIRED=$(kubectl get deploy istiod -n istio-system -o jsonpath='{.spec.replicas}')

                if [ "${READY:-0}" -lt "${DESIRED:-3}" ]; then
                  echo "$(date): istiod has $READY/$DESIRED replicas ready"

                  # If no replicas are ready for more than 5 minutes, force recreate
                  if [ "${READY:-0}" -eq 0 ]; then
                    echo "$(date): No istiod replicas ready. Forcing recreation."
                    kubectl rollout restart deployment/istiod -n istio-system
                  fi
                fi

                # Check gateway health
                GW_READY=$(kubectl get deploy istio-ingressgateway -n istio-system -o jsonpath='{.status.readyReplicas}' 2>/dev/null)
                GW_DESIRED=$(kubectl get deploy istio-ingressgateway -n istio-system -o jsonpath='{.spec.replicas}')

                if [ "${GW_READY:-0}" -lt "${GW_DESIRED:-3}" ]; then
                  echo "$(date): Gateway has $GW_READY/$GW_DESIRED replicas ready"
                fi

                sleep 30
              done
```

## Setting Up Alert-Based Auto-Recovery

Combine Prometheus alerting with a webhook-based recovery system. When Prometheus fires an alert, it triggers a recovery action:

```yaml
# AlertManager configuration
route:
  receiver: 'recovery-webhook'
  routes:
    - match:
        alertname: IstiodUnresponsive
      receiver: 'recovery-webhook'

receivers:
  - name: 'recovery-webhook'
    webhook_configs:
      - url: 'http://recovery-service.istio-system:8080/recover'
        send_resolved: true
```

The recovery service receives the webhook and takes appropriate action (restart istiod, scale up replicas, etc.).

## Summary

Automatic recovery for Istio components works in layers. Kubernetes provides the foundation with restart policies, liveness probes, and deployment replicas. HPAs handle load-based recovery. CronJobs catch the edge cases that basic restarts miss: stale configurations, expiring certificates, and unhealthy-but-running sidecars. For more sophisticated scenarios, custom controllers and alert-based webhooks give you programmable recovery logic. The goal is to reduce the time between a failure and recovery to seconds or minutes, without waiting for a human to notice and act.
