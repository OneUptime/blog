# Using ConfigMaps, Secrets, and imagePullSecrets in Devfile Workspaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Devfile, Kubernetes, Secrets, ConfigMaps, Supply Chain Security

Description: Use Kubernetes ConfigMaps, Secrets, and imagePullSecrets with Devfile workflows without embedding credentials or assuming unsupported portable fields.

---

Devfile container components have a portable `env` list of literal name/value pairs. They do not expose the full Kubernetes `EnvVar`, `envFrom`, Secret volume, or ConfigMap volume APIs. That distinction matters: copying a password into `components[].container.env[].value` is valid Devfile YAML, but it hardcodes the secret in source control.

Use Kubernetes resources for sensitive values, create credentials outside the Devfile, and be explicit about whether configuration belongs to the inner-loop workspace container or an outer-loop application workload.

## Do Not Put Secret Values in a Devfile

This is syntactically possible and operationally unsafe:

```yaml
components:
  - name: runtime
    container:
      image: registry.example.com/platform/node:22
      env:
        - name: DATABASE_PASSWORD
          value: correct-horse-battery-staple
```

The value can leak through Git history, reviews, registry artifacts, logs, and generated workspace resources. Devfile variables do not fix that problem:

```yaml
variables:
  DATABASE_PASSWORD: correct-horse-battery-staple
```

Variables are string substitution, not a secret store. Keep secrets in a managed secret system or Kubernetes Secret and grant the minimum namespace access.

## Create Kubernetes Secrets Outside Source Control

For a development namespace, create a Secret from a secure input channel:

```bash
kubectl create secret generic catalog-database \
  --from-literal=username="$DATABASE_USERNAME" \
  --from-literal=password="$DATABASE_PASSWORD" \
  --dry-run=client \
  -o yaml |
kubectl apply -f -
```

This avoids writing the value into a checked-in file, but shell history, process inspection, CI logs, and environment handling still need consideration. In production, prefer an approved secret controller or delivery system that retrieves secrets from the organization's source of truth.

Do not commit a base64-encoded Kubernetes Secret and call it encrypted. The `data` field is base64 representation, which is reversible.

## Use Native References in Outer-Loop Manifests

An application Deployment can consume a pre-created Secret and ConfigMap:

```yaml
apiVersion: v1
kind: List
items:
  - apiVersion: v1
    kind: ConfigMap
    metadata:
      name: catalog-config
    data:
      LOG_LEVEL: info
      FEATURE_SEARCH_V2: "true"
  - apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: catalog-api
    spec:
      selector:
        matchLabels:
          app: catalog-api
      template:
        metadata:
          labels:
            app: catalog-api
        spec:
          containers:
            - name: catalog-api
              image: registry.example.com/catalog-api:1.8.0
              envFrom:
                - configMapRef:
                    name: catalog-config
                - secretRef:
                    name: catalog-database
```

Check in the ConfigMap only when all values are non-sensitive. The Deployment references the Secret by name but does not define its contents.

Reference that manifest as a Devfile Kubernetes component:

```yaml
schemaVersion: 2.3.0
metadata:
  name: catalog-api
components:
  - name: outerloop-workload
    kubernetes:
      uri: deploy/application.yaml
commands:
  - id: apply-workload
    apply:
      component: outerloop-workload
  - id: deploy
    composite:
      commands:
        - apply-workload
      group:
        kind: deploy
        isDefault: true
```

Devfile's Kubernetes-resource guidance uses a Kubernetes `List` when one component supplies several objects. This pattern configures the workload described by `application.yaml`; it does not inject those values into a separate inner-loop `container` component.

## Know the Portable Inner-Loop Limit

The standard Devfile 2.3 container environment shape accepts:

```yaml
env:
  - name: LOG_LEVEL
    value: debug
```

It does not accept Kubernetes `valueFrom.secretKeyRef`:

```yaml
# Not part of the portable Devfile container env schema
env:
  - name: DATABASE_PASSWORD
    valueFrom:
      secretKeyRef:
        name: catalog-database
        key: password
```

Nor can `pod-overrides` or `container-overrides` be used to smuggle this field into the generated container. Devfile 2.3 explicitly restricts `container-overrides` from changing environment variables and volume mounts. `pod-overrides` cannot override containers or volumes.

For an inner-loop workspace that needs secrets, choose a documented integration in the consuming platform, such as a service-binding or secret-injection feature, and document that the Devfile is no longer consumer-neutral. Otherwise, run a development dependency with non-sensitive disposable credentials declared as ordinary environment values, isolated from production.

