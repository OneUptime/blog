# Validating Cilium L7 Circuit Breaking Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, L7, Circuit Breaking, Validation

Description: How to validate that Cilium L7 circuit breaking is correctly configured and functioning to protect backend services from overload.

---

## Introduction

Validating L7 circuit breaking ensures that your services are protected from cascading failures. Validation confirms that Envoy is in the traffic path, circuit breaker thresholds are configured, and the circuit breaker triggers under the expected conditions.

## Prerequisites

- Kubernetes cluster with Cilium L7 proxy and EnvoyConfig support enabled
- kubectl and Cilium CLI configured
- A test application to generate load

## Validating Envoy Proxy Activation

```bash
# Confirm Envoy is enabled

cilium status

# Verify Envoy is handling traffic for the target service
hubble observe --protocol http -n default --to-pod default/backend --last 10

# Check Envoy listeners
kubectl exec -n kube-system <cilium-pod> -c cilium-agent -- \
  cilium-dbg envoy admin listeners
```

## Validating Circuit Breaker Configuration

```bash
# Check Envoy cluster configuration
kubectl exec -n kube-system <cilium-pod> -c cilium-agent -- \
  cilium-dbg envoy admin config clusters | grep -A20 "circuit_breakers"

# Check circuit breaker stats
kubectl exec -n kube-system <cilium-pod> -c cilium-agent -- \
  cilium-dbg envoy admin metrics | grep -E "upstream_(cx|rq).*overflow"
```

## Load Testing to Validate Triggering

```bash
# Generate load to trigger circuit breaking
kubectl run load-test --image=busybox:1.36 --restart=Never --command -- sh -c '
  for i in $(seq 1 1000); do
    wget -qO- --timeout=1 http://backend:8080/ &
  done
  wait
'

# Check if circuit breaker triggered
kubectl exec -n kube-system <cilium-pod> -c cilium-agent -- \
  cilium-dbg envoy admin metrics | grep -E "upstream_(cx|rq).*overflow"
```

```mermaid
graph TD
    A[Validate Circuit Breaking] --> B[Check Envoy Active]
    B --> C[Verify Config]
    C --> D[Load Test]
    D --> E{Circuit Breaker Triggers?}
    E -->|Yes| F[Validation Passed]
    E -->|No| G[Check Thresholds]
```

## Verification

```bash
cilium status
kubectl exec -n kube-system <cilium-pod> -c cilium-agent -- \
  cilium-dbg envoy admin metrics | grep overflow
kubectl delete pod load-test 2>/dev/null
```

## Troubleshooting

- **Envoy not active**: Enable L7 proxy support with `--set l7Proxy=true` and EnvoyConfig support with `--set envoyConfig.enabled=true`.
- **No circuit breaker stats**: Traffic may not be going through Envoy. Add L7 rules or a CiliumEnvoyConfig/CiliumClusterwideEnvoyConfig that selects the service.
- **Circuit breaker does not trigger under load**: Thresholds may be too high. Reduce them for testing.

## Conclusion

Validate circuit breaking by confirming Envoy is active, checking configuration, and running load tests to verify triggering. This ensures your services have effective protection against cascading failures.
