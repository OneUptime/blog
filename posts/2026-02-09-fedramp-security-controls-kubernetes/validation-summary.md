# Validation Summary: How to Use FedRAMP Security Controls for Kubernetes Workloads

## Status
validated

## Post Type
Technical implementation guide

## Technologies Covered
- FedRAMP Rev. 5 and NIST SP 800-53 controls
- Kubernetes authentication, ServiceAccounts, audit policies, and NetworkPolicy
- Login.gov OpenID Connect
- AWS S3 Object Lock
- Fluent Bit S3 and Splunk outputs
- Cilium network policies and Hubble
- Istio PeerAuthentication, DestinationRule, and Gateway TLS settings
- Falco runtime security rules and outputs
- OpenSCAP and Red Hat/OpenShift compliance scanning

## Sources Consulted
- FedRAMP Rev. 5 baselines release: https://www.fedramp.gov/archive/2023-05-30-rev-5-baselines-have-been-approved-and-released
- FedRAMP Rev. 5 transition overview: https://www.fedramp.gov/assets/resources/documents/Rev-5-Transition-Overview-Presentation.pdf
- FedRAMP Rev. 5 documentation and playbooks: https://www.fedramp.gov/docs/rev5/
- Login.gov OIDC documentation and discovery metadata: https://developers.login.gov/oidc/getting-started/ and https://secure.login.gov/.well-known/openid-configuration
- Kubernetes authentication documentation: https://kubernetes.io/docs/reference/access-authn-authz/authentication/
- Kubernetes ServiceAccount documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes audit policy documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes PodSecurityPolicy removal notice: https://kubernetes.io/docs/concepts/security/pod-security-policy/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- AWS CLI S3 Object Lock documentation: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-object-lock-configuration.html
- AWS S3 CLI bucket creation documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/GettingStartedS3CLI.html
- Fluent Bit S3 output documentation: https://docs.fluentbit.io/manual/pipeline/outputs/s3
- Cilium policy and DNS/FQDN policy documentation: https://docs.cilium.io/en/stable/security/policy/language/ and https://docs.cilium.io/en/stable/security/dns/
- Istio Gateway and TLS documentation: https://istio.io/latest/docs/reference/config/networking/gateway/ and https://istio.io/latest/docs/tasks/security/tls-configuration/workload-min-tls-version/
- Falco rules and output documentation: https://falco.org/docs/concepts/rules/ and https://falco.org/docs/concepts/outputs/channels/
- OpenSCAP usage documentation: https://github.com/OpenSCAP/openscap/blob/main/docs/manual/manual.adoc
- Red Hat Compliance Operator/OpenSCAP container documentation: https://catalog.redhat.com/en/software/containers/compliance/openshift-compliance-openscap-rhel8/607dc7b403f4b3563ab483b1

## Issues Found
- Updated the FedRAMP baseline description from generic/Rev. 4-era wording to FedRAMP Rev. 5 wording. The Moderate baseline count was corrected from 325 to 323 controls based on current FedRAMP Rev. 5 material.
- Removed the claim that FedRAMP requires controls across exactly 17 families. Current Rev. 5 material and FedRAMP documentation do not make that statement accurate as written.
- Corrected the Login.gov OIDC issuer URL from `https://login.gov/openid-connect` to `https://secure.login.gov/`, matching Login.gov discovery metadata. Removed the unsupported `groups` claim example and used `sub` plus an `x509_presented` required claim for CAC/PIV-oriented authentication.
- Reworked the ServiceAccount cleanup CronJob. The original script assumed Kubernetes ServiceAccount token Secrets have a `last-used` annotation and are automatically present, which is not valid for modern Kubernetes. The replacement uses explicit managed labels and expiration annotations.
- Changed secret audit logging from `RequestResponse` to `Metadata` to avoid recording Secret response bodies in audit logs.
- Replaced `podsecuritypolicies` in the audit policy because PodSecurityPolicy was deprecated in Kubernetes v1.21 and removed in v1.25. The example now audits current admission policy resources and namespace updates.
- Moved S3 versioning before the Object Lock retention configuration and removed the hard-coded statement that FedRAMP requires seven years of retention. Retention periods are organization and authorization-boundary decisions, while Object Lock default retention accepts configured days or years.
- Corrected the egress NetworkPolicy that claimed to allow approved external endpoints but actually selected pods. It now uses `ipBlock` for an external CIDR.
- Clarified the Cilium FQDN rule comment so it accurately says the rule allows approved `.gov` egress and relies on policy enforcement to deny other egress.
- Added missing Falco lists referenced by custom rules and changed the sensitive path condition from shell-style wildcard syntax to Falco-supported path comparisons.
- Replaced the non-specific `openshift/oscap:latest` image with Red Hat's documented OpenSCAP scanner image and changed the OpenSCAP profile handling from a non-existent FedRAMP profile ID to an approved environment-selected profile with a documented default.

## Review Notes
The post is now technically consistent as a high-level implementation guide, but FedRAMP authorization still requires assessor-reviewed evidence, boundary definition, inherited controls, policy/procedure documentation, and agency-specific parameters. The OpenSCAP CronJob remains a simplified example for node compliance scanning; OpenShift environments should generally use the Compliance Operator for cluster and node scans.
