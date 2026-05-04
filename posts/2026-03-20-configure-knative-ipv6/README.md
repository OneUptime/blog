# How to Configure Knative with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Knative, Kubernetes, Serverless, Serving, Eventing

Description: Configure Knative Serving and Eventing on an IPv6-enabled Kubernetes cluster, deploy IPv6 services, and handle dual-stack routing.

## Introduction

Knative provides a serverless experience on Kubernetes. Knative Serving handles request-driven workloads and Knative Eventing handles event-driven architectures. Both inherit IPv6 from the Kubernetes cluster and Istio/Kourier networking layer.

## Installing Knative on IPv6 Kubernetes

```bash
# Install Knative Serving CRDs and core

kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.13.0/serving-crds.yaml
kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.13.0/serving-core.yaml

# Install Kourier networking layer (IPv6-compatible)
kubectl apply -f https://github.com/knative/net-kourier/releases/download/knative-v1.13.0/kourier.yaml

# Configure Knative to use Kourier
kubectl patch configmap/config-network \
  --namespace knative-serving \
  --type merge \
  --patch '{"data":{"ingress-class":"kourier.ingress.networking.knative.dev"}}'

# Verify Knative pods are running
kubectl get pods -n knative-serving
```

## Configure Kourier for IPv6

```yaml
# Patch Kourier service for dual-stack
apiVersion: v1
kind: Service
metadata:
  name: kourier
  namespace: kourier-system
spec:
  type: LoadBalancer
  ipFamilyPolicy: RequireDualStack
  ipFamilies:
    - IPv6
    - IPv4
```

```bash
kubectl apply -f kourier-ipv6-svc.yaml

# Get the IPv6 external IP
kubectl get svc -n kourier-system kourier \
  -o jsonpath='{.status.loadBalancer.ingress[*].ip}'
```

## Deploying a Knative Service with IPv6

```yaml
# knative-service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: hello-ipv6
  namespace: default
spec:
  template:
    spec:
      containers:
        - image: gcr.io/knative-samples/helloworld-go
          ports:
            - containerPort: 8080
          env:
            - name: TARGET
              value: "IPv6 World"
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
```

```bash
kubectl apply -f knative-service.yaml

# Get the service URL
kubectl get ksvc hello-ipv6
# NAME          URL
# hello-ipv6   http://hello-ipv6.default.example.com

# Test via IPv6 (with Host header)
curl -6 -H "Host: hello-ipv6.default.example.com" \
  http://[<kourier-ipv6>]/
```

## Knative Domain Configuration for IPv6

```yaml
# Configure domain to use IPv6 LoadBalancer IP
# config-domain ConfigMap in knative-serving namespace
apiVersion: v1
kind: ConfigMap
metadata:
  name: config-domain
  namespace: knative-serving
data:
  # Map your domain to the IPv6 LoadBalancer
  svc.cluster.local: ""
  example.com: |
    selector:
      app: production
```

## Knative Eventing with IPv6

```yaml
# Event source that sends events to an IPv6-capable sink
apiVersion: sources.knative.dev/v1
kind: ApiServerSource
metadata:
  name: k8s-events
  namespace: default
spec:
  serviceAccountName: default
  mode: Resource
  resources:
    - apiVersion: v1
      kind: Event
  sink:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: hello-ipv6
```

## Autoscaling Test

```bash
# Generate IPv6 traffic to trigger Knative autoscaling
hey -n 1000 -c 50 -host "hello-ipv6.default.example.com" \
  http://[<kourier-ipv6>]/

# Watch pods scale up
kubectl get pods -n default -w | grep hello-ipv6

# Verify IPv6 source addresses in logs
kubectl logs -n default -l serving.knative.dev/service=hello-ipv6 -c user-container | grep "RemoteAddr"
```

## Conclusion

Knative on a dual-stack Kubernetes cluster serves IPv6 clients when Kourier is configured with a dual-stack LoadBalancer service. Knative Services inherit IPv6 capabilities from the cluster networking layer. Configure your domain's AAAA record to point to the Kourier IPv6 LoadBalancer IP. Monitor Knative function cold start times and autoscaling behavior with OneUptime.
