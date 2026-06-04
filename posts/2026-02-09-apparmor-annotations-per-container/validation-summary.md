# Validation Summary: How to configure AppArmor annotations for per-container profiles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- AppArmor
- Linux security modules
- Kubernetes Pod security contexts
- Kubernetes DaemonSets and ConfigMaps
- kubectl

## Sources Consulted
- Kubernetes documentation: Restrict a Container's Access to Resources with AppArmor: https://kubernetes.io/docs/tutorials/security/apparmor/
- Kubernetes documentation: Configure a Security Context for a Pod or Container: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- AppArmor documentation: Profiles basics: https://apparmor.net/profiles/profile-types-and-syntax/
- AppArmor documentation: apparmor_parser manual: https://apparmor.net/man/apparmor_parser/

## Issues Found
- The post used deprecated Kubernetes AppArmor annotations, such as `container.apparmor.security.beta.kubernetes.io/<container-name>`. Kubernetes documentation states that AppArmor was specified through annotations before v1.30 and now uses `securityContext.appArmorProfile`. I updated the title, description, explanations, conclusion, and all Pod examples to use `appArmorProfile`.
- The profile type values were written in annotation form, such as `runtime/default`, `unconfined`, and `localhost/<profile>`. I updated them to the current API values: `RuntimeDefault`, `Unconfined`, and `Localhost` with `localhostProfile`.
- The verification command used `kubectl debug node/...` but ran the check directly inside the debug container. I updated it to run through `chroot /host` and check `/sys/module/apparmor/parameters/enabled`, matching Kubernetes guidance that AppArmor support is a node-level property.
- The init container section said init containers can have elevated privileges for setup. AppArmor restricts access and does not grant privileges, so I changed this to say init containers can use different restrictions.
- A sample profile comment said "Deny everything else by default" immediately above explicit deny rules. I changed the comment to "Explicitly deny high-risk access" to avoid confusing AppArmor's default-deny behavior with explicit deny rules.

## Review Notes
- Kubernetes does not provide a built-in mechanism for loading AppArmor profiles onto nodes. The DaemonSet approach shown is a custom operational pattern; Kubernetes documentation also mentions custom infrastructure or the Kubernetes Security Profiles Operator.
- Pods using `Localhost` profiles must be scheduled only onto nodes where those profiles are already loaded. The node selector example is valid if the operator maintains the labels accurately.
