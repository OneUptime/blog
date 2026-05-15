# How Flux CD Controllers Communicate with Each Other

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Controller, Architecture, Custom Resources

Description: An in-depth look at how Flux CD's independent controllers communicate through the Kubernetes API using custom resource status fields, artifact references, and event-driven coordination.

---

## Controllers Are Independent Processes

Each Flux CD controller runs as a separate Kubernetes Deployment with its own binary, its own set of watched custom resources, and its own reconciliation loops. There is no shared message bus, no direct RPC between controllers, and no shared database. Instead, coordination flows through the Kubernetes API server, while source artifacts are retrieved from the source-controller's in-cluster HTTP server.

This design is intentional. By using Kubernetes itself as the communication layer, Flux CD inherits the reliability, scalability, and access control mechanisms that Kubernetes provides.

```mermaid
graph TB
    subgraph "Flux Controllers (separate processes)"
        SC[Source Controller]
        KC[Kustomize Controller]
        HC[Helm Controller]
        NC[Notification Controller]
    end

    API[Kubernetes API Server]

    SC <-->|reads/writes CRDs| API
    KC <-->|reads/writes CRDs| API
    HC <-->|reads/writes CRDs| API
    NC <-->|reads/writes CRDs| API
```

## Communication Mechanism 1: Custom Resource Status Fields

The primary communication mechanism between Flux controllers is the **status subresource** of custom resources. When a controller finishes processing a resource, it writes results into the resource's `.status` field. Other controllers watch for changes to these status fields and react accordingly.

### The Source-to-Consumer Pattern

The most important communication pattern in Flux is between the source-controller and the consuming controllers (kustomize-controller and helm-controller).

```mermaid
sequenceDiagram
    participant SC as Source Controller
    participant API as Kubernetes API
    participant KC as Kustomize Controller

    SC->>API: Update GitRepository status.artifact.revision = "main@sha1:abc123"
    API-->>KC: Watch event: GitRepository changed
    KC->>API: Read GitRepository status.artifact
    KC->>SC: HTTP GET artifact tarball from status.artifact.url
    SC-->>KC: Tarball contents
    KC->>KC: Build and apply manifests
    KC->>API: Update Kustomization status
```

Here is what the source-controller writes when it fetches a new revision:

```yaml
# GitRepository status after successful reconciliation

apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: fleet-infra
  namespace: flux-system
status:
  observedGeneration: 3
  conditions:
    - type: Ready
      status: "True"
      reason: Succeeded
      message: "stored artifact for revision 'main@sha1:abc123def'"
  artifact:
    revision: "main@sha1:abc123def"
    digest: "sha256:9f86d081884c7d659a2feaa..."
    path: "gitrepository/flux-system/fleet-infra/abc123def.tar.gz"
    url: "http://source-controller.flux-system.svc.cluster.local./gitrepository/flux-system/fleet-infra/abc123def.tar.gz"
    lastUpdateTime: "2026-03-05T10:00:00Z"
    size: 45678
```

The kustomize-controller has a watch on all `GitRepository` resources. When it detects that `status.artifact.revision` has changed, it triggers a reconciliation of every `Kustomization` that references that `GitRepository` through `spec.sourceRef`.

### The Cross-Reference Pattern

A Flux Kustomization references a source through `spec.sourceRef`:

```yaml
# The sourceRef field creates a cross-reference between controllers
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  sourceRef:
    kind: GitRepository     # Source type
    name: fleet-infra       # Source name
    namespace: flux-system  # Source namespace (defaults to same namespace)
  path: ./apps/production
  interval: 10m
```

The kustomize-controller resolves this reference by reading the named `GitRepository` from the Kubernetes API. It checks the `.status.artifact` field to find the download URL and revision. If the source is not ready (its `Ready` condition is `False`), the kustomize-controller waits and retries.

## Communication Mechanism 2: Artifact HTTP Server

While status fields coordinate the what and when, the actual artifact content is transferred through the source-controller's built-in HTTP server. This server runs on port 9090 inside the source-controller pod and serves tarball files from its local storage.

```mermaid
graph LR
    subgraph "Source Controller Pod"
        Fetcher[Artifact Fetcher] --> Storage[Local Storage /data]
        Storage --> HTTP[HTTP Server :9090]
    end

    subgraph "Kustomize Controller Pod"
        Downloader[Artifact Downloader] -->|GET /gitrepository/...tar.gz| HTTP
    end

    subgraph "Helm Controller Pod"
        HDownloader[Chart Downloader] -->|GET /helmchart/...tgz| HTTP
    end
```

The URL for each GitRepository artifact follows a predictable pattern:

```text
http://source-controller.flux-system.svc.cluster.local./
  {source-kind}/{namespace}/{name}/{artifact-file}.tar.gz
```

This is an in-cluster HTTP call - it never leaves the cluster network. The consuming controller downloads the tarball, extracts it to a temporary directory, and processes the contents.

## Communication Mechanism 3: Flux Events

