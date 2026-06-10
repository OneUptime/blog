# Validation Summary: How to Implement OAuth2 in Django

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Python
- Django
- django-allauth
- OAuth2
- Google OAuth provider
- GitHub OAuth provider
- Django signals
- Django templates

## Sources Consulted
- django-allauth official documentation: https://docs.allauth.org/en/latest/
- django-allauth configuration reference: https://docs.allauth.org/en/latest/account/configuration.html
- django-allauth socialaccount configuration: https://docs.allauth.org/en/latest/socialaccount/configuration.html
- django-allauth Google provider docs: https://docs.allauth.org/en/latest/socialaccount/providers/google.html
- django-allauth GitHub provider docs: https://docs.allauth.org/en/latest/socialaccount/providers/github.html
- django-allauth signals docs: https://docs.allauth.org/en/latest/account/signals.html
- Django official documentation: https://docs.djangoproject.com/
- Django custom user model docs: https://docs.djangoproject.com/en/stable/topics/auth/customizing/
- Google OAuth2 scope reference: https://developers.google.com/identity/protocols/oauth2/scopes
- GitHub OAuth scope reference: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps

## Issues Found
- **Invalid setting `ACCOUNT_LOGIN_ON_GET`**: The post listed `ACCOUNT_LOGIN_ON_GET = True` in the allauth configuration. This is not a documented django-allauth setting. The author almost certainly meant `SOCIALACCOUNT_LOGIN_ON_GET`, which allows initiating a social login via a direct GET link (e.g. clicking an `<a>` tag) instead of requiring a form POST. The behavior described in the post's templates section (using `{% provider_login_url %}` as an anchor href) explicitly relies on this setting. Renamed the setting to `SOCIALACCOUNT_LOGIN_ON_GET` and added a brief inline comment clarifying its purpose. `ACCOUNT_LOGOUT_ON_GET` directly below it is a real setting and was left untouched.

## Review Notes
- **Deprecated but still functional settings**: The post uses `ACCOUNT_AUTHENTICATION_METHOD`, `ACCOUNT_EMAIL_REQUIRED`, and `ACCOUNT_USERNAME_REQUIRED`. In modern django-allauth (0.61+, and especially 65+), these have been superseded by `ACCOUNT_LOGIN_METHODS = {"email"}` and `ACCOUNT_SIGNUP_FIELDS = ["email*", "password1*", "password2*"]`. The legacy settings still work as backwards-compatible shims and emit deprecation warnings, so they are not technically wrong; left as-is to avoid changing the post beyond fixing actual errors. Worth refreshing in a future revision.
- **Unused import**: `user_logged_in` is imported from `allauth.account.signals` but never used. Harmless, not a technical error.
- **GitHub scopes are redundant**: The post requests `'user', 'read:user', 'user:email'`. The `user` scope already grants `read:user` and `user:email`, so the latter two are redundant. Not incorrect — just over-specified.
- **Google scopes**: `'profile'` and `'email'` work because allauth maps these short names to the full Google OAuth scope URLs internally. Some modern setups also include `'openid'` to opt into the OIDC flow, but the post's choice is valid.
- **`OAUTH_PKCE_ENABLED`**: Verified as a real django-allauth setting for OAuth2 providers like Google. Correct usage.
- **`access_type: 'online'`**: Correct Google OAuth2 parameter. Note that this means no refresh token will be issued — switch to `'offline'` if long-lived API access is needed.
- **`SocialApp` admin setup**: The programmatic management command correctly uses `get_or_create` and `sites.add(site)` to associate the app with the right `Site`, matching the model's `sites = models.ManyToManyField(Site)` definition.
- **Signal `pre_social_login` account linking**: The example uses `sociallogin.connect(request, existing_user)`, which is the documented API for linking a social login to an existing user. Correct.
- **Production checklist**: Sound advice. HTTPS, env vars, and proper Site domain are all real requirements for OAuth callbacks to work in production.
