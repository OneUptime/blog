# How to Run Podman Inside Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Kubernetes, Container, CI/CD, Cloud Native

Description: Learn how to run Podman inside Kubernetes pods for building container images, CI/CD pipelines, and container-in-container workflows without requiring Docker-in-Docker.

---

> Running Podman inside Kubernetes replaces the traditional Docker-in-Docker pattern with a daemonless, rootless alternative. This approach is ideal for building container images in CI/CD pipelines running on Kubernetes clusters.

Building container images inside Kubernetes has traditionally relied on Docker-in-Docker (DinD) or mounting the Docker socket. Both approaches have security concerns. Podman offers a safer alternative because it runs without a daemon and supports rootless execution. This guide shows you how to set up and use Podman inside Kubernetes pods.

---

## Why Podman Over Docker-in-Docker?

Docker-in-Docker (DinD) usually requires running a Docker daemon inside a container with privileged access. This creates security risks because the inner daemon still shares the host kernel. Podman reduces some of these risks:

- No daemon required, reducing the attack surface
- Rootless mode for unprivileged container builds
- No socket sharing that could expose the host
- Direct Kubernetes YAML generation from pods
- OCI-compliant image building

## Basic Kubernetes Pod with Podman

Create a pod that runs Podman:

```yaml
# podman-pod.yaml

apiVersion: v1
kind: Pod
metadata:
  name: podman-builder
  labels:
    app: podman-builder
spec:
  containers:
    - name: podman
      image: quay.io/podman/stable
      command: ["sleep", "infinity"]
      securityContext:
        privileged: true
      volumeMounts:
        - name: podman-storage
          mountPath: /var/lib/containers
  volumes:
    - name: podman-storage
      emptyDir:
        sizeLimit: 10Gi
```

Deploy and verify:

```bash
kubectl apply -f podman-pod.yaml
kubectl exec -it podman-builder -- podman info
```

## Rootless Podman in Kubernetes

For better security, run Podman as a non-root user:

```yaml
# podman-rootless.yaml
apiVersion: v1
kind: Pod
metadata:
  name: podman-rootless
spec:
  containers:
    - name: podman
      image: quay.io/podman/stable
      command: ["sleep", "infinity"]
      securityContext:
        runAsUser: 1000
        runAsGroup: 1000
        capabilities:
          add:
            - SETUID
            - SETGID
            - SYS_CHROOT
      volumeMounts:
        - name: podman-storage
          mountPath: /home/podman/.local/share/containers
        - name: dev-fuse
          mountPath: /dev/fuse
      resources:
        limits:
          cpu: "2"
          memory: "4Gi"
  volumes:
    - name: podman-storage
      emptyDir:
        sizeLimit: 10Gi
    - name: dev-fuse
      hostPath:
        path: /dev/fuse
        type: CharDevice
```

## CI/CD Pipeline with Podman on Kubernetes

### Tekton Pipeline Task

Use Podman as a build step in Tekton:

```yaml
# tekton-podman-task.yaml
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: podman-build
spec:
  params:
    - name: IMAGE
      description: The image to build
      type: string
    - name: DOCKERFILE
      description: Path to Dockerfile
      type: string
      default: "./Dockerfile"
  workspaces:
    - name: source
  steps:
    - name: build
      image: quay.io/podman/stable
      securityContext:
        privileged: true
      script: |
        #!/bin/bash
        cd $(workspaces.source.path)
        podman build \
          -t $(params.IMAGE) \
          -f $(params.DOCKERFILE) \
          .
        echo "Build complete"
    - name: push
      image: quay.io/podman/stable
      securityContext:
        privileged: true
      script: |
        #!/bin/bash
        podman push $(params.IMAGE)
        echo "Push complete"
```

### Jenkins Pipeline

Use Podman in a Kubernetes-based Jenkins pipeline:

```groovy
// Jenkinsfile
pipeline {
    agent {
        kubernetes {
            yaml '''
            apiVersion: v1
            kind: Pod
            spec:
              containers:
                - name: podman
                  image: quay.io/podman/stable
                  command: ["sleep", "infinity"]
                  securityContext:
                    privileged: true
                  volumeMounts:
                    - name: storage
                      mountPath: /var/lib/containers
              volumes:
                - name: storage
                  emptyDir:
                    sizeLimit: 10Gi
            '''
        }
    }
    stages {
        stage('Build') {
            steps {
                container('podman') {
                    sh 'podman build -t myapp:${BUILD_NUMBER} .'
                }
            }
        }
        stage('Test') {
            steps {
                container('podman') {
                    sh 'podman run --rm myapp:${BUILD_NUMBER} python3 -m pytest'
                }
            }
        }
        stage('Push') {
            steps {
                container('podman') {
                    sh 'podman push myapp:${BUILD_NUMBER}'
                }
            }
        }
    }
}
```

## Building Images Inside Kubernetes

### Using Buildah (Podman's Build Engine)

