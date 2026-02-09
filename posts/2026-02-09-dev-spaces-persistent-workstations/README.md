# How to Set Up Dev Spaces in Kubernetes with Persistent Developer Workstations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Development, DevOps, Workstations, Cloud

Description: Create persistent developer workstations in Kubernetes with dev spaces that preserve development environments, tools, and configuration across sessions for consistent cloud-based development.

---

Cloud-based development environments eliminate the need for powerful local machines and ensure consistency across teams. However, ephemeral containers lose state between sessions, forcing developers to reconfigure their environment repeatedly. Persistent dev spaces solve this problem by maintaining developer workstations across restarts.

This guide shows you how to build persistent developer workstations in Kubernetes using persistent volumes, custom images, and automation that preserves tool configuration, shell history, and working directories.

## Architecture Overview

A persistent dev space consists of:

- Persistent volume for home directory and workspace
- Custom development container with pre-installed tools
- StatefulSet for stable pod identity and storage
- Service for consistent network access
- VS Code or SSH access for remote development

This architecture ensures developers can disconnect and reconnect without losing work or configuration.

## Creating the Base Developer Image

Build a container image with common development tools:

```dockerfile
# Dockerfile.devspace
FROM ubuntu:22.04

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install base tools
RUN apt-get update && apt-get install -y \
    git \
    vim \
    tmux \
    curl \
    wget \
    build-essential \
    python3 \
    python3-pip \
    nodejs \
    npm \
    kubectl \
    docker.io \
    jq \
    fzf \
    ripgrep \
    && rm -rf /var/lib/apt/lists/*

# Install Go
RUN wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz && \
    tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz && \
    rm go1.21.5.linux-amd64.tar.gz

ENV PATH="/usr/local/go/bin:${PATH}"

# Install useful CLI tools
RUN go install github.com/junegunn/fzf@latest && \
    go install github.com/jesseduffield/lazygit@latest && \
    go install github.com/ahmetb/kubectx/cmd/kubectx@latest && \
    go install github.com/ahmetb/kubectx/cmd/kubens@latest

# Install code-server for browser-based VS Code
RUN curl -fsSL https://code-server.dev/install.sh | sh

# Create developer user
RUN useradd -m -s /bin/bash developer && \
    echo "developer ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Set up default shell configuration
COPY --chown=developer:developer configs/.bashrc /home/developer/.bashrc
COPY --chown=developer:developer configs/.vimrc /home/developer/.vimrc
COPY --chown=developer:developer configs/.tmux.conf /home/developer/.tmux.conf
COPY --chown=developer:developer configs/.gitconfig /home/developer/.gitconfig

USER developer
WORKDIR /home/developer

# Default command starts code-server
CMD ["code-server", "--bind-addr", "0.0.0.0:8080", "--auth", "none"]
```

Create default configuration files:

```bash
# configs/.bashrc
export PS1='\[\033[01;32m\]\u@devspace\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ '
export EDITOR=vim
export PATH="$PATH:$HOME/go/bin"

# Kubernetes shortcuts
alias k='kubectl'
alias kgp='kubectl get pods'
alias kgs='kubectl get svc'
alias kgd='kubectl get deploy'

# Git shortcuts
alias gs='git status'
alias ga='git add'
alias gc='git commit'
alias gp='git push'

# Load fzf
[ -f ~/.fzf.bash ] && source ~/.fzf.bash
```

```bash
# configs/.vimrc
syntax on
set number
set relativenumber
set tabstop=4
set shiftwidth=4
set expandtab
set autoindent
set hlsearch
set incsearch
```

```bash
# configs/.tmux.conf
set -g mouse on
set -g history-limit 10000
set -g base-index 1
setw -g pane-base-index 1

# Split panes using | and -
bind | split-window -h
bind - split-window -v
```

Build and push the image:

```bash
docker build -f Dockerfile.devspace -t myregistry/devspace:latest .
docker push myregistry/devspace:latest
```

## Deploying Persistent Dev Spaces

Create a StatefulSet with persistent storage:

