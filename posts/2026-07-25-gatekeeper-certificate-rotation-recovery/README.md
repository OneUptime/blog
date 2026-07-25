# How Gatekeeper Webhook Certificate Rotation Fails—and How to Recover Admission

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gatekeeper, Kubernetes, TLS, Certificates, Incident Response

Description: Diagnose Gatekeeper webhook TLS failures, identify certificate ownership, restore CA consistency safely, and preserve a controlled admission recovery path.

---

The Kubernetes API server calls Gatekeeper over HTTPS. It trusts the webhook certificate using the `caBundle` embedded in Gatekeeper's webhook configurations.

Admission fails when the served certificate, its private key, service DNS name, validity window, and configured CA stop agreeing. If the webhook fails closed, this can block matching API writes across the cluster.

## Know who owns the certificate

By default, Gatekeeper uses `open-policy-agent/cert-controller` to generate and rotate webhook certificates. The runtime flag `--disable-cert-rotation` hands that responsibility to another system.

Check the live arguments on the webhook operation that owns the serving certificate:

```bash
kubectl get deployment -n gatekeeper-system \
  gatekeeper-controller-manager \
  -o jsonpath='{.spec.template.spec.containers[?(@.name=="manager")].args}{"\n"}'
```

No `--disable-cert-rotation` argument on that Deployment means the default is enabled. The separate audit Deployment can legitimately disable rotation because it does not serve admission traffic; do not use its arguments to infer certificate ownership. A Helm chart, operator, or certificate manager can still alter ownership, so inspect annotations and release configuration before changing Secrets.

Never let Gatekeeper's cert controller and a third-party controller continuously overwrite the same Secret or `caBundle`.

## Identify the TLS error

Different messages suggest different faults:

| Error | Likely cause |
| --- | --- |
| `certificate has expired or is not yet valid` | Expiry, rotation failure, or clock skew |
| `certificate signed by unknown authority` | Served chain and webhook `caBundle` differ |
| `certificate is valid for ..., not ...` | Service name or certificate SAN mismatch |
| `tls: bad certificate` | Client authentication or key/certificate mismatch |
| `no endpoints available` | Service readiness problem, not certificate rotation |

Capture the exact error from the API client, API server logs if available, and Gatekeeper controller logs.

## Inspect certificate validity without exposing keys

Gatekeeper's default certificate Secret is commonly named `gatekeeper-webhook-server-cert`:

```bash
kubectl get secret -n gatekeeper-system \
  gatekeeper-webhook-server-cert \
  -o jsonpath='{.data.tls\\.crt}' \
  | base64 --decode \
  | openssl x509 -noout \
      -subject -issuer -serial -dates -ext subjectAltName
```

This reads only the public certificate. Do not print `tls.key`.

Inspect the CA stored with the Secret:

```bash
kubectl get secret -n gatekeeper-system \
  gatekeeper-webhook-server-cert \
  -o jsonpath='{.data.ca\\.crt}' \
  | base64 --decode \
  | openssl x509 -noout -subject -issuer -fingerprint -sha256
```

Extract the validating webhook CA:

```bash
kubectl get validatingwebhookconfiguration \
  gatekeeper-validating-webhook-configuration -o json \
  | jq -r '.webhooks[]
      | select(.name == "validation.gatekeeper.sh")
      | .clientConfig.caBundle' \
  | base64 --decode \
  | openssl x509 -noout -subject -issuer -fingerprint -sha256
```

The CA fingerprints should agree. Repeat the check for the namespace-label webhook and the mutating webhook configuration if mutation is enabled.

## Verify names and clocks

The default service is `gatekeeper-webhook-service` in `gatekeeper-system`. The served certificate must contain the DNS names used by the API server, normally including the Service DNS identity.

Check:

```bash
kubectl get service -n gatekeeper-system \
  gatekeeper-webhook-service -o yaml
kubectl get validatingwebhookconfiguration \
  gatekeeper-validating-webhook-configuration \
  -o jsonpath='{range .webhooks[*]}{.name}{"  "}{.clientConfig.service.namespace}{"/"}{.clientConfig.service.name}{"\\n"}{end}'
```

