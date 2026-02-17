# How to Set Up Canary Deployments in Cloud Deploy with Percentage-Based Rollouts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Deploy, Canary Deployment, DevOps, GKE

Description: Learn how to configure percentage-based canary deployments in Google Cloud Deploy to gradually roll out new versions and reduce deployment risk.

---

Canary deployments are one of the safest ways to ship changes to production. Instead of replacing all your instances at once, you route a small percentage of traffic to the new version first, observe how it behaves, and then gradually increase the percentage. Google Cloud Deploy has built-in support for canary deployments with configurable percentage-based rollout phases.

In this post, I will show you how to set up canary deployments from scratch using Cloud Deploy's native canary strategy.

## Why Use Canary Deployments?

With a standard rolling deployment, all instances eventually run the new version. If there is a bug, every user is affected. Canary deployments limit the blast radius. If 5% of traffic goes to the canary and something breaks, only 5% of users are impacted. You catch the problem before it reaches everyone.

Cloud Deploy makes this easy by managing the phased rollout for you. You define the percentages, and Cloud Deploy handles the traffic splitting and pod scaling.

## Prerequisites

For canary deployments in Cloud Deploy, you need:

- A GKE cluster with the Gateway API enabled (for traffic management)
- Cloud Deploy API enabled
- A delivery pipeline and targets already configured
- An application with a Kubernetes Deployment and Service

## Configuring the Delivery Pipeline for Canary

The canary strategy is defined in the pipeline configuration at the stage level. Here is a pipeline that uses canary for the production target.

```yaml
# pipeline.yaml - Pipeline with canary deployment strategy for production
apiVersion: deploy.cloud.google.com/v1
kind: DeliveryPipeline
metadata:
  name: my-app-pipeline
description: Pipeline with canary deployment to production
serialPipeline:
  stages:
  - targetId: dev
    profiles:
    - dev
  - targetId: staging
    profiles:
    - staging
  - targetId: prod
    profiles:
    - prod
    strategy:
      canary:
        runtimeConfig:
          kubernetes:
            serviceNetworking:
              service: my-web-app-service
              deployment: my-web-app
        canaryDeployment:
          percentages:
          - 10
          - 25
          - 50
          - 75
          verify: false
```

The `percentages` array defines the canary phases. In this configuration, the rollout happens in four steps: 10%, 25%, 50%, and 75%. After the last explicit percentage, Cloud Deploy automatically handles the final phase that shifts 100% of traffic to the new version.

## Setting Up the Runtime Configuration

The `runtimeConfig` section tells Cloud Deploy how to manage traffic splitting. For GKE with service networking, you specify the Kubernetes Service and Deployment names.

Cloud Deploy creates a canary Deployment alongside your stable Deployment and adjusts the pod counts to achieve the desired traffic split. For a service-networking based canary, the traffic split is approximated by the ratio of canary pods to total pods.

## Preparing Your Kubernetes Manifests

Your manifests need to include both a Deployment and a Service. Cloud Deploy uses these to create and manage the canary.

```yaml
# k8s/deployment.yaml - The application deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-web-app
  labels:
    app: my-web-app
spec:
  replicas: 10
  selector:
    matchLabels:
      app: my-web-app
  template:
    metadata:
      labels:
        app: my-web-app
    spec:
      containers:
      - name: my-web-app
        image: us-central1-docker.pkg.dev/my-project/my-repo/my-web-app
        ports:
        - containerPort: 8080
---
# k8s/service.yaml - The service that routes traffic to the deployment
apiVersion: v1
kind: Service
metadata:
  name: my-web-app-service
spec:
  selector:
    app: my-web-app
  ports:
  - port: 80
    targetPort: 8080
```

With 10 replicas and a 10% canary phase, Cloud Deploy will run 1 pod with the new version and 9 pods with the stable version during the first phase.

## Using Gateway API for Precise Traffic Splitting

If you need exact traffic percentages rather than pod-ratio approximations, use the Gateway API approach instead of service networking.

