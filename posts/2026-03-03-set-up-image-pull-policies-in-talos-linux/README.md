# How to Set Up Image Pull Policies in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Container Image, Image Pull Policy, Deployment

Description: A hands-on guide to configuring image pull policies in Talos Linux Kubernetes clusters for efficient and reliable container deployments.

---

Image pull policies in Kubernetes determine when the kubelet fetches container images from a registry versus using a locally cached copy. Getting this right matters for deployment speed, bandwidth usage, and reliability. In Talos Linux, where you cannot manually pull images onto nodes, understanding and properly configuring image pull policies is even more important.

This guide explains how image pull policies work in a Talos Linux environment and how to configure them for different scenarios.

## Understanding Image Pull Policies

Kubernetes supports three image pull policies:

- **Always** - The kubelet always pulls the image from the registry, even if a local copy exists. This ensures you always get the latest version but adds latency to every pod start.
- **IfNotPresent** - The kubelet only pulls the image if it is not already cached locally. This is faster for subsequent deployments but may use a stale image if the tag was overwritten.
- **Never** - The kubelet never pulls the image and only uses locally cached images. The pod fails if the image is not available locally.

The default behavior depends on the image tag. If you use the `latest` tag or no tag at all, Kubernetes defaults to `Always`. For any other tag, it defaults to `IfNotPresent`.

## Setting Image Pull Policies in Pod Specs

The most direct way to control image pulling is in your pod specifications:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  containers:
    - name: app
      image: myregistry.com/myapp:v1.2.3
      # Explicitly set the pull policy
      imagePullPolicy: IfNotPresent
```

For Deployments, DaemonSets, and StatefulSets, set it in the pod template:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app
          image: myregistry.com/myapp:v1.2.3
          imagePullPolicy: Always
```

## Best Practices for Production

In production Talos Linux clusters, follow these guidelines:

### Use Specific Tags, Not Latest

```yaml
# Good - uses a specific version tag
containers:
  - name: app
    image: myregistry.com/myapp:v1.2.3
    imagePullPolicy: IfNotPresent

# Bad - uses latest, which defaults to Always pulling
containers:
  - name: app
    image: myregistry.com/myapp:latest
```

Using specific tags with `IfNotPresent` gives you the best balance of reliability and performance. You know exactly which version is running, and the kubelet only downloads it once per node.

### Use Digest References for Maximum Reproducibility

For the strongest guarantee that you are running exactly the image you expect:

```yaml
containers:
  - name: app
    image: myregistry.com/myapp@sha256:abc123def456...
    imagePullPolicy: IfNotPresent
```

Digest references are immutable. No one can overwrite a digest, so `IfNotPresent` is perfectly safe. This is the recommended approach for security-sensitive environments.

## Configuring Image Pull Secrets

In Talos Linux, you often need to pull from private registries. Image pull secrets work the same way as any Kubernetes cluster:

```bash
# Create an image pull secret
kubectl create secret docker-registry my-registry-secret \
  --docker-server=myregistry.com \
  --docker-username=myuser \
  --docker-password=mypassword \
  --docker-email=myemail@example.com
```

Reference it in your pod spec:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: private-app
spec:
  imagePullSecrets:
    - name: my-registry-secret
  containers:
    - name: app
      image: myregistry.com/private/myapp:v1.0.0
      imagePullPolicy: IfNotPresent
```

For convenience, attach pull secrets to a service account so all pods in a namespace use them automatically:

```bash
# Patch the default service account to include the pull secret
kubectl patch serviceaccount default \
  -p '{"imagePullSecrets": [{"name": "my-registry-secret"}]}'
```

## Registry Configuration in Talos

Beyond pod-level pull policies, Talos Linux lets you configure registry access at the node level. This is configured in the machine configuration:

```yaml
machine:
  registries:
    mirrors:
      docker.io:
        endpoints:
          - https://my-mirror.example.com
    config:
      my-mirror.example.com:
        tls:
          insecureSkipVerify: false
        auth:
          username: myuser
          password: mypassword
```

This node-level configuration affects all image pulls on the node, regardless of what the pod spec says. It is useful for setting up registry mirrors to reduce external bandwidth usage and improve pull speeds.

## Handling Image Pull Failures

When an image pull fails in a Talos Linux cluster, Kubernetes enters a backoff loop. Understanding this helps with troubleshooting:

```bash
# Check pod events for pull failures
kubectl describe pod my-app | grep -A 5 Events

# Common errors you might see:
# - ErrImagePull: Registry is unreachable or image does not exist
# - ImagePullBackOff: Kubernetes is backing off after repeated failures
# - ErrImageNeverPull: Policy is Never but image is not cached
```

To diagnose pull issues on the node level:

```bash
# Check containerd logs for image pull errors
talosctl logs containerd --nodes 10.0.0.5 | grep -i "pull\|image\|error"

# List cached images on the node
talosctl images --nodes 10.0.0.5
```

## Pre-Pulling Images

For workloads that need fast startup times, you can pre-pull images using a DaemonSet:

```yaml
# DaemonSet that pre-pulls an image and then exits
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: image-prepuller
spec:
  selector:
    matchLabels:
      app: prepuller
  template:
    metadata:
      labels:
        app: prepuller
    spec:
      initContainers:
        - name: pull-image
          image: myregistry.com/myapp:v2.0.0
          imagePullPolicy: Always
          command: ["sh", "-c", "echo Image pulled successfully"]
      containers:
        - name: pause
          image: registry.k8s.io/pause:3.9
```

This ensures the image is cached on every node before you deploy your actual workload.

## Admission Controllers for Policy Enforcement

If you want to enforce image pull policies across your cluster, use an admission controller. For example, with Kyverno:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-always-pull
spec:
  validationFailureAction: Enforce
  rules:
    - name: check-pull-policy
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: "imagePullPolicy must be Always for production namespaces"
        pattern:
          spec:
            containers:
              - imagePullPolicy: "Always"
```

This prevents anyone from deploying pods with a relaxed pull policy in namespaces where you want strict image freshness.

## Conclusion

Image pull policies in Talos Linux work just like they do in any Kubernetes cluster, but the immutable nature of Talos makes node-level registry configuration especially valuable. Use specific image tags with `IfNotPresent` for most workloads, configure registry mirrors at the Talos level for performance, and consider digest-based references for security-critical deployments. The combination of pod-level policies and node-level registry configuration gives you full control over how images flow into your cluster.
