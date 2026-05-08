# Validation Summary: Securing a Demo Application with Cilium Network Policies

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Kubernetes Deployments and Services
- Kubernetes DNS
- kubectl
- Hubble
- NGINX
- PostgreSQL

## Sources Consulted
- Cilium Network Policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Cilium policy enforcement and rule basics: https://docs.cilium.io/en/latest/security/policy/intro/
- Cilium Layer 3 policy examples, including endpoint selectors and `world`: https://docs.cilium.io/en/stable/security/policy/layer3/
- Cilium Layer 7 policy documentation: https://docs.cilium.io/en/latest/security/policy/layer7/
- Cilium Layer 7 protocol visibility documentation: https://docs.cilium.io/en/stable/observability/visibility/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The verification commands used `http://api:8080/` and `http://database:5432/`, but the application manifest did not create Kubernetes Services named `api` or `database`. Added ClusterIP Services for `frontend`, `api`, and `database` so the Service DNS names resolve as described.
- The API Deployment used the stock `nginx:1.27` image with `containerPort: 8080`, but NGINX listens on port 80 by default unless reconfigured. Changed the API container and policy examples to use port 80 consistently.
- The description and prerequisites referenced L7 filtering, but the original policies only enforced L3/L4 rules. Added Cilium HTTP L7 rules for frontend-to-API GET traffic and DNS L7 rules for DNS egress.
- The verification commands used `kubectl exec` to run `curl` inside the frontend NGINX container, but the stock NGINX image does not reliably include `curl`. Replaced those checks with temporary `curlimages/curl` pods labeled as frontend clients so the frontend Cilium policy is exercised.
- The DNS allow policy only permitted UDP/53. Updated it to protocol `ANY` with a DNS L7 rule so both UDP and TCP DNS traffic are covered and the L7 proxy prerequisite is meaningful.
- The verification section used `hubble observe`, but Hubble was not listed as a prerequisite. Added a prerequisite for Hubble and the Hubble CLI.

## Review Notes
The demo still uses simple NGINX and PostgreSQL containers rather than a real API implementation that actively talks to the database. The network policy examples are technically valid for demonstrating the intended access pattern, but a future version could use an API container with an actual database call to make the API-to-database verification more complete.
