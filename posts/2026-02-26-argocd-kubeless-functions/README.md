# How to Deploy Kubeless Functions with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Kubeless, Serverless

Description: Learn how to deploy and manage Kubeless serverless functions using ArgoCD GitOps workflows including function configuration, triggers, and runtime management.

---

Kubeless is a Kubernetes-native serverless framework that lets you deploy functions without needing to build container images. You write your function code, declare it as a Kubernetes custom resource, and Kubeless handles the runtime. Managing Kubeless through ArgoCD means your functions, triggers, and configurations are all version-controlled and automatically deployed.

While Kubeless is no longer actively maintained, many teams still run it in production. This guide covers managing Kubeless workloads through ArgoCD.

## Installing Kubeless with ArgoCD

Deploy the Kubeless controller and its CRDs through ArgoCD:

```yaml
# kubeless-platform-app.yaml

apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: kubeless
  namespace: argocd
spec:
  project: serverless
  source:
    repoURL: https://github.com/myorg/k8s-platform.git
    path: kubeless/install
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: kubeless
  syncPolicy:
    automated:
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
```

Store the official Kubeless release manifests in your Git repository. The controller Deployment from the v1.0.8 release includes the function, HTTP trigger, and CronJob trigger controllers:

```yaml
# kubeless/install/kubeless-controller.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kubeless-controller-manager
  namespace: kubeless
  labels:
    kubeless: controller
spec:
  selector:
    matchLabels:
      kubeless: controller
  template:
    metadata:
      labels:
        kubeless: controller
    spec:
      containers:
        - name: kubeless-function-controller
          image: kubeless/function-controller:v1.0.8
          env:
            - name: KUBELESS_INGRESS_ENABLED
              valueFrom:
                configMapKeyRef:
                  key: ingress-enabled
                  name: kubeless-config
            - name: KUBELESS_SERVICE_TYPE
              valueFrom:
                configMapKeyRef:
                  key: service-type
                  name: kubeless-config
            - name: KUBELESS_NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
            - name: KUBELESS_CONFIG
              value: kubeless-config
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
        - name: http-trigger-controller
          image: kubeless/http-trigger-controller:v1.0.3
          env:
            - name: KUBELESS_INGRESS_ENABLED
              valueFrom:
                configMapKeyRef:
                  key: ingress-enabled
                  name: kubeless-config
            - name: KUBELESS_SERVICE_TYPE
              valueFrom:
                configMapKeyRef:
                  key: service-type
                  name: kubeless-config
            - name: KUBELESS_NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
            - name: KUBELESS_CONFIG
              value: kubeless-config
        - name: cronjob-trigger-controller
          image: kubeless/cronjob-trigger-controller:v1.0.3
          env:
            - name: KUBELESS_INGRESS_ENABLED
              valueFrom:
                configMapKeyRef:
                  key: ingress-enabled
                  name: kubeless-config
            - name: KUBELESS_SERVICE_TYPE
              valueFrom:
                configMapKeyRef:
                  key: service-type
                  name: kubeless-config
            - name: KUBELESS_NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
            - name: KUBELESS_CONFIG
              value: kubeless-config
      serviceAccountName: controller-acct
```

Configure the available runtimes:

