# How to Troubleshoot Authentication Issues in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Authentication, SSO, LDAP, SAML, OIDC, RBAC

Description: A comprehensive troubleshooting guide for resolving common authentication issues in Rancher across all auth providers.

Authentication problems in Rancher can range from simple misconfiguration to complex network and certificate issues. This guide provides a systematic approach to diagnosing and fixing authentication issues across all supported providers including LDAP, SAML, OIDC, and local auth.

## Prerequisites

- Admin or kubectl access to the Rancher cluster
- Basic understanding of the configured authentication provider
- Access to the Rancher server logs
- Network diagnostic tools (curl, openssl, ldapsearch)

## Step 1: Check Rancher Server Logs

The first step in troubleshooting any auth issue is checking the logs:

```bash
# Get recent auth-related logs

kubectl logs -l app=rancher -n cattle-system --tail=500 | \
  grep -iE "auth|login|ldap|saml|oidc|oauth|azure|github|keycloak" | tail -50

# Get error-level logs
kubectl logs -l app=rancher -n cattle-system --tail=500 | \
  grep -iE "error|fail|panic|fatal" | tail -30

# Follow logs in real-time while attempting login
kubectl logs -l app=rancher -n cattle-system -f | \
  grep -iE "auth|login|error"
```

## Step 2: Verify Network Connectivity

Test connectivity to your auth provider from the Rancher pod:

```bash
# Get the Rancher pod name
RANCHER_POD=$(kubectl get pod -l app=rancher -n cattle-system -o jsonpath='{.items[0].metadata.name}')

# Test LDAP/LDAPS connectivity
kubectl exec -it $RANCHER_POD -n cattle-system -- \
  curl -v telnet://ldap.example.com:636 --max-time 5

# Test OIDC provider connectivity
kubectl exec -it $RANCHER_POD -n cattle-system -- \
  curl -sk "https://idp.example.com/.well-known/openid-configuration" | head -5

# Test GitHub API connectivity
kubectl exec -it $RANCHER_POD -n cattle-system -- \
  curl -sk "https://api.github.com" | head -5

# Test Azure AD connectivity
kubectl exec -it $RANCHER_POD -n cattle-system -- \
  curl -sk "https://login.microsoftonline.com/common/.well-known/openid-configuration" | head -5
```

## Step 3: Diagnose LDAP Issues

For LDAP and Active Directory authentication problems:

### Test LDAP Bind

```bash
# Test bind from the Rancher server
ldapsearch -x -H ldaps://ldap.example.com:636 \
  -D "cn=rancher-bind,ou=service-accounts,dc=example,dc=com" \
  -w "<password>" \
  -b "dc=example,dc=com" \
  -s base \
  "(objectClass=*)"

# Test with specific user search
ldapsearch -x -H ldaps://ldap.example.com:636 \
  -D "cn=rancher-bind,ou=service-accounts,dc=example,dc=com" \
  -w "<password>" \
  -b "ou=users,dc=example,dc=com" \
  "(uid=testuser)" \
  uid cn mail memberOf
```

### Common LDAP Issues

| Symptom | Possible Cause | Diagnostic Command | Solution |
|---------|---------------|-------------------|----------|
| Connection refused | Wrong port or firewall | `nc -zv ldap.example.com 636` | Check firewall rules and port |
| Invalid credentials | Wrong bind DN or password | Test with ldapsearch | Verify the full DN and password |
| No users found | Wrong search base | `ldapsearch -b "dc=example,dc=com" -s sub "(uid=*)"` | Check the user search base path |
| No groups returned | Wrong group membership attribute or missing memberOf overlay | `ldapsearch "(uid=testuser)" memberOf` | Use the correct group membership attribute or enable memberOf |
| TLS handshake failure | Certificate issue | `openssl s_client -connect ldap.example.com:636` | Update the CA certificate |

### Fix TLS Certificate Issues

```bash
# Check the LDAP server certificate
openssl s_client -connect ldap.example.com:636 -showcerts </dev/null 2>/dev/null | \
  openssl x509 -noout -subject -issuer -dates

# Export the LDAP server certificate presented by the endpoint
openssl s_client -connect ldap.example.com:636 -showcerts </dev/null 2>/dev/null | \
  openssl x509 -outform PEM > ldap-server-cert.pem

# Verify the server certificate against the CA that signed it
SSL_CERT_DIR=/dummy SSL_CERT_FILE=/dummy \
  openssl verify -CAfile /path/to/ldap-ca.pem ldap-server-cert.pem
```

