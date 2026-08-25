# How to Troubleshoot the VPA Admission Webhook: CA Bundles, Certificates, and Mutation Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Vertical Pod Autoscaler, Admission Webhook, TLS, Troubleshooting

Description: Trace VPA Pod mutation from webhook registration through Service endpoints and TLS trust, then prove the final admission patch without risking an eviction loop.

---

The VPA admission controller is a mutating admission webhook on the Pod creation path. It finds the controlling VPA and patches the new Pod's resources from the current target. If it is registered incorrectly, unreachable, untrusted, or unable to find the VPA, the recommender can look healthy while replacement Pods start with old resources—or fail to start at all.

## Establish the Failure Mode Safely

```bash
kubectl -n kube-system get deploy,pod,svc,endpointslice \
  -l app=vpa-admission-controller -o wide
kubectl -n kube-system logs deploy/vpa-admission-controller --since=30m
kubectl get mutatingwebhookconfiguration vpa-webhook-config -o yaml
```

Current upstream installation uses `admissionregistration.k8s.io/v1`, a Service named `vpa-webhook` in `kube-system`, and the admission controller on target port 8000. Adapt names when a chart installs into another namespace.

The webhook should include a `CREATE` rule for core `pods` and VPA validation/mutation rules, an `admissionReviewVersions` value supported by the API server, `sideEffects`, a non-empty client service or URL, and a non-empty `caBundle` for a private CA.

If the configuration is absent, inspect admission-controller logs for self-registration errors and RBAC:

```bash
kubectl auth can-i --as=system:serviceaccount:kube-system:vpa-admission-controller \
  create mutatingwebhookconfigurations.admissionregistration.k8s.io
kubectl auth can-i --as=system:serviceaccount:kube-system:vpa-admission-controller \
  update mutatingwebhookconfigurations.admissionregistration.k8s.io
```

## Check Service Routing from the API Server's Perspective

```bash
kubectl -n kube-system get svc vpa-webhook -o yaml
kubectl -n kube-system get endpointslice \
  -l kubernetes.io/service-name=vpa-webhook -o yaml
kubectl -n kube-system get pod -l app=vpa-admission-controller \
  -o custom-columns=NAME:.metadata.name,READY:.status.containerStatuses[0].ready,IP:.status.podIP
```

An empty EndpointSlice points to selector, readiness, or Pod failure. A healthy in-cluster curl proves ordinary Service routing but does not prove the control plane can reach the overlay network. Some managed control planes require host networking or provider-specific connectivity. The upstream FAQ calls out this class of issue for EKS with Cilium.

NetworkPolicy must allow control-plane traffic to the webhook. The API server must also resolve the exact Service name and namespace registered in `clientConfig.service`.

## Verify Certificate Identity and Trust

The upstream secret is `vpa-tls-certs` and contains `caCert.pem`, `serverCert.pem`, and `serverKey.pem`. The serving certificate must be valid for the registered Service DNS name, such as `vpa-webhook.kube-system.svc`, and the webhook's base64 `caBundle` must trust its issuer.

```bash
kubectl -n kube-system get secret vpa-tls-certs \
  -o jsonpath='{.data.serverCert\.pem}' | base64 --decode | \
  openssl x509 -noout -subject -issuer -dates -ext subjectAltName

kubectl get mutatingwebhookconfiguration vpa-webhook-config \
  -o jsonpath='{.webhooks[0].clientConfig.caBundle}' | base64 --decode | \
  openssl x509 -noout -subject -fingerprint -sha256
```

Extract the Secret CA similarly and compare fingerprints. Check all webhook entries rather than assuming index zero when another installer combines them.

Typical log or API server errors have distinct causes:

- `x509: certificate signed by unknown authority`: wrong or stale `caBundle`.
- `certificate is valid for ... not ...`: missing Service DNS SAN or wrong registered namespace/name.
- `certificate has expired or is not yet valid`: rotation or clock problem.
- `connection refused` or timeout: no endpoint, wrong port, NetworkPolicy, or control-plane routing.
- TLS `bad certificate`: client/server trust or certificate-role mismatch.

Current upstream deployment passes `--reload-cert`, which reloads changed leaf and CA files. The webhook configuration's `caBundle` must still be updated consistently during CA rotation; reloading a new server certificate signed by an untrusted CA does not update API server trust.

## Understand Failure Policy Before Testing

The upstream admission-controller flag `--webhook-failure-policy-fail` defaults to `false`, which configures fail-open behavior. With `Ignore`, a webhook call failure can allow a Pod to be created without VPA mutation. With `Fail`, the API request is rejected and Pod creation can be blocked cluster-wide for matching requests.

The official VPA examples warn that fail-closed can break Pod creation. Limit webhook scope or ignored namespaces deliberately before enabling it. Current updater also defaults to checking the admission-controller status lease and stops evicting when that lease is stale, reducing the risk of evicting Pods that would return unmutated.

```bash
kubectl -n kube-system get lease vpa-admission-controller -o yaml
kubectl -n kube-system get deploy vpa-updater -o yaml | \
  grep -E 'use-admission-controller-status|admission-controller-status'
```

## Prove Mutation with Server-Side Dry-Run

Use a low-risk VPA in `Off` to verify matching, then temporarily use `Initial` for a disposable target with a known recommendation. Submit a representative Pod through server-side dry-run:

```bash
kubectl create --dry-run=server -n sandbox -f candidate-pod.yaml -o yaml
```

Compare returned `spec.containers[*].resources` with the VPA target and inspect annotations added by VPA. Dry-running a Deployment does not necessarily admit a child Pod, so use a Pod manifest whose labels and owner context match a controlled test design. For a definitive integration test, create a disposable Deployment and VPA as documented by the upstream quickstart.

If the webhook is called but no patch appears, check:

- targetRef and selector matching;
- VPA `RecommendationProvided` status;
- container names and `mode: Off` policies;
- namespace and object selectors on the webhook;
- competing mutating webhooks; and
- admission-controller logs at verbosity 4.

## Official Documentation

- [VPA admission-controller troubleshooting FAQ](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/faq.md#vpa-restarts-my-pods-but-does-not-modify-cpu-or-memory-settings)
- [VPA admission-controller component](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/components.md#admission-controller)
- [VPA installation and certificates](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/installation.md)
- [VPA admission-controller flags](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/flags.md#what-are-the-parameters-to-vpa-admission-controller)
- [Kubernetes dynamic admission control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [VPA failurePolicy example](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/examples.md#setting-the-webhook-failurepolicy)

## Conclusion

Trace mutation as one chain: registered rule, Service endpoint, control-plane reachability, serving certificate identity, CA-bundle trust, VPA match, and returned patch. Keep the updater's status-lease safeguard enabled, understand fail-open versus fail-closed behavior, and prove changes with a disposable server-side admission test before allowing eviction.