```yaml
# kubeless/install/kubeless-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubeless-config
  namespace: kubeless
data:
  ingress-enabled: "false"
  service-type: ClusterIP
  runtime-images: |
    [
      {
        "ID": "python",
        "versions": [
          {
            "name": "python38",
            "version": "3.8",
            "images": [
              {
                "phase": "installation",
                "image": "python:3.8",
                "command": "pip install --prefix=$KUBELESS_INSTALL_VOLUME -r $KUBELESS_DEPS_FILE"
              },
              {
                "phase": "runtime",
                "image": "kubeless/python@sha256:536eb97fda81d6e52bd947f771192077aa7b4f529fd0ca30e47561f94741963d",
                "env": {
                  "PYTHONPATH": "$(KUBELESS_INSTALL_VOLUME)/lib/python3.8/site-packages:$(KUBELESS_INSTALL_VOLUME)"
                }
              }
            ]
          }
        ],
        "depName": "requirements.txt",
        "fileNameSuffix": ".py"
      },
      {
        "ID": "nodejs",
        "versions": [
          {
            "name": "node14",
            "version": "14",
            "images": [
              {
                "phase": "installation",
                "image": "kubeless/nodejs@sha256:f3645b5e8417e5bcc905446e1fac8a7d565be74eeba4fd80c2487c5d43a32a7b",
                "command": "/kubeless-npm-install.sh"
              },
              {
                "phase": "runtime",
                "image": "kubeless/nodejs@sha256:f3645b5e8417e5bcc905446e1fac8a7d565be74eeba4fd80c2487c5d43a32a7b",
                "env": {
                  "NODE_PATH": "$(KUBELESS_INSTALL_VOLUME)/node_modules"
                }
              }
            ]
          }
        ],
        "depName": "package.json",
        "fileNameSuffix": ".js"
      },
      {
        "ID": "go",
        "versions": [
          {
            "name": "go1.14",
            "version": "1.14",
            "images": [
              {
                "phase": "compilation",
                "image": "kubeless/go-init:1.14@sha256:b4b98c2848845447a43b50d61a386bcaa5bb34d5034a969aa404a41d71f1c439",
                "command": "/compile-function.sh",
                "env": {
                  "GOCACHE": "$(KUBELESS_INSTALL_VOLUME)/.cache"
                }
              },
              {
                "phase": "runtime",
                "image": "kubeless/go@sha256:ee496259f1bef2c338d074bfb5c14a08bb097f793a683d208a50df9f24d0d850"
              }
            ]
          }
        ],
        "depName": "go.mod",
        "fileNameSuffix": ".go"
      }
    ]
```

## Deploying Functions as CRDs

Kubeless functions are Kubernetes custom resources. The function code is embedded directly in the manifest, which means ArgoCD manages both the function configuration and the code itself.

```yaml
# functions/production/hello-world.yaml
apiVersion: kubeless.io/v1beta1
kind: Function
metadata:
  name: hello-world
  namespace: default
  labels:
    created-by: argocd
    function: hello-world
spec:
  runtime: python38
  handler: hello.handler
  function-content-type: text
  function: |
    import json
    import datetime

    def handler(event, context):
        """
        Simple hello world function that returns a greeting
        with the current timestamp.
        """
        body = {
            "message": "Hello from Kubeless!",
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "method": event.get("extensions", {}).get("request", {}).get("method", "unknown")
        }

        return json.dumps(body)
  deps: ""
  timeout: "180"
  deployment:
    spec:
      replicas: 2
      template:
        spec:
          containers:
            - name: ""
              resources:
                requests:
                  cpu: 100m
                  memory: 128Mi
                limits:
                  cpu: 500m
                  memory: 256Mi
```

A more complex function with dependencies:

```yaml
# functions/production/process-webhook.yaml
apiVersion: kubeless.io/v1beta1
kind: Function
metadata:
  name: process-webhook
  namespace: default
  labels:
    function: process-webhook
spec:
  runtime: node14
  handler: webhook.handler
  function-content-type: text
  function: |
    'use strict';

    const crypto = require('crypto');

    module.exports = {
      handler: async (event, context) => {
        const body = JSON.parse(event.data);

        // Validate webhook signature
        const signature = event.extensions.request.headers['x-webhook-signature'];
        const secret = process.env.WEBHOOK_SECRET;

        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(JSON.stringify(body));
        const expectedSignature = hmac.digest('hex');

        if (signature !== expectedSignature) {
          return { statusCode: 401, body: 'Invalid signature' };
        }

        // Process the webhook event
        console.log(`Processing event type: ${body.type}`);

        return {
          statusCode: 200,
          body: JSON.stringify({ processed: true, type: body.type })
        };
      }
    };
  deps: |
    {
      "name": "process-webhook",
      "version": "1.0.0",
      "dependencies": {}
    }
  timeout: "30"
  deployment:
    spec:
      replicas: 3
```

