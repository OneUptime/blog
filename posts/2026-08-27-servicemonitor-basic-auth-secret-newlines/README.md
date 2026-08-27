# How to Configure Basic Authentication in a ServiceMonitor Without Secret Newline Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Prometheus Operator, ServiceMonitor, Kubernetes Secrets, Basic Authentication, Troubleshooting

Description: Store exact Basic Auth credential bytes in Kubernetes Secrets, reference them safely from a ServiceMonitor, and detect hidden trailing newlines.

---

HTTP Basic Authentication encodes the exact bytes of `username:password`. A trailing newline in either Kubernetes Secret value becomes part of the credential, so a password that looks correct in YAML can still produce `401 Unauthorized`.

Prometheus Operator does not trim Secret data. Create the values without a newline, reference both keys from `basicAuth`, and verify byte properties without printing the secret.

## Create Exact Secret Values

The simplest imperative form uses literals:

```bash
kubectl create secret generic metrics-basic-auth \
  --namespace=monitoring \
  --from-literal=username='prometheus' \
  --from-literal=password='replace-with-the-real-password'
```

Quote values so that the shell does not expand `$`, `!`, backslashes, glob characters, or spaces.

If credentials must come from files, do not create the files with plain `echo`, which normally appends a newline. Use `printf`:

```bash
printf '%s' 'prometheus' > username.txt
printf '%s' 'replace-with-the-real-password' > password.txt

kubectl create secret generic metrics-basic-auth \
  --namespace=monitoring \
  --from-file=username=username.txt \
  --from-file=password=password.txt
```

Kubernetes documentation calls out this exact issue: `kubectl` base64-encodes file contents, including an extra newline.

A declarative Secret can use `stringData`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: metrics-basic-auth
  namespace: monitoring
type: kubernetes.io/basic-auth
stringData:
  username: prometheus
  password: replace-with-the-real-password
```

Plain YAML scalars above do not include a line ending in the value. Avoid a literal block scalar with the default chomping behavior:

```yaml
password: |
  replace-with-the-real-password
```

That `|` form keeps a final newline. If a block is genuinely required, `|-` strips the final line break, but a one-line quoted or plain scalar is clearer for credentials. Do not commit plaintext Secret manifests to source control unless an approved encryption workflow protects them. Kubernetes also notes that `stringData` does not work well with server-side apply, so choose a secrets-management workflow that fits the deployment mechanism.

## Reference the Secret from the ServiceMonitor

Both `username` and `password` are `SecretKeySelector` values:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: private-api
  namespace: monitoring
  labels:
    prometheus: platform
spec:
  namespaceSelector:
    matchNames:
      - applications
  selector:
    matchLabels:
      app.kubernetes.io/name: private-api
  endpoints:
    - port: metrics
      path: /metrics
      basicAuth:
        username:
          name: metrics-basic-auth
          key: username
        password:
          name: metrics-basic-auth
          key: password
```

The Secret belongs in the same namespace as the ServiceMonitor, here `monitoring`, even though the selected Service is in `applications`. The Operator must be able to read it when generating Prometheus configuration.

On one endpoint, `basicAuth` cannot be combined with `authorization`, `bearerTokenSecret`, or `oauth2`. Prometheus Operator treats these as mutually exclusive authentication methods and rejects the monitor configuration when they are combined.

The Secret type does not drive the ServiceMonitor reference. `Opaque` works, but `kubernetes.io/basic-auth` documents the intended `username` and `password` keys and lets Kubernetes validate the built-in Secret type's required structure.

## Detect a Newline Without Revealing the Credential

This command reports only the byte count and whether the decoded value ends with line feed or carriage return:

```bash
kubectl get secret metrics-basic-auth -n monitoring \
  -o jsonpath='{.data.password}' \
  | base64 -d \
  | python3 -c 'import sys; d=sys.stdin.buffer.read(); print({"bytes": len(d), "ends_lf": d.endswith(b"\n"), "ends_cr": d.endswith(b"\r")})'
```

Run the same check for `.data.username`. Avoid `kubectl get secret -o yaml` in shared terminals and tickets because base64 is encoding, not encryption.

If the value is wrong, recreate or patch the Secret through the approved secret manager. Do not try to compensate by adding a newline to the server-side password. The stored secret should represent the real credential exactly.

## Separate Authentication from Other Scrape Failures

After the monitor reconciles, inspect the Prometheus target error:

| Symptom | Likely cause |
| --- | --- |
| `401 Unauthorized` | wrong username/password bytes or authentication realm |
| `403 Forbidden` | credential accepted but not authorized, depending on the application |
| `server returned HTTP status 404` | wrong metrics path |
| timeout or connection refused | network, port, listener, or policy, not Basic Auth |
| target absent | monitor or Service discovery, not authentication |

Test the application independently with the same credential through a secure method. Avoid putting a password directly on a command line because process listings and shell history can expose it. A temporary netrc file with restrictive permissions or an isolated diagnostic Pod that references the same Secret is safer than `curl -u user:password` in a shared shell.

Check rejection Events if the Operator cannot resolve a Secret or key:

```bash
kubectl get events -n monitoring \
  --field-selector=involvedObject.kind=ServiceMonitor,involvedObject.name=private-api \
  --sort-by=.lastTimestamp
```

An absent Secret, wrong key, wrong namespace, or denied read can prevent the monitor from being rendered. A `401` on an active target means rendering succeeded and the remote server rejected the resulting header.

## Rotate Credentials Cleanly

Updating the referenced Secret causes the Operator to reconcile generated configuration, and the Prometheus config reloader applies the change. Confirm the target after rotation rather than restarting Prometheus immediately.

If the server cannot accept old and new credentials concurrently, coordinate the change to minimize the interval in which one side has advanced. For zero-downtime rotation, use an authentication system that supports overlapping credentials or short-lived tokens rather than relying on a single Basic Auth password.

## Official Documentation

- [Prometheus Operator Endpoint API](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.Endpoint)
- [Prometheus Operator BasicAuth API](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.BasicAuth)
- [Kubernetes: manage Secrets with kubectl](https://kubernetes.io/docs/tasks/configmap-secret/managing-secret-using-kubectl/)
- [Kubernetes Secret types and Basic Authentication Secret](https://kubernetes.io/docs/concepts/configuration/secret/#basic-authentication-secret)
- [Prometheus scrape configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config)

## Conclusion

Basic Auth failures often come from one invisible byte. Create Secret values with literals or `printf`, avoid newline-preserving YAML blocks, keep the Secret beside the ServiceMonitor, and reference the exact keys through `basicAuth`. Verify only length and trailing-byte properties, then use the Prometheus target error to distinguish rejected credentials from discovery or network failures.
