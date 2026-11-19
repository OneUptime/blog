# How to Enable Init Containers for Knative Serving Startup Tasks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative, Kubernetes, Configuration

Description: Enable Knative init containers through the correct configuration owner and design repeatable startup tasks that tolerate scale-out and cold starts.

A Kubernetes Deployment accepts your init container, but the equivalent Knative Service is rejected by admission. Knative deliberately exposes a smaller portable API, and some Kubernetes Pod fields require an extension flag.

Enable the init-container extension at the installation level, then place the startup task in the Service's Revision template. Design the task to run for every new pod, including pods created during autoscaling.

## Enable the extension at its source

The [Knative feature flag reference](https://knative.dev/docs/serving/configuration/feature-flags/#kubernetes-init-containers) names the setting `kubernetes.podspec-init-containers`. For an Operator-managed installation, merge it into the existing `KnativeServing` resource:

```yaml
spec:
  config:
    features:
      kubernetes.podspec-init-containers: "enabled"
      kubernetes.podspec-volumes-emptydir: "enabled"
```

The second flag enables the shared `emptyDir` volume used below. Check the extension support and defaults for your installed Serving release. The [Operator configuration mapping](https://knative.dev/docs/install/operator/configuring-with-operator/) turns `spec.config.features` into `config-features`.

For YAML-managed installations, put the corresponding strings in the managed ConfigMap's `data`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: config-features
  namespace: knative-serving
data:
  kubernetes.podspec-init-containers: "enabled"
  kubernetes.podspec-volumes-emptydir: "enabled"
```

Merge these keys while preserving other settings. Do not patch this generated ConfigMap directly when the Operator owns it. Verify the resulting live values before retrying admission.

## Put the task in the Revision template

This example copies a configuration file bundled in a preparation image into a shared volume. Replace both illustrative images with your own pinned images. The preparation image must contain `/bin/sh`, `/defaults/app.yaml`, and `cp`; the application must serve HTTP on port 8080 and read `/config/app.yaml`.

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: prepared-api
  namespace: applications
spec:
  template:
    spec:
      initContainers:
        - name: prepare-config
          image: registry.example.com/platform/config-preparer:build-42
          command: ["sh", "-ec"]
          args: ["cp /defaults/app.yaml /work/app.yaml"]
          volumeMounts:
            - name: prepared-config
              mountPath: /work
      containers:
        - name: app
          image: registry.example.com/apps/prepared-api:build-42
          ports:
            - containerPort: 8080
          volumeMounts:
            - name: prepared-config
              mountPath: /config
              readOnly: true
      volumes:
        - name: prepared-config
          emptyDir: {}
```

[Kubernetes init-container semantics](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/) apply to the ordinary run-to-completion init container shown here. The application starts after initialization succeeds. Do not infer that enabling this extension also enables every native-sidecar variant; validate those separately against your Knative release.

The shared file must be readable by the application's user. Match file ownership, permissions, and Pod security policy to your images. `emptyDir` lasts for the pod, not for the lifetime of the Service, so this pattern suits per-pod preparation rather than durable storage.

## Keep startup work repeatable and bounded

Autoscaling can run the task concurrently in many pods. An init container can also be restarted. Copying a fixed file into a pod-local directory is naturally repeatable; migrating a shared production database usually is not. Run release-wide migrations through a separately controlled workflow with appropriate coordination and rollback planning.

Avoid unbounded waits for a remote dependency. If startup depends on a download, use explicit timeouts, bounded retries, and verified artifact identity. In an air-gapped environment, make every dependency available locally before deployment. A hidden public URL in an init script can defeat an otherwise complete image mirror.

Include initialization time in the cold-start budget. Knative's [progress deadline](https://knative.dev/docs/serving/configuration/deployment/#configuring-progress-deadlines) can expire while a pod waits for initialization, image pulls, or scheduling. Increasing that deadline should follow measurement of necessary work, not conceal a task that never completes.

## Verify admission and execution separately

Use server-side dry run to check that the Service fields are accepted, then deploy through your normal workflow:

```bash
kubectl apply --dry-run=server -f service.yaml
kubectl -n applications get pods -l serving.knative.dev/service=prepared-api
kubectl -n applications logs prepared-api-example-pod -c prepare-config
```

Replace the pod name with an actual pod. Inspect its init-container status, application readiness, and a real request. Test another scale-out and a cold start after scale-to-zero. Each pod should recreate its own configuration successfully without altering shared system state.