## Step 4: Diagnose SAML Issues

For SAML authentication problems (Okta, Ping, Keycloak SAML, ADFS):

### Check SAML Metadata

```bash
# Verify Rancher SP metadata is accessible for the configured SAML provider
curl -sk "https://rancher.example.com/v1-saml/<provider-name>/saml/metadata" | head -20

# Verify IdP metadata is accessible
curl -sk "https://idp.example.com/saml/metadata" | head -20
```

### Common SAML Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| Invalid signature | Certificate mismatch between IdP and Rancher | Update the IdP certificate in Rancher |
| Audience restriction failure | Entity ID mismatch | Ensure Entity IDs match in both IdP and Rancher |
| Missing attributes | Attribute mapper not configured | Add attribute statements in the IdP |
| Clock skew | Time difference between servers | Sync NTP on both Rancher and IdP |
| Redirect loop | Wrong ACS URL | Verify ACS URL in both configurations |

### Debug SAML Response

To debug the SAML response, use browser developer tools:

1. Open browser Developer Tools (F12).
2. Go to the **Network** tab.
3. Attempt a SAML login.
4. Find the POST request to the ACS URL.
5. Look at the `SAMLResponse` parameter.
6. Decode it:

```bash
# Decode a base64-encoded SAML response
echo "<base64-saml-response>" | base64 -d | xmllint --format -
```

## Step 5: Diagnose OIDC Issues

For OpenID Connect authentication problems:

### Verify OIDC Discovery

```bash
# Check the OIDC discovery document
curl -s "https://idp.example.com/.well-known/openid-configuration" | jq '{
  issuer,
  authorization_endpoint,
  token_endpoint,
  userinfo_endpoint,
  jwks_uri
}'

# Verify the JWKS endpoint from the discovery document
JWKS_URI=$(curl -s "https://idp.example.com/.well-known/openid-configuration" | jq -r '.jwks_uri')
curl -s "$JWKS_URI" | jq '.keys[0].kid'
```

### Common OIDC Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| Invalid client | Wrong client ID or secret | Verify credentials in the OIDC provider |
| Redirect URI mismatch | Callback URL mismatch | Set redirect URI to `https://rancher.example.com/verify-auth` |
| Token validation failed | Wrong JWKS URL or key rotation | Verify the JWKS endpoint is accessible |
| Missing groups claim | Groups not included in token | Configure group claim mapper in IdP |
| ID token expired | Clock skew | Sync NTP on the Rancher server |

## Step 6: Diagnose Azure AD Issues

For Azure AD authentication problems:

```bash
# Test Azure AD token endpoint
TOKEN=$(curl -s -X POST \
  "https://login.microsoftonline.com/<tenant-id>/oauth2/token" \
  -d "client_id=<client-id>" \
  -d "client_secret=<client-secret>" \
  -d "resource=https://graph.microsoft.com/" \
  -d "grant_type=client_credentials" | jq -r '.access_token')

# Test Microsoft Graph group lookup with the application token
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://graph.microsoft.com/v1.0/users/<user-upn-or-object-id>/memberOf" | jq '.value | length'
```

Common Azure AD issues:

- **AADSTS700016**: Application not found. Verify the Application ID.
- **AADSTS65001**: Admin consent not granted. Grant admin consent in Azure AD.
- **AADSTS50011**: Redirect URI mismatch. Update the redirect URI in the app registration to `https://rancher.example.com/verify-auth-azure`.

## Step 7: Regain Local Admin Access

If an external auth provider is broken and you are locked out, regain access with a local Rancher admin account:

```bash
# Reset the built-in Rancher admin password
kubectl -n cattle-system exec $(kubectl -n cattle-system get pods \
  -l app=rancher --no-headers | head -1 | awk '{ print $1 }') \
  -c rancher -- reset-password

# If the last admin was deleted or deactivated, recreate a default admin
kubectl -n cattle-system exec $(kubectl -n cattle-system get pods \
  -l app=rancher --no-headers | head -1 | awk '{ print $1 }') \
  -c rancher -- ensure-default-admin
```

Rancher recommends keeping local users available for exactly this scenario.

