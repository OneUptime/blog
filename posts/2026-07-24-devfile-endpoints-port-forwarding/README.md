# Devfile Endpoints and Port Forwarding: Fixing Routes, Ingress, and HTTPS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Devfile, odo, Kubernetes, Networking, TLS

Description: Model Devfile endpoints accurately, use odo port forwarding for local access, and define explicit Ingress or Route resources for shared HTTPS URLs.

---

A Devfile endpoint says that a component listens on a port and describes how a consumer may expose it. It does not, by itself, guarantee a Kubernetes Ingress, an OpenShift Route, a public DNS name, or an application TLS certificate.

That distinction separates two common workflows:

- inner-loop development usually uses local port forwarding;
- outer-loop or shared environments use explicit Kubernetes or OpenShift networking resources.

Treat the Devfile endpoint as portable intent, then validate how the selected consumer implements it.

## Define the Port the Process Actually Uses

A minimal HTTP endpoint belongs to its container component:

```yaml
schemaVersion: 2.3.0
metadata:
  name: catalog-api
components:
  - name: runtime
    container:
      image: node:22
      mountSources: true
      endpoints:
        - name: http
          targetPort: 3000
          exposure: public
          protocol: http
commands:
  - id: run
    exec:
      component: runtime
      commandLine: npm run dev -- --host 0.0.0.0 --port 3000
      workingDir: ${PROJECT_SOURCE}
      group:
        kind: run
        isDefault: true
```

`targetPort` must match the port on which the process listens inside the container. The endpoint does not reconfigure the application. If the process starts on 8080 while the Devfile says 3000, forwarding and probes reach the wrong socket.

Endpoint names are identifiers and must be unique across components, so keep them stable. Use names such as `http`, `metrics`, and `debug` instead of embedding a mutable port number in every name.

## Understand the Endpoint Fields

Devfile 2.3 endpoint fields include:

- `name`: the endpoint identifier;
- `targetPort`: the component port;
- `exposure`: `none`, `internal`, or `public`;
- `protocol`: a hint such as `http`, `https`, `ws`, `wss`, `tcp`, or `udp`, as allowed by the selected schema;
- `path`: a URL path;
- `secure`: a request for a consumer-provided secure endpoint mechanism;
- optional endpoint attributes for consumer-specific behavior.

`exposure` is desired visibility, not a cloud firewall policy. A consumer may implement it with a service, a proxy, a local forward, or another platform facility.

`protocol: https` does not turn an HTTP server into a TLS server. It tells the consumer how the endpoint should be represented. Determine where TLS actually terminates:

1. in the application container;
2. in a consumer-provided proxy;
3. at an Ingress controller or OpenShift router.

Only then decide whether the backend protocol should be HTTP or HTTPS.

The `secure` flag is also consumer-dependent. The Devfile endpoint guide describes it as putting the endpoint behind a JWT proxy in consumers that implement that mechanism. It is not synonymous with a generally trusted TLS certificate, and it is not a replacement for application authorization.

## Use `odo dev` Port Forwarding for the Inner Loop

Current `odo dev` forwards declared container ports to the developer machine. By default it binds to `127.0.0.1`; when no explicit local mapping is supplied, it selects an available local port in its documented range.

For a predictable mapping:

```bash
odo dev --port-forward 3000:runtime:3000
```

The three-part form is necessary to disambiguate the component when multiple components validly expose the same target port, such as containers that use dedicated Pods. For a unique target port, current `odo` also accepts:

```bash
odo dev --port-forward 3000:3000
```

The `--port-forward` flag is repeatable:

```bash
odo dev \
  --port-forward 3000:runtime:3000 \
  --port-forward 9229:runtime:9229 \
  --debug
```

Port forwarding is local transport. It does not create a stable team URL, manage DNS, or persist after the development session ends. Keep the default loopback bind unless other machines genuinely need access. Binding to a broader address expands the network exposure of a development service.

## Internal Services Are Different from Host Access

For a database sidecar:

```yaml
components:
  - name: database
    container:
      image: postgres:17
      mountSources: false
      command: ["docker-entrypoint.sh"]
      args: ["postgres"]
      endpoints:
        - name: postgres
          targetPort: 5432
          exposure: none
```

`exposure: none` communicates that the endpoint should not be exposed outside its component or workspace context. The application still needs the correct in-workspace host and port according to the consumer's networking model.

