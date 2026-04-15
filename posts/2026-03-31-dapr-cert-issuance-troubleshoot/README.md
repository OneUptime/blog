# How to Troubleshoot Dapr Certificate Issuance Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Sentry, Certificate, Troubleshooting, mTLS

Description: Troubleshoot Dapr certificate issuance failures including CA initialization errors, sidecar-to-Sentry connectivity issues, and clock skew problems affecting mTLS.

---

## Symptoms of Certificate Issuance Failures

Certificate issuance issues manifest as:

- Sidecar fails to start with `failed to get workload cert` error
- Service-to-service calls fail with TLS handshake errors
- `certificate signed by unknown authority` errors in logs
- Services work initially but fail after 24 hours (certificate expiry)

## Checking Sidecar Logs for Cert Errors

```bash
kubectl logs <pod-name> -c daprd | grep -iE "cert|sentry|tls|x509" | tail -50
```

Common error messages and their causes:

```bash
# Error: failed to request workload cert
# Cause: Cannot reach Sentry service

# Error: certificate signed by unknown authority
# Cause: Trust bundle mismatch or CA rotation

# Error: certificate has expired or is not yet valid
# Cause: Clock skew between nodes
```

## Verifying Sentry Is Reachable

The sidecar connects to Sentry via the Kubernetes Service on port 443 (which routes to container port 50001):

```bash
# Test from within an app pod
kubectl exec -it <pod-name> -c daprd -- \
  sh -c "nc -zv dapr-sentry.dapr-system.svc.cluster.local 443 && echo CONNECTED"
```

Check network policies that may block this connection:

```bash
kubectl describe networkpolicy -n dapr-system
kubectl describe networkpolicy -n <app-namespace>
```

## Diagnosing Trust Bundle Issues

If certificates are issued but not trusted, there may be a stale trust bundle:

```bash
# Check the current trust bundle
kubectl get secret dapr-trust-bundle -n dapr-system -o yaml

# Check when Sentry last updated it
kubectl describe secret dapr-trust-bundle -n dapr-system | grep "Last Applied"
```

Force a trust bundle refresh by restarting Sentry:

```bash
kubectl rollout restart deployment/dapr-sentry -n dapr-system
```

## Checking Clock Skew

Certificate validation fails if clocks differ by more than `allowedClockSkew`:

```bash
# Compare timestamps across nodes
kubectl get nodes -o custom-columns='NAME:.metadata.name,TIME:.status.conditions[-1].lastHeartbeatTime'

# Check time in sentry pod
kubectl exec -n dapr-system -l app=dapr-sentry -- date -u

# Check time in app pod
kubectl exec -n default <app-pod> -- date -u
```

If skew exceeds 15 minutes, increase the allowed clock skew or fix NTP on affected nodes.

## Recovering from Expired CA

If the Sentry CA certificate has expired, you must rotate it:

```bash
# Export existing CA to inspect it
dapr mtls export -o ./certs

# Verify expiry
openssl x509 -in ./certs/ca.crt -enddate -noout

# Recommended: use the Dapr CLI to renew certificates automatically
dapr mtls renew-certificate -k --valid-until 365 --restart

# Alternative: manual rotation
# Generate new root CA
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 3650 -key ca.key -out ca.crt \
  -subj "/CN=Dapr Root CA"

# Generate issuer certificate and key
openssl genrsa -out issuer.key 4096
openssl req -new -key issuer.key -out issuer.csr -subj "/CN=Dapr Issuer"
openssl x509 -req -in issuer.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out issuer.crt -days 3650

# Update the secret (must include ca.crt, issuer.crt, and issuer.key)
kubectl create secret generic dapr-trust-bundle \
  --from-file=ca.crt=./ca.crt \
  --from-file=issuer.crt=./issuer.crt \
  --from-file=issuer.key=./issuer.key \
  -n dapr-system --dry-run=client -o yaml | kubectl apply -f -

kubectl rollout restart deployment/dapr-sentry -n dapr-system
```

## Summary

Troubleshoot Dapr certificate issuance by checking sidecar logs for specific error messages, verifying Sentry connectivity on port 443, inspecting the trust bundle for staleness, and checking for clock skew between nodes. Most issuance failures are caused by network policies blocking Sentry service access or expired CA certificates that need rotation.
