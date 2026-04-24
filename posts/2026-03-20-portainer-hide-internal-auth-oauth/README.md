# How to Hide Internal Authentication When Using OAuth in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, OAuth, SSO, Authentication, Security, UX

Description: Hide the internal username/password login form in Portainer when OAuth is the primary authentication method, while keeping emergency admin access available.

## Introduction

When OAuth is your primary authentication method, showing both the OAuth button and the internal login form can confuse users and suggest an alternative (less secure for regular users) login path. Portainer's `HideInternalAuth` option removes the internal login form from the login page, directing all users through OAuth. This guide explains how to configure this and maintain emergency admin access.

## Understanding HideInternalAuth

When `HideInternalAuth` is enabled:
- The username/password login form is hidden from the login page
- Users only see the OAuth login option
- The initial admin account is still accessible via the internal auth route
- Emergency access is preserved

This does NOT:
- Delete or disable internal user accounts
- Remove the initial admin account
- Remove admin capabilities from the initial admin account

## Enabling HideInternalAuth via UI

1. Go to Settings → Authentication → OAuth
2. Configure OAuth settings
3. Enable **Hide internal authentication prompt**
4. Save settings

## Enabling via API

Portainer's public API documentation exposes `PUT /api/settings` for configuring `AuthenticationMethod` and `OAuthSettings`, but it does not document a `HideInternalAuth` field. Configure **Hide internal authentication prompt** in the UI.

## Accessing Internal Login When Hidden

Even with `HideInternalAuth` enabled, you can access the internal login form by going to:

```text
https://portainer.example.com/#!/internal-auth
```

This forces the internal login flow. When external authentication is enabled, only the initial admin user can log in this way.

**Document this URL** in your runbooks and share it only with admins who need emergency access.

## Emergency Admin Account Best Practices

Since `HideInternalAuth` makes the internal admin less visible, ensure you:

1. **Have a strong initial admin password** documented in a password manager or secrets vault
2. **Test emergency access regularly** - log in via `#!/internal-auth` quarterly
3. **Remember that only the initial admin user can use internal authentication** when external auth is enabled
4. **Don't rely on the IdP admin** - your IdP being unavailable is exactly the scenario where you need internal admin access

```bash
# Test that emergency access works for the initial admin account
curl -X POST https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"VeryStrongAdminP@ssword123!"}' \
  | python3 -m json.tool
```

## Combining with SSO

For the cleanest experience, combine both SSO and HideInternalAuth:

Enable both **Use SSO** and **Hide internal authentication prompt** in the OAuth settings UI.

With both enabled:
1. User visits the Portainer login page
2. User is presented only with the OAuth login option
3. User authenticates with IdP
4. Redirected back and logged in
5. If the user already has an active IdP session, the provider won't force credentials again

## Reverting HideInternalAuth

If the IdP is unavailable and you need to re-enable the internal login form for all users:

1. Go to `https://portainer.example.com/#!/internal-auth`
2. Log in as the initial admin user
3. Go to Settings → Authentication → OAuth
4. Disable **Hide internal authentication prompt**
5. Save settings

## Conclusion

`HideInternalAuth` provides a cleaner user experience when OAuth is the primary login method, guiding all users through the standardized SSO flow. The `/#!/internal-auth` escape hatch ensures the initial admin user can still access Portainer if the IdP is unavailable. Always test emergency access before enabling this feature in production and document the emergency URL in your incident response procedures.