Flux controllers emit Flux events when significant actions occur. They push these event payloads to the notification-controller event API, and the notification-controller forwards matching events to external systems.

```mermaid
graph LR
    KC[Kustomize Controller] -->|pushes Event| NC[Notification Controller Event API]
    HC[Helm Controller] -->|pushes Event| NC
    SC[Source Controller] -->|pushes Event| NC
    NC -->|forwards to| Slack[Slack]
    NC -->|forwards to| Teams[Teams]
    NC -->|forwards to| Webhook[Webhooks]
```

Events carry metadata that the notification-controller uses for filtering and routing:

```yaml
# Example Flux event emitted by the kustomize-controller
involvedObject:
  apiVersion: kustomize.toolkit.fluxcd.io/v1
  kind: Kustomization
  name: apps
  namespace: flux-system
metadata:
  kustomize.toolkit.fluxcd.io/revision: "main@sha1:abc123def"
severity: info
reason: ReconciliationSucceeded
message: "Applied revision: main@sha1:abc123def"
reportingController: kustomize-controller
timestamp: "2026-03-05T10:05:00Z"
```

The notification-controller matches events against `Alert` resources to determine what to forward:

```yaml
# Alert configuration that filters events by source and severity
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: production-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info           # Forward info and error events
  eventSources:
    - kind: Kustomization
      name: apps                # Only from the "apps" Kustomization
      namespace: flux-system
  exclusionList:
    - ".*no change.*"           # Exclude no-op reconciliations
```

## Communication Mechanism 4: Inbound Webhooks

The notification-controller also handles inbound communication. It exposes webhook endpoints that external systems (like GitHub or GitLab) can call to trigger immediate reconciliation.

```mermaid
sequenceDiagram
    participant GH as GitHub
    participant NC as Notification Controller
    participant API as Kubernetes API
    participant SC as Source Controller

    GH->>NC: POST /hook/{receiver-token} (push event)
    NC->>NC: Validate webhook signature
    NC->>API: Annotate GitRepository with reconcile.fluxcd.io/requestedAt
    API-->>SC: Watch event: GitRepository annotation changed
    SC->>SC: Trigger immediate reconciliation
```

The `Receiver` resource configures these webhook endpoints:

```yaml
# A Receiver that triggers GitRepository reconciliation on GitHub push
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: github-push
  namespace: flux-system
spec:
  type: github
  events:
    - "push"
  secretRef:
    name: github-webhook-secret   # Shared secret for HMAC validation
  resources:
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: GitRepository
      name: fleet-infra
      namespace: flux-system
```

When the notification-controller receives a valid webhook, it annotates the referenced resources with `reconcile.fluxcd.io/requestedAt`. The owning controller (source-controller in this case) watches for this annotation and triggers an immediate reconciliation, bypassing the normal interval wait.

## Communication Mechanism 5: Owner Labels and Finalizers

Flux also uses Kubernetes metadata and finalizers for lifecycle management. For example, when a `HelmRelease` uses a chart template, the helm-controller creates and manages an associated `HelmChart` resource, records it in the `HelmRelease` status, and marks it with owner labels.

```yaml
# The helm-controller creates HelmCharts associated with the HelmRelease
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmChart
metadata:
  name: flux-system-ingress-nginx
  namespace: flux-system
  labels:
    helm.toolkit.fluxcd.io/name: ingress-nginx
    helm.toolkit.fluxcd.io/namespace: flux-system
```

When a `HelmRelease` is deleted or its generated chart reference changes, the helm-controller deletes the associated `HelmChart`. The source-controller then cleans up stored artifacts according to its artifact retention settings.

## The Complete Communication Flow

Here is the full picture of how a Git push flows through all controllers:

```mermaid
graph TD
    A[Developer pushes to Git] --> B[GitHub sends webhook]
    B --> C[Notification Controller receives webhook]
    C --> D[Annotates GitRepository for immediate reconciliation]
    D --> E[Source Controller fetches new commit]
    E --> F[Source Controller updates artifact revision in status]
    F --> G[Kustomize Controller detects new revision]
    G --> H[Kustomize Controller downloads artifact]
    H --> I[Kustomize Controller applies manifests]
    I --> J[Kustomize Controller emits success/failure event]
    J --> K[Notification Controller sends Slack alert]
```

Most coordination arrows in this diagram go through the Kubernetes API server. The exception is artifact transfer: consuming controllers download artifact content directly from the source-controller's in-cluster HTTP server using the URL recorded in source status. This API-centered coordination is what makes the architecture resilient - if one controller restarts, the others continue operating, and reconciliation resumes from the last known state stored in the custom resources.

## Summary

Flux CD controllers communicate through five mechanisms: custom resource status fields for state propagation, an internal HTTP server for artifact transfer, Kubernetes events for observability, inbound webhooks for external triggers, and owner labels and finalizers for lifecycle management. This design avoids tight coupling between controllers while maintaining a coherent delivery pipeline. Each controller can be independently scaled, restarted, or upgraded without disrupting the others.
