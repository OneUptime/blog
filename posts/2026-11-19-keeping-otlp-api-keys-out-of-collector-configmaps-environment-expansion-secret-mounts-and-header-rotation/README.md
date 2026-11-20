# Keep OTLP API Keys Out of Collector ConfigMaps with Secrets and Header Rotation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kubernetes, Secrets Management

Description: Use Kubernetes Secrets for Collector exporter credentials, understand environment and mounted-file refresh behavior, and rotate headers through a verified rollout.

A Collector ConfigMap is convenient to review, but it is the wrong place for an OTLP API key. Keep the endpoint and pipeline wiring in ordinary configuration, and supply the credential through a Kubernetes Secret or your existing secret manager.

The operational detail that matters most is rotation. Updating a Secret, updating a file inside a pod, and making an exporter use the new credential are separate events.

## Reference a Secret from the environment

This Collector exporter fragment keeps the key out of the ConfigMap:

```yaml
exporters:
  otlp_http/backend:
    endpoint: https://telemetry.example.com
    headers:
      Authorization: "Bearer ${env:OTLP_API_KEY}"
```

The example assumes the backend accepts a bearer token. Use its documented header name and authentication format. Current upstream Collector documentation calls the exporter `otlp_http`; use the component name supported by your pinned distribution, including `otlphttp` on older releases.

Add the following to the Collector container specification:

```yaml
env:
  - name: OTLP_API_KEY
    valueFrom:
      secretKeyRef:
        name: otlp-backend-credentials
        key: api-key
```

Provision that Secret through the team's secret delivery process. It must exist in the Collector pod's namespace. The [Collector configuration guide](https://opentelemetry.io/docs/collector/configuration/#environment-variables) documents `${env:...}` expansion, and [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/) documents `secretKeyRef`.

Do not add a convenient production token as an environment fallback. A missing credential should be detected during deployment, rather than silently selecting a shared key. Also check Helm and other templating layers: the literal `${env:OTLP_API_KEY}` must survive rendering for the Collector to expand it.

## Use a mounted file when that fits your delivery system

A Secret volume can hold a small private Collector configuration fragment. For example, the mounted file `/etc/otel-secret/exporter-auth.yaml` can contain an `exporters` mapping with the appropriate exporter ID and headers. Start the Collector with the public configuration followed by that private fragment:

```text
--config=/etc/otel-public/config.yaml
--config=/etc/otel-secret/exporter-auth.yaml
```

Both fragments form one combined configuration. Use the exact same exporter ID in the public pipeline and private fragment, and avoid defining the header twice. The public file supplies receivers, processors, and service wiring; the private file supplies the credential-bearing exporter settings.

Here is the volume wiring, assuming the Secret contains a key named `exporter-auth.yaml`:

```yaml
# Pod specification fragments
volumes:
  - name: otel-auth
    secret:
      secretName: otlp-backend-auth-config
containers:
  - name: collector
    volumeMounts:
      - name: otel-auth
        mountPath: /etc/otel-secret
        readOnly: true
```

Merge these fragments into the existing pod specification; they are not a complete Deployment. Apply appropriate file permissions for your Collector's user and group. Mount the directory rather than using `subPath` if you need Kubernetes to project subsequent Secret updates.

A file mount avoids placing the token in the process environment, but the Collector still reads secret material. Keep both configuration sources restricted, and do not print the merged configuration with sensitive fields exposed.

## Rotate with an explicit activation step

For environment-based delivery, existing processes retain the old environment. Replace the Collector pods after changing the Secret. For projected files, Kubernetes eventually updates the mounted content, but that does not itself prove the exporter reloaded its headers. Use a controlled restart unless the exact provider and distribution have documented and tested live-reload behavior.

A straightforward rotation sequence is:

1. Create the replacement backend key while the old key remains valid, if the backend supports overlap.
2. Update the credential source and trigger a rolling Collector restart.
3. Verify every replacement pod is ready and exports a synthetic record successfully.
4. Confirm backend authentication failures and exporter queues remain healthy.
5. Revoke the old key after all replicas have switched and any rollback decision is resolved.

For an existing Deployment, the restart commands are:

```bash
kubectl -n observability rollout restart deployment/otel-collector
kubectl -n observability rollout status deployment/otel-collector
```

Readiness alone cannot prove backend authorization. Check successful exports and destination records as well. Plan queue persistence and shutdown time so the rollout does not discard buffered telemetry. If the backend permits only one active key, plan the transition window and monitor for temporary export failures.

Keeping keys out of ConfigMaps reduces accidental exposure through routine config review. Complete the setup with limited Secret access, appropriate encryption at rest, and a rotation procedure that verifies the exporter actually changed credentials.
