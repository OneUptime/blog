# How to Run Init Containers Using Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Init Container, Kubernetes, DevOps

Description: Configure and deploy init containers in Portainer to run setup tasks before main application containers start.

## Introduction

Init containers are a Kubernetes feature. In Portainer, the usual way to run them is to deploy a Kubernetes manifest that defines `initContainers`. This guide walks you through the process step by step with a practical example.

## Prerequisites

- Portainer installed (CE or BE) with a Kubernetes environment connected
- Permission to deploy applications to the target namespace
- Basic familiarity with Kubernetes manifests

## Using the Portainer UI

### Step 1: Navigate to the Relevant Section

1. Log in to your Portainer instance
2. Select your Kubernetes environment from the home screen
3. Navigate to **Applications**
4. Click **Create from code** and choose **Manifest**

### Step 2: Locate Your Application

After deploying the manifest in Portainer:

1. Open the **Applications** menu item
2. Use the namespace filter if needed
3. Click on the application name to inspect its details
4. Review the **Events** tab and the pod list to confirm the init container completed successfully

## Step-by-Step Instructions

### Deploy an Application Manifest

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: init-demo
spec:
  containers:
    - name: nginx
      image: nginx
      ports:
        - containerPort: 80
      volumeMounts:
        - name: workdir
          mountPath: /usr/share/nginx/html
  # This container runs during Pod initialization
  initContainers:
    - name: install
      image: busybox:1.28
      command:
        - wget
        - "-O"
        - "/work-dir/index.html"
        - http://info.cern.ch
      volumeMounts:
        - name: workdir
          mountPath: /work-dir
  dnsPolicy: Default
  volumes:
    - name: workdir
      emptyDir: {}
```

### Key Configuration Options

```yaml
spec:
  initContainers:
    - name: install
      image: busybox:1.28
      command: ["wget", "-O", "/work-dir/index.html", "http://info.cern.ch"]
      volumeMounts:
        - name: workdir
          mountPath: /work-dir
  containers:
    - name: nginx
      image: nginx
      volumeMounts:
        - name: workdir
          mountPath: /usr/share/nginx/html
  volumes:
    - name: workdir
      emptyDir: {}
```

## Command Line Examples

Useful Kubernetes commands for this task:

```bash
# Check the Pod created by the manifest
kubectl get pod init-demo

# Inspect Pod state, events, and init container progress
kubectl describe pod init-demo

# View logs from the init container
kubectl logs init-demo -c install

# View logs from the main application container
kubectl logs init-demo -c nginx

# Inspect init container status in structured output
kubectl get pod init-demo -o jsonpath='{.status.initContainerStatuses}'
```

## Portainer-Specific Features

Portainer provides several UI conveniences for this task:

1. **Manifest Deployment**: Use **Applications** > **Create from code** > **Manifest** to paste or load Kubernetes YAML
2. **Application Details**: Inspect the application status, placement, and related events from the application details page
3. **YAML View**: Review the generated YAML for the application, and edit it there in Business Edition
4. **Application Containers**: Open pod logs, stats, and console access from the application details view
5. **kubectl Shell**: Use Portainer's built-in `kubectl` and `helm` shell for cluster-side troubleshooting

## Troubleshooting Common Issues

**Issue: Pod stays in `Init:0/1` or `Init:CrashLoopBackOff`**
```bash
# Inspect events and status details
kubectl describe pod init-demo

# Check the init container logs
kubectl logs init-demo -c install
```

**Issue: Application deployed to the wrong namespace**
```bash
# Check the Pod in the expected namespace
kubectl get pod init-demo -n your-namespace

# When deploying from Portainer, make sure the selected namespace
# matches the target namespace for the manifest
```

**Issue: Need to confirm the init container completed successfully**
```bash
# View init container status directly
kubectl get pod init-demo -o jsonpath='{.status.initContainerStatuses[*].state}'
```

## Automating with the Portainer API

Portainer exposes an API for authenticated automation, and it can also act as a gateway to the underlying Kubernetes API for connected environments.

```bash
# Authenticate and get a JWT token
TOKEN=$(curl -s -X POST \
  "https://portainer.example.com:9443/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"password"}' | jq -r .jwt)

# Use the token in the Authorization header for subsequent API calls
printf 'Authorization: Bearer %s\n' "$TOKEN"
```

## Conclusion

Understanding how to run init containers in Portainer gives you greater control over Kubernetes application startup. Portainer's visual interface makes manifest deployment, inspection, and troubleshooting accessible to team members who may not want to work directly in `kubectl`, while still providing quick access to logs, events, YAML, and a built-in `kubectl` shell when needed.