```yaml
# devspace-statefulset.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: devspaces
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: devspace-storage
  namespace: devspaces
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: fast-ssd
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: devspace
  namespace: devspaces
spec:
  serviceName: devspace
  replicas: 1
  selector:
    matchLabels:
      app: devspace
  template:
    metadata:
      labels:
        app: devspace
    spec:
      containers:
      - name: devspace
        image: myregistry/devspace:latest
        ports:
        - containerPort: 8080
          name: code-server
        - containerPort: 22
          name: ssh
        volumeMounts:
        - name: workspace
          mountPath: /home/developer
        - name: docker-sock
          mountPath: /var/run/docker.sock
        env:
        - name: DEVELOPER_NAME
          value: "john-doe"
        resources:
          requests:
            cpu: "1"
            memory: 2Gi
          limits:
            cpu: "4"
            memory: 8Gi
        securityContext:
          capabilities:
            add:
              - SYS_PTRACE

      volumes:
      - name: docker-sock
        hostPath:
          path: /var/run/docker.sock

  volumeClaimTemplates:
  - metadata:
      name: workspace
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 50Gi
---
apiVersion: v1
kind: Service
metadata:
  name: devspace
  namespace: devspaces
spec:
  type: ClusterIP
  selector:
    app: devspace
  ports:
  - name: code-server
    port: 8080
    targetPort: 8080
  - name: ssh
    port: 22
    targetPort: 22
```

Deploy the dev space:

```bash
kubectl apply -f devspace-statefulset.yaml
```

## Accessing the Dev Space

Set up port forwarding for VS Code access:

```bash
kubectl port-forward -n devspaces statefulset/devspace 8080:8080
```

Access the workspace at `http://localhost:8080`.

For SSH access, configure a service:

```bash
kubectl port-forward -n devspaces statefulset/devspace 2222:22
ssh -p 2222 developer@localhost
```

## Automating Dev Space Provisioning

Create a script that provisions dev spaces for team members:

```bash
#!/bin/bash
# provision-devspace.sh

DEVELOPER=$1
EMAIL=$2

if [ -z "$DEVELOPER" ] || [ -z "$EMAIL" ]; then
    echo "Usage: $0 <developer-name> <email>"
    exit 1
fi

# Sanitize developer name
DEV_NAME=$(echo "$DEVELOPER" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
NAMESPACE="devspace-$DEV_NAME"

echo "Provisioning dev space for $DEVELOPER ($EMAIL)..."

# Create namespace
kubectl create namespace "$NAMESPACE"

# Label namespace
kubectl label namespace "$NAMESPACE" \
  type=devspace \
  developer="$DEV_NAME" \
  email="$EMAIL"

# Create StatefulSet
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: $DEV_NAME
  namespace: $NAMESPACE
spec:
  serviceName: $DEV_NAME
  replicas: 1
  selector:
    matchLabels:
      app: devspace
      owner: $DEV_NAME
  template:
    metadata:
      labels:
        app: devspace
        owner: $DEV_NAME
    spec:
      containers:
      - name: devspace
        image: myregistry/devspace:latest
        ports:
        - containerPort: 8080
          name: code-server
        env:
        - name: DEVELOPER_NAME
          value: "$DEVELOPER"
        - name: DEVELOPER_EMAIL
          value: "$EMAIL"
        - name: GIT_AUTHOR_NAME
          value: "$DEVELOPER"
        - name: GIT_AUTHOR_EMAIL
          value: "$EMAIL"
        - name: GIT_COMMITTER_NAME
          value: "$DEVELOPER"
        - name: GIT_COMMITTER_EMAIL
          value: "$EMAIL"
        volumeMounts:
        - name: workspace
          mountPath: /home/developer
        resources:
          requests:
            cpu: "1"
            memory: 2Gi
          limits:
            cpu: "4"
            memory: 8Gi
  volumeClaimTemplates:
  - metadata:
      name: workspace
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 50Gi
---
apiVersion: v1
kind: Service
metadata:
  name: $DEV_NAME
  namespace: $NAMESPACE
spec:
  type: ClusterIP
  selector:
    app: devspace
    owner: $DEV_NAME
  ports:
  - name: code-server
    port: 8080
    targetPort: 8080
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: $DEV_NAME
  namespace: $NAMESPACE
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt
spec:
  tls:
  - hosts:
    - $DEV_NAME.devspaces.example.com
    secretName: ${DEV_NAME}-tls
  rules:
  - host: $DEV_NAME.devspaces.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: $DEV_NAME
            port:
              number: 8080
EOF

# Wait for pod to be ready
echo "Waiting for dev space to be ready..."
kubectl wait --for=condition=ready pod \
  -l "owner=$DEV_NAME" \
  -n "$NAMESPACE" \
  --timeout=300s

echo ""
echo "Dev space provisioned successfully!"
echo "URL: https://$DEV_NAME.devspaces.example.com"
echo "Namespace: $NAMESPACE"
echo ""
echo "Send this information to $EMAIL"
```