```yaml
# pipeline-gateway.yaml - Canary with Gateway API for exact traffic control
apiVersion: deploy.cloud.google.com/v1
kind: DeliveryPipeline
metadata:
  name: my-app-pipeline-gateway
serialPipeline:
  stages:
  - targetId: prod
    profiles:
    - prod
    strategy:
      canary:
        runtimeConfig:
          kubernetes:
            gatewayServiceMesh:
              httpRoute: my-web-app-route
              service: my-web-app-service
              deployment: my-web-app
        canaryDeployment:
          percentages:
          - 5
          - 20
          - 50
          verify: true
```

With Gateway API, traffic splitting is done at the mesh/gateway level, so you get precise percentage-based routing regardless of pod count.

You will also need the HTTPRoute resource in your manifests.

```yaml
# k8s/httproute.yaml - Gateway API HTTPRoute for traffic splitting
apiVersion: gateway.networking.k8s.io/v1beta1
kind: HTTPRoute
metadata:
  name: my-web-app-route
spec:
  parentRefs:
  - name: my-gateway
  rules:
  - backendRefs:
    - name: my-web-app-service
      port: 80
```

## Creating a Release with Canary

Creating the release works the same as any other Cloud Deploy release. The canary behavior is triggered automatically based on the pipeline configuration.

```bash
# Create a release - the canary strategy kicks in for the prod target
gcloud deploy releases create canary-rel-001 \
  --delivery-pipeline=my-app-pipeline \
  --region=us-central1 \
  --source=. \
  --images=my-web-app=us-central1-docker.pkg.dev/my-project/my-repo/my-web-app:v2.0.0
```

When this release reaches the prod target, it will start at the 10% canary phase instead of deploying to all pods immediately.

## Advancing Through Canary Phases

Each canary phase creates a separate rollout phase. After a phase completes, you can advance to the next one.

```bash
# Advance the rollout to the next canary phase
gcloud deploy rollouts advance canary-rel-001-to-prod-0001 \
  --delivery-pipeline=my-app-pipeline \
  --release=canary-rel-001 \
  --region=us-central1
```

If you configured verification (setting `verify: true`), Cloud Deploy runs your verification job after each phase. If verification passes, you can advance. If it fails, you know something is wrong before increasing traffic.

## Monitoring During Canary Phases

While a canary phase is active, you should monitor key metrics to decide whether to advance or roll back. Check error rates, latency, and any custom metrics relevant to your application.

```bash
# Check the current status of the rollout to see which phase is active
gcloud deploy rollouts describe canary-rel-001-to-prod-0001 \
  --delivery-pipeline=my-app-pipeline \
  --release=canary-rel-001 \
  --region=us-central1
```

The Cloud Deploy console shows a visual representation of the rollout phases with their status, making it easy to see where you are in the canary process.

## Rolling Back a Canary

If something goes wrong during any canary phase, you can roll back the rollout. This shifts all traffic back to the stable version.

```bash
# Roll back the canary deployment to the stable version
gcloud deploy rollouts cancel canary-rel-001-to-prod-0001 \
  --delivery-pipeline=my-app-pipeline \
  --release=canary-rel-001 \
  --region=us-central1
```

Canceling the rollout removes the canary pods and restores the previous stable state. This is one of the biggest advantages of canary deployments - you can bail out at any point without impacting most of your users.

## Tips for Choosing Canary Percentages

Start small. A 5% or 10% initial canary gives you enough traffic to spot issues without exposing many users. The number of phases depends on your risk tolerance. For critical services, I use more phases with smaller increments. For less critical services, three phases (10%, 50%, 100%) might be sufficient.

Also consider your total replica count. With service networking, the traffic split is based on pod ratios, so very small percentages only work if you have enough replicas. With 5 replicas, you cannot do a 5% canary since the minimum is one pod, which is 20%.

## Summary

Canary deployments in Cloud Deploy give you a structured way to roll out changes gradually. By defining percentage-based phases in your pipeline configuration, you control exactly how much traffic sees the new version at each step. Combined with verification and monitoring, this approach significantly reduces the risk of bad deployments reaching all your users.
