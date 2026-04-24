# Validation Summary: Portainer CE vs Portainer Business Edition: Feature Comparison

## Status
validated

## Post Type
Reference / comparison guide

## Technologies Covered
- Portainer Community Edition (CE)
- Portainer Business Edition (BE)
- Docker and Docker Swarm
- Kubernetes
- Portainer Edge Agent / Edge Compute
- LDAP, Active Directory, OAuth/OIDC
- Container registries and registry policies

## Sources Consulted
- Portainer docs welcome page: https://docs.portainer.io/
- Portainer pricing FAQ: https://docs.portainer.io/faqs/licensing/what-is-the-pricing-for-business-edition
- Portainer licensing node definition: https://docs.portainer.io/sts/faqs/licensing/what-is-a-node-for-licensing-purposes
- Portainer roles documentation: https://docs.portainer.io/sts/admin/user/roles
- Portainer Docker roles and permissions: https://docs.portainer.io/advanced/docker-roles-and-permissions
- Portainer access control documentation: https://docs.portainer.io/sts/advanced-topics/access-control
- Portainer Kubernetes roles and bindings: https://docs.portainer.io/sts/advanced/kubernetes-roles-and-bindings
- Portainer Kubernetes applications docs: https://docs.portainer.io/user/kubernetes/applications
- Portainer Kubernetes ingress docs: https://docs.portainer.io/user/kubernetes/networking/ingresses/add
- Portainer Kubernetes namespace management docs: https://docs.portainer.io/2.33-lts/user/kubernetes/namespaces/manage
- Portainer Edge Agent docs: https://docs.portainer.io/advanced/edge-agent
- Portainer Edge Agent install docs: https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer Edge Stacks docs: https://docs.portainer.io/user/edge/stacks/add
- Portainer Edge Configurations docs: https://docs.portainer.io/user/edge/configurations
- Portainer mTLS docs: https://docs.portainer.io/advanced/mtls
- Portainer authentication settings docs: https://docs.portainer.io/admin/settings/authentication
- Portainer LDAP docs: https://docs.portainer.io/sts/admin/settings/authentication/ldap
- Portainer Active Directory docs: https://docs.portainer.io/admin/settings/authentication/active-directory
- Portainer OAuth docs: https://docs.portainer.io/sts/admin/settings/authentication/oauth
- Portainer activity log docs: https://docs.portainer.io/admin/logs/activity
- Portainer authentication log docs: https://docs.portainer.io/admin/logs/authentication
- Portainer SIEM streaming docs: https://docs.portainer.io/sts/advanced/siem
- Portainer registry policy docs: https://docs.portainer.io/admin/environments/policies/kubernetes-policies/kubernetes-registry-policy
- Portainer website pricing page: https://www.portainer.io/pricing

## Issues Found
- The quick summary table overstated the CE/BE split. I corrected BE pricing from simply "Paid" to licensed per node, changed BE from "Proprietary" to the officially supported commercial positioning, clarified that CE has core Kubernetes management, and fixed CE external authentication from "Basic" to "No".
- The Kubernetes section incorrectly presented ingress management, PVC management, HPA/PDB configuration, and per-team quota management as BE-only. I replaced those with features the docs actually gate to BE: Kubernetes RBAC integration, namespace-scoped access control, and additional RBAC roles.
- The Edge section mixed documented and undocumented claims. I removed outdated or unverified items like ARMv7 support, heartbeat alerting, and offline detection, and replaced them with documented BE Edge features such as advanced Edge Stack rollout controls, Edge Configurations, and optional mTLS.
- The RBAC section described Helpdesk and Standard User incorrectly and claimed custom roles without documentation. I updated the role list to match the current built-in roles and documented permissions.
- The authentication table was inaccurate. LDAP/AD is not documented as a CE feature, and I found no official documentation supporting the post's SAML 2.0 claim. I updated the table to reflect documented BE support for LDAP/AD, OAuth/OIDC, and automatic team sync.
- The compliance section included unsupported claims about per-team activity reporting and Trivy-based image scanning. I replaced them with documented authentication/activity logs, SIEM log streaming, and registry access policies.

## Review Notes
- Portainer's official docs currently document external authentication through LDAP, Active Directory, and OAuth/OIDC. They do not currently document SAML 2.0 in the pages reviewed, so that claim was removed.
- Portainer Business Edition licensing is still node-based as of April 24, 2026, but Portainer also advertises free 3-node and trial options. Pricing/package details should be rechecked if this post is republished later.