Use it:

```bash
chmod +x provision-devspace.sh
./provision-devspace.sh "John Doe" "john@example.com"
```

## Implementing Workspace Snapshots

Create snapshots of dev spaces for backup and recovery:

```bash
#!/bin/bash
# snapshot-devspace.sh

NAMESPACE=$1
DEV_NAME=$2
SNAPSHOT_NAME="${DEV_NAME}-$(date +%Y%m%d-%H%M%S)"

if [ -z "$NAMESPACE" ] || [ -z "$DEV_NAME" ]; then
    echo "Usage: $0 <namespace> <dev-name>"
    exit 1
fi

echo "Creating snapshot: $SNAPSHOT_NAME"

# Create VolumeSnapshot
cat <<EOF | kubectl apply -f -
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: $SNAPSHOT_NAME
  namespace: $NAMESPACE
spec:
  volumeSnapshotClassName: csi-snapclass
  source:
    persistentVolumeClaimName: workspace-${DEV_NAME}-0
EOF

echo "Snapshot created: $SNAPSHOT_NAME"
echo "Restore with: restore-devspace.sh $NAMESPACE $DEV_NAME $SNAPSHOT_NAME"
```

Restore from snapshot:

```bash
#!/bin/bash
# restore-devspace.sh

NAMESPACE=$1
DEV_NAME=$2
SNAPSHOT_NAME=$3

if [ -z "$NAMESPACE" ] || [ -z "$DEV_NAME" ] || [ -z "$SNAPSHOT_NAME" ]; then
    echo "Usage: $0 <namespace> <dev-name> <snapshot-name>"
    exit 1
fi

echo "Restoring from snapshot: $SNAPSHOT_NAME"

# Scale down StatefulSet
kubectl scale statefulset "$DEV_NAME" -n "$NAMESPACE" --replicas=0

# Wait for pod to terminate
kubectl wait --for=delete pod -l "owner=$DEV_NAME" -n "$NAMESPACE" --timeout=60s

# Delete existing PVC
kubectl delete pvc "workspace-${DEV_NAME}-0" -n "$NAMESPACE"

# Create PVC from snapshot
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: workspace-${DEV_NAME}-0
  namespace: $NAMESPACE
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 50Gi
  dataSource:
    name: $SNAPSHOT_NAME
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
EOF

# Scale up StatefulSet
kubectl scale statefulset "$DEV_NAME" -n "$NAMESPACE" --replicas=1

echo "Restore complete!"
```

## Setting Up Automatic Backups

Implement scheduled backups with CronJob:

```yaml
# backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: devspace-backup
  namespace: devspaces
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: backup-sa
          containers:
          - name: backup
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              for pvc in $(kubectl get pvc -n devspaces -o name); do
                name=$(basename $pvc)
                snapshot="${name}-backup-$(date +%Y%m%d)"

                cat <<EOF | kubectl apply -f -
              apiVersion: snapshot.storage.k8s.io/v1
              kind: VolumeSnapshot
              metadata:
                name: $snapshot
                namespace: devspaces
              spec:
                volumeSnapshotClassName: csi-snapclass
                source:
                  persistentVolumeClaimName: $name
              EOF

                echo "Created snapshot: $snapshot"
              done
          restartPolicy: OnFailure
```

## Monitoring Dev Space Usage

Track resource consumption:

```bash
#!/bin/bash
# devspace-usage.sh

echo "Dev Space Usage Report"
echo "====================="

kubectl get namespaces -l type=devspace -o json | \
  jq -r '.items[].metadata.name' | \
  while read ns; do
    echo ""
    echo "Namespace: $ns"
    echo "Developer: $(kubectl get namespace $ns -o jsonpath='{.metadata.labels.developer}')"

    # CPU and memory usage
    kubectl top pods -n "$ns" 2>/dev/null || echo "  Metrics unavailable"

    # Storage usage
    kubectl get pvc -n "$ns" -o json | \
      jq -r '.items[] | "  Storage: \(.status.capacity.storage) (\(.spec.storageClassName))"'

    # Age
    age=$(kubectl get namespace "$ns" -o jsonpath='{.metadata.creationTimestamp}')
    echo "  Created: $age"
  done
```

Persistent dev spaces in Kubernetes provide developers with consistent, stateful environments that survive pod restarts. Combined with automated provisioning and backup strategies, they deliver reliable cloud-based development workstations.
