# Validation Summary: How to Test Calico Service Account-Based Policies with Real Traffic

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico Open Source network policy
- Kubernetes ServiceAccounts
- Kubernetes Pods
- kubectl
- BusyBox/netcat traffic testing

## Sources Consulted
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico service account policy guide: https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-accounts
- Kubernetes Service Accounts concept documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes Configure Service Accounts for Pods task: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The policy used `source.serviceAccountSelector`, which is not the Calico rule field for matching source service accounts. Changed it to `source.serviceAccounts.names` with `backend-sa`, matching the Calico `ServiceAccountMatch` schema.
- The introduction described `serviceAccountSelector` as the source-pod service account match. Updated it to describe `source.serviceAccounts`, because top-level `serviceAccountSelector` selects the service account of endpoints the policy applies to, not the source of an ingress rule.
- The pod manifest referenced custom service accounts without defining them. Added `backend-sa` and `frontend-sa` ServiceAccount objects so the pod examples are complete.
- The policy matched destination port `5432` without explicitly setting the protocol. Added `protocol: TCP`, matching Calico examples that constrain access to a TCP port.
- The recreation test immediately executed into the new pod. Added `kubectl wait --for=condition=Ready` so the command is reliable after `kubectl run`.
- The Mermaid test matrix labeled Test 3 as a default service account pod, but the command recreates it with `frontend-sa`. Updated the diagram label to `frontend-sa Pod`.
- The prerequisites did not state that the target `db-pod` must exist with the expected label and listening port. Added that prerequisite because the policy selector and traffic tests depend on it.

## Review Notes
The post is technically valid after the corrections. In a future expansion, it could include a minimal `db-pod` fixture and explicit `kubectl apply -f` steps, but those are not required to correct the existing examples.