## Add `imagePullSecrets` Through a Pod Override

Pulling the workspace image is a pod-level concern. Devfile 2.3's documented `pod-overrides` attribute can set pod fields that are not prohibited, including `imagePullSecrets`:

```yaml
schemaVersion: 2.3.0
metadata:
  name: catalog-api
attributes:
  pod-overrides:
    spec:
      imagePullSecrets:
        - name: platform-registry
components:
  - name: runtime
    container:
      image: registry.internal.example.com/dev/node:22
      mountSources: true
```

Create the pull Secret in the workspace namespace without committing it:

```bash
kubectl create secret docker-registry platform-registry \
  --docker-server=registry.internal.example.com \
  --docker-username="$REGISTRY_USERNAME" \
  --docker-password="$REGISTRY_PASSWORD"
```

Kubernetes requires the Secret to exist in the same namespace as the pod that uses it. The credentials must authorize the exact registry host in the image reference.

The override tells a supporting Devfile consumer to put the Secret name on the generated pod. It does not distribute that Secret to other namespaces and does not authenticate local Docker or Podman builds.

## Separate Three Registry Authentication Paths

A Devfile workflow may involve three independent clients:

1. `odo` or another tool fetching a stack from a Devfile registry.
2. Docker or Podman pulling base images and pushing an image component.
3. Kubernetes pulling the resulting container image onto a node.

`imagePullSecrets` addresses only the third path. Authenticate the local builder with its documented login mechanism:

```bash
printf '%s' "$REGISTRY_PASSWORD" |
  podman login registry.internal.example.com \
    --username "$REGISTRY_USERNAME" \
    --password-stdin
```

Registry-stack access and TLS trust are separate again. Do not keep trying different `imagePullSecrets` when the error occurs before a pod is created.

## Mount ConfigMap or Secret Files in Native Workloads

For applications that read files:

```yaml
spec:
  template:
    spec:
      containers:
        - name: catalog-api
          image: registry.example.com/catalog-api:1.8.0
          volumeMounts:
            - name: application-config
              mountPath: /etc/catalog
              readOnly: true
            - name: database-secret
              mountPath: /var/run/secrets/catalog
              readOnly: true
      volumes:
        - name: application-config
          configMap:
            name: catalog-config
        - name: database-secret
          secret:
            secretName: catalog-database
```

This is Kubernetes manifest syntax inside a Kubernetes component's resource, not Devfile `volume` component syntax. A Devfile volume declares workspace storage; it cannot be converted into a ConfigMap or Secret volume by adding Kubernetes-only fields.

Mounted updates are eventually reflected according to Kubernetes rules, while environment variables are fixed for the lifetime of the container. Applications may still need to reload files. Treat configuration refresh as an application and platform concern.

## Avoid Ownership Conflicts

Decide who owns each resource:

- platform automation owns long-lived Secrets;
- application Git owns non-sensitive ConfigMaps and workload references;
- Devfile/odo owns temporary development resources;
- a secret operator owns synchronized or generated Secret objects.

If both `odo deploy` and GitOps apply the same object, deletion or reconciliation becomes unpredictable. Keep names, labels, and namespaces explicit, and do not let a development cleanup command remove platform-owned credentials.

## Diagnose by Failure Stage

For a workspace image pull failure:

```bash
kubectl describe pod <workspace-pod>
kubectl get secret platform-registry
```

Look for `ErrImagePull`, `ImagePullBackOff`, a missing Secret, or unauthorized registry access.

For a running application with missing configuration:

```bash
kubectl get configmap catalog-config
kubectl get secret catalog-database
kubectl describe pod <application-pod>
```

Check the namespace, key names, pod spec, and events without printing secret values.

For a local image push failure, inspect Podman or Docker authentication. For a Devfile registry fetch failure, inspect the registry URL and TLS trust. The client that reports the error determines which credential path to repair.

## Official Documentation

- [Devfile 2.3 schema reference](https://devfile.io/docs/2.3.0/devfile-schema)
- [Devfile 2.3: Extending Kubernetes resources](https://devfile.io/docs/2.3.0/overriding-pod-and-container-attributes)
- [Devfile 2.3: Defining Kubernetes resources](https://devfile.io/docs/2.3.0/defining-kubernetes-resources)
- [Kubernetes ConfigMaps](https://kubernetes.io/docs/concepts/configuration/configmap/)
- [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
- [Kubernetes: Pull an image from a private registry](https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/)