The explicit `command` and `args` preserve the image's normal long-running startup under `odo`, which otherwise substitutes an idle command when both fields are absent. A fresh `postgres:17` database also requires its normal initialization settings. Supply `POSTGRES_PASSWORD` or `POSTGRES_PASSWORD_FILE` through an approved secret mechanism; the fragment above only illustrates endpoint exposure.

Do not mark a database endpoint public merely to make local debugging easy. Use an explicit, temporary port forward and appropriate credentials instead.

## Define Ingress Explicitly for Outer Loop

For a shared Kubernetes URL, model the workload, Service, and Ingress as Kubernetes resources. A Devfile Kubernetes component can reference a checked-in manifest:

```yaml
components:
  - name: production-network
    kubernetes:
      uri: deploy/network.yaml
commands:
  - id: apply-network
    apply:
      component: production-network
      group:
        kind: deploy
        isDefault: true
```

Assuming the workload's Pods carry the label `app: catalog-api`, `deploy/network.yaml` can contain a Kubernetes resource list:

```yaml
apiVersion: v1
kind: List
items:
  - apiVersion: v1
    kind: Service
    metadata:
      name: catalog-api
    spec:
      selector:
        app: catalog-api
      ports:
        - name: http
          port: 80
          targetPort: 3000
  - apiVersion: networking.k8s.io/v1
    kind: Ingress
    metadata:
      name: catalog-api
    spec:
      tls:
        - hosts:
            - catalog.dev.example.com
          secretName: catalog-dev-tls
      rules:
        - host: catalog.dev.example.com
          http:
            paths:
              - path: /
                pathType: Prefix
                backend:
                  service:
                    name: catalog-api
                    port:
                      name: http
```

The Ingress API only declares routing. An Ingress controller must be installed, and the Ingress must select it through `spec.ingressClassName` or a default IngressClass. DNS must point to the controller, and a `catalog-dev-tls` Secret in the same namespace must contain the `tls.crt` certificate and `tls.key` private key. Certificate issuance can be managed separately by the platform; the Devfile specification does not issue one.

Keep secrets out of the Devfile and repository. Refer to a pre-created TLS Secret or use an approved certificate controller.

## Use an OpenShift Route Only on OpenShift

An OpenShift Route is not a Kubernetes-standard object. It can be included in a Devfile `openshift` manifest component when the target cluster supports its API:

```yaml
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: catalog-api
spec:
  host: catalog.dev.example.com
  to:
    kind: Service
    name: catalog-api
  port:
    targetPort: http
  tls:
    termination: edge
```

At edge termination, the router handles client TLS and forwards unencrypted HTTP to the backend. The optional `insecureEdgeTerminationPolicy` separately controls whether client HTTP is disabled, allowed, or redirected. Other termination modes have different backend requirements. Validate them against the OpenShift version and cluster policy.

Because this example omits a route-specific certificate and key, the router uses its default certificate. That certificate must cover `catalog.dev.example.com`; otherwise, configure a matching certificate through an approved cluster mechanism.

Do not place both an Ingress and a Route in a portable default without deciding which controller owns the hostname. Platform variants can select the appropriate resource through separate manifests or parent Devfiles.

## Diagnose an Unreachable Endpoint

Check each layer in order:

1. Confirm the process binds to the expected port.
2. Confirm it listens on the required interface.
3. Confirm `targetPort` matches.
4. Inspect `odo dev` output for the actual local mapping.
5. Test the local forward with `curl`.
6. For shared URLs, inspect the Service endpoints.
7. Inspect Ingress or Route status and controller events.
8. Verify DNS and the served certificate hostname.

Useful checks include:

```bash
odo describe component
curl --verbose http://127.0.0.1:3000/health
kubectl get service,ingress
kubectl describe ingress catalog-api
```

If HTTPS fails, test separately for DNS, TCP connectivity, certificate trust, hostname matching, and backend health. Changing `protocol: https` cannot repair any of those layers on its own.

## Official Documentation

- [Devfile: Defining endpoints](https://devfile.io/docs/2.3.0/defining-endpoints)
- [Devfile 2.3 schema reference](https://devfile.io/docs/2.3.0/devfile-schema)
- [odo dev: Custom port mappings](https://odo.dev/docs/command-reference/dev/#using-custom-port-mapping-for-port-forwarding)
- [Kubernetes Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/)
- [OpenShift Route API](https://docs.openshift.com/container-platform/latest/rest_api/network_apis/route-route-openshift-io-v1.html)
