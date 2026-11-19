# How to Make the Knative Serving Controller Trust a Private Registry CA

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative, Kubernetes, Security

Description: Configure private registry CA trust for the Knative Serving controller, then distinguish tag-resolution TLS failures from credentials and node image-pull failures.

Your nodes can pull an image from a private registry, but Knative rejects the Revision with an unknown-authority certificate error. There are two clients involved. The node container runtime pulls image layers, while the Knative Serving controller contacts the registry to resolve an image tag to a digest.

Installing a CA on the nodes does not automatically install it in the controller container. Give each client the trust it needs and test them separately.

## Confirm the failing client

Inspect the Service and its latest Revision, then correlate their messages with controller logs:

```bash
kubectl -n applications describe ksvc checkout
kubectl -n applications get revisions
kubectl -n applications describe revision checkout-00001
kubectl -n knative-serving logs deployment/controller --since=10m
```

Use the actual Revision name. An `x509: certificate signed by unknown authority` message during tag resolution points to controller trust. A hostname mismatch points to a certificate identity problem. A 401 points to authentication. `ImagePullBackOff` in an already-created pod may instead be the node runtime's registry connection.

The [Knative tag-resolution guide](https://knative.dev/docs/serving/tag-resolution/) explains why the controller needs registry access and documents its custom certificate configuration.

## Configure an Operator-managed controller

Create a ConfigMap containing the trusted CA certificate in the Knative Serving namespace. This should contain public CA certificates, never the CA's private key:

```bash
kubectl -n knative-serving create configmap registry-ca \
  --from-file=ca.crt=./registry-root-ca.pem \
  --dry-run=client -o yaml > registry-ca.yaml
```

Review and apply that manifest through your configuration management process. Then merge this field into the existing `KnativeServing` resource:

```yaml
spec:
  controller-custom-certs:
    name: registry-ca
    type: ConfigMap
```

The [Operator custom certificate configuration](https://knative.dev/docs/install/operator/configuring-serving-cr/#ssl-certificate-for-controller) also supports a Secret as the certificate source. Let the Operator reconcile its Deployment instead of patching the generated Deployment directly. Check the installed Operator's CRD and documentation if the field is rejected.

Inspect the resulting controller pod's certificate mount and environment configuration. Confirm the file is readable by the process and the expected certificate is present. A ConfigMap existing in Kubernetes does not prove that the container mounted it.

## Configure a YAML-managed installation

For installations without the Operator, the official guide documents mounting a certificate directory and setting `SSL_CERT_DIR`. Incorporate this into the Deployment manifest managed by your installation tooling:

```yaml
spec:
  template:
    spec:
      containers:
        - name: controller
          env:
            - name: SSL_CERT_DIR
              value: /etc/registry-ca
          volumeMounts:
            - name: registry-ca
              mountPath: /etc/registry-ca
              readOnly: true
      volumes:
        - name: registry-ca
          configMap:
            name: registry-ca
```

This is a fragment, not a complete Deployment. Preserve the existing container image, arguments, mounts, and environment entries. Knative also recognizes `SSL_CERT_FILE`. When customizing certificate paths, preserve any trust roots required for other registries the controller must access, and verify the behavior of your controller image.

## Verify trust without bypassing identity

From a diagnostic environment with the same DNS and network path, check the registry certificate:

```bash
openssl s_client \
  -connect registry.internal.example:443 \
  -servername registry.internal.example \
  -CAfile registry-root-ca.pem \
  -verify_hostname registry.internal.example \
  -verify_return_error </dev/null
```

This verifies the diagnostic client's connection, not the controller's loaded trust. Next create a new test Revision using a tag in the registry and confirm that controller-side resolution succeeds. Inspect the resulting Revision status, generated pod, and application request.

Keep registry authentication separate: the Service or its service account may need image-pull credentials. Keep node-runtime CA trust separate as well. A successful tag resolution can be followed by a node image-pull failure if only the controller was fixed.

For CA rotation, distribute the replacement trust before changing the registry's certificate when possible. Reconcile or restart the controller through the supported management path and prove a fresh lookup succeeds. Do not use a stale cached image or skip tag resolution as evidence that the new certificate is trusted.