If `--cert-service-name` or the Service name changed, regenerate a certificate for the current identity and update the `caBundle` through its owner.

Compare control-plane, node, and workstation clocks. A newly rotated certificate can appear "not yet valid" when time synchronization is broken.

## Check rotation permissions

Gatekeeper's webhook operation needs permission to update its webhook configurations and certificate Secret when embedded rotation is enabled.

Read the controller Pod's ServiceAccount, then test:

```bash
kubectl auth can-i update \
  validatingwebhookconfiguration.admissionregistration.k8s.io/gatekeeper-validating-webhook-configuration \
  --as=system:serviceaccount:gatekeeper-system:<serviceaccount>
kubectl auth can-i update \
  mutatingwebhookconfiguration.admissionregistration.k8s.io/gatekeeper-mutating-webhook-configuration \
  --as=system:serviceaccount:gatekeeper-system:<serviceaccount>
kubectl auth can-i update secret/gatekeeper-webhook-server-cert \
  -n gatekeeper-system \
  --as=system:serviceaccount:gatekeeper-system:<serviceaccount>
```

The mutating-webhook check matters when Gatekeeper mutation is installed; the embedded certificate controller patches both webhook configurations.

Also inspect events and logs for forbidden updates, optimistic-lock conflicts, or repeated rotation:

```bash
kubectl get events -n gatekeeper-system \
  --sort-by=.metadata.creationTimestamp
kubectl logs -n gatekeeper-system <controller-pod> \
  --since=30m | grep -Ei 'cert|tls|x509|rotation'
```

## Recover according to ownership

Use this order:

1. Record the Secret metadata, certificate details, webhook configurations, Pod arguments, events, and logs.
2. Identify whether Gatekeeper, cert-manager, an operator, or another controller owns rotation.
3. Fix that controller's permissions, configuration, or availability.
4. Reconcile the pinned installation so it creates a matching certificate and `caBundle`.
5. Restart Gatekeeper Pods only if the installation procedure requires them to reload repaired material.
6. Verify an allowed and denied server-side dry run.

Do not blindly delete the certificate Secret. If no healthy controller can recreate it, deletion removes the last served keypair and can extend the outage.

If using a third-party manager, set `--disable-cert-rotation` and make that manager responsible for both the serving Secret and CA injection. Follow the manager's documented renewal process.

## Use emergency recovery carefully

If fail-closed Gatekeeper is blocking cluster repair, the official break-glass action is:

```bash
kubectl delete validatingwebhookconfiguration \
  gatekeeper-validating-webhook-configuration
```

This disables all Gatekeeper validation, not just the broken policy. Use an audited incident procedure. An operator or GitOps controller may recreate the object, so account for that before acting.

After certificate repair, redeploy the pinned webhook configuration, verify its CA and endpoints, then run Gatekeeper audit to find resources admitted during the gap.

## Prevent the next incident

- Alert well before certificate expiry.
- Monitor rotation controller errors and webhook TLS failures.
- Test renewal in staging.
- Keep one clear certificate owner.
- Preserve RBAC for Secret and webhook updates.
- Avoid renaming the Service without a coordinated certificate rollout.
- Maintain an out-of-band break-glass credential and runbook.
- Test admission after every Gatekeeper or certificate-manager upgrade.

Certificate rotation is part of control-plane availability. Treat it as an SLO-backed service, not a background implementation detail.

## Official documentation

- [Gatekeeper certificate rotation configuration](https://open-policy-agent.github.io/gatekeeper/website/docs/customize-startup/#disable-certificate-generation-and-rotation-for-gatekeepers-webhook)
- [Gatekeeper runtime certificate flags](https://open-policy-agent.github.io/gatekeeper/website/docs/runtime-flags/)
- [Gatekeeper operations and certificate permissions](https://open-policy-agent.github.io/gatekeeper/website/docs/operations/)
- [Kubernetes webhook TLS requirements](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/#service-reference)