Podman uses Buildah for building images. You can also use Buildah directly for more control:

```yaml
# buildah-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: image-build
spec:
  template:
    spec:
      containers:
        - name: build
          image: quay.io/buildah/stable
          securityContext:
            privileged: true
          command:
            - /bin/bash
            - -c
            - |
              # Clone the repository
              dnf install -y git
              git clone https://github.com/example/myapp.git /build
              cd /build

              # Build the image
              buildah build -t registry.example.com/myapp:latest .

              # Login and push
              buildah login registry.example.com \
                --username "$REGISTRY_USER" \
                --password "$REGISTRY_PASS"
              buildah push registry.example.com/myapp:latest
          env:
            - name: REGISTRY_USER
              valueFrom:
                secretKeyRef:
                  name: registry-creds
                  key: username
            - name: REGISTRY_PASS
              valueFrom:
                secretKeyRef:
                  name: registry-creds
                  key: password
          volumeMounts:
            - name: storage
              mountPath: /var/lib/containers
      volumes:
        - name: storage
          emptyDir:
            sizeLimit: 20Gi
      restartPolicy: Never
  backoffLimit: 2
```

## Persistent Image Cache

Use a PersistentVolumeClaim to cache pulled images across builds:

```yaml
# pvc-cache.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: podman-cache
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
---
apiVersion: batch/v1
kind: Job
metadata:
  name: cached-build
spec:
  template:
    spec:
      containers:
        - name: build
          image: quay.io/podman/stable
          securityContext:
            privileged: true
          command: ["bash", "-c"]
          args:
            - |
              podman build -t myapp:latest /workspace
              podman images
          volumeMounts:
            - name: workspace
              mountPath: /workspace
            - name: cache
              mountPath: /var/lib/containers
      volumes:
        - name: workspace
          configMap:
            name: build-context
        - name: cache
          persistentVolumeClaim:
            claimName: podman-cache
      restartPolicy: Never
```

## Using VFS Storage Driver

When FUSE is unavailable in your Kubernetes cluster, use the VFS storage driver:

```yaml
# podman-vfs.yaml
apiVersion: v1
kind: Pod
metadata:
  name: podman-vfs
spec:
  containers:
    - name: podman
      image: quay.io/podman/stable
      command: ["sleep", "infinity"]
      securityContext:
        privileged: true
      env:
        - name: STORAGE_DRIVER
          value: "vfs"
      volumeMounts:
        - name: storage
          mountPath: /var/lib/containers
  volumes:
    - name: storage
      emptyDir:
        sizeLimit: 20Gi
```

VFS is slower because it copies entire image layers, but it works without FUSE or overlay kernel support.

## Multi-Architecture Builds

Build images for multiple architectures inside Kubernetes:

```yaml
# multiarch-build.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: multiarch-build
spec:
  template:
    spec:
      containers:
        - name: build
          image: quay.io/podman/stable
          securityContext:
            privileged: true
          command: ["bash", "-c"]
          args:
            - |
              # Build a multi-architecture manifest list
              podman build \
                --platform linux/amd64,linux/arm64 \
                --manifest myapp:latest \
                /workspace

              echo "Multi-arch build complete"
          volumeMounts:
            - name: workspace
              mountPath: /workspace
            - name: storage
              mountPath: /var/lib/containers
      volumes:
        - name: workspace
          emptyDir: {}
        - name: storage
          emptyDir:
            sizeLimit: 30Gi
      restartPolicy: Never
```

Resource Limits and Quotas

Set appropriate resource limits for Podman build pods:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: podman-builds-quota
  namespace: ci-builds
spec:
  hard:
    pods: "10"
    requests.cpu: "20"
    requests.memory: "40Gi"
    limits.cpu: "40"
    limits.memory: "80Gi"
```

## Security with Pod Security Standards

For clusters with Pod Security Standards, configure the namespace:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ci-builds
  labels:
    pod-security.kubernetes.io/enforce: privileged
    pod-security.kubernetes.io/audit: privileged
    pod-security.kubernetes.io/warn: privileged
```

## Troubleshooting

### Common issues and solutions:

```bash
# Check if Podman can access needed devices
kubectl exec podman-builder -- ls -la /dev/fuse

# Verify storage driver
kubectl exec podman-builder -- podman info --format '{{.Store.GraphDriverName}}'

# Check for storage space issues
kubectl exec podman-builder -- df -h /var/lib/containers

# View recent Podman system events
kubectl exec podman-builder -- podman system events --since 1h --stream=false
```

## Conclusion

Running Podman inside Kubernetes provides a secure alternative to Docker-in-Docker for building container images in CI/CD pipelines. Podman's daemonless architecture, rootless execution support, and OCI compliance make it well-suited for cloud-native build environments. Whether you use Tekton, Jenkins, or custom build jobs, Podman integrates cleanly into Kubernetes-based workflows while reducing the security risks associated with traditional DinD approaches.