## ArgoCD Application for Functions

Manage all functions through a dedicated Application:

```yaml
# kubeless-functions-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: kubeless-functions
  namespace: argocd
spec:
  project: serverless
  source:
    repoURL: https://github.com/myorg/k8s-functions.git
    path: functions/production
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      selfHeal: true
      prune: true
```

## Managing HTTP Triggers

Kubeless functions need triggers to be invoked. HTTP triggers create Ingress resources:

```yaml
# functions/production/triggers/hello-trigger.yaml
apiVersion: kubeless.io/v1beta1
kind: HTTPTrigger
metadata:
  name: hello-world-trigger
  namespace: default
spec:
  function-name: hello-world
  host-name: functions.example.com
  path: hello
  gateway: nginx
  basic-auth-secret: ""
  tls: true
  tls-secret: functions-tls
```

## CronJob Triggers

Schedule functions to run on a cron schedule:

```yaml
# functions/production/triggers/cleanup-trigger.yaml
apiVersion: kubeless.io/v1beta1
kind: CronJobTrigger
metadata:
  name: daily-cleanup
  namespace: default
spec:
  function-name: cleanup-old-data
  schedule: "0 2 * * *"  # Run at 2 AM daily
```

## Multi-Environment Management with Kustomize

Organize functions per environment:

```text
functions/
  base/
    hello-world.yaml
    process-webhook.yaml
    kustomization.yaml
  overlays/
    staging/
      kustomization.yaml
      patches/
        replicas.yaml
    production/
      kustomization.yaml
      patches/
        replicas.yaml
        resources.yaml
```

```yaml
# functions/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - hello-world.yaml
  - process-webhook.yaml
```

```yaml
# functions/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patches:
  - path: patches/replicas.yaml
    target:
      group: kubeless.io
      version: v1beta1
      kind: Function
```

```yaml
# functions/overlays/production/patches/replicas.yaml
- op: replace
  path: /spec/deployment/spec/replicas
  value: 3
```

## Handling Function Updates

When you update function code in Git, ArgoCD detects the change and syncs. The Kubeless controller then rolls out the updated function. The workflow:

```mermaid
graph TD
    A[Developer Updates Function Code in Git] --> B[Pull Request Review]
    B --> C[Merge to Main]
    C --> D[ArgoCD Detects Change]
    D --> E[ArgoCD Updates Function CRD]
    E --> F[Kubeless Controller Rebuilds Function]
    F --> G[New Pods with Updated Code]
```

## Monitoring Kubeless Functions

Kubeless exposes metrics through the function proxy. Set up monitoring:

```yaml
# monitoring/kubeless-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kubeless-functions
  namespace: monitoring
spec:
  selector:
    matchLabels:
      created-by: kubeless
  namespaceSelector:
    matchNames:
      - default
  endpoints:
    - port: http-function-port
      interval: 30s
      path: /metrics
```

## Migration Considerations

Since Kubeless is no longer actively maintained, consider migrating to Knative or OpenFaaS for long-term support. ArgoCD makes this migration easier since you can run both platforms simultaneously and gradually move functions. See our guide on [deploying Knative services with ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-knative-services/view) for the target platform.

## Summary

Kubeless with ArgoCD gives you serverless functions managed through GitOps. Function code, dependencies, triggers, and scaling configuration all live in Git as Kubernetes custom resources. ArgoCD ensures your functions are always in sync with your repository, and every change goes through your standard review process. While Kubeless is no longer actively maintained, teams still running it benefit greatly from ArgoCD's declarative management approach.