## Step 8: Check DNS Resolution

DNS issues can silently break authentication:

```bash
# Test DNS resolution from Rancher pod
kubectl exec -it $RANCHER_POD -n cattle-system -- nslookup ldap.example.com
kubectl exec -it $RANCHER_POD -n cattle-system -- nslookup idp.example.com
kubectl exec -it $RANCHER_POD -n cattle-system -- nslookup login.microsoftonline.com

# Check CoreDNS logs for failures
kubectl logs -l k8s-app=kube-dns -n kube-system --tail=100 | grep -i "error\|fail"
```

## Step 9: Verify Proxy Configuration

If Rancher is behind a proxy, verify proxy settings:

```bash
# Check proxy environment variables in Rancher pod
kubectl exec -it $RANCHER_POD -n cattle-system -- env | grep -i proxy

# Verify no-proxy settings include internal addresses
kubectl exec -it $RANCHER_POD -n cattle-system -- env | grep NO_PROXY
```

The `NO_PROXY` setting should include Rancher and cluster-internal addresses such as:

```plaintext
localhost,127.0.0.1,0.0.0.0,cattle-system.svc,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.svc,.cluster.local
```

Add your cluster's service CIDR and pod CIDR if they are not already covered.

## Step 10: Collect Diagnostic Information

When contacting support, collect this information:

```bash
#!/bin/bash
# auth-diagnostic.sh - Collect authentication diagnostic information

echo "=== Rancher Version ==="
kubectl get settings.management.cattle.io server-version -o jsonpath='{.value}'

echo -e "\n\n=== Auth Config ==="
kubectl get authconfigs.management.cattle.io

echo -e "\n\n=== Auth Provider Status ==="
kubectl logs -l app=rancher -n cattle-system --tail=100 | grep -i "auth\|provider" | tail -20

echo -e "\n\n=== Certificate Status ==="
kubectl get secrets -n cattle-system | grep tls

echo -e "\n\n=== Rancher Pod Status ==="
kubectl get pods -n cattle-system -o wide

echo -e "\n\n=== Recent Auth Errors ==="
kubectl logs -l app=rancher -n cattle-system --tail=500 | grep -i "error.*auth\|auth.*error" | tail -20

echo -e "\n\n=== Network Policies ==="
kubectl get networkpolicies -A

echo -e "\n\n=== DNS Resolution ==="
kubectl exec -it $(kubectl get pod -l app=rancher -n cattle-system -o jsonpath='{.items[0].metadata.name}') \
  -n cattle-system -- nslookup kubernetes.default.svc.cluster.local 2>/dev/null | head -5
```

## Troubleshooting Decision Tree

Follow this decision tree to narrow down the issue:

1. **Can you access the Rancher UI?**
   - No: Check Rancher pod status and ingress configuration.
   - Yes: Continue to step 2.

2. **Do you see the external auth login button?**
   - No: The auth provider may not be configured. Check auth config.
   - Yes: Continue to step 3.

3. **Are you redirected to the IdP?**
   - No: Check network connectivity to the IdP from Rancher.
   - Yes: Continue to step 4.

4. **Can you authenticate at the IdP?**
   - No: The issue is with the IdP, not Rancher.
   - Yes: Continue to step 5.

5. **Are you redirected back to Rancher?**
   - No: Check the callback/ACS URL configuration.
   - Yes: Continue to step 6.

6. **Do you get an error on the Rancher side?**
   - Yes: Check Rancher logs for the specific error message.
   - No, but no access: Check role assignments for the user or their groups.

## Best Practices

- **Always maintain local admin access**: Keep a local admin account as a fallback when external auth fails.
- **Monitor auth provider health**: Set up monitoring for your identity provider's availability.
- **Log authentication events**: Enable audit logging to track authentication successes and failures.
- **Document your auth configuration**: Keep a record of all authentication settings, endpoints, and certificates.
- **Test after changes**: Always test authentication after making any configuration changes to the auth provider or Rancher.

## Conclusion

Authentication troubleshooting in Rancher requires a systematic approach that starts with log analysis and works through network connectivity, certificate validation, and configuration verification. By following the diagnostic steps in this guide and using the troubleshooting decision tree, you can quickly identify and resolve authentication issues regardless of the provider. Always maintain a local admin account as your emergency access path, and document your authentication configuration to speed up future troubleshooting.
