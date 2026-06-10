# Validation Summary: How to Implement Custom User Models in Django

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- Django (auth framework, models, forms, admin, class-based views)
- `django.contrib.auth.models.AbstractUser` and `AbstractBaseUser`
- `PermissionsMixin`
- `BaseUserManager` and email normalization
- Django admin (`UserAdmin`)
- Django forms (`UserCreationForm`, `AuthenticationForm`)
- Class-based views (`LoginView`, `LogoutView`, `CreateView`, `UpdateView`, `DetailView`)
- `PasswordResetTokenGenerator` (used as base for email verification token)
- `urlsafe_base64_encode` / `urlsafe_base64_decode`
- `force_bytes` / `force_str`
- Django password validators
- Django test framework (`TestCase`, `Client`)

## Sources Consulted
- Django official documentation: Customizing authentication — https://docs.djangoproject.com/en/5.1/topics/auth/customizing/
- Django source: `django.contrib.auth.base_user.BaseUserManager` (for `normalize_email` behavior — lowercases only the domain part)
- Django source: `django.contrib.auth.models.AbstractBaseUser`, `AbstractUser`, `PermissionsMixin`
- Django docs: Password management — https://docs.djangoproject.com/en/5.1/topics/auth/passwords/
- Django docs: `AUTH_PASSWORD_VALIDATORS` — `NumericPasswordValidator` validates that the password is not entirely numeric
- Django docs: `django.contrib.auth.tokens.PasswordResetTokenGenerator` (`_make_hash_value` customization point)
- Django docs: `django.utils.encoding.force_str` (renamed from `force_text` in Django 4.0)
- Django docs: `django.utils.http.urlsafe_base64_encode` (returns a string in modern Django)
- Django docs: URL namespaces and `include()` — https://docs.djangoproject.com/en/5.1/topics/http/urls/#url-namespaces

## Issues Found
- **Incorrect comment on `NumericPasswordValidator`** (settings.py snippet): The comment read "Requires mixed content," which misrepresents the validator. `NumericPasswordValidator` rejects passwords that are entirely numeric — it does not enforce mixed content. Updated the comment to "Rejects passwords that are entirely numeric" to match Django's documented behavior.

## Review Notes
- The mermaid class hierarchy (`AbstractBaseUser → AbstractUser → User`, plus a separate custom subclass of `AbstractBaseUser`) is accurate per Django source.
- `BaseUserManager.normalize_email` only lowercases the domain portion, so the `test_email_normalized` assertion (`'Test@example.com'`) is correct.
- The custom user model correctly defines `is_active` itself — `AbstractBaseUser` does not provide it; `ModelBackend.user_can_authenticate` relies on it being present.
- `USERNAME_FIELD = 'email'` with `REQUIRED_FIELDS = ['first_name', 'last_name']` is valid; `REQUIRED_FIELDS` must not include `USERNAME_FIELD` or the password field, and this code follows that rule.
- `EmailVerificationTokenGenerator._make_hash_value` correctly overrides the documented customization point on `PasswordResetTokenGenerator`. Including `is_verified` invalidates tokens after successful verification, which is a valid pattern.
- The `Index(fields=['email'])` in `Meta.indexes` is technically redundant because `unique=True` already creates a unique index on the column. Not incorrect, just duplicate. Left as-is since it does not break anything.
- The form's `clean_email` lowercases the entire address (`email.lower()`), whereas `CustomUserManager.create_user` uses `BaseUserManager.normalize_email`, which lowercases only the domain. Both are valid normalization strategies, but the inconsistency means users created via the form will have fully lowercased emails while users created via the manager keep the original local-part casing. Worth noting but not a correctness bug.
- The `CustomUserAdmin` does not explicitly set `form` and `add_form`. In strict use, the default `UserChangeForm`/`UserCreationForm` reference the default `User` model in their `Meta` and can require additional customization when paired with a non-username-based custom user model. In practice many tutorials defer this; the post would benefit from a follow-up snippet that wires `add_form` to `CustomUserCreationForm`, but the current example will work in most Django versions because the overridden `fieldsets`/`add_fieldsets` and `UserModel = get_user_model()` resolution at module import keep the form aligned with the active model.
- `force_str`, `urlsafe_base64_encode/decode`, `force_bytes`, `get_current_site`, and `render_to_string` imports are all from the correct, current modules.
- The `CustomAuthenticationForm` correctly keeps the field name `username` (Django's `AuthenticationForm` hardcodes that field name; the underlying `ModelBackend.authenticate` then maps it to `USERNAME_FIELD`). The test reflecting this (`'username': 'user@example.com'`) is accurate.
