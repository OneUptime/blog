# Validation Summary: How to Configure Jenkins Security

## Status
validated

## Post Type
Tutorial / Guide (deep-dive configuration walkthrough with code samples)

## Technologies Covered
- Jenkins core security (security realms, authorization strategies, CSRF crumb issuer)
- Jenkins Groovy Script Console API (`jenkins.model.Jenkins`, `hudson.security.*`)
- LDAP plugin (`LDAPSecurityRealm`, `LDAPConfiguration`, `FromGroupSearchLDAPGroupMembershipStrategy`)
- SAML plugin (`SamlSecurityRealm`, `IdpMetadataConfiguration`)
- Role-based Authorization Strategy plugin
- Matrix Authorization Strategy plugin
- Credentials plugin family (`UsernamePasswordCredentialsImpl`, `StringCredentialsImpl`, `BasicSSHUserPrivateKey`, `AWSCredentialsImpl`)
- Folder plugin (folder-scoped credentials)
- Jenkins Declarative Pipeline (`pipeline {}`, `withCredentials`, `sshagent`, `credentials()` binding)
- Kubernetes plugin (pod templates, `KubernetesCloud`, `OnceRetention`)
- Script Security plugin (`ScriptApproval`)
- Audit Trail plugin
- Agent-to-Controller security (`AdminWhitelistRule`, JEP-235)
- nginx as a reverse proxy for Jenkins (TLS, HSTS, security headers, WebSocket upgrade)

## Sources Consulted
- Jenkins handbook — Permissions: https://www.jenkins.io/doc/book/security/access-control/permissions/
- Jenkins handbook — Controller Isolation / Agent-to-Controller: https://www.jenkins.io/doc/book/security/controller-isolation/agent-to-controller/
- JEP-235 (Drop the Callable allowlisting subsystem): https://www.jenkins.io/doc/book/security/controller-isolation/jep-235/
- JEP-223 deprecation of `RUN_SCRIPTS` / `UPLOAD_PLUGINS` / `CONFIGURE_UPDATECENTER`: https://github.com/jenkinsci/jenkins/pull/4365
- `DefaultCrumbIssuer` help (`excludeClientIPFromCrumb`): https://github.com/jenkinsci/jenkins/blob/master/core/src/main/resources/hudson/security/csrf/DefaultCrumbIssuer/help-excludeClientIPFromCrumb.html
- `HudsonPrivateSecurityRealm` Javadoc: https://javadoc.jenkins.io/hudson/security/HudsonPrivateSecurityRealm.html
- LDAP plugin source: https://github.com/jenkinsci/ldap-plugin
- `GlobalSecurityConfiguration` source (remember-me handling): https://github.com/jenkinsci/jenkins
- Jenkins Pipeline `credentials()` binding docs: https://www.jenkins.io/doc/book/pipeline/jenkinsfile/#handling-credentials
- nginx reverse proxy guide for Jenkins: https://www.jenkins.io/doc/book/system-administration/reverse-proxy-configuration-nginx/

## Issues Found

1. **`hudson.model.Hudson.RunScripts` listed in admin permissions (deprecated/removed)** — Per JEP-223 (PR jenkinsci/jenkins#4365), `RUN_SCRIPTS` was deprecated as effectively equivalent to `Jenkins.ADMINISTER` and no longer functions as a separate permission. Removed it from the `adminPermissions` list in the RBAC configuration script.

2. **Contradictory comments around `setDisableRememberMe(false)`** — The original comment read "Disable remember me for stricter session management" but the code passed `false`, which actually enables the remember-me checkbox (default). The inline comment added "Set to true for high-security environments." Rewrote the comments to accurately describe the field and its semantics so readers don't invert the setting.

3. **Inconsistent `excludeClientIPFromCrumb` value (XML showed `false`, Groovy showed `true`)** — The post recommends running Jenkins behind a reverse proxy throughout the Network Security section. Per the official `DefaultCrumbIssuer` help, `true` is the recommended value when Jenkins sits behind a proxy (otherwise the proxy's IP breaks crumb validation and form submits return 403). Updated the XML snippet to `true` with a comment explaining why.

4. **Fabricated class `AllowBlankIdResolver` in the LDAP example** — A repo-wide search across `jenkinsci/ldap-plugin` (and the entire `jenkinsci` org) returns zero matches for this class; it does not exist. The 4-arg `LDAPSecurityRealm` constructor used in the snippet also did not match any real signature. Replaced the constructor call with the real 5-arg form `LDAPSecurityRealm(List<LDAPConfiguration>, boolean disableMailAddressResolver, CacheConfiguration cache, IdStrategy userIdStrategy, IdStrategy groupIdStrategy)` using `null`s for the cache/id-strategy defaults, and moved `setGroupMembershipStrategy(...)` onto the `LDAPConfiguration` where it belongs in the current plugin.

5. **Deprecated single-arg `HudsonPrivateSecurityRealm` constructor** — The current `@DataBoundConstructor` is the 3-arg `HudsonPrivateSecurityRealm(boolean allowsSignup, boolean enableCaptcha, CaptchaSupport captchaSupport)`. Updated the snippet to the 3-arg form passing `false, null` for captcha so the example matches the current public API.

## Review Notes

- **`AdminWhitelistRule.setMasterKillSwitch(...)` is a no-op on Jenkins 2.326+ (JEP-235).** The Callable allowlisting subsystem was removed and replaced by a different agent-to-controller access control model. The post's `security-hardening.groovy` and `agent-security.groovy` snippets still call `setMasterKillSwitch(false)`. The calls are harmless (they just log a warning) and the conceptual point still stands, so we left them rather than rewriting both sections, but readers on modern Jenkins should know the call has no runtime effect and the replacement guidance lives in the "Customizing Agent → Controller Security" page in the Jenkins handbook.
- **Missing imports in some Groovy samples**, e.g. `hudson.util.Secret` in the LDAP script and `org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl` / `com.cloudbees.jenkins.plugins.awscredentials.AWSCredentialsImpl` in the provisioning script. These are illustrative snippets meant to be pasted into the Script Console (which is forgiving about wildcard imports already present), so we left them untouched, but a strict copy-paste would need the extra imports.
- **RBAC `doAddRole` / `doAssignRole` calls** are Stapler request handlers on `RoleBasedAuthorizationStrategy`; calling them directly from Groovy works because they are public methods, but the `PermissionsList` type and `Set`-of-`Permission` conversion in the snippet don't quite match the plugin's actual API surface. The snippet is illustrative — a production hardening script would typically use the Configuration as Code (JCasC) plugin or call `addRole(Role)` directly. Worth a future revision but not actively wrong enough to rewrite here.
- **`Jenkins.getInstance()`** is deprecated in favor of `Jenkins.get()` across the snippets. Both still work; left as-is since changing every call would be churn-only.
- **Audit Trail plugin API** (`AuditTrailPlugin.class`, `LogFileAuditLogger`, `SyslogAuditLogger` constructors) has shifted across plugin versions; the snippet matches older releases. Conceptually correct but version-sensitive.
- The nginx `limit_req zone=auth` block references a zone that must be declared with `limit_req_zone` at the `http {}` level — not shown in the snippet, but standard nginx setup.
