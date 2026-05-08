# Validation Summary: Validating a Demo Application Secured with Cilium

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Kubernetes
- kubectl
- Hubble CLI
- Bash
- curl
- netcat

## Sources Consulted
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl overview and command syntax: https://kubernetes.io/docs/reference/kubectl/
- Cilium Network Policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/
- Cilium Hubble setup and API access documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/

## Issues Found
- The first test was described as validating that the frontend was reachable from outside, but the command runs `curl http://localhost:80` inside the frontend deployment with `kubectl exec`. I changed the label and comment so the test accurately describes a local HTTP check inside the frontend pod.
- The database validation used `curl` against PostgreSQL on port 5432. PostgreSQL is not an HTTP service, so HTTP status checks are not a reliable way to validate L4 policy behavior. I changed the frontend-to-database blocked test and API-to-database allowed test to use `nc -vz` TCP connection checks.
- The script previously printed `CHECK MANUALLY` for the API-to-database path and did not update pass/fail counters. I changed it to automatically pass when the TCP connection succeeds and fail otherwise.
- The prerequisites did not mention that the application containers need the test utilities used by the script or that Hubble must be available for the verification command. I added `curl`, `nc`, and Hubble CLI prerequisites.

## Review Notes
The `kubectl exec -n demo deploy/... -- ...` syntax is supported by current Kubernetes documentation. The `kubectl get ciliumnetworkpolicies -n demo` command is appropriate for CiliumNetworkPolicy custom resources when Cilium is installed. The Hubble command assumes the Hubble CLI is already configured to reach the Hubble API; otherwise users may need to use Hubble port-forwarding as described in the official Cilium documentation.
